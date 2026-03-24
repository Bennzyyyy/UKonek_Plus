const sidebar = document.getElementById('sidebar');
const burger = document.getElementById('burger');

// Handle port mismatch during development (Live Server on 5500, Backend on 5000)
const API_BASE = window.location.port === '5500'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '';

function showToast(message, type = 'info') {
  const containerId = 'toast-container';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 240);
  }, 4200);
}

function state() {
  if (!sidebar) return;
  const collapsed = sidebar.classList.contains('collapsed');
  const slid = sidebar.classList.contains('slid');
  burger.textContent = (slid || !collapsed) ? '←' : '☰';
}

if (burger) {
  burger.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      sidebar.classList.toggle('slid');
      sidebar.classList.remove('collapsed');
    } else {
      sidebar.classList.toggle('collapsed');
    }
    state();
  });
  window.addEventListener('resize', state);
}



document.addEventListener('click', (e) => {
  if (window.innerWidth <= 900 && sidebar && sidebar.classList.contains('slid')) {
    const inside = sidebar.contains(e.target) || (burger && burger.contains(e.target));
    if (!inside) {
      sidebar.classList.remove('slid');
      state();
    }
  }
});

state();

async function performLogout() {
  try {
    await fetch(`${API_BASE}/api/staff/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    window.location.replace('./index.html');
  }
}

const logoutBtn = document.getElementById('logout-btn');
const logoutConfirmModal = document.getElementById('logout-confirm-modal');
const logoutConfirmYesBtn = document.getElementById('logout-confirm-yes');
const logoutConfirmNoBtn = document.getElementById('logout-confirm-no');

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (logoutConfirmModal) {
      logoutConfirmModal.style.display = 'flex';
      return;
    }
    performLogout();
  });
}

if (logoutConfirmYesBtn) {
  logoutConfirmYesBtn.addEventListener('click', () => {
    if (logoutConfirmModal) {
      logoutConfirmModal.style.display = 'none';
    }
    performLogout();
  });
}

if (logoutConfirmNoBtn) {
  logoutConfirmNoBtn.addEventListener('click', () => {
    if (logoutConfirmModal) {
      logoutConfirmModal.style.display = 'none';
    }
  });
}

async function ensureAuthenticatedSession() {
  try {
    const response = await fetch(`${API_BASE}/api/staff/session`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      // Do not redirect automatically — return null and let caller handle it.
      return null;
    }

    const sessionData = await response.json().catch(() => null);
    return sessionData?.user || null;
  } catch (error) {
    console.error('Session check failed:', error);
    // Suppress automatic redirect here; caller will decide next steps.
    return null;
  }
}

function isAdminUser(user) {
  return String(user?.role || '').trim().toLowerCase() === 'admin';
}

function toTitleCase(value) {
  const lower = String(value || '').trim().toLowerCase();
  if (!lower) return 'Unknown';
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getDisplayFirstName(user) {
  const preferred =
    user?.first_name ||
    user?.firstName ||
    user?.firstname;

  if (preferred && String(preferred).trim()) {
    return String(preferred).trim();
  }

  return String(user?.username || '').trim() || 'User';
}

function updateNonAdminWorkspace(user) {
  const role = String(user?.role || '').trim().toLowerCase();
  const roleTitle = toTitleCase(role);

  const titleNode = document.getElementById('non-admin-title');
  if (titleNode) titleNode.textContent = `${roleTitle} Workspace`;

  const subtitleNode = document.getElementById('non-admin-subtitle');
  if (subtitleNode) {
    subtitleNode.textContent = role === 'doctor'
      ? 'Track your daily clinical tasks and coordinate with the admin team for account-related requests.'
      : 'Track your daily operations and coordinate with the admin team for account-related requests.';
  }

  const permissionsNode = document.getElementById('non-admin-permissions');
  if (permissionsNode) {
    permissionsNode.textContent = 'Admin Command Center modules are restricted to admin accounts. Your role can continue using non-admin workspace functions.';
  }

  const usernameNode = document.getElementById('non-admin-username');
  if (usernameNode) usernameNode.textContent = user?.username || '—';

  const roleNode = document.getElementById('non-admin-role');
  if (roleNode) roleNode.textContent = roleTitle;

  const emailNode = document.getElementById('non-admin-email');
  if (emailNode) emailNode.textContent = user?.email || '—';
}

function applyRoleAccess(user) {
  const adminAccess = isAdminUser(user);
  if (!adminAccess) {
    document.querySelectorAll('.admin-only').forEach((element) => {
      element.classList.add('hidden');
    });
  }

  const userNameNode = document.querySelector('.user-name');
  if (userNameNode) {
    userNameNode.textContent = getDisplayFirstName(user);
  }

  const userRoleNode = document.querySelector('.user-pos');
  if (userRoleNode) {
    const roleText = String(user?.role || 'Staff');
    userRoleNode.textContent = roleText.charAt(0).toUpperCase() + roleText.slice(1);
  }

  const nonAdminSection = document.getElementById('non-admin-section');
  if (adminAccess) {
    if (nonAdminSection) nonAdminSection.classList.add('hidden');
    return;
  }

  hideAllSections();
  clearActiveNav();
  updateNonAdminWorkspace(user);
  if (nonAdminSection) nonAdminSection.classList.remove('hidden');
}

window.addEventListener('pageshow', async (event) => {
  const navEntries = performance.getEntriesByType('navigation');
  const navType = navEntries && navEntries.length > 0 ? navEntries[0].type : '';
  const restoredFromHistory = event.persisted || navType === 'back_forward';
  if (!restoredFromHistory) {
    return;
  }

  const sessionUser = await ensureAuthenticatedSession();
  if (sessionUser) {
    applyRoleAccess(sessionUser);
  }
});

// Search input handler
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) console.log('Search:', q);
    }
  });
}

// Dropdown toggle for each nav button (supports multiple dropdowns)
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach(btn => {
  const parent = btn.closest('.nav-item');
  const menu = parent ? parent.querySelector('.dropdown-menu') : null;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    // close other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });

    // Toggle dropdown if present
    if (menu) menu.classList.toggle('hidden');

    // If this nav button has a data-section, also open that section
    const section = btn.getAttribute('data-section');
    if (section) {
      hideAllSections();
      clearActiveNav();
      btn.classList.add('is-active');
      if (section === 'dashboard' && dashboardSection) dashboardSection.classList.remove('hidden');
      else if (section === 'reports' && reportsSection) reportsSection.classList.remove('hidden');
    }
  });
});

// Registration handlers from script.js (adapted for dashboard)
const EYE_OPEN_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12 5c-5.5 0-9.3 4.1-10.7 6.1a1.5 1.5 0 0 0 0 1.8C2.7 14.9 6.5 19 12 19s9.3-4.1 10.7-6.1a1.5 1.5 0 0 0 0-1.8C21.3 9.1 17.5 5 12 5zm0 11a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
</svg>`;

const EYE_CLOSED_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M2.3 1.3a1 1 0 0 0-1.4 1.4l3 3A13.8 13.8 0 0 0 1.3 11a1.5 1.5 0 0 0 0 1.8C2.7 14.9 6.5 19 12 19a12 12 0 0 0 4.6-.9l3.1 3.1a1 1 0 1 0 1.4-1.4zm7.5 10.3a2.5 2.5 0 0 0 3.6 2.4l-3.5-3.5c0 .4-.1.7-.1 1.1zM12 7a5 5 0 0 1 5 5c0 .7-.1 1.3-.4 1.9l1.5 1.5a13.8 13.8 0 0 0 4.6-4.4 1.5 1.5 0 0 0 0-1.8C21.3 9.1 17.5 5 12 5c-1.4 0-2.7.3-3.8.8l1.5 1.5c.6-.2 1.5-.3 2.3-.3z"/>
</svg>`;

function setupPasswordVisibilityToggles(root = document) {
  const passwordInputs = root.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    if (input.dataset.toggleAttached === 'true') return;
    const wrapper = document.createElement('div');
    wrapper.className = 'password-input-wrap';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle';
    toggleBtn.setAttribute('aria-label', 'Show password');
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.innerHTML = EYE_OPEN_ICON;
    toggleBtn.addEventListener('click', () => {
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      toggleBtn.innerHTML = showPassword ? EYE_CLOSED_ICON : EYE_OPEN_ICON;
      toggleBtn.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
      toggleBtn.setAttribute('aria-pressed', showPassword ? 'true' : 'false');
    });
    wrapper.appendChild(toggleBtn);
    input.dataset.toggleAttached = 'true';
  });
}

let pendingRegistrationProfile = null;

// --- ADD THESE MISSING DEFINITIONS AT THE TOP OF YOUR SCRIPT ---
const registerForm = document.getElementById('register-form');
const registerSubmitBtn = document.getElementById('register-submit-btn');
const registerOtpModal = document.getElementById('register-otp-modal');
const registerOtpForm = document.getElementById('register-otp-form');
const otpModalCloseBtn = document.getElementById('otp-modal-close-btn');
const otpCompleteBtn = document.getElementById('otp-complete-btn');
const registrationSuccessModal = document.getElementById('registration-success-modal');
const regSuccessDashboardBtn = document.getElementById('reg-success-dashboard-btn');
const regSuccessUsersBtn = document.getElementById('reg-success-users-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const registerResendOtpBtn = document.getElementById('register-resend-otp-btn');

// --- FIXED REGISTRATION HANDLER ---
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get values
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

    err.style.display = 'none';
    if (!first_name || !last_name || !email || !role) {
      err.textContent = 'Please fill in all required fields.';
      err.style.display = 'block';
      return;
    }

    // Visual feedback
    registerSubmitBtn.disabled = true;
    const label = registerSubmitBtn.querySelector('.btn-label');
    if (label) label.textContent = 'SENDING OTP...';

    try {
      const response = await fetch(`${API_BASE}/api/staff/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, middle_name, last_name, birthday, gender, employee_id, email, role }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');

      pendingRegistrationProfile = { first_name, middle_name, last_name, birthday, gender, employee_id, email, role };

      // Open OTP Modal
      if (registerOtpModal) registerOtpModal.classList.remove('hidden');
      showToast('OTP sent to email', 'info');

    } catch (error) {
      err.textContent = error.message;
      err.style.display = 'block';
    } finally {
      registerSubmitBtn.disabled = false;
      if (label) label.textContent = 'SEND OTP';
    }
  });
}

