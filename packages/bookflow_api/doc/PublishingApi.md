# bookflow_api.api.PublishingApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**publishMyBusiness**](PublishingApi.md#publishmybusiness) | **POST** /v1/me/business/publish | Publish the salon


# **publishMyBusiness**
> PublishedBusiness publishMyBusiness()

Publish the salon

Requires a name, at least one service and at least one open day; otherwise 409 publish-requirements-not-met, which names nothing the caller does not already have. On success the business becomes publicly readable and is assigned a permanent handle (ADR-021), derived from the name with a random suffix on collision. Idempotent: publishing an already-published salon returns the handle it already has and never mints a second.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getPublishingApi();

try {
    final response = api.publishMyBusiness();
    print(response);
} catch on DioException (e) {
    print('Exception when calling PublishingApi->publishMyBusiness: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**PublishedBusiness**](PublishedBusiness.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

