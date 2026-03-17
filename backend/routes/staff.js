const express = require('express');
const staffController = require('../controllers/staffController');
const { validateStaff } = require('../middleware/validation');
const { requireAuth } = require('../middleware/sessionAuth');
const router = express.Router();

// GET /api/staff - Get all staff accounts
router.get('/', requireAuth, staffController.getAllStaff);

// DELETE /api/staff/:id - Delete active staff account
router.delete('/:id', requireAuth, staffController.deleteStaff);

// POST /api/staff/register - Register to pending_staff table
router.post('/register', staffController.registerStaff);

// GET /api/staff/verify-email?token=... - Verify staff registration email
router.get('/verify-email', staffController.verifyStaffEmail);

// POST /api/staff/complete-registration - Create username/password after email verification
router.post('/complete-registration', staffController.completeStaffRegistration);

// POST /api/staff/register-direct - Register directly to staff table (Active)
router.post('/register-direct', requireAuth, validateStaff, staffController.registerStaffDirect);

// GET /api/staff/pending - Get all pending staff
router.get('/pending', requireAuth, staffController.getPendingStaff);

// POST /api/staff/approve/:id - Approve a pending staff
router.post('/approve/:id', requireAuth, staffController.approveStaff);

// POST /api/staff/reject/:id - Reject a pending staff
router.post('/reject/:id', requireAuth, staffController.rejectStaff);

// POST /api/staff/login - Staff login
router.post('/login', staffController.loginStaff);

// POST /api/staff/logout - End current login session
router.post('/logout', staffController.logoutStaff);

// GET /api/staff/session - Validate current login session
router.get('/session', requireAuth, staffController.getSession);

// POST /api/staff/forgot-password - Request password reset link
router.post('/forgot-password', staffController.forgotPassword);

// POST /api/staff/reset-password - Reset password using token
router.post('/reset-password', staffController.resetPassword);

module.exports = router;
