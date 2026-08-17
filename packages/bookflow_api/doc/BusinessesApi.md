# bookflow_api.api.BusinessesApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getBusiness**](BusinessesApi.md#getbusiness) | **GET** /v1/businesses/{businessId} | A business the caller belongs to
[**renameBusiness**](BusinessesApi.md#renamebusiness) | **PATCH** /v1/businesses/{businessId} | Rename a business the caller belongs to


# **getBusiness**
> Business getBusiness(businessId)

A business the caller belongs to

Scoped through membership: user → membership → business. A business the caller has no membership in is indistinguishable from one that does not exist.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBusinessesApi();
final String businessId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getBusiness(businessId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling BusinessesApi->getBusiness: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **businessId** | **String**|  | 

### Return type

[**Business**](Business.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **renameBusiness**
> Business renameBusiness(businessId, renameBusinessRequestInput)

Rename a business the caller belongs to

The name is the only editable field. Scoped through membership: a business the caller has no membership in is indistinguishable from one that does not exist. The name is trimmed before it is stored.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getBusinessesApi();
final String businessId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final RenameBusinessRequestInput renameBusinessRequestInput = ; // RenameBusinessRequestInput | 

try {
    final response = api.renameBusiness(businessId, renameBusinessRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling BusinessesApi->renameBusiness: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **businessId** | **String**|  | 
 **renameBusinessRequestInput** | [**RenameBusinessRequestInput**](RenameBusinessRequestInput.md)|  | 

### Return type

[**Business**](Business.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

