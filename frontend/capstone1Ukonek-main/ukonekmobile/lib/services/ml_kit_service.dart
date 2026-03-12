import 'dart:io';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:string_similarity/string_similarity.dart';

/// Service for Google ML Kit text recognition (mobile only, not web)
class GoogleMLKitService {
  String _normalize(String s) => s.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
  String _toLower(String s) => s.toLowerCase().replaceAll(RegExp(r'[^a-z0-9\s]'), '').trim();

  bool _checkBirthdayInOcr(String ocrRaw, DateTime dob) {
    final month = dob.month;
    final day = dob.day;
    final year = dob.year;
    final monthNames = [
      '',
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ];
    final monthShort = ['', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    final ocrLower = ocrRaw.toLowerCase();
    final variants = [
      '${month.toString().padLeft(2, '0')}/${day.toString().padLeft(2, '0')}/$year',
      '${day.toString().padLeft(2, '0')}/${month.toString().padLeft(2, '0')}/$year',
      '$month/$day/$year',
      '$day/$month/$year',
      '${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}-$year',
      '$year-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}',
      '${monthNames[month]} $day, $year',
      '${monthNames[month]} $day $year',
      '${monthShort[month]} $day, $year',
      '${monthShort[month]} $day $year',
      '$day ${monthNames[month]} $year',
      '$day ${monthShort[month]} $year',
      '${monthNames[month]} $year',
      '${monthShort[month]} $year',
    ];
    for (final v in variants) {
      if (ocrLower.contains(v.toLowerCase())) return true;
    }
    final digitsOnly = ocrRaw.replaceAll(RegExp(r'[^0-9]'), '');
    final ms = month.toString().padLeft(2, '0');
    final ds = day.toString().padLeft(2, '0');
    final ys = year.toString();
    if (digitsOnly.contains('$ys$ms$ds') || digitsOnly.contains('$ds$ms$ys') || digitsOnly.contains('$ms$ds$ys')) {
      return true;
    }
    return false;
  }

  /// Verify ID text using Google ML Kit (mobile only)
  Future<Map<String, dynamic>> verifyIDText(
    File idImage,
    String firstName,
    String middleName,
    String surname,
    DateTime? dob,
  ) async {
    try {
      final inputImage = InputImage.fromFile(idImage);
      final textRecognizer = TextRecognizer();
      final recognizedText = await textRecognizer.processImage(inputImage);
      await textRecognizer.close();

      final rawText = recognizedText.text.trim();
      final ocrNorm = _normalize(rawText);
      final ocrLowerSpaced = _toLower(rawText);
      final fullName = _normalize('$firstName $middleName $surname');
      final shortName = _normalize('$firstName $surname');
      final firstNameLower = _toLower(firstName);
      final middleNameLower = _toLower(middleName);
      final surnameLower = _toLower(surname);

      final fullSim = StringSimilarity.compareTwoStrings(ocrNorm, fullName);
      final shortSim = StringSimilarity.compareTwoStrings(ocrNorm, shortName);
      final ocrContainsFirst = firstNameLower.length > 1 && ocrLowerSpaced.contains(firstNameLower);
      final ocrContainsSurname = surnameLower.length > 1 && ocrLowerSpaced.contains(surnameLower);
      final ocrContainsMiddle = middleNameLower.length > 1 && ocrLowerSpaced.contains(middleNameLower);

      final nameMatched = fullSim > 0.45 ||
          shortSim > 0.45 ||
          (ocrContainsFirst && ocrContainsSurname) ||
          (ocrContainsFirst && ocrContainsMiddle);

      bool birthdayMatched = false;
      if (dob != null) {
        birthdayMatched = _checkBirthdayInOcr(rawText, dob);
      }

      final isVerified = nameMatched && (dob == null || birthdayMatched);

      return {
        'isVerified': isVerified,
        'nameMatched': nameMatched,
        'birthdayMatched': birthdayMatched,
        'extractedText': rawText,
      };
    } catch (e) {
      rethrow;
    }
  }
}
