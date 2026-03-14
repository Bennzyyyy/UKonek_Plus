const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const tabReset = document.getElementById('tab-reset');

// Handle port mismatch during development (Live Server on 5500, Backend on 5000)
const API_BASE = window.location.port === '5500'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : '';
const LOGIN_PAGE_URL = API_BASE ? `${API_BASE}/html/index.html` : '/html/index.html';
const DASHBOARD_PAGE_URL = API_BASE ? `${API_BASE}/html/dashboard.html` : '/html/dashboard.html';

const loginPanel = document.getElementById('login-panel');
const registerPanel = document.getElementById('register-panel');
const resetPanel = document.getElementById('reset-panel');

const panelTitle = document.getElementById('panel-title');
const panelDesc = document.getElementById('panel-desc');

function hideAllPanels() {
    loginPanel.style.display = 'none';
    registerPanel.style.display = 'none';
    resetPanel.style.display = 'none';

    tabLogin.classList.remove('active');
    tabRegister.classList.remove('active');
    tabReset.classList.remove('active');

    tabLogin.setAttribute('aria-selected', 'false');
    tabRegister.setAttribute('aria-selected', 'false');
    tabReset.setAttribute('aria-selected', 'false');
}

tabLogin.addEventListener('click', () => {
    hideAllPanels();
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    loginPanel.style.display = 'block';
    panelTitle.textContent = 'Welcome Back';
    panelDesc.textContent = 'Enter your credentials to access the portal';
});

tabRegister.addEventListener('click', () => {
    hideAllPanels();
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    registerPanel.style.display = 'block';
    panelTitle.textContent = 'Join U-Konek+';
    panelDesc.textContent = 'Register as medical personnel to get started';
});

tabReset.addEventListener('click', () => {
    hideAllPanels();
    tabReset.classList.add('active');
    tabReset.setAttribute('aria-selected', 'true');
    resetPanel.style.display = 'block';
    panelTitle.textContent = 'Reset Password';
    panelDesc.textContent = 'Restore access to your account';
});

// Registration Success Modal Handler
const modalLoginBtn = document.getElementById('modal-login-btn');
if (modalLoginBtn) {
    modalLoginBtn.addEventListener('click', () => {
        const successModal = document.getElementById('registration-success-modal');
        successModal.classList.add('hidden');
        if (window.location.port === '5500') {
            window.location.href = LOGIN_PAGE_URL;
            return;
        }
        tabLogin.click();
    });
}

// Dynamic Doctor Fields
const regRoleSelect = document.getElementById('reg-role');
const doctorFields = document.getElementById('doctor-fields');
regRoleSelect.addEventListener('change', () => {
    if (regRoleSelect.value === 'doctor') {
        doctorFields.style.display = 'block';
    } else {
        doctorFields.style.display = 'none';
    }
});

// Helper function to validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Email input validation
const emailInput = document.getElementById('reg-email');
if (emailInput) {
    emailInput.addEventListener('blur', function() {
        const emailError = document.getElementById('err-reg-email');
        const email = this.value.trim();
        
        if (!email) {
            emailError.classList.add('hidden');
            return;
        }

        if (!validateEmail(email)) {
            emailError.textContent = 'Please enter a valid email address';
            emailError.classList.remove('hidden');
        } else {
            emailError.classList.add('hidden');
        }
    });

    emailInput.addEventListener('input', function() {
        const emailError = document.getElementById('err-reg-email');
        if (emailError.classList.contains('hidden') || !this.value.trim()) {
            return;
        }
        
        const email = this.value.trim();
        if (validateEmail(email)) {
            emailError.classList.add('hidden');
        }
    });
}

// Helper function to clear schedule validation errors
function clearScheduleErrors() {
    const scheduleErrors = ['err-schedule-days', 'err-schedule-start', 'err-schedule-end'];
    scheduleErrors.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.classList.add('hidden');
            elem.textContent = '';
        }
    });
}

