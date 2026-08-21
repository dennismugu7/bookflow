# bookflow_api.api.PublicApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createSalonBooking**](PublicApi.md#createsalonbooking) | **POST** /v1/public/salons/{handle}/bookings | Book a slot
[**getPublicSalon**](PublicApi.md#getpublicsalon) | **GET** /v1/public/salons/{handle} | A published salon’s booking page
[**getSalonAvailability**](PublicApi.md#getsalonavailability) | **GET** /v1/public/salons/{handle}/availability | Bookable start times for one service on one day


# **createSalonBooking**
> BookingReceipt createSalonBooking(handle)

Book a slot

Unauthenticated, multipart/form-data. Fields: serviceId, startsAt (ISO 8601), clientName, clientEmail, clientPhone, optional teamMemberId, optional paymentProof (JPEG or PNG, 5 MB). The service name, duration and price are snapshotted from the service row at booking time (ADR-006) and never taken from the request. A slot taken concurrently answers 409 slot-taken — that race is what the database exclusion constraint exists for, and the client should re-read availability.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getPublicApi();
final String handle = handle_example; // String | 

try {
    final response = api.createSalonBooking(handle);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PublicApi->createSalonBooking: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **handle** | **String**|  | 

### Return type

[**BookingReceipt**](BookingReceipt.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPublicSalon**
> PublicSalon getPublicSalon(handle)

A published salon’s booking page

Unauthenticated. Returns an allowlist projection — no ids beyond the service and team-member ids booking will reference, no owner, no timestamps. A handle that does not exist and a salon that is not published are the same 404, deliberately: distinguishing them would let anyone enumerate unpublished salons by name.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getPublicApi();
final String handle = handle_example; // String | 

try {
    final response = api.getPublicSalon(handle);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PublicApi->getPublicSalon: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **handle** | **String**|  | 

### Return type

[**PublicSalon**](PublicSalon.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSalonAvailability**
> Availability getSalonAvailability(serviceId, date, handle, teamMemberId)

Bookable start times for one service on one day

Unauthenticated. Slots are on a 30-minute grid anchored to the opening time, and a slot is offered only when the service fits before closing AND nothing already occupies it — matching the exclusion constraint exactly, so an offered slot does not 409. Times are Africa/Nairobi (ADR-005). A past date or one beyond 60 days is refused as validation-failed rather than answered with an empty list.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getPublicApi();
final String serviceId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String date = date_example; // String | A date in the salon’s local calendar (Africa/Nairobi).
final String handle = handle_example; // String | 
final String teamMemberId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getSalonAvailability(serviceId, date, handle, teamMemberId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PublicApi->getSalonAvailability: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serviceId** | **String**|  | 
 **date** | **String**| A date in the salon’s local calendar (Africa/Nairobi). | 
 **handle** | **String**|  | 
 **teamMemberId** | **String**|  | [optional] 

### Return type

[**Availability**](Availability.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

