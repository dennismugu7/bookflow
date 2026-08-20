# bookflow_api.api.OpeningHoursApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getMyOpeningHours**](OpeningHoursApi.md#getmyopeninghours) | **GET** /v1/me/business/opening-hours | The caller&#39;s opening hours
[**replaceMyOpeningHours**](OpeningHoursApi.md#replacemyopeninghours) | **PUT** /v1/me/business/opening-hours | Replace the week


# **getMyOpeningHours**
> BuiltList<OpeningHoursEntry> getMyOpeningHours()

The caller's opening hours

Ascending by day, 0 = Monday. An absent day is CLOSED (A6) — there is no row meaning \"shut\", only the absence of one.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getOpeningHoursApi();

try {
    final response = api.getMyOpeningHours();
    print(response);
} catch on DioException (e) {
    print('Exception when calling OpeningHoursApi->getMyOpeningHours: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**BuiltList&lt;OpeningHoursEntry&gt;**](OpeningHoursEntry.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **replaceMyOpeningHours**
> BuiltList<OpeningHoursEntry> replaceMyOpeningHours(replaceOpeningHoursRequestInput)

Replace the week

The submitted array becomes the whole week: days that are absent are removed. Applied in one statement, so a request either lands entirely or not at all — a half-applied week would be a salon open at hours nobody chose. A day may appear at most once and closeTime must be after openTime.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getOpeningHoursApi();
final ReplaceOpeningHoursRequestInput replaceOpeningHoursRequestInput = ; // ReplaceOpeningHoursRequestInput | 

try {
    final response = api.replaceMyOpeningHours(replaceOpeningHoursRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling OpeningHoursApi->replaceMyOpeningHours: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **replaceOpeningHoursRequestInput** | [**ReplaceOpeningHoursRequestInput**](ReplaceOpeningHoursRequestInput.md)|  | 

### Return type

[**BuiltList&lt;OpeningHoursEntry&gt;**](OpeningHoursEntry.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

