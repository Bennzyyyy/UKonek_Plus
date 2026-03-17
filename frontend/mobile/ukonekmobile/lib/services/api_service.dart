import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _defaultWebBaseUrl = 'http://localhost:5000/api';
  static const String _defaultMobileBaseUrl = 'http://10.0.2.2:5000/api';

  static String get _baseUrl {
    const configured = String.fromEnvironment('BACKEND_BASE_URL');
    if (configured.isNotEmpty) {
      return configured;
    }
    return kIsWeb ? _defaultWebBaseUrl : _defaultMobileBaseUrl;
  }

  static Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  static String _extractMessage(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'];
        if (message is String && message.isNotEmpty) {
          return message;
        }
      }
    } catch (_) {
      // Use fallback below.
    }
    return 'Request failed (${response.statusCode})';
  }

  static Future<Map<String, dynamic>> loginPatient({
    required String identifier,
    required String password,
  }) async {
    final response = await http.post(
      _uri('/patients/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier.trim(), 'password': password}),
    );

    final body = response.body.isNotEmpty
        ? jsonDecode(response.body) as Map<String, dynamic>
        : <String, dynamic>{};

    if (response.statusCode >= 400) {
      throw Exception(_extractMessage(response));
    }

    return body;
  }

  static Future<void> registerPatient({
    required Map<String, dynamic> payload,
  }) async {
    final response = await http.post(
      _uri('/patients/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode >= 400) {
      throw Exception(_extractMessage(response));
    }
  }

  static Future<void> requestPatientOtp({
    required String email,
    required String purpose,
  }) async {
    final response = await http.post(
      _uri('/patients/request-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim().toLowerCase(),
        'purpose': purpose,
      }),
    );

    if (response.statusCode >= 400) {
      throw Exception(_extractMessage(response));
    }
  }

  static Future<void> resetPatientPassword({
    required String email,
    required String otp,
    required String password,
    required String confirmPassword,
  }) async {
    final response = await http.post(
      _uri('/patients/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim().toLowerCase(),
        'otp': otp.trim(),
        'password': password,
        'confirmPassword': confirmPassword,
      }),
    );

    if (response.statusCode >= 400) {
      throw Exception(_extractMessage(response));
    }
  }
}
