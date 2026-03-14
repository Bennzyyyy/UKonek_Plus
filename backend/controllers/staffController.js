const db = require('../config/db');
const crypto = require('crypto');
const { hashPassword, comparePassword } = require('../utils/auth');
const { handleDbError } = require('../utils/dbHelpers');
const { sendStaffVerificationEmail, sendStaffApprovalEmail, sendStaffPasswordResetEmail } = require('../utils/email');
const {
    createSessionForUser,
    destroySession,
    setSessionCookie,
    clearSessionCookie,
    parseCookies,
    SESSION_COOKIE_NAME
} = require('../middleware/sessionAuth');

let staffEmailVerificationTableReady = false;
let staffPasswordResetSchemaReady = false;

async function ensureStaffEmailVerificationTable() {
    if (staffEmailVerificationTableReady) {
        return;
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS staff_email_verifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            employee_id VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            role VARCHAR(100) NOT NULL,
            specialization VARCHAR(255) DEFAULT NULL,
            schedule VARCHAR(255) DEFAULT NULL,
            verification_token_hash VARCHAR(64) NOT NULL,
            verification_token_expires DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    staffEmailVerificationTableReady = true;
}

async function ensureStaffPasswordResetSchema() {
    if (staffPasswordResetSchemaReady) {
        return;
    }

    const [columns] = await db.query(
        `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = 'staff'
        `,
        [process.env.DB_NAME]
    );

    const existing = new Set(columns.map((column) => column.COLUMN_NAME));
    const alterStatements = [];

    if (!existing.has('password_reset_token_hash')) {
        alterStatements.push("ADD COLUMN password_reset_token_hash VARCHAR(64) NULL");
    }
    if (!existing.has('password_reset_token_expires')) {
        alterStatements.push("ADD COLUMN password_reset_token_expires DATETIME NULL");
    }

    if (alterStatements.length > 0) {
        await db.query(`ALTER TABLE staff ${alterStatements.join(', ')}`);
    }

    staffPasswordResetSchemaReady = true;
}

function createVerificationTokenPayload() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
        token,
        tokenHash,
        expiresAt
    };
}

function wantsJson(req) {
    const acceptHeader = req.get('accept') || '';
    return acceptHeader.includes('application/json') || req.query.format === 'json';
}

