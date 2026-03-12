class AppConstants {
  // Backend API Base URL
  // For development on localhost, use: http://10.0.2.2:5000 (Android)
  // For physical device on same network, use: http://<your_machine_ip>:5000
  static const String apiBaseUrl = 'http://10.0.2.2:5000';
  
  // API Endpoints
  static const String loginEndpoint = '/api/staff/login';
  static const String patientRegisterEndpoint = '/api/patients/register';
  static const String staffRegisterEndpoint = '/api/staff/register';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);
}
