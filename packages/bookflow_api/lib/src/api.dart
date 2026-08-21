//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'package:dio/dio.dart';
import 'package:built_value/serializer.dart';
import 'package:bookflow_api/src/serializers.dart';
import 'package:bookflow_api/src/auth/api_key_auth.dart';
import 'package:bookflow_api/src/auth/basic_auth.dart';
import 'package:bookflow_api/src/auth/bearer_auth.dart';
import 'package:bookflow_api/src/auth/oauth.dart';
import 'package:bookflow_api/src/api/auth_api.dart';
import 'package:bookflow_api/src/api/bookings_api.dart';
import 'package:bookflow_api/src/api/businesses_api.dart';
import 'package:bookflow_api/src/api/health_api.dart';
import 'package:bookflow_api/src/api/me_api.dart';
import 'package:bookflow_api/src/api/media_api.dart';
import 'package:bookflow_api/src/api/opening_hours_api.dart';
import 'package:bookflow_api/src/api/public_api.dart';
import 'package:bookflow_api/src/api/publishing_api.dart';
import 'package:bookflow_api/src/api/services_api.dart';
import 'package:bookflow_api/src/api/team_api.dart';

class BookflowApi {
  static const String basePath = r'http://localhost';

  final Dio dio;
  final Serializers serializers;

  BookflowApi({
    Dio? dio,
    Serializers? serializers,
    String? basePathOverride,
    List<Interceptor>? interceptors,
  })  : this.serializers = serializers ?? standardSerializers,
        this.dio = dio ??
            Dio(BaseOptions(
              baseUrl: basePathOverride ?? basePath,
              connectTimeout: const Duration(milliseconds: 5000),
              receiveTimeout: const Duration(milliseconds: 3000),
            )) {
    if (interceptors == null) {
      this.dio.interceptors.addAll([
        OAuthInterceptor(),
        BasicAuthInterceptor(),
        BearerAuthInterceptor(),
        ApiKeyAuthInterceptor(),
      ]);
    } else {
      this.dio.interceptors.addAll(interceptors);
    }
  }

  void setOAuthToken(String name, String token) {
    if (this.dio.interceptors.any((i) => i is OAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is OAuthInterceptor)
              as OAuthInterceptor)
          .tokens[name] = token;
    }
  }

  void setBearerAuth(String name, String token) {
    if (this.dio.interceptors.any((i) => i is BearerAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BearerAuthInterceptor)
              as BearerAuthInterceptor)
          .tokens[name] = token;
    }
  }

  void setBasicAuth(String name, String username, String password) {
    if (this.dio.interceptors.any((i) => i is BasicAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BasicAuthInterceptor)
              as BasicAuthInterceptor)
          .authInfo[name] = BasicAuthInfo(username, password);
    }
  }

  void setApiKey(String name, String apiKey) {
    if (this.dio.interceptors.any((i) => i is ApiKeyAuthInterceptor)) {
      (this
                  .dio
                  .interceptors
                  .firstWhere((element) => element is ApiKeyAuthInterceptor)
              as ApiKeyAuthInterceptor)
          .apiKeys[name] = apiKey;
    }
  }

  /// Get AuthApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AuthApi getAuthApi() {
    return AuthApi(dio, serializers);
  }

  /// Get BookingsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  BookingsApi getBookingsApi() {
    return BookingsApi(dio, serializers);
  }

  /// Get BusinessesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  BusinessesApi getBusinessesApi() {
    return BusinessesApi(dio, serializers);
  }

  /// Get HealthApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  HealthApi getHealthApi() {
    return HealthApi(dio, serializers);
  }

  /// Get MeApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  MeApi getMeApi() {
    return MeApi(dio, serializers);
  }

  /// Get MediaApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  MediaApi getMediaApi() {
    return MediaApi(dio, serializers);
  }

  /// Get OpeningHoursApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  OpeningHoursApi getOpeningHoursApi() {
    return OpeningHoursApi(dio, serializers);
  }

  /// Get PublicApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  PublicApi getPublicApi() {
    return PublicApi(dio, serializers);
  }

  /// Get PublishingApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  PublishingApi getPublishingApi() {
    return PublishingApi(dio, serializers);
  }

  /// Get ServicesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ServicesApi getServicesApi() {
    return ServicesApi(dio, serializers);
  }

  /// Get TeamApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  TeamApi getTeamApi() {
    return TeamApi(dio, serializers);
  }
}