function sendVerificationResult(req, res, { statusCode, success, title, message }) {
    if (wantsJson(req)) {
        return res.status(statusCode).json({ message, success });
    }

    const themeColor = success ? '#16a34a' : '#dc2626';
    const symbol = success ? '✓' : '!' ;
    const backendBaseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const homeLink = process.env.FRONTEND_LOGIN_URL || `${backendBaseUrl}/html/index.html`;

    return res.status(statusCode).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
    <style>
        :root {
            --surface: #ffffff;
            --text: #0f172a;
            --muted: #475569;
            --accent: ${themeColor};
            --bg-start: #f8fbff;
            --bg-end: #eef2ff;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text);
            background: radial-gradient(circle at top right, var(--bg-end), var(--bg-start));
            padding: 20px;
        }
        .card {
            width: 100%;
            max-width: 520px;
            background: var(--surface);
            border-radius: 16px;
            padding: 28px 24px;
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
            text-align: center;
        }
        .badge {
            width: 64px;
            height: 64px;
            margin: 0 auto 14px;
            border-radius: 999px;
            background: var(--accent);
            color: #fff;
            display: grid;
            place-items: center;
            font-size: 30px;
            font-weight: 700;
        }
        h1 {
            margin: 0 0 12px;
            font-size: 26px;
            line-height: 1.25;
        }
        p {
            margin: 0;
            font-size: 15px;
            line-height: 1.6;
            color: var(--muted);
        }
        .actions {
            margin-top: 22px;
        }
        .btn {
            display: inline-block;
            text-decoration: none;
            background: #00277f;
            color: #ffffff;
            padding: 11px 18px;
            border-radius: 10px;
            font-weight: 600;
        }
        .btn:hover {
            filter: brightness(1.06);
        }
    </style>
</head>
<body>
    <main class="card">
        <div class="badge">${symbol}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="actions">
            <a class="btn" href="${homeLink}">Go to Login</a>
        </div>
    </main>
</body>
</html>
    `);
}

// Register a new staff account (Medical Personnel) - Goes to PENDING
exports.registerStaff = async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await ensureStaffEmailVerificationTable();

        const { username, password, employee_id, email, role, specialization, schedule } = req.body;

        // Check if username, employee_id, or email already exists in active or pending accounts.
        const [existingStaff] = await connection.query(
            "SELECT id FROM staff WHERE username = ? OR employee_id = ? OR email = ?",
            [username, employee_id, email]
        );

        const [existingPending] = await connection.query(
            "SELECT id FROM pending_staff WHERE username = ? OR employee_id = ? OR email = ?",
            [username, employee_id, email]
        );

        // Check staged registrations waiting for email verification.
        const [existingStaged] = await connection.query(
            "SELECT id FROM staff_email_verifications WHERE username = ? OR employee_id = ? OR email = ?",
            [username, employee_id, email]
        );

        if (existingStaff.length > 0) {
            return res.status(400).json({ message: "Username, Employee ID, or Email already registered" });
        }
        if (existingPending.length > 0) {
            return res.status(400).json({ message: "Username, Employee ID, or Email already pending approval" });
        }
        if (existingStaged.length > 0) {
            return res.status(400).json({ message: "Registration already submitted. Please verify your email." });
        }

        // Hash the password
        const password_hash = await hashPassword(password);
        const { token, tokenHash, expiresAt } = createVerificationTokenPayload();

        await connection.beginTransaction();
        transactionStarted = true;

        // Stage registration until email is verified.
        const sql = `
            INSERT INTO staff_email_verifications (
                username,
                password_hash,
                employee_id,
                email,
                role,
                specialization,
                schedule,
                verification_token_hash,
                verification_token_expires
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            username,
            password_hash,
            employee_id,
            email,
            role,
            role === 'doctor' ? specialization : null,
            role === 'doctor' ? JSON.stringify(schedule) : null,
            tokenHash,
            expiresAt
        ];

        await connection.query(sql, params);

        const backendBaseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const verificationUrl = `${backendBaseUrl}/api/staff/verify-email?token=${token}`;

        await sendStaffVerificationEmail({
            to: email,
            username,
            verificationUrl,
            expiresHours: 24
        });

        await connection.commit();
        transactionStarted = false;
        res.status(201).json({
            message: "Registration submitted. Please verify your email to complete your request for admin approval."
        });

    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        console.error('Registration error:', error);

        if (!error.code) {
            return res.status(500).json({ message: error.message || 'Server error during registration' });
        }

        const { message, status } = handleDbError(error);
        return res.status(status).json({ message });
    } finally {
        connection.release();
    }
};