// OTP Modal handlers
if (otpModalCloseBtn) {
  otpModalCloseBtn.addEventListener('click', () => {
    if (registerOtpModal) registerOtpModal.classList.add('hidden');
  });
}

if (registerOtpModal) {
  registerOtpModal.addEventListener('click', (event) => {
    if (event.target === registerOtpModal) {
      registerOtpModal.classList.add('hidden');
    }
  });
}

if (registerOtpForm) {
  registerOtpForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const otpModalError = document.getElementById('otp-modal-error');
    const otpModalSuccess = document.getElementById('otp-modal-success');
    const otp = document.getElementById('reg-otp').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const consentGiven = document.getElementById('reg-consent').checked;

    if (otpModalError) otpModalError.style.display = 'none';
    if (otpModalSuccess) otpModalSuccess.style.display = 'none';

    if (!pendingRegistrationProfile || !pendingRegistrationProfile.email) {
      if (otpModalError) {
        otpModalError.textContent = 'No active registration request found. Please send OTP again.';
        otpModalError.style.display = 'block';
      }
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      if (otpModalError) {
        otpModalError.textContent = 'Please enter a valid 6-digit OTP.';
        otpModalError.style.display = 'block';
      }
      return;
    }

    if (!username || !password || !confirmPassword) {
      if (otpModalError) {
        otpModalError.textContent = 'Username, password, and confirm password are required.';
        otpModalError.style.display = 'block';
      }
      return;
    }

    if (password !== confirmPassword) {
      if (otpModalError) {
        otpModalError.textContent = 'Passwords do not match.';
        otpModalError.style.display = 'block';
      }
      return;
    }

    if (!consentGiven) {
      if (otpModalError) {
        otpModalError.textContent = 'Consent is required to continue.';
        otpModalError.style.display = 'block';
      }
      return;
    }

    otpCompleteBtn.disabled = true;
    const otpLabel = otpCompleteBtn.querySelector('.btn-label');
    if (otpLabel) otpLabel.textContent = 'CREATING ACCOUNT...';

    try {
      const completeResponse = await fetch(`${API_BASE}/api/staff/complete-registration`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingRegistrationProfile.email,
          otp,
          username,
          password,
          confirmPassword,
          consentGiven
        })
      });

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        if (otpModalError) {
          otpModalError.textContent = completeData.message || 'Unable to complete registration.';
          otpModalError.style.display = 'block';
        }
        return;
      }

      if (registerOtpModal) registerOtpModal.classList.add('hidden');
      registerForm.reset();
      registerOtpForm.reset();
      pendingRegistrationProfile = null;

      if (registrationSuccessModal) registrationSuccessModal.classList.remove('hidden');
    } catch (error) {
      console.error('Error:', error);
      if (otpModalError) {
        otpModalError.textContent = 'Server connection failed.';
        otpModalError.style.display = 'block';
      }
    } finally {
      otpCompleteBtn.disabled = false;
      if (otpLabel) otpLabel.textContent = 'COMPLETE REGISTRATION';
    }
  });
}

