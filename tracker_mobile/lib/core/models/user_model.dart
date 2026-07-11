class UserModel {
  final String id;
  final String name;
  final String? role;
  final String? department;
  final String? designation;
  final String? managerId;
  final String? profileImage;
  final String platform;
  final String? userType;
  final String? clientId;
  final String? workEmail;

  UserModel({
    required this.id,
    required this.name,
    this.role,
    this.department,
    this.designation,
    this.managerId,
    this.profileImage,
    required this.platform,
    this.userType,
    this.clientId,
    this.workEmail,
  });

  static String? _safeString(dynamic val) {
    if (val == null) return null;
    if (val is String) return val;
    if (val is Map) {
      final nameOrId = val['name'] ?? val['id'] ?? val['_id'];
      if (nameOrId != null) return nameOrId.toString();
    }
    return val.toString();
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Check nested basicInfo object (employees schema structure)
    String? imgUrl = _safeString(json['profileImage']);
    if (imgUrl == null && json['basicInfo'] is Map) {
      imgUrl = _safeString(json['basicInfo']['profileImage']);
    }

    return UserModel(
  id: _safeString(json['id'] ?? json['_id']) ?? '',
  name: _safeString(json['name']) ?? '',
  role: _safeString(json['role']),
  department: _safeString(json['department']),
  designation: _safeString(json['designation']),
  managerId: _safeString(json['managerId'] ?? json['reportingManager']),
  profileImage: imgUrl,
  platform: _safeString(json['platform']) ?? 'mobile',
  userType: _safeString(json['userType']),
  clientId: _safeString(json['clientId']),
  workEmail: _safeString(
    json['workEmail'] ??
    json['email'] ??
    (json['basicInfo'] is Map ? json['basicInfo']['workEmail'] : null) ??
    (json['basicInfo'] is Map ? json['basicInfo']['email'] : null),
  ),
);
  }

  Map<String, dynamic> toJson() {
    return {
  'id': id,
  'name': name,
  'role': role,
  'department': department,
  'designation': designation,
  'managerId': managerId,
  'profileImage': profileImage,
  'platform': platform,
  'userType': userType,
  'clientId': clientId,
  'workEmail': workEmail,
};
  }
}

class UserSession {
  final String accessToken;
  final String refreshToken;
  final String sessionId;
  final UserModel user;

  UserSession({
    required this.accessToken,
    required this.refreshToken,
    required this.sessionId,
    required this.user,
  });

  factory UserSession.fromJson(Map<String, dynamic> json, Map<String, dynamic> decodedJwt) {
    return UserSession(
      accessToken: json['accessToken'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
      sessionId: json['sessionId'] ?? '',
      user: UserModel.fromJson(decodedJwt),
    );
  }
}
