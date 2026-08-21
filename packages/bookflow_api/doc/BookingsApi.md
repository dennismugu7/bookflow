# bookflow_api.api.BookingsApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**cancelBooking**](BookingsApi.md#cancelbooking) | **POST** /v1/me/business/bookings/{bookingId}/cancel | Cancel a booking
[**confirmBooking**](BookingsApi.md#confirmbooking) | **POST** /v1/me/business/bookings/{bookingId}/confirm | Confirm a booking
[**listMyBookings**](BookingsApi.md#listmybookings) | **GET** /v1/me/business/bookings | The salon&#39;s bookings
[**listMyContacts**](BookingsApi.md#listmycontacts) | **GET** /v1/me/business/contacts | The salon&#39;s clients
[**reinstateBooking**](BookingsApi.md#reinstatebooking) | **POST** /v1/me/business/bookings/{bookingId}/reinstate | Reinstate a booking


# **cancelBooking**
> OwnerBooking cancelBooking(bookingId)

Cancel a booking

booked or confirmed → cancelled. Emails the client. The slot becomes bookable again immediately — a cancelled booking occupies nothing.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBookingsApi();
final String bookingId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.cancelBooking(bookingId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling BookingsApi->cancelBooking: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **bookingId** | **String**|  | 

### Return type

[**OwnerBooking**](OwnerBooking.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **confirmBooking**
> OwnerBooking confirmBooking(bookingId)

Confirm a booking

booked → confirmed. Emails the client the confirmation. A booking in any other state answers 409 invalid-booking-transition.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBookingsApi();
final String bookingId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.confirmBooking(bookingId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling BookingsApi->confirmBooking: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **bookingId** | **String**|  | 

### Return type

[**OwnerBooking**](OwnerBooking.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyBookings**
> BuiltList<OwnerBooking> listMyBookings(status)

The salon's bookings

Newest start time first, optionally filtered by status. Carries the snapshot and the client’s details, which is what the salon needs to serve the appointment.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBookingsApi();
final String status = status_example; // String | 

try {
    final response = api.listMyBookings(status);
    print(response);
} catch on DioException (e) {
    print('Exception when calling BookingsApi->listMyBookings: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **String**|  | [optional] 

### Return type

[**BuiltList&lt;OwnerBooking&gt;**](OwnerBooking.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyContacts**
> BuiltList<Contact> listMyContacts()

The salon's clients

Derived from bookings — there is no contacts table to keep in step. Grouped by email, because a name is not unique and a phone number gets retyped; the name and phone shown are from that client’s most recent booking.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBookingsApi();

try {
    final response = api.listMyContacts();
    print(response);
} catch on DioException (e) {
    print('Exception when calling BookingsApi->listMyContacts: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**BuiltList&lt;Contact&gt;**](Contact.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **reinstateBooking**
> OwnerBooking reinstateBooking(bookingId)

Reinstate a booking

cancelled → booked. May answer 409 slot-taken: the slot was free while the booking was cancelled and something else may have taken it, which the exclusion constraint refuses.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBookingsApi();
final String bookingId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.reinstateBooking(bookingId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling BookingsApi->reinstateBooking: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **bookingId** | **String**|  | 

### Return type

[**OwnerBooking**](OwnerBooking.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

