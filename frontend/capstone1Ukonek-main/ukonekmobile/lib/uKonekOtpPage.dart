import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'uKonekLoginPage.dart';
import 'services/api_service.dart';

class uKonekOtpPage extends StatefulWidget {
  final String firstName;
  final String middleName;
  final String surname;
  final String dob;
  final String age;
  final String contact;
  final String sex;
  final String email;
  final String address;
  final String emergencyName;
  final String emergencyContact;
  final String relation;
  final String username;
  final String password;
  final bool idVerified;

  const uKonekOtpPage({
    super.key,
    required this.firstName,
    required this.middleName,
    required this.surname,
    required this.dob,
    required this.age,
    required this.contact,
    required this.sex,
    required this.email,
    required this.address,
    required this.emergencyName,
    required this.emergencyContact,
    required this.relation,
    required this.username,
    required this.password,
    required this.idVerified,
  });

  @override
  State<uKonekOtpPage> createState() => _uKonekOtpPageState();
}

class _uKonekOtpPageState extends State<uKonekOtpPage> {
  final List<TextEditingController> _controllers =
  List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes =
  List.generate(6, (_) => FocusNode());

  String _generatedOtp = "";
  bool _isVerifying = false;
  bool _otpVisible = true; // toggle show/hide dummy OTP hint

