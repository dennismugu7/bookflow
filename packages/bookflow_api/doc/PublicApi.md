# bookflow_api.api.PublicApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getPublicSalon**](PublicApi.md#getpublicsalon) | **GET** /v1/public/salons/{handle} | A published salon’s booking page


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

