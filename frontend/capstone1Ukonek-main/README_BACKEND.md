# Backend Connection Summary

## ✅ What Was Done

Connected the **capstone1Ukonek-main** Flutter mobile app to the existing Node.js/Express backend for:

### 1. **Patient Registration** 
- Multi-step form: Register → Preview → Credentials → OTP → Backend Submission
- When OTP is verified, patient data is sent to: `POST /api/patients/register`
- Data includes: name, DOB, contact, email, address, emergency contact, credentials
- Success: Redirects to login page

### 2. **Staff Login**
- Replaced hardcoded credentials with real backend authentication
- Authenticates against: `POST /api/staff/login`
- On success: Redirects to dashboard with user data
- On failure: Shows error message

### 3. **API Service Layer**
- Created `lib/services/api_service.dart` - Singleton class for all API calls
- Handles timeouts, error mapping, and response parsing
- Methods: `login()`, `registerPatient()`, `registerStaff()`

### 4. **Configuration**
- Created `lib/constants.dart` - Centralized API configuration
- Base URL: `http://10.0.2.2:5000` (Android Emulator default)
- Configurable for different environments

### 5. **Dependencies**
- Added `http: ^1.2.1` to pubspec.yaml for HTTP requests

---

## 🔧 Key Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `lib/constants.dart` | ✨ Created | API configuration & endpoints |
| `lib/services/api_service.dart` | ✨ Created | API service for all backend calls |
| `lib/uKonekLoginPage.dart` | 🔄 Modified | Connected to `/api/staff/login` |
| `lib/uKonekOtpPage.dart` | 🔄 Modified | Calls `/api/patients/register` after OTP verification |
| `lib/uKonekRegisterPage.dart` | 🔄 Modified | Added imports for APIService |
| `pubspec.yaml` | 🔄 Modified | Added http dependency |
| `BACKEND_INTEGRATION.md` | ✨ Created | Detailed setup & troubleshooting guide |

---

## 📱 Registration Flow

```
Register Page (Fill form + upload ID)
         ↓
Preview Page (Review all details)
         ↓
Credential Page (Set username & password)
         ↓
OTP Page (Enter 6-digit code)
         ↓
POST /api/patients/register
         ↓
✅ Account Created → Login Page
```

---

## 🔑 Login Flow

```
Login Page (Enter username & password)
         ↓
POST /api/staff/login
         ↓
✅ Valid → Dashboard
❌ Invalid → Error message
```

---

## 🚀 How to Use

### 1. Start the Backend
```bash
cd backend
npm install
node init-db.js  # Run once to initialize database
node server.js
```
Backend runs on: `http://localhost:5000`

### 2. Run the Flutter App

**For Android Emulator:**
```bash
cd capstone1Ukonek-main/ukonekmobile
flutter pub get
flutter run -d emulator-5554
```
(Uses `10.0.2.2:5000` by default)

**For Physical Device on same network:**
Update `lib/constants.dart`:
```dart
static const String apiBaseUrl = 'http://YOUR_MACHINE_IP:5000';
```
Then run:
```bash
flutter run
```

### 3. Test the Features

**Test Login:**
- Username: `admin`
- Password: `admin123`

**Test Registration:**
- Fill all fields correctly
- Upload a valid government ID
- The app will extract text using OCR and verify it
- Complete OTP verification (dummy OTP shown on screen)
- Account created in database

---

## ⚙️ Configuration Guide

### For Android Emulator
```dart
// lib/constants.dart
static const String apiBaseUrl = 'http://10.0.2.2:5000';
```
✅ This is the default and works out of the box

### For Physical Android Device
```dart
// Replace with your machine's IP
static const String apiBaseUrl = 'http://192.168.1.100:5000';
```

### For iOS Simulator
```dart
static const String apiBaseUrl = 'http://localhost:5000';
```

### For Web (Chrome)
```dart
static const String apiBaseUrl = 'http://localhost:5000';
```

---

## 📊 API Endpoints Connected

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/staff/login` | POST | Staff authentication | ✅ Connected |
| `/api/patients/register` | POST | Patient registration | ✅ Connected |
| `/api/staff/register` | POST | Staff registration | ✅ Ready (not UI integrated yet) |

---

## 🎯 Next Steps (Optional Enhancements)

1. **JWT Tokens:** Implement token-based authentication for session persistence
2. **Local Storage:** Use `shared_preferences` to store user session data
3. **Dashboard Integration:** Connect dashboard to fetch real appointments, health data
4. **Error Handling:** Add more specific error messages for different API failures
5. **Network Detection:** Check internet connectivity before making API calls
6. **Offline Support:** Implement local data caching for offline functionality

---

## ✨ Testing Checklist

- [ ] Backend is running on localhost:5000
- [ ] Database tables exist (staff, patients, pending_staff)
- [ ] Admin account exists (username: admin, password: admin123)
- [ ] Flutter app can connect to backend
- [ ] Login works with valid credentials
- [ ] Patient registration complete flow works
- [ ] New patient record appears in database

---

## 📞 Support

For issues:
1. Check `BACKEND_INTEGRATION.md` for detailed troubleshooting
2. Verify backend is running: `curl http://localhost:5000/api/staff`
3. Check Flutter console logs for error messages
4. Ensure database is initialized: `node backend/init-db.js`

---

**Last Updated:** March 12, 2026
**Status:** ✅ Backend Connection Complete