// Resend OTP
if (registerResendOtpBtn) {
  registerResendOtpBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    if (registerResendOtpBtn.getAttribute('aria-disabled') === 'true') return;

    const err = document.getElementById('register-error');
    const otpModalError = document.getElementById('otp-modal-error');
    const otpModalSuccess = document.getElementById('otp-modal-success');

    if (!pendingRegistrationProfile) {
      if (otpModalError) {
        otpModalError.textContent = 'No active registration request found. Please send OTP again.';
        otpModalError.style.display = 'block';
      }
      return;
    }

    err.style.display = 'none';
    if (otpModalError) otpModalError.style.display = 'none';
    if (otpModalSuccess) otpModalSuccess.style.display = 'none';

    registerResendOtpBtn.setAttribute('aria-disabled', 'true');
    registerResendOtpBtn.style.pointerEvents = 'none';
    registerResendOtpBtn.style.opacity = '0.65';
    registerResendOtpBtn.textContent = 'Sending...';

    try {
      const response = await fetch(`${API_BASE}/api/staff/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingRegistrationProfile)
      });
      const data = await response.json();

      if (!response.ok) {
        if (otpModalError) {
          otpModalError.textContent = data.message || 'Failed to resend OTP.';
          otpModalError.style.display = 'block';
        }
        return;
      }

      if (otpModalSuccess) {
        otpModalSuccess.style.display = 'block';
        otpModalSuccess.textContent = data.message || 'OTP resent. Please check email.';
      }
    } catch (error) {
      console.error('Error:', error);
      if (otpModalError) {
        otpModalError.textContent = 'Server connection failed.';
        otpModalError.style.display = 'block';
      }
    } finally {
      registerResendOtpBtn.setAttribute('aria-disabled', 'false');
      registerResendOtpBtn.style.pointerEvents = '';
      registerResendOtpBtn.style.opacity = '';
      registerResendOtpBtn.textContent = 'Resend OTP';
    }
  });
}

// Success modal buttons
if (regSuccessDashboardBtn) {
  regSuccessDashboardBtn.addEventListener('click', () => {
    if (registrationSuccessModal) registrationSuccessModal.classList.add('hidden');
    hideAllSections();
    if (dashboardSection) dashboardSection.classList.remove('hidden');
  });
}

if (regSuccessUsersBtn) {
  regSuccessUsersBtn.addEventListener('click', () => {
    if (registrationSuccessModal) registrationSuccessModal.classList.add('hidden');
    openUsersSubsection('account-management');
  });
}

// Back to dashboard
if (backToDashboardBtn) {
  backToDashboardBtn.addEventListener('click', () => {
    hideAllSections();
    if (dashboardSection) dashboardSection.classList.remove('hidden');
  });
}

// Name field validation (letters only)
['reg-first-name', 'reg-middle-name', 'reg-last-name'].forEach(fieldId => {
  const input = document.getElementById(fieldId);
  if (input) {
    input.addEventListener('input', function () {
      this.value = this.value.replace(/\d+/g, '');
    });
  }
});

// Employee ID numeric only
const employeeIdInput = document.getElementById('reg-employee-id');
if (employeeIdInput) {
  employeeIdInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D+/g, '');
  });
}

// Email validation
const emailInput = document.getElementById('reg-email');
if (emailInput) {
  emailInput.addEventListener('blur', function () {
    const emailError = document.getElementById('err-reg-email');
    const email = this.value.trim();
    if (!email) {
      if (emailError) emailError.classList.add('hidden');
      return;
    }
    if (!validateEmail(email)) {
      if (emailError) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.classList.remove('hidden');
      }
    } else {
      if (emailError) emailError.classList.add('hidden');
    }
  });
}

// Password toggles
setupPasswordVisibilityToggles();

// Init registration section handlers after DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupPasswordVisibilityToggles();
});



// Section navigation
// Only attach the generic anchor-based nav handler to top-level <a> links
// (exclude dropdown items which have their own handlers).
const navLinks = document.querySelectorAll('a[data-section]:not(.dropdown-item)');
const dropdownItems = document.querySelectorAll('.dropdown-item');
const dashboardSection = document.getElementById('dashboard-section');
const usersSection = document.getElementById('users-section');
const newRegistrationSection = document.getElementById('new-registration');
const reportsSection = document.getElementById('reports-section');


const statTotalStaff = document.getElementById('stat-total-staff');
const statPendingStaff = document.getElementById('stat-pending-staff');
const statDoctors = document.getElementById('stat-doctors');
const statActiveStaff = document.getElementById('stat-active-staff');
const statAnnouncements = document.getElementById('stat-announcements');
const statReports = document.getElementById('stat-reports');
const statCitizens = document.getElementById('stat-citizens');
const dashboardPendingPreview = document.getElementById('dashboard-pending-preview');
const dashboardActivePreview = document.getElementById('dashboard-active-preview');
const dashboardLastSync = document.getElementById('dashboard-last-sync');

const dashRefreshBtn = document.getElementById('dash-refresh-btn');
const dashOpenPendingBtn = document.getElementById('dash-open-pending-btn');
const refreshAccountsBtn = document.getElementById('refresh-accounts-btn');
const citizensTbody = document.getElementById('citizens-tbody');
const citizensPane = document.getElementById('citizens-pane');

function hideAllSections() {
  if (dashboardSection) dashboardSection.classList.add('hidden');
  if (usersSection) usersSection.classList.add('hidden');
  if (reportsSection) reportsSection.classList.add('hidden');
  const nonAdminSection = document.getElementById('non-admin-section');
  if (nonAdminSection) nonAdminSection.classList.add('hidden');
  // Hide all subsections
  const accountMgmt = document.getElementById('account-management');
  if (accountMgmt) accountMgmt.classList.add('hidden');
  if (newRegistrationSection) newRegistrationSection.classList.add('hidden');
}


function clearActiveNav() {
  navLinks.forEach((link) => link.classList.remove('is-active'));
  // clear any active nav-buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('is-active'));
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.getAttribute('data-section');
    hideAllSections();
    clearActiveNav();
    link.classList.add('is-active');
    if (section === 'dashboard' && dashboardSection) {
      dashboardSection.classList.remove('hidden');
    } else if (section === 'reports' && reportsSection) {
      reportsSection.classList.remove('hidden');
    }
    // ensure all dropdown menus are closed
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
  });
});

// Reports tabs switching
const tabFeedback = document.getElementById('tab-feedback');
const tabAnnouncements = document.getElementById('tab-announcements');
const feedbackPane = document.getElementById('feedback-pane');
const announcementsPane = document.getElementById('announcements-pane');
if (tabFeedback && tabAnnouncements && feedbackPane && announcementsPane) {
  tabFeedback.addEventListener('click', () => {
    tabFeedback.classList.add('active');
    tabAnnouncements.classList.remove('active');
    feedbackPane.classList.remove('hidden');
    announcementsPane.classList.add('hidden');
  });
  tabAnnouncements.addEventListener('click', () => {
    tabAnnouncements.classList.add('active');
    tabFeedback.classList.remove('active');
    announcementsPane.classList.remove('hidden');
    feedbackPane.classList.add('hidden');
  });
}

// Reports refresh button
const reportsRefreshBtn = document.getElementById('reports-refresh-btn');
if (reportsRefreshBtn) {
  reportsRefreshBtn.addEventListener('click', () => {
    showToast('Reports data refreshed (placeholder).', 'info');
  });
}

// Create announcement modal handlers
const createAnnouncementBtn = document.getElementById('create-announcement-btn');
const createAnnouncementModal = document.getElementById('create-announcement-modal');
const createAnnouncementForm = document.getElementById('create-announcement-form');
const annSubmitBtn = document.getElementById('ann-submit-btn');
const annCancelBtn = document.getElementById('ann-cancel-btn');
const annFormError = document.getElementById('ann-form-error');

if (createAnnouncementBtn && createAnnouncementModal) {
  createAnnouncementBtn.addEventListener('click', () => {
    createAnnouncementModal.classList.remove('hidden');
  });
}

if (annCancelBtn && createAnnouncementModal) {
  annCancelBtn.addEventListener('click', () => {
    createAnnouncementModal.classList.add('hidden');
    if (createAnnouncementForm) createAnnouncementForm.reset();
    if (annFormError) annFormError.style.display = 'none';
  });
}

if (createAnnouncementModal) {
  createAnnouncementModal.addEventListener('click', (e) => {
    if (e.target === createAnnouncementModal) {
      createAnnouncementModal.classList.add('hidden');
      if (createAnnouncementForm) createAnnouncementForm.reset();
      if (annFormError) annFormError.style.display = 'none';
    }
  });
}

if (createAnnouncementForm && annSubmitBtn) {
  createAnnouncementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ann-title').value.trim();
    const content = document.getElementById('ann-content').value.trim();

    if (!title || !content) {
      if (annFormError) {
        annFormError.textContent = 'Title and content are required.';
        annFormError.style.display = 'block';
      }
      return;
    }

    annSubmitBtn.disabled = true;
    const spinner = annSubmitBtn.querySelector('.btn-spinner');
    const label = annSubmitBtn.querySelector('.btn-label');
    if (spinner) spinner.style.display = 'inline-block';
    if (label) label.textContent = 'PUBLISHING...';

    // Placeholder API call
    try {
      showToast('Announcement created successfully (placeholder).', 'success');
      if (createAnnouncementModal) createAnnouncementModal.classList.add('hidden');
      createAnnouncementForm.reset();
    } catch (error) {
      console.error('Error:', error);
      if (annFormError) {
        annFormError.textContent = 'Failed to create announcement.';
        annFormError.style.display = 'block';
      }
    } finally {
      annSubmitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (label) label.textContent = 'PUBLISH ANNOUNCEMENT';
    }
  });
}

// Top-right quick create announcement button (same modal)
const createAnnouncementTopBtn = document.getElementById('create-announcement-topright');
if (createAnnouncementTopBtn && createAnnouncementModal) {
  createAnnouncementTopBtn.addEventListener('click', () => {
    createAnnouncementModal.classList.remove('hidden');
  });
}

// Announcement detail modal logic
const announcementDetailModal = document.getElementById('announcement-detail-modal');
const announcementDetailClose = document.getElementById('announcement-detail-close');
const announcementDetailTitle = document.getElementById('announcement-detail-title');
const announcementDetailBody = document.getElementById('announcement-detail-body');
const announcementDetailDate = document.getElementById('announcement-detail-date');

function openAnnouncementDetail(row) {
  const cells = row.querySelectorAll('td');
  const title = cells[0]?.innerText.trim() || 'Announcement';
  const preview = cells[1]?.innerText.trim() || '';
  const date = cells[2]?.innerText.trim() || '';
  if (announcementDetailTitle) announcementDetailTitle.textContent = title;
  if (announcementDetailBody) announcementDetailBody.textContent = preview;
  if (announcementDetailDate) announcementDetailDate.textContent = date;
  if (announcementDetailModal) announcementDetailModal.classList.remove('hidden');
}

document.querySelectorAll('.announcement-row').forEach(row => {
  row.style.cursor = 'pointer';
  row.addEventListener('click', () => openAnnouncementDetail(row));
});

if (announcementDetailModal) {
  announcementDetailModal.addEventListener('click', (e) => {
    if (e.target === announcementDetailModal || e.target.classList.contains('modal-close')) {
      announcementDetailModal.classList.add('hidden');
    }
  });
}
if (announcementDetailClose) announcementDetailClose.addEventListener('click', () => announcementDetailModal.classList.add('hidden'));



dropdownItems.forEach(item => {
  item.addEventListener('click', (e) => {
    // Prevent other handlers (including generic nav handlers) from interfering
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    const section = item.getAttribute('data-section');
    hideAllSections();
    clearActiveNav();

    // Close all dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));

    // Activate parent nav button if present
    const parentNavItem = item.closest('.nav-item');
    const parentNavBtn = parentNavItem ? parentNavItem.querySelector('.nav-btn') : null;
    if (parentNavBtn) parentNavBtn.classList.add('is-active');

    // Users submenu handling
    if (section === 'account-management' || section === 'new-registration') {
      if (usersSection) usersSection.classList.remove('hidden');
      const subsection = document.getElementById(section);
      if (subsection) subsection.classList.remove('hidden');
      // Ensure account management hidden when opening user registration
      const accountMgmt = document.getElementById('account-management');
      if (section === 'new-registration' && accountMgmt) accountMgmt.classList.add('hidden');
      if (section === 'account-management' && accountMgmt) accountMgmt.classList.remove('hidden');
      return;
    }

    // Reports submenu handling: show reports and switch panes
    if (section === 'announcements-pane' || section === 'feedback-pane') {
      if (reportsSection) reportsSection.classList.remove('hidden');

      // Prefer triggering the tab click handlers (they handle classes + pane visibility)
      if (section === 'announcements-pane') {
        if (tabAnnouncements && typeof tabAnnouncements.click === 'function') {
          tabAnnouncements.click();
        } else {
          if (tabAnnouncements) tabAnnouncements.classList.add('active');
          if (tabFeedback) tabFeedback.classList.remove('active');
          if (announcementsPane) announcementsPane.classList.remove('hidden');
          if (feedbackPane) feedbackPane.classList.add('hidden');
        }
      } else {
        if (tabFeedback && typeof tabFeedback.click === 'function') {
          tabFeedback.click();
        } else {
          if (tabFeedback) tabFeedback.classList.add('active');
          if (tabAnnouncements) tabAnnouncements.classList.remove('active');
          if (feedbackPane) feedbackPane.classList.remove('hidden');
          if (announcementsPane) announcementsPane.classList.add('hidden');
        }
      }
      return;
    }

    // Generic subsection open
    const subsection = document.getElementById(section);
    if (subsection) subsection.classList.remove('hidden');
  });
});

const dashboardLink = document.querySelector('.nav-item[data-section="dashboard"]');
if (dashboardLink && !dashboardLink.classList.contains('hidden')) {
  dashboardLink.classList.add('is-active');
}

// Stored accounts (identifier -> account data)
const storedAccounts = new Map();
let latestStaffList = [];
let latestPendingList = [];
let latestCitizensList = [];

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function renderDashboardInsights() {
  if (statTotalStaff) statTotalStaff.textContent = String(latestStaffList.length);
  if (statPendingStaff) statPendingStaff.textContent = String(latestPendingList.length);

  // Announcements count (read from localStorage if present)
  try {
    const raw = localStorage.getItem('ukonek_announcements');
    const anns = raw ? JSON.parse(raw) : [];
    if (statAnnouncements) statAnnouncements.textContent = String(Array.isArray(anns) ? anns.length : 0);
  } catch (err) {
    if (statAnnouncements) statAnnouncements.textContent = '0';
  }

  // Reports / feedback count (count rows in feedback table)
  try {
    const feedbackRows = document.querySelectorAll('#feedback-tbody tr');
    if (statReports) statReports.textContent = String(feedbackRows ? feedbackRows.length : 0);
  } catch (err) {
    if (statReports) statReports.textContent = '0';
  }

  // Citizens count
  if (statCitizens) statCitizens.textContent = String(latestCitizensList.length || 0);

  const doctorsCount = latestStaffList.filter((user) => String(user.role || '').toLowerCase() === 'doctor').length;
  if (statDoctors) statDoctors.textContent = String(doctorsCount);

  const activeCount = latestStaffList.filter((user) => String(user.status || '').toLowerCase() === 'active').length;
  if (statActiveStaff) statActiveStaff.textContent = String(activeCount);

  if (dashboardPendingPreview) {
    const rows = latestPendingList.slice(0, 5);
    dashboardPendingPreview.innerHTML = rows.length
      ? rows.map((user) => `
          <tr>
            <td class="table-cell">${user.username || '—'}</td>
            <td class="table-cell">${user.employee_id || '—'}</td>
            <td class="table-cell">${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—'}</td>
            <td class="table-cell">${formatDateTime(user.created_at)}</td>
          </tr>
        `).join('')
      : '<tr><td class="table-cell" colspan="4">No pending registrations.</td></tr>';
  }

  if (dashboardActivePreview) {
    const rows = latestStaffList.slice(0, 5);
    dashboardActivePreview.innerHTML = rows.length
      ? rows.map((user) => `
          <tr>
            <td class="table-cell">${user.username || '—'}</td>
            <td class="table-cell">${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—'}</td>
            <td class="table-cell"><span class="badge-${String(user.status || '').toLowerCase()}">${user.status || '—'}</span></td>
            <td class="table-cell">${formatDateTime(user.created_at)}</td>
          </tr>
        `).join('')
      : '<tr><td class="table-cell" colspan="4">No active accounts found.</td></tr>';
  }

  if (dashboardLastSync) {
    dashboardLastSync.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
  }
}

// Load citizens (mobile app users)
async function loadCitizenData() {
  try {
    // Attempt to fetch from API; fallback to empty list
    const response = await fetch(`${API_BASE}/api/citizens`, { credentials: 'include' });
    let list = [];
    if (response && response.ok) {
      list = await response.json();
    }
    latestCitizensList = Array.isArray(list) ? list : [];

    if (citizensTbody) {
      citizensTbody.innerHTML = '';
      if (latestCitizensList.length === 0) {
        citizensTbody.innerHTML = '<tr><td class="table-cell" colspan="4">No citizen accounts found.</td></tr>';
      } else {
        latestCitizensList.forEach(user => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="table-cell">${user.username || user.name || '—'}</td>
            <td class="table-cell">${user.email || '—'}</td>
            <td class="table-cell">${user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</td>
            <td class="table-cell">${user.status || '—'}</td>
          `;
          citizensTbody.appendChild(row);
        });
      }
    }
  } catch (error) {
    console.error('Error loading citizens:', error);
    latestCitizensList = [];
    if (citizensTbody) citizensTbody.innerHTML = '<tr><td class="table-cell" colspan="4">Unable to load citizens.</td></tr>';
  }
}

