import 'dart:async';
import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'uKonekChangePasswordPage.dart';

class uKonekForgotPasswordPage extends StatefulWidget {
  const uKonekForgotPasswordPage({super.key});
  @override
  State<uKonekForgotPasswordPage> createState() =>
      _uKonekForgotPasswordPageState();
}

class _uKonekForgotPasswordPageState extends State<uKonekForgotPasswordPage>
    with SingleTickerProviderStateMixin {

  // ── Step: 0 = email entry, 1 = OTP verification ──────────────
  int _step = 0;

  final emailController = TextEditingController();
  final _emailFormKey = GlobalKey<FormState>();

  // OTP
  final List<TextEditingController> _otpControllers =
  List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes =
  List.generate(6, (_) => FocusNode());
  bool _isLoadingEmail = false;
  bool _isVerifyingOtp = false;
  bool _otpError = false;

  // Resend countdown
  int _resendSeconds = 60;
  bool _canResend = false;
  Timer? _resendTimer;

  static const _primary = Color(0xFF0D47A1);
  static const _primaryLight = Color(0xFF1976D2);

  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 400));
    _fadeAnim =
        CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
  }

  @override
  void dispose() {
    emailController.dispose();
    for (var c in _otpControllers) {
      c.dispose();
    }
    for (var f in _otpFocusNodes) {
      f.dispose();
    }
    _resendTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  void _startResendTimer() {
    _resendSeconds = 60;
    _canResend = false;
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendSeconds <= 1) {
        t.cancel();
        setState(() => _canResend = true);
      } else {
        setState(() => _resendSeconds--);
      }
    });
  }

  Future<void> _sendOtp() async {
    if (!_emailFormKey.currentState!.validate()) return;
    setState(() => _isLoadingEmail = true);
    try {
      await ApiService.requestPatientOtp(
        email: emailController.text.trim(),
        purpose: 'password_reset',
      );
      if (!mounted) return;
      setState(() {
        _isLoadingEmail = false;
        _step = 1;
      });
      _startResendTimer();
      _animController
        ..reset()
        ..forward();
    } catch (error) {
      if (!mounted) return;
      setState(() => _isLoadingEmail = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
        backgroundColor: Colors.redAccent,
      ));
    }
  }

  Future<void> _resendOtp() async {
    if (!_canResend) return;
    for (var c in _otpControllers) {
      c.clear();
    }
    try {
      await ApiService.requestPatientOtp(
        email: emailController.text.trim(),
        purpose: 'password_reset',
      );
      if (!mounted) return;
      setState(() => _otpError = false);
      _startResendTimer();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("✅ New OTP sent to your email."),
        backgroundColor: Colors.green,
      ));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
        backgroundColor: Colors.redAccent,
      ));
    }
  }

  // ── Verify entered OTP ────────────────────────────────────────
  void _verifyOtp() {
    final entered = _otpControllers.map((c) => c.text).join();
    if (entered.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("Please enter the complete 6-digit OTP."),
        backgroundColor: Colors.orange,
      ));
      return;
    }

    setState(() {
      _isVerifyingOtp = true;
      _otpError = false;
    });
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => uKonekChangePasswordPage(
          email: emailController.text.trim(),
          otp: entered,
        ),
      ),
    ).then((_) {
      if (mounted) {
        setState(() => _isVerifyingOtp = false);
      }
    });
  }

  // ── Mask email for display ────────────────────────────────────
  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return email;
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 3) return "${name[0]}***@$domain";
    return "${name.substring(0, 3)}***@$domain";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: Column(
        children: [
          // ── Header ─────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                  colors: [_primary, _primaryLight],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight),
              borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32)),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                child: Row(children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 38, height: 38,
                      decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.arrow_back_ios_new_rounded,
                          color: Colors.white, size: 18),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(
                      _step == 0 ? "Forgot Password" : "Verify OTP",
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _step == 0
                          ? "We'll send a code to your email"
                          : "Enter the code sent to your email",
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12),
                    ),
                  ]),
                ]),
              ),
            ),
          ),

          Expanded(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _step == 0 ? _buildEmailStep() : _buildOtpStep(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ────────────────────────────────────────────────────────────
  // STEP 0 — Email entry
  // ────────────────────────────────────────────────────────────
  Widget _buildEmailStep() {
    return Column(
      children: [
        const SizedBox(height: 16),

        // Icon
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            color: _primary.withOpacity(0.08),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.email_outlined, color: _primary, size: 38),
        ),
        const SizedBox(height: 20),

        const Text("Reset Your Password",
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A2E))),
        const SizedBox(height: 8),
        Text(
          "Enter the email address you used during registration. We'll send you a one-time code.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Colors.grey.shade500, height: 1.5),
        ),
        const SizedBox(height: 32),

        // Email card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 20,
                offset: const Offset(0, 6))],
          ),
          child: Form(
            key: _emailFormKey,
            child: Column(
              children: [
                TextFormField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) {
                    if (v == null || v.isEmpty) return "Email is required";
                    if (!v.contains('@') || !v.contains('.')) {
                      return "Enter a valid email";
                    }
                    return null;
                  },
                  style: const TextStyle(
                      fontSize: 14, color: Color(0xFF1A1A2E)),
                  decoration: InputDecoration(
                    labelText: "Email Address",
                    labelStyle: TextStyle(
                        fontSize: 13, color: Colors.grey.shade500),
                    prefixIcon: Icon(Icons.email_outlined,
                        color: _primary.withOpacity(0.6), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFF),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                        const BorderSide(color: Color(0xFFDDE3F0))),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                        const BorderSide(color: Color(0xFFDDE3F0))),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                        const BorderSide(color: _primary, width: 1.8)),
                    errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                        const BorderSide(color: Colors.redAccent)),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                      shadowColor: _primary.withOpacity(0.4),
                    ),
                    onPressed: _isLoadingEmail ? null : _sendOtp,
                    child: _isLoadingEmail
                        ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                        : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text("SEND OTP CODE",
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                letterSpacing: 1)),
                        SizedBox(width: 8),
                        Icon(Icons.send_rounded, size: 18),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ────────────────────────────────────────────────────────────
  // STEP 1 — OTP Verification
  // ────────────────────────────────────────────────────────────
  Widget _buildOtpStep() {
    return Column(
      children: [
        const SizedBox(height: 16),

        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
              color: _primary.withOpacity(0.08), shape: BoxShape.circle),
          child: const Icon(Icons.mark_email_read_outlined,
              color: _primary, size: 38),
        ),
        const SizedBox(height: 20),

        const Text("Check Your Email",
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A2E))),
        const SizedBox(height: 8),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: TextStyle(
                fontSize: 13, color: Colors.grey.shade500, height: 1.5),
            children: [
              const TextSpan(text: "A 6-digit code was sent to\n"),
              TextSpan(
                text: _maskEmail(emailController.text),
                style: const TextStyle(
                    color: _primary, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        // OTP card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 20,
                offset: const Offset(0, 6))],
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),

              // 6 OTP boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (i) {
                  return SizedBox(
                    width: 46, height: 56,
                    child: TextFormField(
                      controller: _otpControllers[i],
                      focusNode: _otpFocusNodes[i],
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 1,
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: _otpError ? Colors.red : _primary),
                      decoration: InputDecoration(
                        counterText: "",
                        filled: true,
                        fillColor: _otpError
                            ? Colors.red.shade50
                            : const Color(0xFFF0F4FF),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                                color: _otpError
                                    ? Colors.red.shade300
                                    : const Color(0xFFBBCCEE))),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                                color: _otpError
                                    ? Colors.red.shade300
                                    : const Color(0xFFBBCCEE))),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                                color:
                                _otpError ? Colors.red : _primary,
                                width: 2)),
                      ),
                      onChanged: (val) {
                        if (_otpError) setState(() => _otpError = false);
                        if (val.isNotEmpty && i < 5) {
                          _otpFocusNodes[i + 1].requestFocus();
                        } else if (val.isEmpty && i > 0) {
                          _otpFocusNodes[i - 1].requestFocus();
                        }
                        // Auto verify on last digit
                        if (i == 5 && val.isNotEmpty) _verifyOtp();
                      },
                    ),
                  );
                }),
              ),

              const SizedBox(height: 20),

              // Resend row
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text("Didn't receive the code? ",
                    style: TextStyle(
                        fontSize: 12, color: Colors.grey.shade500)),
                GestureDetector(
                  onTap: _canResend ? () => _resendOtp() : null,
                  child: Text(
                    _canResend
                        ? "Resend OTP"
                        : "Resend in ${_resendSeconds}s",
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _canResend
                            ? _primary
                            : Colors.grey.shade400),
                  ),
                ),
              ]),

              const SizedBox(height: 20),

              // Verify button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                    shadowColor: _primary.withOpacity(0.4),
                  ),
                  onPressed: _isVerifyingOtp ? null : _verifyOtp,
                  child: _isVerifyingOtp
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text("VERIFY CODE",
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    letterSpacing: 1)),
                            SizedBox(width: 8),
                            Icon(Icons.verified_outlined, size: 18),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 14),

              // Wrong email link
              Center(
                child: GestureDetector(
                  onTap: () {
                    setState(() { _step = 0; _otpError = false; });
                    for (var c in _otpControllers) {
                      c.clear();
                    }
                    _resendTimer?.cancel();
                    _animController..reset()..forward();
                  },
                  child: const Text("← Use a different email",
                      style: TextStyle(
                          color: _primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}