# bookflow_api.api.MeApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getMe**](MeApi.md#getme) | **GET** /v1/me | The authenticated owner&#39;s profile
[**getMyBusiness**](MeApi.md#getmybusiness) | **GET** /v1/me/business | The caller&#39;s own business


# **getMe**
> Profile getMe()

The authenticated owner's profile

Screen #20 renders this. Keyed by the caller's own id, so it does not exercise the membership scoping rule — see GET /v1/businesses/{businessId}.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMeApi();

try {
    final response = api.getMe();
    print(response);
} catch on DioException (e) {
    print('Exception when calling MeApi->getMe: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**Profile**](Profile.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getMyBusiness**
> Business getMyBusiness()

The caller's own business

Answers \"do I have a business, and which one\" without needing its id. A 404 means the account has not created one yet — an ordinary state, not an error. Clients must not surface it as a failure.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMeApi();

try {
    final response = api.getMyBusiness();
    print(response);
} catch on DioException (e) {
    print('Exception when calling MeApi->getMyBusiness: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**Business**](Business.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

