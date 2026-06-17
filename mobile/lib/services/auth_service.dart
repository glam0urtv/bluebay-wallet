import 'package:flutter/foundation.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final ApiService _api = ApiService();
  User? _user;
  bool _loading = false;

  User? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;
  bool get isAdmin => _user?.isAdmin ?? false;
  bool get isMerchant => _user?.isMerchant ?? false;

  Future<void> tryAutoLogin() async {
    _loading = true;
    notifyListeners();
    try {
      final token = await ApiService.getToken();
      if (token != null) {
        final data = await _api.get('/auth/profile');
        _user = User.fromJson(data);
      }
    } catch (_) {
      await ApiService.setToken(null);
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String phone, String pin) async {
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.post('/auth/login', {
        'phone': phone,
        'pin': pin,
      });
      await ApiService.setToken(data['accessToken']);
      _user = User.fromJson(data['user']);
    } catch (e) {
      await ApiService.setToken(null);
      _user = null;
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> register(String phone, String pin, String fullName, {String? email, String? role}) async {
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.post('/auth/register', {
        'phone': phone,
        'pin': pin,
        'fullName': fullName,
        if (email != null) 'email': email,
        if (role != null) 'role': role,
      });
      await ApiService.setToken(data['accessToken']);
      _user = User.fromJson(data['user']);
    } catch (e) {
      await ApiService.setToken(null);
      _user = null;
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> registerMerchant(
    String phone, String pin, String fullName, String businessName,
    {String? businessCategory, double conversionRate = 1.0}) async {
    _loading = true;
    notifyListeners();
    try {
      final regData = await _api.post('/auth/register', {
        'phone': phone,
        'pin': pin,
        'fullName': fullName,
        'role': 'merchant',
      });
      await ApiService.setToken(regData['accessToken']);

      await _api.post('/merchants', {
        'businessName': businessName,
        if (businessCategory != null) 'businessCategory': businessCategory,
        'conversionRate': conversionRate,
      });

      final profile = await _api.get('/auth/profile');
      _user = User.fromJson(profile);
      return regData;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await ApiService.setToken(null);
    _user = null;
    notifyListeners();
  }
}
