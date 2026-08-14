# bookflow_api.model.SignupRequestInput

## Load the model package
```dart
import 'package:bookflow_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **String** | Where the activation email is sent. | 
**password** | **String** | At least 8 characters (ADR-030). No composition rules. May still be refused if it appears in a known breach corpus. | 
**firstName** | **String** | Required. Trimmed. Rejected above 100 characters. | 
**lastName** | **String** | Required. Trimmed. Rejected above 100 characters. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