function openUsersSubsection(subsectionId) {
  hideAllSections();
  if (usersSection) usersSection.classList.remove('hidden');
  const subsection = document.getElementById(subsectionId);
  if (subsection) subsection.classList.remove('hidden');
}

async function loadStaffData() {
  try {
    const response = await fetch(`${API_BASE}/api/staff`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch staff');
    const staffList = await response.json();
    latestStaffList = staffList;

    const accountsTbody = document.getElementById('accounts-tbody');
    if (accountsTbody) {
      accountsTbody.innerHTML = ''; // Clear hardcoded rows
      staffList.forEach(user => {
        const identifier = user.username || user.employee_id;
        storedAccounts.set(identifier, user);

        const row = document.createElement('tr');
        row.className = 'account-row';
        row.setAttribute('data-role', user.role.toLowerCase());
        row.setAttribute('data-id', identifier); // Store identifier for lookup
        row.innerHTML = `
                    <td class="table-cell">${user.username || '—'}</td>
                    <td class="table-cell">${user.employee_id || '—'}</td>
                    <td class="table-cell">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                    <td class="table-cell"><span class="badge-${user.status.toLowerCase()}">${user.status}</span></td>
                `;
        accountsTbody.appendChild(row);
        attachAccountRowListener(row);
      });
    }

    renderDashboardInsights();
  } catch (error) {
    console.error('Error loading staff:', error);
  }
}

async function loadPendingStaffData() {
  try {
    const response = await fetch(`${API_BASE}/api/staff/pending`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch pending staff');
    const pendingList = await response.json();
    latestPendingList = pendingList;

    const pendingTbody = document.getElementById('pending-tbody');
    if (pendingTbody) {
      pendingTbody.innerHTML = '';
      pendingList.forEach(user => {
        const identifier = user.username || user.employee_id;
        storedAccounts.set(identifier, user);

        const row = document.createElement('tr');
        row.className = 'pending-row';
        row.setAttribute('data-role', user.role.toLowerCase());
        row.setAttribute('data-id', identifier);
        row.innerHTML = `
                    <td class="table-cell">${user.username || '—'}</td>
                    <td class="table-cell">${user.employee_id || '—'}</td>
                    <td class="table-cell">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                    <td class="table-cell">${new Date(user.created_at).toLocaleString()}</td>
                `;
        pendingTbody.appendChild(row);
        attachPendingRowListener(row);
      });
    }

    renderDashboardInsights();
  } catch (error) {
    console.error('Error loading pending staff:', error);
  }
}

// Initial load (after auth check)
async function initDashboardData() {
  const sessionUser = await ensureAuthenticatedSession();
  if (!sessionUser) return;

  applyRoleAccess(sessionUser);

  if (!isAdminUser(sessionUser)) {
    return;
  }

  if (dashboardSection) dashboardSection.classList.remove('hidden');
  if (dashboardLink) dashboardLink.classList.add('is-active');
  await Promise.all([loadStaffData(), loadPendingStaffData(), loadCitizenData()]);
  // Refresh counts after all data loaded
  renderDashboardInsights();
}

initDashboardData();

if (dashRefreshBtn) {
  dashRefreshBtn.addEventListener('click', async () => {
    await Promise.all([loadStaffData(), loadPendingStaffData(), loadCitizenData()]);
    showToast('Dashboard data refreshed.', 'info');
  });
}

if (dashOpenPendingBtn) {
  dashOpenPendingBtn.addEventListener('click', () => {
    openUsersSubsection('account-management');
    if (tabPending) tabPending.click();
  });
}

if (refreshAccountsBtn) {
  refreshAccountsBtn.addEventListener('click', async () => {
    await Promise.all([loadStaffData(), loadPendingStaffData(), loadCitizenData()]);
    showToast('Account tables refreshed.', 'info');
  });
}

// Utility validation functions
function validateEmail(email) {
  return /.+@.+\..+/.test(email);
}

// Role filter functionality
const roleFilter = document.getElementById('role-filter');
if (roleFilter) {
  roleFilter.addEventListener('change', (e) => {
    const filterValue = e.target.value.toLowerCase();
    const accountRows = document.querySelectorAll('.account-row');

    accountRows.forEach(row => {
      const role = row.getAttribute('data-role');
      if (filterValue === '' || role === filterValue) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
}

// Modal state
let currentAccountData = null;
let currentAction = null; // 'edit' or 'delete'

// Account row click handler
function attachAccountRowListener(row) {
  row.addEventListener('click', () => {
    const identifier = row.getAttribute('data-id');
    const user = storedAccounts.get(identifier);
    if (!user) return;

    currentAccountData = { ...user };

    const firstName = String(user.first_name || '').trim();
    const lastName = String(user.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
    const birthdayValue = user.birthday ? new Date(user.birthday) : null;
    const birthdayText = birthdayValue && !Number.isNaN(birthdayValue.getTime())
      ? birthdayValue.toLocaleDateString()
      : '—';

    // Populate modal
    document.getElementById('modal-name').textContent = fullName || user.username || '—';
    document.getElementById('modal-email').textContent = user.email || '—';
    document.getElementById('modal-role').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('modal-status').textContent = user.status;
    document.getElementById('modal-contact').textContent = user.employee_id || '—';
    document.getElementById('modal-bday').textContent = birthdayText;

    // Hide/clear extra fields that don't exist in our schema
    const extraFields = ['address'];
    extraFields.forEach(field => {
      const el = document.getElementById(`modal-${field}`);
      if (el) el.textContent = user[field] || '—';
    });

    // Reset confirmation section
    document.getElementById('modal-confirm-section').style.display = 'none';
    document.getElementById('modal-actions').style.display = 'flex';

    // Show modal
    const modal = document.getElementById('account-modal');
    modal.style.display = 'flex';
  });
}

// Attach listeners to existing account rows
document.querySelectorAll('.account-row').forEach(attachAccountRowListener);

// attach listeners to any existing pending rows (none initially)
document.querySelectorAll('.pending-row').forEach(attachPendingRowListener);

// Tab switching (Registered / Pending / Citizens)
const tabRegistered = document.getElementById('tab-registered');
const tabPending = document.getElementById('tab-pending');
const tabCitizens = document.getElementById('tab-citizens');
const registeredPane = document.getElementById('registered-pane');
const pendingPane = document.getElementById('pending-pane');
const citizensPaneEl = document.getElementById('citizens-pane');
if (tabRegistered && tabPending && registeredPane && pendingPane && tabCitizens && citizensPaneEl) {
  tabRegistered.addEventListener('click', () => {
    tabRegistered.classList.add('active');
    tabPending.classList.remove('active');
    tabCitizens.classList.remove('active');
    registeredPane.classList.remove('hidden');
    pendingPane.classList.add('hidden');
    citizensPaneEl.classList.add('hidden');
  });
  tabPending.addEventListener('click', () => {
    tabPending.classList.add('active');
    tabRegistered.classList.remove('active');
    tabCitizens.classList.remove('active');
    pendingPane.classList.remove('hidden');
    registeredPane.classList.add('hidden');
    citizensPaneEl.classList.add('hidden');
  });
  tabCitizens.addEventListener('click', () => {
    tabCitizens.classList.add('active');
    tabRegistered.classList.remove('active');
    tabPending.classList.remove('active');
    citizensPaneEl.classList.remove('hidden');
    registeredPane.classList.add('hidden');
    pendingPane.classList.add('hidden');
  });
}

// Pending modal logic
function attachPendingRowListener(row) {
  row.addEventListener('click', () => {
    const identifier = row.getAttribute('data-id');
    const stored = storedAccounts.get(identifier);
    if (!stored) {
      console.error('Pending account data not found for:', identifier);
      return;
    }

    // Populate pending modal fields (create modal elements if absent)
    const pendingModal = document.getElementById('pending-modal');
    if (!pendingModal) {
      console.warn('Pending modal element not found in DOM');
      return;
    }

    let scheduleText = '—';
    if (stored.schedule) {
      try {
        const scheduleData = typeof stored.schedule === 'string' ? JSON.parse(stored.schedule) : stored.schedule;
        if (scheduleData && Array.isArray(scheduleData.days) && scheduleData.days.length > 0) {
          const startHour = Number.isFinite(scheduleData.startHour) ? `${scheduleData.startHour}:00` : '?';
          const endHour = Number.isFinite(scheduleData.endHour) ? `${scheduleData.endHour}:00` : '?';
          scheduleText = `${scheduleData.days.join(', ')} (${startHour} - ${endHour})`;
        }
      } catch (error) {
        scheduleText = String(stored.schedule);
      }
    }

    // set values
    document.getElementById('pending-username').textContent = stored.username || '—';
    document.getElementById('pending-employee-id').textContent = stored.employee_id || '—';
    document.getElementById('pending-email').textContent = stored.email || '—';
    document.getElementById('pending-role').textContent = stored.role ? (stored.role.charAt(0).toUpperCase() + stored.role.slice(1)) : '';
    document.getElementById('pending-specialization').textContent = stored.specialization || '—';
    document.getElementById('pending-schedule').textContent = scheduleText;
    document.getElementById('pending-submitted').textContent = formatDateTime(stored.created_at);

    // show modal
    pendingModal.style.display = 'flex';

    // accept/reject handlers use global pending-action-confirm-modal
    const showConfirm = (text, onConfirmAction) => {
      const global = document.getElementById('pending-action-confirm-modal');
      if (!global) {
        console.warn('Pending action confirm modal not found');
        return;
      }

      // close the pending modal immediately so the confirmation modal isn't displayed behind it
      pendingModal.style.display = 'none';

      document.getElementById('pending-action-text').textContent = text;
      global.style.display = 'flex';
      const yes = document.getElementById('pending-action-yes');
      const no = document.getElementById('pending-action-no');
      const cleanup = () => { global.style.display = 'none'; yes.onclick = null; no.onclick = null; };
      yes.onclick = () => { cleanup(); onConfirmAction(); };
      no.onclick = () => { cleanup(); };
    };

    document.getElementById('pending-accept').onclick = () => {
      showConfirm('Accept this registration and activate the account?', async () => {
        try {
          const res = await fetch(`${API_BASE}/api/staff/approve/${stored.id}`, { method: 'POST', credentials: 'include' });
          const data = await res.json();

          if (res.ok) {
            if (data.notificationEmailSent === true) {
              const recipient = data.notificationEmailRecipient || 'the registrant';
              showToast(`Account approved. Notification email sent to ${recipient}.`, 'success');
            } else if (data.notificationEmailSent === false) {
              const reason = data.notificationError ? ` Reason: ${data.notificationError}` : '';
              showToast(`Account approved, but notification email failed.${reason}`, 'warning');
            } else {
              showToast(data.message || 'Account approved successfully.', 'success');
            }
            loadStaffData();
            loadPendingStaffData();
          } else {
            showToast(data.message || 'Approval failed', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Server error', 'error');
        }
      });
    };

    document.getElementById('pending-reject').onclick = () => {
      showConfirm('Reject this registration? This will permanently delete the submission.', async () => {
        try {
          const res = await fetch(`${API_BASE}/api/staff/reject/${stored.id}`, { method: 'POST', credentials: 'include' });
          const data = await res.json();
          if (res.ok) {
            showToast(data.message || 'Account rejected', 'success');
            loadPendingStaffData();
          } else {
            showToast(data.message || 'Rejection failed', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Server error', 'error');
        }
      });
    };
  });
}

// Modal close button
const closeModalBtn = document.getElementById('modal-close-btn');
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    document.getElementById('account-modal').style.display = 'none';
    currentAccountData = null;
    currentAction = null;
  });
}

// Edit button
const editBtn = document.getElementById('modal-edit-btn');
if (editBtn) {
  editBtn.addEventListener('click', () => {
    currentAction = 'edit';
    document.getElementById('modal-confirm-text').textContent = 'Are you sure you want to edit this account?';
    document.getElementById('modal-actions').style.display = 'none';
    document.getElementById('modal-confirm-section').style.display = 'block';
  });
}

// Delete button
const deleteBtn = document.getElementById('modal-delete-btn');
if (deleteBtn) {
  deleteBtn.addEventListener('click', () => {
    currentAction = 'delete';
    document.getElementById('modal-confirm-text').textContent = 'Are you sure you want to delete this account? This action cannot be undone.';
    document.getElementById('modal-actions').style.display = 'none';
    document.getElementById('modal-confirm-section').style.display = 'block';
  });
}

// Confirm button
const confirmBtn = document.getElementById('modal-confirm-btn');
if (confirmBtn) {
  confirmBtn.addEventListener('click', async () => {
    if (currentAction === 'edit') {
      console.log('Editing account:', currentAccountData);
      alert('Account updated successfully');
      document.getElementById('account-modal').style.display = 'none';
      currentAccountData = null;
      currentAction = null;
    } else if (currentAction === 'delete') {
      try {
        if (!currentAccountData || !currentAccountData.id) {
          showToast('Unable to delete: missing account id.', 'error');
          return;
        }

        const response = await fetch(`${API_BASE}/api/staff/${currentAccountData.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(data.message || 'Failed to delete account.', 'error');
          return;
        }

        document.getElementById('account-modal').style.display = 'none';
        document.getElementById('modal-confirm-section').style.display = 'none';
        document.getElementById('modal-actions').style.display = 'flex';
        currentAccountData = null;
        currentAction = null;

        await Promise.all([loadStaffData(), loadPendingStaffData()]);
        showToast(data.message || 'Account deleted successfully.', 'success');
      } catch (error) {
        console.error('Delete account error:', error);
        showToast('Server error during deletion.', 'error');
      }
    }
  });
}

// Cancel button
const cancelBtn = document.getElementById('modal-cancel-btn');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    document.getElementById('modal-confirm-section').style.display = 'none';
    document.getElementById('modal-actions').style.display = 'flex';
    currentAction = null;
  });
}

// --- Clickable stats to navigate to panes ---
const statAnnouncementsCard = document.getElementById('stat-announcements-card');
const statReportsCard = document.getElementById('stat-reports-card');
const statCitizensCard = document.getElementById('stat-citizens-card');

if (statAnnouncementsCard) {
  statAnnouncementsCard.addEventListener('click', () => {
    hideAllSections();
    if (reportsSection) reportsSection.classList.remove('hidden');
    if (tabAnnouncements) tabAnnouncements.click();
  });
}

if (statReportsCard) {
  statReportsCard.addEventListener('click', () => {
    hideAllSections();
    if (reportsSection) reportsSection.classList.remove('hidden');
    if (tabFeedback) tabFeedback.click();
  });
}

if (statCitizensCard) {
  statCitizensCard.addEventListener('click', async () => {
    hideAllSections();
    if (usersSection) usersSection.classList.remove('hidden');
    // ensure citizens data is loaded
    await loadCitizenData();
    const citizensTabButton = document.getElementById('tab-citizens');
    if (citizensTabButton) citizensTabButton.click();
  });
}

// --- Consultations, Prescriptions, Medicines (localStorage-backed demo) ---
const consultationSection = document.getElementById('consultation-section');
const consultationForm = document.getElementById('consultation-form');
const consultationsTbody = document.getElementById('consultations-tbody');
const consultSaveBtn = document.getElementById('consult-save-btn');
const consultReportBtn = document.getElementById('consult-report-btn');

const prescriptionModal = document.getElementById('prescription-modal');
const prescriptionForm = document.getElementById('prescription-form');
const prescriptionPatient = document.getElementById('prescription-patient');
const prescriptionLines = document.getElementById('prescription-lines');
const addPrescriptionLineBtn = document.getElementById('add-prescription-line');
const cancelPrescriptionBtn = document.getElementById('cancel-prescription');

const medicineSection = document.getElementById('medicine-section');
const medicineForm = document.getElementById('medicine-form');
const medicineTbody = document.getElementById('medicine-tbody');
const medicineReportBtn = document.getElementById('medicine-report-btn');

let consultations = [];
let medicines = [];
let prescriptions = [];

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Storage parse error', key, err);
    return [];
  }
}

function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (err) { console.error('Storage save error', key, err); }
}

function renderConsultations() {
  if (!consultationsTbody) return;
  consultationsTbody.innerHTML = '';
  consultations.slice().reverse().forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="table-cell">${c.id}</td>
      <td class="table-cell">${c.patientId}</td>
      <td class="table-cell">${(c.diagnosis||'').substring(0,60)}</td>
      <td class="table-cell">${new Date(c.created_at).toLocaleString()}</td>
      <td class="table-cell">
        <button class="btn small" data-action="view" data-id="${c.id}">View</button>
        <button class="btn small outline" data-action="prescribe" data-id="${c.id}">Prescribe</button>
      </td>
    `;
    consultationsTbody.appendChild(tr);
  });
}

function renderMedicines() {
  if (!medicineTbody) return;
  medicineTbody.innerHTML = '';
  medicines.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="table-cell">${m.name}</td>
      <td class="table-cell">${m.qty}</td>
      <td class="table-cell">${m.unit || ''}</td>
      <td class="table-cell">
        <button class="btn small" data-action="add" data-name="${m.name}">+ Add</button>
        <button class="btn small outline" data-action="sub" data-name="${m.name}">- Subtract</button>
      </td>
    `;
    medicineTbody.appendChild(tr);
  });
}

function initClinicalData() {
  consultations = loadFromStorage('ukonek_consultations');
  medicines = loadFromStorage('ukonek_medicine_inventory');
  prescriptions = loadFromStorage('ukonek_prescriptions');
  renderConsultations();
  renderMedicines();
}

initClinicalData();

// Consultation form submit
if (consultationForm) {
  consultationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const patientId = document.getElementById('consult-patient-id').value.trim();
    const symptoms = document.getElementById('consult-symptoms').value.trim();
    const diagnosis = document.getElementById('consult-diagnosis').value.trim();
    const notes = document.getElementById('consult-notes').value.trim();
    if (!patientId || !diagnosis) { showToast('Patient ID and diagnosis required', 'warning'); return; }
    const entry = { id: `C-${Date.now()}`, patientId, symptoms, diagnosis, notes, created_at: new Date().toISOString() };
    consultations.push(entry);
    saveToStorage('ukonek_consultations', consultations);
    renderConsultations();
    consultationForm.reset();
    showToast('Consultation saved', 'success');
  });
}

// Open prescription modal
const consultAddPrescBtn = document.getElementById('consult-add-prescription');
if (consultAddPrescBtn && prescriptionModal) {
  consultAddPrescBtn.addEventListener('click', () => {
    if (prescriptionModal) prescriptionModal.classList.remove('hidden');
    // prefill patient id if available
    const pid = document.getElementById('consult-patient-id')?.value || '';
    if (prescriptionPatient) prescriptionPatient.value = pid;
    prescriptionLines.innerHTML = '';
    addPrescriptionLine();
  });
}

function addPrescriptionLine() {
  const line = document.createElement('div');
  line.className = 'field';
  line.innerHTML = `
    <label class="inputLabel">Medicine</label>
    <select class="pres-med" required>
      ${medicines.map(m => `<option value="${m.name}">${m.name} (${m.unit||''})</option>`).join('')}
    </select>
    <label class="inputLabel">Quantity</label>
    <input type="number" class="pres-qty" value="1" min="1" required />
    <button type="button" class="btn small" data-action="remove-line">Remove</button>
  `;
  prescriptionLines.appendChild(line);
  line.querySelector('[data-action="remove-line"]').addEventListener('click', () => line.remove());
}

if (addPrescriptionLineBtn) addPrescriptionLineBtn.addEventListener('click', addPrescriptionLine);

if (cancelPrescriptionBtn) cancelPrescriptionBtn.addEventListener('click', () => {
  if (prescriptionModal) prescriptionModal.classList.add('hidden');
});

if (prescriptionForm) {
  prescriptionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const patient = prescriptionPatient.value.trim();
    if (!patient) { showToast('Patient ID required', 'warning'); return; }
    const items = [];
    const selects = prescriptionForm.querySelectorAll('.pres-med');
    const qtys = prescriptionForm.querySelectorAll('.pres-qty');
    for (let i = 0; i < selects.length; i++) {
      const name = selects[i].value;
      const qty = Number(qtys[i].value) || 0;
      if (name && qty > 0) items.push({ name, qty });
    }
    if (items.length === 0) { showToast('Add at least one medicine', 'warning'); return; }
    const pres = { id: `P-${Date.now()}`, patient, items, created_at: new Date().toISOString() };
    prescriptions.push(pres);
    saveToStorage('ukonek_prescriptions', prescriptions);

    // decrement inventory where possible
    items.forEach(it => {
      const idx = medicines.findIndex(m => m.name === it.name);
      if (idx >= 0) {
        medicines[idx].qty = Math.max(0, Number(medicines[idx].qty) - Number(it.qty));
      }
    });
    saveToStorage('ukonek_medicine_inventory', medicines);
    renderMedicines();

    if (prescriptionModal) prescriptionModal.classList.add('hidden');
    showToast('Prescription created and inventory updated', 'success');
  });
}

// Medicine form submit
if (medicineForm) {
  medicineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('med-name').value.trim();
    const qty = Number(document.getElementById('med-qty').value) || 0;
    const unit = document.getElementById('med-unit').value.trim();
    if (!name) { showToast('Medicine name required', 'warning'); return; }
    const idx = medicines.findIndex(m => m.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      medicines[idx].qty = Number(medicines[idx].qty) + qty; // treat as adding stock
      medicines[idx].unit = unit || medicines[idx].unit;
    } else {
      medicines.push({ name, qty, unit });
    }
    saveToStorage('ukonek_medicine_inventory', medicines);
    renderMedicines();
    medicineForm.reset();
    showToast('Medicine added/updated', 'success');
  });
}

// medicine +/- actions
if (medicineTbody) {
  medicineTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const name = btn.getAttribute('data-name');
    if (!action || !name) return;
    const idx = medicines.findIndex(m => m.name === name);
    if (idx < 0) return;
    if (action === 'add') {
      const add = Number(prompt('Enter quantity to add', '1')) || 0;
      medicines[idx].qty = Number(medicines[idx].qty) + add;
    } else if (action === 'sub') {
      const sub = Number(prompt('Enter quantity to subtract', '1')) || 0;
      medicines[idx].qty = Math.max(0, Number(medicines[idx].qty) - sub);
    }
    saveToStorage('ukonek_medicine_inventory', medicines);
    renderMedicines();
  });
}

// Consultations table actions (view/prescribe)
if (consultationsTbody) {
  consultationsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const entry = consultations.find(c => c.id === id);
    if (!action || !entry) return;
    if (action === 'view') {
      // show brief modal-like window using alert for simplicity
      alert(`Consultation ${entry.id}\nPatient: ${entry.patientId}\nDiagnosis: ${entry.diagnosis}\nNotes: ${entry.notes}`);
    } else if (action === 'prescribe') {
      if (prescriptionModal) prescriptionModal.classList.remove('hidden');
      if (prescriptionPatient) prescriptionPatient.value = entry.patientId || '';
      prescriptionLines.innerHTML = '';
      addPrescriptionLine();
    }
  });
}

// Simple printable report generator (user can Save as PDF via print dialog)
function generateReport(title, headers, rows) {
  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked. Allow popups for report generation.', 'error'); return; }
  const html = [];
  html.push('<html><head><title>' + title + '</title>');
  html.push('<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>');
  html.push('</head><body>');
  html.push('<h1>' + title + '</h1>');
  html.push('<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>');
  html.push('<tbody>');
  rows.forEach(r => {
    html.push('<tr>' + r.map(c => `<td>${String(c)}</td>`).join('') + '</tr>');
  });
  html.push('</tbody></table>');
  html.push('</body></html>');
  win.document.write(html.join(''));
  win.document.close();
  // give the browser a moment to render then call print
  setTimeout(() => { win.print(); }, 500);
}

// report buttons
if (consultReportBtn) {
  consultReportBtn.addEventListener('click', () => {
    const headers = ['ID', 'Patient', 'Diagnosis', 'Date'];
    const rows = consultations.map(c => [c.id, c.patientId, c.diagnosis, new Date(c.created_at).toLocaleString()]);
    generateReport('Consultations Report', headers, rows);
  });
}

if (medicineReportBtn) {
  medicineReportBtn.addEventListener('click', () => {
    const headers = ['Medicine', 'Quantity', 'Unit'];
    const rows = medicines.map(m => [m.name, m.qty, m.unit || '']);
    generateReport('Medicine Inventory Report', headers, rows);
  });
}

// Expose report generation for other entities
function generateUsersReport() {
  const rows = latestStaffList.map(u => [u.username || '', u.employee_id || '', u.role || '', u.status || '']);
  generateReport('Users Report', ['Username', 'Employee ID', 'Role', 'Status'], rows);
}

function generateCitizensReport() {
  const rows = latestCitizensList.map(c => [c.username || c.name || '', c.email || '', c.created_at || '']);
  generateReport('Citizens Report', ['Username', 'Email', 'Registered'], rows);
}

// wire up simple global report triggers (if buttons exist elsewhere)
const usersReportBtn = document.getElementById('users-report-btn');
if (usersReportBtn) usersReportBtn.addEventListener('click', generateUsersReport);

const citizensReportBtn = document.getElementById('citizens-report-btn');
if (citizensReportBtn) citizensReportBtn.addEventListener('click', generateCitizensReport);
