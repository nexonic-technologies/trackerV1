import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cached_avatar.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _taskAlerts = true;
  bool _ticketAlerts = true;
  bool _feedsAlerts = true;
  bool _approvalAlerts = true;
  bool _prefLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotificationPreferences();
  }

  Future<void> _loadNotificationPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) {
        setState(() {
          _taskAlerts = prefs.getBool('pref_task_alerts') ?? true;
          _ticketAlerts = prefs.getBool('pref_ticket_alerts') ?? true;
          _feedsAlerts = prefs.getBool('pref_feeds_alerts') ?? true;
          _approvalAlerts = prefs.getBool('pref_approval_alerts') ?? true;
          _prefLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _prefLoading = false);
    }
  }

  Future<void> _togglePref(String key, bool val) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, val);
      setState(() {
        if (key == 'pref_task_alerts') _taskAlerts = val;
        if (key == 'pref_ticket_alerts') _ticketAlerts = val;
        if (key == 'pref_feeds_alerts') _feedsAlerts = val;
        if (key == 'pref_approval_alerts') _approvalAlerts = val;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final nav = context.watch<NavigationProvider>();
    final user = auth.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final name = user?.name ?? 'User';
    final role = user?.role ?? user?.userType ?? 'Employee';
    final email = user?.workEmail ?? 'No email associated';
    final dept = user?.department ?? 'General';
    final desig = user?.designation ?? 'Team Member';

    final isAdminOrManager =
        role == 'superadmin' || user?.userType == 'manager';

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Profile Card Header
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 24.0,
                  horizontal: 16.0,
                ),
                child: Column(
                  children: [
                    // Avatar
                    CachedAvatar(
                      name: name,
                      imageUrl: user?.profileImage,
                      radius: 46,
                    ),
                    const SizedBox(height: 16),

                    // Name
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkInk : AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Designation tag
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.brandSolid.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        desig,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.brandSolid,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Profile info details list
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _buildInfoTile(
                      context,
                      Icons.mail_outline_rounded,
                      'Work Email',
                      email,
                      isDark,
                    ),
                    const Divider(height: 24),
                    _buildInfoTile(
                      context,
                      Icons.business_rounded,
                      'Department',
                      dept,
                      isDark,
                    ),
                    const Divider(height: 24),
                    _buildInfoTile(
                      context,
                      Icons.shield_outlined,
                      'System Role',
                      role,
                      isDark,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Notification preferences settings
            if (!_prefLoading) ...[
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.border,
                  ),
                ),
                color: isDark ? AppColors.darkSurface0 : Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Notification Alerts',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.darkInkSubtle
                              : AppColors.inkSubtle,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildSwitchTile(
                        'Task Assignments',
                        _taskAlerts,
                        Icons.task_alt_rounded,
                        (val) {
                          _togglePref('pref_task_alerts', val);
                        },
                        isDark,
                      ),
                      const Divider(height: 16),
                      _buildSwitchTile(
                        'Ticket Updates',
                        _ticketAlerts,
                        Icons.confirmation_number_outlined,
                        (val) {
                          _togglePref('pref_ticket_alerts', val);
                        },
                        isDark,
                      ),
                      const Divider(height: 16),
                      _buildSwitchTile(
                        'Company Feeds',
                        _feedsAlerts,
                        Icons.feed_outlined,
                        (val) {
                          _togglePref('pref_feeds_alerts', val);
                        },
                        isDark,
                      ),
                      if (isAdminOrManager) ...[
                        const Divider(height: 16),
                        _buildSwitchTile(
                          'Leave Requests & Approvals',
                          _approvalAlerts,
                          Icons.assignment_turned_in_outlined,
                          (val) {
                            _togglePref('pref_approval_alerts', val);
                          },
                          isDark,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // General Settings Card (Theme Toggle)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    // Theme Toggle
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        isDark
                            ? Icons.dark_mode_rounded
                            : Icons.light_mode_rounded,
                        color: AppColors.brandSolid,
                      ),
                      title: Text(
                        'Dark Theme Mode',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkInk : AppColors.ink,
                        ),
                      ),
                      trailing: Switch(
                        value: isDark,
                        onChanged: (val) {
                          nav.toggleTheme();
                        },
                        activeThumbColor: AppColors.brandSolid,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => auth.logout(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Logout'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
    String label,
    bool value,
    IconData icon,
    ValueChanged<bool> onChanged,
    bool isDark,
  ) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      leading: Icon(icon, size: 20, color: AppColors.brandSolid),
      title: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: isDark ? AppColors.darkInk : AppColors.ink,
        ),
      ),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeThumbColor: AppColors.brandSolid,
      ),
    );
  }

  Widget _buildInfoTile(
    BuildContext context,
    IconData icon,
    String label,
    String value,
    bool isDark,
  ) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkInk : AppColors.ink,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// Simple extension helper for OutlinedButton
extension _OutlinedButtonExtension on OutlinedButton {
  Widget onPressed(VoidCallback callback) {
    return OutlinedButton(
      style: style,
      onPressed: callback,
      child: child ?? const Text('Logout'),
    );
  }
}
