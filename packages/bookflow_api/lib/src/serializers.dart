//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_import

import 'package:one_of_serializer/any_of_serializer.dart';
import 'package:one_of_serializer/one_of_serializer.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:built_value/standard_json_plugin.dart';
import 'package:built_value/iso_8601_date_time_serializer.dart';
import 'package:bookflow_api/src/date_serializer.dart';
import 'package:bookflow_api/src/model/date.dart';

import 'package:bookflow_api/src/model/business.dart';
import 'package:bookflow_api/src/model/business_input.dart';
import 'package:bookflow_api/src/model/create_business_request.dart';
import 'package:bookflow_api/src/model/create_business_request_input.dart';
import 'package:bookflow_api/src/model/health_response.dart';
import 'package:bookflow_api/src/model/health_response_input.dart';
import 'package:bookflow_api/src/model/profile.dart';
import 'package:bookflow_api/src/model/profile_input.dart';
import 'package:bookflow_api/src/model/rename_business_request.dart';
import 'package:bookflow_api/src/model/rename_business_request_input.dart';
import 'package:bookflow_api/src/model/signup_accepted.dart';
import 'package:bookflow_api/src/model/signup_accepted_input.dart';
import 'package:bookflow_api/src/model/signup_request.dart';
import 'package:bookflow_api/src/model/signup_request_input.dart';

part 'serializers.g.dart';

@SerializersFor([
  Business,
  BusinessInput,
  CreateBusinessRequest,
  CreateBusinessRequestInput,
  HealthResponse,
  HealthResponseInput,
  Profile,
  ProfileInput,
  RenameBusinessRequest,
  RenameBusinessRequestInput,
  SignupAccepted,
  SignupAcceptedInput,
  SignupRequest,
  SignupRequestInput,
])
Serializers serializers = (_$serializers.toBuilder()
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer()))
    .build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