// Register a new staff account DIRECTLY (Admin action) - Goes to ACTIVE
exports.registerStaffDirect = async (req, res) => {
    try {
        const { username, password, employee_id, email, role, specialization, schedule } = req.body;

        // Check if username, employee_id, or email already exists in EITHER staff or pending_staff
        const [existingStaff] = await db.query(
            "SELECT id FROM staff WHERE username = ? OR employee_id = ? OR email = ?",
            [username, employee_id, email]
        );

        const [existingPending] = await db.query(
            "SELECT id FROM pending_staff WHERE username = ? OR employee_id = ? OR email = ?",
            [username, employee_id, email]
        );

        if (existingStaff.length > 0) {
            return res.status(400).json({ message: "Username, Employee ID, or Email already registered" });
        }
        if (existingPending.length > 0) {
            return res.status(400).json({ message: "Username, Employee ID, or Email already pending approval" });
        }

        // Hash the password
        const password_hash = await hashPassword(password);

        // Insert into staff
        const sql = `
            INSERT INTO staff (username, password_hash, employee_id, email, role, specialization, schedule, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            username,
            password_hash,
            employee_id,
            email,
            role,
            role === 'doctor' ? specialization : null,
            role === 'doctor' ? JSON.stringify(schedule) : null,
            'Active'
        ];

        await db.query(sql, params);

        res.status(201).json({ message: "Account registered successfully and is now active." });

    } catch (error) {
        console.error('Direct Registration error:', error);
        const { message, status } = handleDbError(error);
        res.status(status).json({ message });
    }
};

// Get all staff accounts (Active)
exports.getAllStaff = async (req, res) => {
    try {
        const [staff] = await db.query(
            "SELECT id, username, email, employee_id, role, status, specialization, schedule, created_at FROM staff ORDER BY id DESC"
        );
        res.status(200).json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get pending staff accounts
exports.getPendingStaff = async (req, res) => {
    try {
        const [pending] = await db.query(
            "SELECT id, username, email, employee_id, role, status, specialization, schedule, created_at FROM pending_staff ORDER BY id DESC"
        );
        res.status(200).json(pending);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Approve staff account
exports.approveStaff = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await connection.beginTransaction();
        transactionStarted = true;

        // 1. Get the pending user
        const [pendingUsers] = await connection.query("SELECT * FROM pending_staff WHERE id = ?", [id]);
        if (pendingUsers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Pending account not found" });
        }

        const user = pendingUsers[0];

        // 2. Check if username, employee_id, or email already exist in staff (Race condition check)
        const [alreadyExists] = await connection.query(
            "SELECT id FROM staff WHERE username = ? OR employee_id = ? OR email = ?",
            [user.username, user.employee_id, user.email]
        );

        if (alreadyExists.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: "Account already exists in staff table" });
        }

        // 3. Insert into final staff table
        const insertSql = `
            INSERT INTO staff (username, password_hash, employee_id, email, role, specialization, schedule, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            user.username,
            user.password_hash,
            user.employee_id,
            user.email,
            user.role,
            user.specialization,
            user.schedule,
            'Active'
        ];
        await connection.query(insertSql, params);

        // 3. Delete from pending
        await connection.query("DELETE FROM pending_staff WHERE id = ?", [id]);

        await connection.commit();
        transactionStarted = false;

        // Send notification after commit so account approval is not blocked by email delivery failures.
        let notificationEmailSent = true;
        let notificationError = null;
        try {
            await sendStaffApprovalEmail({
                to: user.email,
                username: user.username,
                role: user.role
            });
        } catch (emailError) {
            notificationEmailSent = false;
            notificationError = emailError.message;
            console.error('Approval notification email error:', emailError.message);
        }

        res.status(200).json({
            message: notificationEmailSent
                ? "Account approved and moved to staff table. Approval email sent."
                : "Account approved and moved to staff table, but approval email failed to send.",
            notificationEmailSent,
            notificationEmailRecipient: user.email,
            notificationError
        });

    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        console.error('Approval error:', error);
        res.status(500).json({ message: "Server error during approval" });
    } finally {
        connection.release();
    }
};

