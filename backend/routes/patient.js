const express = require('express');
const patientController = require('../controllers/patientController');
const {
	validatePatient,
	validatePatientLogin,
	validateForgotPassword,
	validatePatientOtpRequest,
	validatePatientResetPassword
} = require('../middleware/validation');
const router = express.Router();

// POST /api/patients/register - Register a new patient account
router.post('/register', validatePatient, patientController.registerPatient);

// POST /api/patients/login - Patient login with username or email
router.post('/login', validatePatientLogin, patientController.loginPatient);

// POST /api/patients/request-otp - Request OTP for registration/forgot password
router.post('/request-otp', validatePatientOtpRequest, patientController.requestPatientOtp);

// POST /api/patients/forgot-password - Request reset OTP
router.post('/forgot-password', validateForgotPassword, patientController.forgotPasswordPatient);

// POST /api/patients/reset-password - Reset password with OTP
router.post('/reset-password', validatePatientResetPassword, patientController.resetPasswordPatient);

module.exports = router;