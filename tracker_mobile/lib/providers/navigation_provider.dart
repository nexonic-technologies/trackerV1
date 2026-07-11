import 'package:flutter/material.dart';

// ─── NavigationProvider ───────────────────────────────────────────────────────
// Manages:
//   1. The currently active page index (drawer navigation)
//   2. The app ThemeMode (light / dark)

enum NavPage { dashboard, attendance, activity, tasks, tickets, profile, payroll, feeds, teams }

class NavigationProvider extends ChangeNotifier {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  NavPage _currentPage = NavPage.dashboard;
  ThemeMode _themeMode = ThemeMode.light;

  NavPage get currentPage => _currentPage;
  ThemeMode get themeMode => _themeMode;
  bool get isDark => _themeMode == ThemeMode.dark;

  String get pageTitle {
    switch (_currentPage) {
      case NavPage.dashboard:
        return 'Dashboard';
      case NavPage.attendance:
        return 'Attendance';
      case NavPage.activity:
        return 'Activity Tracker';
      case NavPage.tasks:
        return 'Tasks';
      case NavPage.tickets:
        return 'Tickets';
      case NavPage.profile:
        return 'My Profile';
      case NavPage.payroll:
        return 'My Payslips';
      case NavPage.feeds:
        return 'Company Feed';
      case NavPage.teams:
        return 'Teams';
    }
  }

  void navigateTo(NavPage page) {
    if (_currentPage == page) return;
    _currentPage = page;
    notifyListeners();
  }

  void toggleTheme() {
    _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }
}
