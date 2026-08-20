# bookflow_api.api.ServicesApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createService**](ServicesApi.md#createservice) | **POST** /v1/me/business/services | Add a service
[**deleteService**](ServicesApi.md#deleteservice) | **DELETE** /v1/me/business/services/{serviceId} | Remove a service
[**listMyServices**](ServicesApi.md#listmyservices) | **GET** /v1/me/business/services | The caller&#39;s services
[**updateService**](ServicesApi.md#updateservice) | **PATCH** /v1/me/business/services/{serviceId} | Change a service


# **createService**
> Service createService(createServiceRequestInput)

Add a service

Names are unique within a salon: a duplicate is refused with 409 duplicate-name and writes nothing. Price is in whole Kenyan shillings.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getServicesApi();
final CreateServiceRequestInput createServiceRequestInput = ; // CreateServiceRequestInput | 

try {
    final response = api.createService(createServiceRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ServicesApi->createService: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **createServiceRequestInput** | [**CreateServiceRequestInput**](CreateServiceRequestInput.md)|  | 

### Return type

[**Service**](Service.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteService**
> deleteService(serviceId)

Remove a service

Hard delete (ADR-036). Bookings snapshot their service (ADR-006), so removing one never rewrites a booking that used it.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getServicesApi();
final String serviceId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deleteService(serviceId);
} catch on DioException (e) {
    print('Exception when calling ServicesApi->deleteService: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serviceId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyServices**
> BuiltList<Service> listMyServices()

The caller's services

In display order, ties broken by creation time. An account with no business gets an empty list, not a 404 — nothing was refused.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getServicesApi();

try {
    final response = api.listMyServices();
    print(response);
} catch on DioException (e) {
    print('Exception when calling ServicesApi->listMyServices: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**BuiltList&lt;Service&gt;**](Service.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateService**
> Service updateService(serviceId, updateServiceRequestInput)

Change a service

Every field is optional and at least one must be present. A service that is not the caller’s is indistinguishable from one that does not exist.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getServicesApi();
final String serviceId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final UpdateServiceRequestInput updateServiceRequestInput = ; // UpdateServiceRequestInput | 

try {
    final response = api.updateService(serviceId, updateServiceRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ServicesApi->updateService: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serviceId** | **String**|  | 
 **updateServiceRequestInput** | [**UpdateServiceRequestInput**](UpdateServiceRequestInput.md)|  | 

### Return type

[**Service**](Service.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