// Schedule validation when hours change
const startHourInput = document.getElementById('reg-schedule-start');
const endHourInput = document.getElementById('reg-schedule-end');

[startHourInput, endHourInput].forEach(input => {
    input.addEventListener('blur', function() {
        if (document.getElementById('reg-role').value === 'doctor') {
            validateScheduleHours();
        }
    });
    input.addEventListener('input', function() {
        if (document.getElementById('reg-role').value === 'doctor' && this.value) {
            validateScheduleHours();
        }
    });
});

function validateScheduleHours() {
    clearScheduleErrors();
    const startval = startHourInput.value.trim();
    const endval = endHourInput.value.trim();

    if (!startval || !endval) {
        return; // Allow empty until submission
    }

    const startHour = parseInt(startval);
    const endHour = parseInt(endval);

    let hasError = false;

    // Validate start hour
    if (isNaN(startHour) || startHour < 0 || startHour > 23) {
        const errElem = document.getElementById('err-schedule-start');
        errElem.textContent = 'Start hour must be between 0 and 23';
        errElem.classList.remove('hidden');
        hasError = true;
    }

    // Validate end hour
    if (isNaN(endHour) || endHour < 0 || endHour > 23) {
        const errElem = document.getElementById('err-schedule-end');
        errElem.textContent = 'End hour must be between 0 and 23';
        errElem.classList.remove('hidden');
        hasError = true;
    }

    // Validate start is before end
    if (!hasError && startHour >= endHour) {
        const errElem = document.getElementById('err-schedule-end');
        errElem.textContent = 'End hour must be after start hour';
        errElem.classList.remove('hidden');
        hasError = true;
    }

    return !hasError;
}

const registerSubmitBtn = document.getElementById('register-submit-btn');
const registerSubmitLabel = registerSubmitBtn ? registerSubmitBtn.querySelector('.btn-label') : null;
const loginSubmitBtn = document.getElementById('login-submit-btn');
const loginSubmitLabel = loginSubmitBtn ? loginSubmitBtn.querySelector('.btn-label') : null;
const resetSubmitBtn = document.getElementById('reset-submit-btn');
const resetSubmitLabel = resetSubmitBtn ? resetSubmitBtn.querySelector('.btn-label') : null;

function setRegisterLoading(isLoading) {
    if (!registerSubmitBtn) return;
    registerSubmitBtn.disabled = isLoading;
    registerSubmitBtn.classList.toggle('is-loading', isLoading);
    if (registerSubmitLabel) {
        registerSubmitLabel.textContent = isLoading ? 'CREATING ACCOUNT...' : 'REGISTER AS PERSONNEL';
    }
}

function setLoginLoading(isLoading) {
    if (!loginSubmitBtn) return;
    loginSubmitBtn.disabled = isLoading;
    loginSubmitBtn.classList.toggle('is-loading', isLoading);
    if (loginSubmitLabel) {
        loginSubmitLabel.textContent = isLoading ? 'SIGNING IN...' : 'SIGN IN';
    }
}

function setResetLoading(isLoading) {
    if (!resetSubmitBtn) return;
    resetSubmitBtn.disabled = isLoading;
    resetSubmitBtn.classList.toggle('is-loading', isLoading);
    if (resetSubmitLabel) {
        resetSubmitLabel.textContent = isLoading ? 'Sending...' : 'Send reset link';
    }
}

