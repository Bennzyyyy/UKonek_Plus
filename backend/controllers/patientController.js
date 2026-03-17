const crypto = require('crypto');
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/auth');
const { handleDbError } = require('../utils/dbHelpers');
const { sendPatientOtpEmail } = require('../utils/email');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{4,30}$/;
const phoneRegex = /^\+?\d{10,15}$/;

let patientSchemaReady = false;
const OTP_EXPIRY_MINUTES = Number.parseInt(process.env.PATIENT_OTP_EXPIRY_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = Number.parseInt(process.env.PATIENT_OTP_MAX_ATTEMPTS || '5', 10);

function isStrongPassword(password) {
    return (
        typeof password === 'string' &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
    );
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateOtpCode() {
    const min = 100000;
    const max = 999999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function ensurePatientSchema() {
    if (patientSchemaReady) {
        return;
    }

    const [columns] = await db.query(
        `
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = 'patients'
        `,
        [process.env.DB_NAME]
    );

    const existing = new Set(columns.map((column) => column.COLUMN_NAME));
    const alterStatements = [];

    if (!existing.has('username')) {
        alterStatements.push('ADD COLUMN username VARCHAR(100) UNIQUE NULL');
    }
    if (!existing.has('password_reset_token_hash')) {
        alterStatements.push('ADD COLUMN password_reset_token_hash VARCHAR(64) NULL');
    }
    if (!existing.has('password_reset_token_expires')) {
        alterStatements.push('ADD COLUMN password_reset_token_expires DATETIME NULL');
    }

    if (alterStatements.length > 0) {
        await db.query(`ALTER TABLE patients ${alterStatements.join(', ')}`);
    }

    const middleInitialColumn = columns.find((column) => column.COLUMN_NAME === 'middle_initial');
    if (
        middleInitialColumn &&
        middleInitialColumn.DATA_TYPE === 'varchar' &&
        Number(middleInitialColumn.CHARACTER_MAXIMUM_LENGTH || 0) < 100
    ) {
        await db.query('ALTER TABLE patients MODIFY COLUMN middle_initial VARCHAR(100) NULL');
    }

    await db.query(
        `
            CREATE TABLE IF NOT EXISTS patient_otps (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                purpose ENUM('registration', 'password_reset') NOT NULL,
                otp_hash VARCHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                attempts_left INT NOT NULL DEFAULT 5,
                consumed TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_patient_otps_email_purpose (email, purpose),
                INDEX idx_patient_otps_expires (expires_at)
            )
        `
    );

    patientSchemaReady = true;
}

async function issuePatientOtp({ email, purpose }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const otp = generateOtpCode();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.query(
        'UPDATE patient_otps SET consumed = 1 WHERE email = ? AND purpose = ? AND consumed = 0',
        [normalizedEmail, purpose]
    );

    await db.query(
        `
            INSERT INTO patient_otps (email, purpose, otp_hash, expires_at, attempts_left, consumed)
            VALUES (?, ?, ?, ?, ?, 0)
        `,
        [normalizedEmail, purpose, otpHash, expiresAt, OTP_MAX_ATTEMPTS]
    );

    await sendPatientOtpEmail({
        to: normalizedEmail,
        purpose,
        otp,
        expiresMinutes: OTP_EXPIRY_MINUTES
    });
}

async function validateAndConsumeOtp({ email, purpose, otp }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const otpHash = hashOtp(String(otp || '').trim());

    const [rows] = await db.query(
        `
            SELECT id, otp_hash, attempts_left, expires_at
            FROM patient_otps
            WHERE email = ?
              AND purpose = ?
              AND consumed = 0
            ORDER BY id DESC
            LIMIT 1
        `,
        [normalizedEmail, purpose]
    );

    if (rows.length === 0) {
        return { ok: false, status: 400, message: 'No active OTP found. Please request a new OTP.' };
    }

    const otpRow = rows[0];
    const expiresAt = new Date(otpRow.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        await db.query('UPDATE patient_otps SET consumed = 1 WHERE id = ?', [otpRow.id]);
        return { ok: false, status: 400, message: 'OTP is expired. Please request a new OTP.' };
    }

    if (otpRow.attempts_left <= 0) {
        await db.query('UPDATE patient_otps SET consumed = 1 WHERE id = ?', [otpRow.id]);
        return { ok: false, status: 400, message: 'OTP attempts exceeded. Please request a new OTP.' };
    }

    if (otpRow.otp_hash !== otpHash) {
        await db.query(
            'UPDATE patient_otps SET attempts_left = attempts_left - 1 WHERE id = ? AND attempts_left > 0',
            [otpRow.id]
        );
        return { ok: false, status: 400, message: 'Invalid OTP code' };
    }

    await db.query('UPDATE patient_otps SET consumed = 1 WHERE id = ?', [otpRow.id]);
    return { ok: true };
}

exports.requestPatientOtp = async (req, res) => {
    try {
        await ensurePatientSchema();

        const email = String(req.body.email || '').trim().toLowerCase();
        const purpose = String(req.body.purpose || '').trim();

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'A valid email is required' });
        }
        if (!['registration', 'password_reset'].includes(purpose)) {
            return res.status(400).json({ message: 'Purpose must be registration or password_reset' });
        }

        if (purpose === 'registration') {
            const [existing] = await db.query('SELECT id FROM patients WHERE email = ? LIMIT 1', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ message: 'Email already registered' });
            }
        }

        if (purpose === 'password_reset') {
            const [existing] = await db.query('SELECT id FROM patients WHERE email = ? LIMIT 1', [email]);
            if (existing.length === 0) {
                return res.status(200).json({ message: 'If an account exists for that email, an OTP has been sent.' });
            }
        }

        await issuePatientOtp({ email, purpose });

        return res.status(200).json({
            message: purpose === 'registration'
                ? 'OTP sent to email for registration verification.'
                : 'If an account exists for that email, an OTP has been sent.'
        });
    } catch (error) {
        console.error('Patient request OTP error:', error);
        return res.status(500).json({ message: 'Server error while requesting OTP' });
    }
};

