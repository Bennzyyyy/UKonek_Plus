import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants.dart';

class APIService {
  static final APIService _instance = APIService._internal();

  factory APIService() {
    return _instance;
  }

  APIService._internal();

  final http.Client _client = http.Client();

  // ── LOGIN ──────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    try {
      final url = Uri.parse('${AppConstants.apiBaseUrl}${AppConstants.loginEndpoint}');
      
      final response = await _client
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'username': username,
              'password': password,
            }),
          )
          .timeout(AppConstants.connectionTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': 'Login successful',
          'user': data,
        };
      } else if (response.statusCode == 401 || response.statusCode == 404) {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Invalid credentials',
        };
      } else {
        return {
          'success': false,
          'message': 'Server error (${response.statusCode})',
        };
      }
    } on TimeoutException {
      return {
        'success': false,
        'message': 'Connection timeout. Check your internet connection.',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // ── PATIENT REGISTRATION ───────────────────────────────────────
  Future<Map<String, dynamic>> registerPatient({
    required String firstname,
    required String surname,
    required String email,
    required String password,
    String? middleInitial,
    String? dateOfBirth,
    int? age,
    String? contactNumber,
    String? sex,
    String? completeAddress,
    String? emergencyContactCompleteName,
    String? emergencyContactCountryCode,
    String? emergencyContactNumber,
    String? relation,
  }) async {
    try {
      final url = Uri.parse('${AppConstants.apiBaseUrl}${AppConstants.patientRegisterEndpoint}');
      
      final Map<String, dynamic> body = {
        'firstname': firstname,
        'surname': surname,
        'email': email,
        'password': password,
        'confirmPassword': password,
      };

      // Add optional fields if provided
      if (middleInitial != null && middleInitial.isNotEmpty) {
        body['middle_initial'] = middleInitial;
      }
      if (dateOfBirth != null && dateOfBirth.isNotEmpty) {
        body['date_of_birth'] = dateOfBirth;
      }
      if (age != null) {
        body['age'] = age;
      }
      if (contactNumber != null && contactNumber.isNotEmpty) {
        body['contact_number'] = contactNumber;
      }
      if (sex != null && sex.isNotEmpty) {
        body['sex'] = sex;
      }
      if (completeAddress != null && completeAddress.isNotEmpty) {
        body['complete_address'] = completeAddress;
      }
      if (emergencyContactCompleteName != null && emergencyContactCompleteName.isNotEmpty) {
        body['emergency_contact_complete_name'] = emergencyContactCompleteName;
      }
      if (emergencyContactCountryCode != null && emergencyContactCountryCode.isNotEmpty) {
        body['emergency_contact_country_code'] = emergencyContactCountryCode;
      }
      if (emergencyContactNumber != null && emergencyContactNumber.isNotEmpty) {
        body['emergency_contact_contact_number'] = emergencyContactNumber;
      }
      if (relation != null && relation.isNotEmpty) {
        body['relation'] = relation;
      }

      final response = await _client
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(AppConstants.connectionTimeout);

      if (response.statusCode == 201) {
        return {
          'success': true,
          'message': 'Registration successful',
        };
      } else if (response.statusCode == 400) {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Invalid input',
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Server error (${response.statusCode})',
        };
      }
    } on TimeoutException {
      return {
        'success': false,
        'message': 'Connection timeout. Check your internet connection.',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // ── STAFF REGISTRATION (for medical personnel) ──────────────────
  Future<Map<String, dynamic>> registerStaff({
    required String username,
    required String password,
    required String employeeId,
    required String role,
    String? specialization,
    String? schedule,
  }) async {
    try {
      final url = Uri.parse('${AppConstants.apiBaseUrl}${AppConstants.staffRegisterEndpoint}');
      
      final body = {
        'username': username,
        'password': password,
        'confirmPassword': password,
        'employee_id': employeeId,
        'role': role,
      };

      if (specialization != null && specialization.isNotEmpty) {
        body['specialization'] = specialization;
      }
      if (schedule != null && schedule.isNotEmpty) {
        body['schedule'] = schedule;
      }

      final response = await _client
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(AppConstants.connectionTimeout);

      if (response.statusCode == 201) {
        return {
          'success': true,
          'message': 'Registration submitted. Pending admin approval.',
        };
      } else if (response.statusCode == 400) {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Invalid input',
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Server error (${response.statusCode})',
        };
      }
    } on TimeoutException {
      return {
        'success': false,
        'message': 'Connection timeout. Check your internet connection.',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }
}