// Registration Form Handler
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const employee_id = document.getElementById('reg-employee-id').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const specialization = document.getElementById('reg-specialization').value.trim();
    
    const err = document.getElementById('register-error');
    const success = document.getElementById('register-success');
    const emailError = document.getElementById('err-reg-email');
    
    err.style.display = 'none';
    success.style.display = 'none';
    emailError.classList.add('hidden');

    // Validate email
    if (!email) {
        emailError.textContent = 'Email is required';
        emailError.classList.remove('hidden');
        return;
    }

    if (!validateEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.classList.remove('hidden');
        return;
    }
    
    // Capture schedule data for doctors
    let schedule = null;
    if (role === 'doctor') {
        const selectedDays = Array.from(document.querySelectorAll('input[name="schedule-day"]:checked')).map(cb => cb.value);
        const startHour = document.getElementById('reg-schedule-start').value;
        const endHour = document.getElementById('reg-schedule-end').value;
        
        // Validate schedule for doctors
        clearScheduleErrors();
        let scheduleValid = true;

        if (selectedDays.length === 0) {
            const errElem = document.getElementById('err-schedule-days');
            errElem.textContent = 'Please select at least one working day';
            errElem.classList.remove('hidden');
            scheduleValid = false;
        }

        if (!startHour || !endHour) {
            if (!startHour) {
                const errElem = document.getElementById('err-schedule-start');
                errElem.textContent = 'Start hour is required';
                errElem.classList.remove('hidden');
            }
            if (!endHour) {
                const errElem = document.getElementById('err-schedule-end');
                errElem.textContent = 'End hour is required';
                errElem.classList.remove('hidden');
            }
            scheduleValid = false;
        } else if (!validateScheduleHours()) {
            scheduleValid = false;
        }

        if (!scheduleValid) {
            return;
        }
        
        schedule = {
            days: selectedDays,
            startHour: parseInt(startHour),
            endHour: parseInt(endHour)
        };
    }

    // Basic Client-side matches Middleware logic
    if (password !== confirmPassword) {
        err.textContent = 'Passwords do not match.';
        err.style.display = 'block';
        return;
    }

    setRegisterLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/staff/register`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                employee_id,
                email,
                role,
                password,
                confirmPassword,
                specialization,
                schedule
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success modal
            document.getElementById('register-form').reset();
            doctorFields.style.display = 'none';
            const successModal = document.getElementById('registration-success-modal');
            successModal.classList.remove('hidden');
        } else {
            err.textContent = data.message || 'Registration failed.';
            err.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        err.textContent = 'Server connection failed.';
        err.style.display = 'block';
    } finally {
        setRegisterLoading(false);
    }
});

// Login Form Handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const err = document.getElementById('login-error');

    err.style.display = 'none';

    if (!username || !password) {
        err.textContent = 'Please enter both username and password.';
        err.style.display = 'block';
        return;
    }

    setLoginLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/staff/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Success: Redirect to dashboard or store user info
            console.log('Login successful:', data.user);
            window.location.href = DASHBOARD_PAGE_URL;
        } else {
            err.textContent = data.message || 'Login failed.';
            err.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        err.textContent = 'Server connection failed.';
        err.style.display = 'block';
    } finally {
        setLoginLoading(false);
    }
});

// Reset Form Handler
document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('reset-msg');
    const resetEmail = document.getElementById('reset-email').value.trim();

    msg.style.display = 'none';

    if (!resetEmail) {
        msg.style.display = 'block';
        msg.style.color = '#dc2626';
        msg.textContent = 'Please enter your email address.';
        return;
    }

    if (!validateEmail(resetEmail)) {
        msg.style.display = 'block';
        msg.style.color = '#dc2626';
        msg.textContent = 'Please enter a valid email address.';
        return;
    }

    setResetLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/staff/forgot-password`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetEmail })
        });

        const data = await response.json();

        msg.style.display = 'block';
        if (response.ok) {
            msg.style.color = '#15803d';
            msg.textContent = data.message || 'If the email exists, a reset link has been sent.';
        } else {
            msg.style.color = '#dc2626';
            msg.textContent = data.message || 'Failed to request password reset.';
        }
    } catch (error) {
        console.error('Reset request error:', error);
        msg.style.display = 'block';
        msg.style.color = '#dc2626';
        msg.textContent = 'Server connection failed.';
    } finally {
        setResetLoading(false);
    }
});
