const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

// Handle port mismatch during development (Live Server on 5500, Backend on 5000)
const API_BASE = window.location.port === '5500'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : '';
const LOGIN_PAGE_URL = API_BASE ? `${API_BASE}/html/index.html` : '/html/index.html';
const DASHBOARD_PAGE_URL = API_BASE ? `${API_BASE}/html/dashboard.html` : '/html/dashboard.html';

const loginPanel = document.getElementById('login-panel');
const registerPanel = document.getElementById('register-panel');
const forgotPasswordToggle = document.getElementById('forgot-password-toggle');
const resetForm = document.getElementById('reset-form');

const panelTitle = document.getElementById('panel-title');
const panelDesc = document.getElementById('panel-desc');

function hideAllPanels() {
    loginPanel.style.display = 'none';
    registerPanel.style.display = 'none';

    tabLogin.classList.remove('active');
    tabRegister.classList.remove('active');

    tabLogin.setAttribute('aria-selected', 'false');
    tabRegister.setAttribute('aria-selected', 'false');
}

tabLogin.addEventListener('click', () => {
    hideAllPanels();
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    loginPanel.style.display = 'block';
    if (resetForm) {
        resetForm.style.display = 'none';
    }
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

if (forgotPasswordToggle && resetForm) {
    forgotPasswordToggle.addEventListener('click', () => {
        const isHidden = resetForm.style.display === 'none' || !resetForm.style.display;
        resetForm.style.display = isHidden ? 'block' : 'none';
    });
}

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

// Helper function to validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateName(name) {
    const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
    return nameRegex.test(name);
}

function validateNumericString(value) {
    const numericRegex = /^\d+$/;
    return numericRegex.test(value);
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

const nameFieldIds = ['reg-first-name', 'reg-middle-name', 'reg-last-name'];
nameFieldIds.forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    if (!input) return;

    input.addEventListener('input', function () {
        this.value = this.value.replace(/\d+/g, '');
    });
});

const employeeIdInput = document.getElementById('reg-employee-id');
if (employeeIdInput) {
    employeeIdInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D+/g, '');
    });
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
        registerSubmitLabel.textContent = isLoading ? 'SENDING VERIFICATION...' : 'SEND VERIFICATION EMAIL';
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
    const first_name = document.getElementById('reg-first-name').value.trim();
    const middle_name = document.getElementById('reg-middle-name').value.trim();
    const last_name = document.getElementById('reg-last-name').value.trim();
    const birthday = document.getElementById('reg-birthday').value;
    const gender = document.getElementById('reg-gender').value;
    const employee_id = document.getElementById('reg-employee-id').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const role = document.getElementById('reg-role').value;
    
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

    if (!validateName(first_name) || !validateName(middle_name) || !validateName(last_name)) {
        err.textContent = 'Name fields must contain letters only.';
        err.style.display = 'block';
        return;
    }

    if (!validateNumericString(employee_id)) {
        err.textContent = 'Employee ID must contain numbers only.';
        err.style.display = 'block';
        return;
    }

    if (!first_name || !middle_name || !last_name || !birthday || !gender || !employee_id || !role) {
        err.textContent = 'Please complete all required registration fields.';
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
                first_name,
                middle_name,
                last_name,
                birthday,
                gender,
                employee_id,
                email,
                role
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success modal
            document.getElementById('register-form').reset();
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
    const role = document.getElementById('role').value;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const err = document.getElementById('login-error');

    err.style.display = 'none';

    if (!role || !username || !password) {
        err.textContent = 'Please select a role and enter username and password.';
        err.style.display = 'block';
        return;
    }

    setLoginLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/staff/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, username, password })
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
