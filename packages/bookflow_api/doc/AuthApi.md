# bookflow_api.api.AuthApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**signUp**](AuthApi.md#signup) | **POST** /v1/auth/signup | Create an owner account


# **signUp**
> SignupAccepted signUp(signupRequestInput)

Create an owner account

Mediated sign-up (ADR-037). The client never calls GoTrue directly. Creates the account, records terms acceptance with a SERVER-supplied version, and asks GoTrue to send its own activation email. Answers identically whether or not the address already has an account.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getAuthApi();
final SignupRequestInput signupRequestInput = ; // SignupRequestInput | 

try {
    final response = api.signUp(signupRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->signUp: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **signupRequestInput** | [**SignupRequestInput**](SignupRequestInput.md)|  | 

### Return type

[**SignupAccepted**](SignupAccepted.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