// Verify pending staff email using token link
exports.verifyStaffEmail = async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await ensureStaffEmailVerificationTable();

        const token = req.query.token || req.body.token;

        if (!token) {
            return sendVerificationResult(req, res, {
                statusCode: 400,
                success: false,
                title: 'Verification Link Invalid',
                message: 'Verification token is required.'
            });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const [stagedMatches] = await connection.query(
            `
                SELECT *
                FROM staff_email_verifications
                WHERE verification_token_hash = ?
                LIMIT 1
            `,
            [tokenHash]
        );

        if (stagedMatches.length === 0) {
            return sendVerificationResult(req, res, {
                statusCode: 400,
                success: false,
                title: 'Link Not Valid',
                message: 'This verification link is invalid or has already been used.'
            });
        }

        const staged = stagedMatches[0];

        if (new Date(staged.verification_token_expires) <= new Date()) {
            return sendVerificationResult(req, res, {
                statusCode: 400,
                success: false,
                title: 'Verification Link Expired',
                message: 'This verification link has expired. Please register again or request a new link.'
            });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const [alreadyInPending] = await connection.query(
            "SELECT id FROM pending_staff WHERE username = ? OR employee_id = ? OR email = ?",
            [staged.username, staged.employee_id, staged.email]
        );

        if (alreadyInPending.length > 0) {
            await connection.query("DELETE FROM staff_email_verifications WHERE id = ?", [staged.id]);
            await connection.commit();
            transactionStarted = false;

            return sendVerificationResult(req, res, {
                statusCode: 200,
                success: true,
                title: 'Email Already Verified',
                message: 'Your email is already verified. Please wait for admin approval.'
            });
        }

        const [alreadyInStaff] = await connection.query(
            "SELECT id FROM staff WHERE username = ? OR employee_id = ? OR email = ?",
            [staged.username, staged.employee_id, staged.email]
        );

        if (alreadyInStaff.length > 0) {
            await connection.query("DELETE FROM staff_email_verifications WHERE id = ?", [staged.id]);
            await connection.commit();
            transactionStarted = false;

            return sendVerificationResult(req, res, {
                statusCode: 409,
                success: false,
                title: 'Account Already Exists',
                message: 'This account already exists in the active staff list.'
            });
        }

        await connection.query(
            `
                INSERT INTO pending_staff (
                    username,
                    password_hash,
                    employee_id,
                    email,
                    role,
                    specialization,
                    schedule,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                staged.username,
                staged.password_hash,
                staged.employee_id,
                staged.email,
                staged.role,
                staged.specialization,
                staged.schedule,
                'Pending'
            ]
        );

        await connection.query("DELETE FROM staff_email_verifications WHERE id = ?", [staged.id]);
        await connection.commit();
        transactionStarted = false;

        return sendVerificationResult(req, res, {
            statusCode: 200,
            success: true,
            title: 'Email Verified Successfully',
            message: 'Your email is verified. Your account is now pending admin approval.'
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        console.error('Email verification error:', error);
        return sendVerificationResult(req, res, {
            statusCode: 500,
            success: false,
            title: 'Verification Failed',
            message: 'A server error occurred while verifying your email. Please try again later.'
        });
    } finally {
        connection.release();
    }
};

// Reject staff account
exports.rejectStaff = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query("DELETE FROM pending_staff WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Pending account not found" });
        }
        res.status(200).json({ message: "Account registration rejected" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during rejection" });
    }
};

// Login staff (Medical Personnel)
exports.loginStaff = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Find user by username
        const [users] = await db.query("SELECT * FROM staff WHERE username = ?", [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid credentials or account not yet active" });
        }

        const user = users[0];

        // Compare passwords
        const isMatch = await comparePassword(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Return user info (excluding password)
        const { password_hash, ...userInfo } = user;
        const sessionId = createSessionForUser({
            id: userInfo.id,
            username: userInfo.username,
            role: userInfo.role,
            email: userInfo.email
        });
        setSessionCookie(res, sessionId);
        res.status(200).json({ message: "Login successful", user: userInfo });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.logoutStaff = async (req, res) => {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (sessionId) {
        destroySession(sessionId);
    }
    clearSessionCookie(res);

    return res.status(200).json({ message: 'Logged out successfully' });
};

exports.getSession = async (req, res) => {
    return res.status(200).json({
        authenticated: true,
        user: req.sessionUser
    });
};

// Request password reset link
exports.forgotPassword = async (req, res) => {
    try {
        await ensureStaffPasswordResetSchema();

        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Always return generic message to prevent account enumeration.
        const genericResponse = {
            message: 'If an account exists for that email, a password reset link has been sent.'
        };

        const [users] = await db.query(
            'SELECT id, username, email FROM staff WHERE email = ? LIMIT 1',
            [email]
        );

        if (users.length === 0) {
            return res.status(200).json(genericResponse);
        }

        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.query(
            `
                UPDATE staff
                SET password_reset_token_hash = ?, password_reset_token_expires = ?
                WHERE id = ?
            `,
            [resetTokenHash, expiresAt, user.id]
        );

        const backendBaseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const resetBaseUrl = process.env.FRONTEND_RESET_URL || `${backendBaseUrl}/html/reset-password.html`;
        const separator = resetBaseUrl.includes('?') ? '&' : '?';
        const resetUrl = `${resetBaseUrl}${separator}token=${encodeURIComponent(resetToken)}`;

        await sendStaffPasswordResetEmail({
            to: user.email,
            username: user.username,
            resetUrl,
            expiresMinutes: 60
        });

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ message: 'Server error while requesting password reset' });
    }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
    try {
        await ensureStaffPasswordResetSchema();

        const { token, password, confirmPassword } = req.body;

        if (!token || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Token, password, and confirm password are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const [users] = await db.query(
            `
                SELECT id
                FROM staff
                WHERE password_reset_token_hash = ?
                  AND password_reset_token_expires IS NOT NULL
                  AND password_reset_token_expires > NOW()
                LIMIT 1
            `,
            [tokenHash]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Reset token is invalid or expired' });
        }

        const passwordHash = await hashPassword(password);

        await db.query(
            `
                UPDATE staff
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
        console.error('Reset password error:', error);
        return res.status(500).json({ message: 'Server error while resetting password' });
    }
};
