import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'uKonekDashboardPage.dart';
import 'uKonekRegisterPage.dart';
import 'uKonekMenuPage.dart';
import 'services/api_service.dart';

class uKonekLoginPage extends StatefulWidget {
  const uKonekLoginPage({super.key});
  @override
  State<uKonekLoginPage> createState() => _uKonekLoginPageState();
}

class _uKonekLoginPageState extends State<uKonekLoginPage>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  static const _primary = Color(0xFF0D47A1);
  static const _primaryLight = Color(0xFF1976D2);

  late APIService _apiService;

  @override
  void initState() {
    super.initState();
    _apiService = APIService();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero)
        .animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final result = await _apiService.login(
      username: usernameController.text.trim(),
      password: passwordController.text,
    );

    setState(() => _isLoading = false);

    if (result['success']) {
      // ✅ Login successful - navigate to Dashboard
      Navigator.pushAndRemoveUntil(
        context,
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => uKonekDashboardPage(
            username: usernameController.text,
          ),
          transitionDuration: const Duration(milliseconds: 500),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
        (route) => false,
      );
    } else {
      // ❌ Login failed
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result['message'] ?? 'Login failed'),
        backgroundColor: Colors.redAccent,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: Stack(
        children: [
          // ── Blue gradient top half ─────────────────────────────
          Container(
            height: size.height * 0.42,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [_primary, _primaryLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),

          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      // ── Top branding ──────────────────────────
                      Padding(
                        padding: const EdgeInsets.fromLTRB(28, 28, 28, 0),
                        child: Column(
                          children: [
                            Row(children: [
                              GestureDetector(
                                onTap: () => Navigator.pushAndRemoveUntil(
                                  context,
                                  MaterialPageRoute(builder: (_) => const uKonekMenuPage()),
                                      (route) => false,
                                ),
                                child: Container(
                                  width: 38, height: 38,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.18),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                                ),
                              ),
                            ]),
                            const SizedBox(height: 24),
                            Container(
                              width: 70, height: 70,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 8))],
                              ),
                              child: const Icon(Icons.favorite_rounded, color: _primary, size: 34),
                            ),
                            const SizedBox(height: 14),
                            const Text("Welcome Back", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            const Text("Sign in to your U-Konek account", style: TextStyle(color: Colors.white70, fontSize: 13)),
                            const SizedBox(height: 36),
                          ],
                        ),
                      ),

                      // ── White card ────────────────────────────
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 30, offset: const Offset(0, 10))],
                        ),
                        padding: const EdgeInsets.all(28),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("Sign In", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E))),
                              const SizedBox(height: 4),
                              Text("Enter your credentials to continue", style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                              const SizedBox(height: 24),

                              // Username field
                              _inputField(
                                label: "Username",
                                controller: usernameController,
                                icon: Icons.person_outline_rounded,
                                validator: (v) => (v == null || v.isEmpty) ? "Username is required" : null,
                              ),
                              const SizedBox(height: 14),

                              // Password field
                              _inputField(
                                label: "Password",
                                controller: passwordController,
                                icon: Icons.lock_outline_rounded,
                                obscure: _obscurePassword,
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    size: 20,
                                    color: Colors.grey.shade400,
                                  ),
                                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                ),
                                validator: (v) => (v == null || v.isEmpty) ? "Password is required" : null,
                              ),

                              // Forgot password
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text("Coming soon.")),
                                  ),
                                  child: const Text("Forgot password?",
                                      style: TextStyle(color: _primary, fontSize: 12, fontWeight: FontWeight.w600)),
                                ),
                              ),

                              const SizedBox(height: 8),

                              // 🧪 Demo hint box
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: Colors.amber.shade50,
                                  border: Border.all(color: Colors.amber.shade300),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(children: [
                                  Icon(Icons.info_outline_rounded, color: Colors.amber.shade700, size: 18),
                                  const SizedBox(width: 8),
                                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text("Demo credentials", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade800)),
                                    const SizedBox(height: 2),
                                    Text("Username: testuser  •  Password: 123456",
                                        style: TextStyle(fontSize: 11, color: Colors.amber.shade700)),
                                  ]),
                                ]),
                              ),

                              const SizedBox(height: 16),

                              // Sign in button
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    elevation: 4,
                                    shadowColor: _primary.withOpacity(0.4),
                                  ),
                                  onPressed: _isLoading ? null : login,
                                  child: _isLoading
                                      ? const SizedBox(width: 20, height: 20,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                      : const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                    Text("SIGN IN", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1.5)),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward_rounded, size: 18),
                                  ]),
                                ),
                              ),

                              const SizedBox(height: 24),

                              // Register link
                              Center(
                                child: RichText(
                                  text: TextSpan(
                                    style: const TextStyle(fontSize: 13, color: Colors.black54),
                                    children: [
                                      const TextSpan(text: "Don't have an account? "),
                                      TextSpan(
                                        text: "Register here",
                                        style: const TextStyle(color: _primary, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                                        recognizer: TapGestureRecognizer()..onTap = () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(builder: (_) => const uKonekRegisterPage()),
                                          );
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _inputField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    bool obscure = false,
    Widget? suffixIcon,
    required String? Function(String?) validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      validator: validator,
      style: const TextStyle(fontSize: 14, color: Color(0xFF1A1A2E)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: 13, color: Colors.grey.shade500),
        prefixIcon: Icon(icon, color: _primary.withOpacity(0.6), size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: const Color(0xFFF8FAFF),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDDE3F0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDDE3F0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: _primary, width: 1.8)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Colors.redAccent)),
      ),
    );
  }
}