  int _secondsLeft = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _generateOtp();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) c.dispose();
    for (final f in _focusNodes) f.dispose();
    super.dispose();
  }

  void _generateOtp() {
    final rand = Random();
    setState(() {
      _generatedOtp =
          List.generate(6, (_) => rand.nextInt(10)).join();
    });
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _secondsLeft = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft == 0) {
        t.cancel();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  String get _enteredOtp =>
      _controllers.map((c) => c.text).join();

  void _verifyOtp() {
    final entered = _enteredOtp;
    if (entered.length < 6) {
      _showSnack("⚠️ Please enter all 6 digits.", isError: true);
      return;
    }

    setState(() => _isVerifying = true);

    Future.delayed(const Duration(milliseconds: 800), () async {
      setState(() => _isVerifying = false);

      if (entered == _generatedOtp) {
        _showSnack("✅ OTP verified successfully! Registering account...");
        
        // Register the patient with the backend
        final apiService = APIService();
        final result = await apiService.registerPatient(
          firstname: widget.firstName,
          surname: widget.surname,
          email: widget.email,
          password: widget.password,
          middleInitial: widget.middleName,
          dateOfBirth: widget.dob,
          age: int.tryParse(widget.age),
          contactNumber: widget.contact,
          sex: widget.sex,
          completeAddress: widget.address,
          emergencyContactCompleteName: widget.emergencyName,
          emergencyContactNumber: widget.emergencyContact,
          relation: widget.relation,
        );

        if (result['success']) {
          _showSnack("✅ Account created successfully!");
          Future.delayed(const Duration(milliseconds: 1000), () {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(
                builder: (_) => const uKonekLoginPage(),
              ),
              (route) => false,
            );
          });
        } else {
          _showSnack("❌ Registration failed: ${result['message']}", isError: true);
        }
      } else {
        _showSnack("❌ Incorrect OTP. Please try again.", isError: true);
        for (final c in _controllers) c.clear();
        _focusNodes[0].requestFocus();
      }
    });
  }

  void _resendOtp() {
    for (final c in _controllers) c.clear();
    _generateOtp();
    _startCountdown();
    _showSnack("🔁 A new OTP has been generated.");
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor:
      isError ? Colors.red.shade700 : Colors.green.shade700,
    ));
  }

  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return email;
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 2) return "${name[0]}***@$domain";
    return "${name.substring(0, 2)}***@$domain";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // ── Header ──────────────────────────────────────────
          Container(
            height: 140,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                  colors: [Color(0xFF0D47A1), Color(0xFF1976D2)]),
              borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(40),
                  bottomRight: Radius.circular(40)),
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.mark_email_read_outlined,
                      color: Colors.white, size: 36),
                  SizedBox(height: 8),
                  Text(
                    "EMAIL VERIFICATION",
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),

          Expanded(
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                    horizontal: 28, vertical: 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // ── Sent message card ────────────────────
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        border: Border.all(color: Colors.blue.shade200),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.email_outlined,
                              color: Color(0xFF1976D2), size: 32),
                          const SizedBox(height: 10),
                          const Text(
                            "An OTP verification code was sent to",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 14, color: Colors.black54),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _maskEmail(widget.email),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0D47A1),
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Please check your inbox (and spam folder).",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 12, color: Colors.black45),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── 🧪 DUMMY OTP HINT BOX ─────────────────
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        border: Border.all(color: Colors.amber.shade400),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.bug_report,
                                  color: Colors.orange, size: 18),
                              const SizedBox(width: 6),
                              const Text(
                                "Demo Mode — Your OTP Code",
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: Colors.orange),
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: () => setState(
                                        () => _otpVisible = !_otpVisible),
                                child: Text(
                                  _otpVisible ? "Hide" : "Show",
                                  style: const TextStyle(
                                    color: Color(0xFF1976D2),
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Center(
                            child: _otpVisible
                                ? Row(
                              mainAxisAlignment:
                              MainAxisAlignment.center,
                              children: _generatedOtp
                                  .split('')
                                  .map((d) => Container(
                                margin: const EdgeInsets
                                    .symmetric(horizontal: 4),
                                padding: const EdgeInsets
                                    .symmetric(
                                    horizontal: 10,
                                    vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.orange
                                      .shade100,
                                  borderRadius:
                                  BorderRadius.circular(
                                      6),
                                  border: Border.all(
                                      color: Colors
                                          .orange.shade300),
                                ),
                                child: Text(
                                  d,
                                  style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight:
                                      FontWeight.bold,
                                      color: Colors.deepOrange,
                                      letterSpacing: 2),
                                ),
                              ))
                                  .toList(),
                            )
                                : const Text(
                              "● ● ● ● ● ●",
                              style: TextStyle(
                                  fontSize: 20,
                                  color: Colors.orange,
                                  letterSpacing: 4),
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Center(
                            child: Text(
                              "This box is for testing only.\nRemove it when backend is ready.",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 11, color: Colors.black45),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    // ── OTP Input label ──────────────────────
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        "Enter 6-digit OTP",
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // ── 6 digit boxes ─────────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(6, (i) {
                        return SizedBox(
                          width: 46,
                          height: 56,
                          child: TextField(
                            controller: _controllers[i],
                            focusNode: _focusNodes[i],
                            textAlign: TextAlign.center,
                            keyboardType: TextInputType.number,
                            maxLength: 1,
                            style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold),
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly
                            ],
                            decoration: InputDecoration(
                              counterText: "",
                              contentPadding: EdgeInsets.zero,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide:
                                const BorderSide(color: Colors.grey),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: const BorderSide(
                                    color: Color(0xFF1976D2), width: 2),
                              ),
                              filled: true,
                              fillColor: Colors.grey.shade100,
                            ),
                            onChanged: (value) {
                              if (value.isNotEmpty && i < 5) {
                                _focusNodes[i + 1].requestFocus();
                              } else if (value.isEmpty && i > 0) {
                                _focusNodes[i - 1].requestFocus();
                              }
                              if (_enteredOtp.length == 6) {
                                _verifyOtp();
                              }
                            },
                          ),
                        );
                      }),
                    ),

                    const SizedBox(height: 28),

                    // ── Verify Button ─────────────────────────
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D47A1),
                          padding:
                          const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: _isVerifying ? null : _verifyOtp,
                        child: _isVerifying
                            ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2),
                        )
                            : const Text(
                          "VERIFY OTP",
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── Resend countdown ──────────────────────
                    if (_secondsLeft > 0)
                      Text(
                        "Resend OTP in $_secondsLeft seconds",
                        style: const TextStyle(
                            color: Colors.black45, fontSize: 13),
                      )
                    else
                      GestureDetector(
                        onTap: _resendOtp,
                        child: const Text(
                          "Didn't receive the code? Resend OTP",
                          style: TextStyle(
                            color: Color(0xFF1976D2),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),

                    const SizedBox(height: 16),

                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text(
                        "← Go back",
                        style: TextStyle(color: Colors.black45),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}