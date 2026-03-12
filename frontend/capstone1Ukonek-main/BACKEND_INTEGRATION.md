# U-Konek Flutter Mobile App - Backend Integration Guide

## Overview
The updated Flutter mobile app (`capstone1Ukonek-main`) is now connected to the Node.js/Express backend. This document explains the integration and how to configure it.

## Setup Instructions

### 1. Backend Requirements
Ensure your Node.js/Express backend is running:
```bash
cd backend
npm install
node server.js
# Backend should be running on http://localhost:5000
```

### 2. API Configuration
The backend URL is configured in **`lib/constants.dart`**:

```dart
static const String apiBaseUrl = 'http://10.0.2.2:5000';
```

⚠️ **Important:** Use `10.0.2.2:5000` for **Android Emulator** (redirects to host machine)

For other scenarios:
- **Physical Android Device on same network:** Replace with your machine's IP (e.g., `http://192.168.1.100:5000`)
- **iOS Simulator:** Use `http://localhost:5000`
- **Chrome/Web:** Use `http://localhost:5000`

### 3. Dependencies
Added to `pubspec.yaml`:
```yaml
http: ^1.2.1
```

Run `flutter pub get` to install.

## Features Connected to Backend

### 1. **Patient Registration Flow**
- **Register Page** → **Preview Page** → **Credential Page** → **OTP Page** → **Backend Registration**
- Sends patient data to: `POST /api/patients/register`
- Includes: Name, DOB, contact, email, address, emergency contact, password

### 2. **Staff/Medical Personnel Login**
- **Login Page** uses: `POST /api/staff/login`
- Returns: Staff member data (username, role, employee_id)

### 3. **Service Classes**
- **File:** `lib/services/api_service.dart`
- **Methods:**
  - `login()` - Staff member login
  - `registerPatient()` - Patient registration
  - `registerStaff()` - Medical personnel registration

## Backend Integration Points

### Login Page Integration
```dart
// uKonekLoginPage.dart
final result = await _apiService.login(
  username: usernameController.text,
  password: passwordController.text,
);
```

**API Call:**
```
POST /api/staff/login
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "id": 1,
  "username": "john_doe",
  "role": "doctor",
  "employee_id": "EMP-001",
  "status": "Active"
}
```

### Patient Registration Integration
```dart
// uKonekOtpPage.dart - Triggered after OTP verification
final result = await apiService.registerPatient(
  firstname: widget.firstName,
  surname: widget.surname,
  email: widget.email,
  password: widget.password,
  // ... other fields
);
```

**API Call:**
```
POST /api/patients/register
{
  "firstname": "string",
  "surname": "string",
  "email": "string@example.com",
  "password": "string",
  "confirmPassword": "string",
  "middle_initial": "string",
  "date_of_birth": "YYYY-MM-DD",
  "age": number,
  "contact_number": "string",
  "sex": "Male|Female",
  "complete_address": "string",
  "emergency_contact_complete_name": "string",
  "emergency_contact_country_code": "+63",
  "emergency_contact_contact_number": "string",
  "relation": "string"
}
```

**Success Response (201):**
```json
{
  "message": "patients registered successfully"
}
```

## Testing the Integration

### 1. Test Login
1. Start the backend
2. Ensure a staff account exists (default: username=`admin`, password=`admin123`)
3. Open the app and navigate to Login
4. Enter credentials
5. Should navigate to Dashboard on success

### 2. Test Patient Registration
1. Complete the registration form with valid data
2. Upload a government ID (OCR verification required)
3. Agree to terms & set credentials
4. Enter OTP (for testing, the app generates a random 6-digit code displayed on screen)
5. On success, should redirect to Login page
6. Check the MySQL database: `patients` table should have the new record

## Troubleshooting

### Connection Timeout Error
- Verify backend is running on port 5000
- Check firewall settings
- For Android Emulator, ensure you're using `10.0.2.2` not `localhost`

### "Invalid credentials" on Login
- Verify the staff account exists in the database: `SELECT * FROM staff WHERE username = 'your_username';`
- Check password is hashed using bcryptjs

### Registration Fails
- Ensure all required fields are filled
- Check backend logs for validation errors
- Verify email is not already registered: `SELECT * FROM patients WHERE email = 'email@example.com';`

### OTP Page Registration Fails
- Check if patient data is being passed correctly from previous pages
- Verify backend `/api/patients/register` endpoint is responding
- Check MySQL `patients` table permissions

## Files Modified/Created

- ✅ `lib/constants.dart` - API configuration
- ✅ `lib/services/api_service.dart` - API service class
- ✅ `lib/uKonekLoginPage.dart` - Backend login integration
- ✅ `lib/uKonekOtpPage.dart` - Backend registration on OTP verify
- ✅ `pubspec.yaml` - Added http dependency

## Next Steps

1. **Authentication Token:** Consider implementing JWT token storage for authenticated requests
2. **Session Management:** Store user session data locally (shared_preferences)
3. **Error Handling:** Add more detailed error messages for specific API failures
4. **Offline Support:** Implement local data caching
5. **Dashboard:** Connect dashboard to fetch actual appointments, health data, medications from backend

## Support
For issues or questions, contact: support@ukonek.ph
