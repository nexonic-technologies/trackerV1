import 'package:flutter/material.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:dio/dio.dart';
import '../core/models/user_model.dart';
import '../services/api.dart';
import '../services/socket_service.dart';
import '../services/fcm_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  bool _isAuthenticated = false;
  bool _isLoading = true;
  String? _errorMessage;
  UserModel? _user;
  Set<String> _capabilities = {};

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  UserModel? get user => _user;
  Set<String> get capabilities => _capabilities;

  bool hasCapability(String cap) {
    if (_user?.role == 'superadmin' || _user?.userType == 'superadmin') {
      return true;
    }
    return _capabilities.contains(cap);
  }

  AuthProvider() {
    checkAuthStatus();
  }

  // --- Auto-Login Check ---
  Future<void> checkAuthStatus() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _apiService.getAccessToken();
      if (token == null) {
        _isAuthenticated = false;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Check if access token is expired
      bool isExpired = false;
      try {
        isExpired = JwtDecoder.isExpired(token);
      } catch (_) {
        isExpired = true;
      }

      if (isExpired) {
        // Attempt refresh
        final refreshed = await _apiService.refreshAuthTokens();
        if (!refreshed) {
          _isAuthenticated = false;
          _user = null;
          _isLoading = false;
          notifyListeners();
          return;
        }
      }

      // Read current token (might be new after refresh)
      final activeToken = await _apiService.getAccessToken();
      if (activeToken != null) {
        try {
          final meResponse = await _apiService.getMe();
          if (meResponse.statusCode == 200 || meResponse.statusCode == 304) {
            if (meResponse.statusCode == 200 && meResponse.data != null) {
              final userMap = Map<String, dynamic>.from(meResponse.data['user']);
              _user = UserModel.fromJson(userMap);
            } else {
              // 304 Not Modified: decode valid stored activeToken to populate user info
              final decodedToken = JwtDecoder.decode(activeToken);
              _user = UserModel.fromJson(decodedToken);
            }
            _isAuthenticated = true;

            // Fetch capabilities context
            await fetchUserCapabilities();

            // Initialize background socket and push integrations
            final sessionId = await _apiService.getSessionId() ?? '';
            _initializeServices(_user!.id, sessionId);
          } else {
            await _apiService.clearAuthData();
            _isAuthenticated = false;
            _user = null;
            _capabilities.clear();
          }
        } catch (e, stackTrace) {
          debugPrint("getMe API request or JSON parsing failed: $e\n$stackTrace");
          // If the server explicitly responded with an Auth failure, reject it.
          // Otherwise (e.g. server is down / network issue), fallback to local JWT decode.
          bool isAuthError = false;
          if (e is DioException) {
            final statusCode = e.response?.statusCode;
            if (statusCode == 401 || statusCode == 403 || statusCode == 404) {
              isAuthError = true;
            }
          }

          if (isAuthError) {
            await _apiService.clearAuthData();
            _isAuthenticated = false;
            _user = null;
          } else {
            try {
              final decodedToken = JwtDecoder.decode(activeToken);
              _user = UserModel.fromJson(decodedToken);
              _isAuthenticated = true;
              
              // Fetch capabilities context
              await fetchUserCapabilities();

              final sessionId = await _apiService.getSessionId() ?? '';
              _initializeServices(_user!.id, sessionId);
            } catch (err, localStack) {
              debugPrint("Fallback local JWT decode/parsing failed: $err\n$localStack");
              await _apiService.clearAuthData();
              _isAuthenticated = false;
              _user = null;
              _capabilities.clear();
            }
          }
        }
      } else {
        _isAuthenticated = false;
        _user = null;
      }
    } catch (e) {
      _isAuthenticated = false;
      _user = null;
      _capabilities.clear();
      _errorMessage = "Auth check failed: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Login Action ---
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.login(email, password);
      
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final accessToken = data['accessToken'];
        final refreshToken = data['refreshToken'];
        final sessionId = data['sessionId'];

        if (accessToken != null && refreshToken != null) {
          // Decode JWT for user profile info
          final decodedToken = JwtDecoder.decode(accessToken);
          _user = UserModel.fromJson(decodedToken);
          
          // Save tokens
          await _apiService.saveAuthData(
            accessToken: accessToken,
            refreshToken: refreshToken,
            sessionId: sessionId ?? '',
          );

          _isAuthenticated = true;
          _errorMessage = null;

          // Fetch capabilities context
          await fetchUserCapabilities();

          // Initialize background connections
          _initializeServices(_user!.id, sessionId ?? '');
          return true;
        }
      }
      _errorMessage = "Login failed: Invalid server response";
      return false;
    } catch (e) {
      _errorMessage = _parseError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Sign Up Action ---
  Future<bool> signup(String name, String email, String password, String department) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Mock signup for UI presentation, as the backend does not provide a public self-signup endpoint.
      // In the future, this can invoke _apiService.signup(...)
      await Future.delayed(const Duration(seconds: 1));
      
      // Let's show a success flag so the user is guided to log in.
      _errorMessage = null;
      return true;
    } catch (e) {
      _errorMessage = _parseError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Logout Action ---
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.logout();
    } catch (_) {
      // Force local logout even if network request fails
      await _apiService.clearAuthData();
    } finally {
      _user = null;
      _isAuthenticated = false;
      _capabilities.clear();
      _isLoading = false;
      SocketService().disconnect();
      notifyListeners();
    }
  }

  Future<void> fetchUserCapabilities() async {
    try {
      final response = await _apiService.dio.get('/auth/me/context');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'];
        if (data != null && data['capabilities'] != null) {
          final capsList = List<dynamic>.from(data['capabilities']);
          _capabilities = capsList.map((c) => c.toString()).toSet();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint("fetchUserCapabilities failed: $e");
    }
  }

  // Helper: Start sockets and register push notifications
  void _initializeServices(String userId, String sessionId) {
    // 1. Init Socket Room connection
    SocketService().init(userId);

    // 2. Init Firebase Cloud Messaging & register token
    FcmService().init().then((_) {
      if (sessionId.isNotEmpty) {
        FcmService().getFcmTokenAndRegister(sessionId);
      }
    });
  }

  String _parseError(dynamic error) {
    if (error is Exception) {
      final str = error.toString();
      if (str.contains('401')) {
        return "Invalid email or password.";
      }
      if (str.contains('Timeout') || str.contains('SocketException')) {
        return "Server is unreachable. Please check your internet connection.";
      }
    }
    return "Authentication failed. Please try again.";
  }
}
