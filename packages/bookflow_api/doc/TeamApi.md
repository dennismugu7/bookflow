# bookflow_api.api.TeamApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createTeamMember**](TeamApi.md#createteammember) | **POST** /v1/me/business/team-members | Add a team member
[**deleteTeamMember**](TeamApi.md#deleteteammember) | **DELETE** /v1/me/business/team-members/{memberId} | Remove a team member
[**listMyTeamMembers**](TeamApi.md#listmyteammembers) | **GET** /v1/me/business/team-members | The caller&#39;s team
[**updateTeamMember**](TeamApi.md#updateteammember) | **PATCH** /v1/me/business/team-members/{memberId} | Change a team member


# **createTeamMember**
> TeamMember createTeamMember(createTeamMemberRequestInput)

Add a team member

One name field (ADR-005): team members are content records, unlike the owner’s own account. `role` is a job title, never an authorization role. Names are not unique — two stylists may share one.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getTeamApi();
final CreateTeamMemberRequestInput createTeamMemberRequestInput = ; // CreateTeamMemberRequestInput | 

try {
    final response = api.createTeamMember(createTeamMemberRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling TeamApi->createTeamMember: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **createTeamMemberRequestInput** | [**CreateTeamMemberRequestInput**](CreateTeamMemberRequestInput.md)|  | 

### Return type

[**TeamMember**](TeamMember.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteTeamMember**
> deleteTeamMember(memberId)

Remove a team member

Hard delete (ADR-036). ADR-006 snapshots the team member onto every booking, so removing one never rewrites a booking they took.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getTeamApi();
final String memberId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deleteTeamMember(memberId);
} catch on DioException (e) {
    print('Exception when calling TeamApi->deleteTeamMember: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **memberId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyTeamMembers**
> BuiltList<TeamMember> listMyTeamMembers()

The caller's team

In display order, ties broken by creation time. An account with no business gets an empty list.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getTeamApi();

try {
    final response = api.listMyTeamMembers();
    print(response);
} catch on DioException (e) {
    print('Exception when calling TeamApi->listMyTeamMembers: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**BuiltList&lt;TeamMember&gt;**](TeamMember.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateTeamMember**
> TeamMember updateTeamMember(memberId, updateTeamMemberRequestInput)

Change a team member

Every field is optional and at least one must be present. A member who is not the caller’s is indistinguishable from one who does not exist.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getTeamApi();
final String memberId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final UpdateTeamMemberRequestInput updateTeamMemberRequestInput = ; // UpdateTeamMemberRequestInput | 

try {
    final response = api.updateTeamMember(memberId, updateTeamMemberRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling TeamApi->updateTeamMember: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **memberId** | **String**|  | 
 **updateTeamMemberRequestInput** | [**UpdateTeamMemberRequestInput**](UpdateTeamMemberRequestInput.md)|  | 

### Return type

[**TeamMember**](TeamMember.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

