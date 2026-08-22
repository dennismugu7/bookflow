# bookflow_api.api.MeApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**deleteMe**](MeApi.md#deleteme) | **DELETE** /v1/me | Delete the authenticated owner’s account
[**getMe**](MeApi.md#getme) | **GET** /v1/me | The authenticated owner&#39;s profile
[**getMyBusiness**](MeApi.md#getmybusiness) | **GET** /v1/me/business | The caller&#39;s own business
[**updateMe**](MeApi.md#updateme) | **PATCH** /v1/me | Edit the authenticated owner’s own name


# **deleteMe**
> deleteMe(deleteAccountRequestInput)

Delete the authenticated owner’s account

Irreversible, and requires the caller’s password in addition to a valid token — a bearer token alone is not sufficient, because ADR-017 keeps no denylist and a stolen one would otherwise erase a salon’s entire booking history. A wrong password answers 401 reauthentication-failed and deletes nothing. Rate limited to a few attempts per hour per USER. On success: deletes the business and everything it owns in one transaction, then its storage objects (best-effort — a storage failure is logged and does not stop the deletion), then the profile, then the Supabase Auth user LAST so that a partial failure leaves an account that can retry rather than one that cannot sign in. An optional reason is written to the structured log and is never stored. Answers 204.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMeApi();
final DeleteAccountRequestInput deleteAccountRequestInput = ; // DeleteAccountRequestInput | 

try {
    api.deleteMe(deleteAccountRequestInput);
} catch on DioException (e) {
    print('Exception when calling MeApi->deleteMe: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **deleteAccountRequestInput** | [**DeleteAccountRequestInput**](DeleteAccountRequestInput.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

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

# **updateMe**
> Profile updateMe(updateProfileRequestInput)

Edit the authenticated owner’s own name

Both names are required and are trimmed before storage. The email address is not editable here — it belongs to Supabase Auth and changing it is a verification flow. The avatar is not editable here either; the upload does not exist yet.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMeApi();
final UpdateProfileRequestInput updateProfileRequestInput = ; // UpdateProfileRequestInput | 

try {
    final response = api.updateMe(updateProfileRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling MeApi->updateMe: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **updateProfileRequestInput** | [**UpdateProfileRequestInput**](UpdateProfileRequestInput.md)|  | 

### Return type

[**Profile**](Profile.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

