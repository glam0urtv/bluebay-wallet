import 'package:flutter/foundation.dart';

class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000/api';
    }
    return 'https://tropical-primp-dingo.ngrok-free.dev/api';
  }

  static const Duration timeout = Duration(seconds: 30);
}

