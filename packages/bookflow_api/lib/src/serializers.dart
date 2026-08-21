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

import 'package:bookflow_api/src/model/availability.dart';
import 'package:bookflow_api/src/model/availability_input.dart';
import 'package:bookflow_api/src/model/booking_receipt.dart';
import 'package:bookflow_api/src/model/booking_receipt_input.dart';
import 'package:bookflow_api/src/model/business.dart';
import 'package:bookflow_api/src/model/business_input.dart';
import 'package:bookflow_api/src/model/contact.dart';
import 'package:bookflow_api/src/model/contact_input.dart';
import 'package:bookflow_api/src/model/create_business_request.dart';
import 'package:bookflow_api/src/model/create_business_request_input.dart';
import 'package:bookflow_api/src/model/create_service_request.dart';
import 'package:bookflow_api/src/model/create_service_request_input.dart';
import 'package:bookflow_api/src/model/create_team_member_request.dart';
import 'package:bookflow_api/src/model/create_team_member_request_input.dart';
import 'package:bookflow_api/src/model/health_response.dart';
import 'package:bookflow_api/src/model/health_response_input.dart';
import 'package:bookflow_api/src/model/opening_hours_entry.dart';
import 'package:bookflow_api/src/model/opening_hours_entry_input.dart';
import 'package:bookflow_api/src/model/owner_booking.dart';
import 'package:bookflow_api/src/model/owner_booking_input.dart';
import 'package:bookflow_api/src/model/payment_proof.dart';
import 'package:bookflow_api/src/model/payment_proof_input.dart';
import 'package:bookflow_api/src/model/portfolio_image.dart';
import 'package:bookflow_api/src/model/portfolio_image_input.dart';
import 'package:bookflow_api/src/model/profile.dart';
import 'package:bookflow_api/src/model/profile_input.dart';
import 'package:bookflow_api/src/model/public_opening_hours.dart';
import 'package:bookflow_api/src/model/public_opening_hours_input.dart';
import 'package:bookflow_api/src/model/public_salon.dart';
import 'package:bookflow_api/src/model/public_salon_input.dart';
import 'package:bookflow_api/src/model/public_service.dart';
import 'package:bookflow_api/src/model/public_service_input.dart';
import 'package:bookflow_api/src/model/public_team_member.dart';
import 'package:bookflow_api/src/model/public_team_member_input.dart';
import 'package:bookflow_api/src/model/published_business.dart';
import 'package:bookflow_api/src/model/published_business_input.dart';
import 'package:bookflow_api/src/model/rename_business_request.dart';
import 'package:bookflow_api/src/model/rename_business_request_input.dart';
import 'package:bookflow_api/src/model/replace_opening_hours_request.dart';
import 'package:bookflow_api/src/model/replace_opening_hours_request_input.dart';
import 'package:bookflow_api/src/model/service.dart';
import 'package:bookflow_api/src/model/service_input.dart';
import 'package:bookflow_api/src/model/signup_accepted.dart';
import 'package:bookflow_api/src/model/signup_accepted_input.dart';
import 'package:bookflow_api/src/model/signup_request.dart';
import 'package:bookflow_api/src/model/signup_request_input.dart';
import 'package:bookflow_api/src/model/team_member.dart';
import 'package:bookflow_api/src/model/team_member_input.dart';
import 'package:bookflow_api/src/model/update_service_request.dart';
import 'package:bookflow_api/src/model/update_service_request_input.dart';
import 'package:bookflow_api/src/model/update_team_member_request.dart';
import 'package:bookflow_api/src/model/update_team_member_request_input.dart';
import 'package:bookflow_api/src/model/uploaded_image.dart';
import 'package:bookflow_api/src/model/uploaded_image_input.dart';

part 'serializers.g.dart';

@SerializersFor([
  Availability,
  AvailabilityInput,
  BookingReceipt,
  BookingReceiptInput,
  Business,
  BusinessInput,
  Contact,
  ContactInput,
  CreateBusinessRequest,
  CreateBusinessRequestInput,
  CreateServiceRequest,
  CreateServiceRequestInput,
  CreateTeamMemberRequest,
  CreateTeamMemberRequestInput,
  HealthResponse,
  HealthResponseInput,
  OpeningHoursEntry,
  OpeningHoursEntryInput,
  OwnerBooking,
  OwnerBookingInput,
  PaymentProof,
  PaymentProofInput,
  PortfolioImage,
  PortfolioImageInput,
  Profile,
  ProfileInput,
  PublicOpeningHours,
  PublicOpeningHoursInput,
  PublicSalon,
  PublicSalonInput,
  PublicService,
  PublicServiceInput,
  PublicTeamMember,
  PublicTeamMemberInput,
  PublishedBusiness,
  PublishedBusinessInput,
  RenameBusinessRequest,
  RenameBusinessRequestInput,
  ReplaceOpeningHoursRequest,
  ReplaceOpeningHoursRequestInput,
  Service,
  ServiceInput,
  SignupAccepted,
  SignupAcceptedInput,
  SignupRequest,
  SignupRequestInput,
  TeamMember,
  TeamMemberInput,
  UpdateServiceRequest,
  UpdateServiceRequestInput,
  UpdateTeamMemberRequest,
  UpdateTeamMemberRequestInput,
  UploadedImage,
  UploadedImageInput,
])
Serializers serializers = (_$serializers.toBuilder()
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Contact)]),
        () => ListBuilder<Contact>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(TeamMember)]),
        () => ListBuilder<TeamMember>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Service)]),
        () => ListBuilder<Service>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(OwnerBooking)]),
        () => ListBuilder<OwnerBooking>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(PortfolioImage)]),
        () => ListBuilder<PortfolioImage>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(OpeningHoursEntry)]),
        () => ListBuilder<OpeningHoursEntry>(),
      )
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer()))
    .build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