exports.registerPatient = async (req, res) => {
    try {
        await ensurePatientSchema();

        const {
            firstname,
            surname,
            middle_initial,
            date_of_birth,
            age,
            contact_number,
            sex,
            email,
            complete_address,
            emergency_contact_complete_name,
            emergency_contact_contact_number,
            relation,
            username,
            password,
            otp
        } = req.body;

        const normalizedFirstName = String(firstname || '').trim();
        const normalizedSurname = String(surname || '').trim();
        const normalizedMiddleInitial = String(middle_initial || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedUsername = String(username || '').trim();
        const normalizedContact = String(contact_number || '').trim();
        const normalizedEmergencyContact = String(emergency_contact_contact_number || '').trim();

        if (!nameRegex.test(normalizedFirstName) || !nameRegex.test(normalizedSurname)) {
            return res.status(400).json({ message: 'First name and surname must contain letters only' });
        }

        if (normalizedMiddleInitial && !nameRegex.test(normalizedMiddleInitial)) {
            return res.status(400).json({ message: 'Middle name must contain letters only' });
        }

        if (normalizedMiddleInitial.length > 100) {
            return res.status(400).json({ message: 'Middle name must be at most 100 characters' });
        }

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (!usernameRegex.test(normalizedUsername)) {
            return res.status(400).json({ message: 'Username must be 4-30 chars and use letters, numbers, dot, underscore, or hyphen' });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase, and number' });
        }

        if (!/^\d{6}$/.test(String(otp || '').trim())) {
            return res.status(400).json({ message: 'A valid 6-digit OTP is required' });
        }

        const parsedAge = Number.parseInt(age, 10);
        if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130) {
            return res.status(400).json({ message: 'Age must be a valid number between 0 and 130' });
        }

        if (!phoneRegex.test(normalizedContact)) {
            return res.status(400).json({ message: 'Contact number must be 10 to 15 digits' });
        }

        if (normalizedEmergencyContact && !phoneRegex.test(normalizedEmergencyContact)) {
            return res.status(400).json({ message: 'Emergency contact number must be 10 to 15 digits' });
        }

        const [existing] = await db.query(
            'SELECT id FROM patients WHERE email = ? OR username = ? LIMIT 1',
            [normalizedEmail, normalizedUsername]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email or username already registered' });
        }

        const otpValidation = await validateAndConsumeOtp({
            email: normalizedEmail,
            purpose: 'registration',
            otp
        });
        if (!otpValidation.ok) {
            return res.status(otpValidation.status).json({ message: otpValidation.message });
        }

        const passwordHash = await hashPassword(password);

        await db.query(
            `
                INSERT INTO patients (
                    firstname,
                    surname,
                    middle_initial,
                    date_of_birth,
                    age,
                    contact_number,
                    sex,
                    email,
                    complete_address,
                    emergency_contact_complete_name,
                    emergency_contact_contact_number,
                    relation,
                    username,
                    password_hash,
                    role
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                normalizedFirstName,
                normalizedSurname,
                normalizedMiddleInitial || null,
                date_of_birth || null,
                parsedAge,
                normalizedContact,
                sex || null,
                normalizedEmail,
                complete_address || null,
                emergency_contact_complete_name || null,
                normalizedEmergencyContact || null,
                relation || null,
                normalizedUsername,
                passwordHash,
                'patient'
            ]
        );

        return res.status(201).json({ message: 'Patient account created successfully' });
    } catch (error) {
        console.error('Patient register error:', error);
        const { message, status } = handleDbError(error);
        return res.status(status).json({ message });
    }
};

exports.loginPatient = async (req, res) => {
    try {
        await ensurePatientSchema();

        const identifier = String(req.body.identifier || req.body.username || req.body.email || '').trim();
        const password = String(req.body.password || '');

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Identifier and password are required' });
        }

        const [rows] = await db.query(
            `
                SELECT id, firstname, surname, username, email, role, password_hash
                FROM patients
                WHERE username = ? OR email = ?
                LIMIT 1
            `,
            [identifier, identifier.toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];
        const passwordOk = await comparePassword(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        return res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                firstname: user.firstname,
                surname: user.surname,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Patient login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.forgotPasswordPatient = async (req, res) => {
    try {
        await ensurePatientSchema();

        const email = String(req.body.email || '').trim().toLowerCase();
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'A valid email is required' });
        }

        const [rows] = await db.query('SELECT id FROM patients WHERE email = ? LIMIT 1', [email]);
        if (rows.length === 0) {
            return res.status(200).json({ message: 'If an account exists for that email, an OTP has been sent.' });
        }

        await issuePatientOtp({ email, purpose: 'password_reset' });
        return res.status(200).json({ message: 'If an account exists for that email, an OTP has been sent.' });
    } catch (error) {
        console.error('Patient forgot password error:', error);
        return res.status(500).json({ message: 'Server error while requesting OTP' });
    }
};

exports.resetPasswordPatient = async (req, res) => {
    try {
        await ensurePatientSchema();

        const email = String(req.body.email || '').trim().toLowerCase();
        const otp = String(req.body.otp || '').trim();
        const password = String(req.body.password || '');
        const confirmPassword = String(req.body.confirmPassword || '');

        if (!email || !otp || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Email, OTP, password, and confirm password are required' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase, and number' });
        }

        const otpValidation = await validateAndConsumeOtp({
            email,
            purpose: 'password_reset',
            otp
        });
        if (!otpValidation.ok) {
            return res.status(otpValidation.status).json({ message: otpValidation.message });
        }

        const [users] = await db.query('SELECT id FROM patients WHERE email = ? LIMIT 1', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid account for password reset' });
        }

        const passwordHash = await hashPassword(password);

        await db.query(
            `
                UPDATE patients
                SET
                    password_hash = ?,
                    password_reset_token_hash = NULL,
                    password_reset_token_expires = NULL
                WHERE id = ?
            `,
            [passwordHash, users[0].id]
        );

        return res.status(200).json({ message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        console.error('Patient reset password error:', error);
        return res.status(500).json({ message: 'Server error while resetting password' });
    }
};
