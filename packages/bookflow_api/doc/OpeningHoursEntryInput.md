# bookflow_api.model.OpeningHoursEntryInput

## Load the model package
```dart
import 'package:bookflow_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**dayOfWeek** | **int** | 0 = Monday, 6 = Sunday. NOT PostgreSQL extract(dow). | 
**openTime** | **String** | Local wall-clock time, HH:MM, 24-hour. Africa/Nairobi (ADR-005). | 
**closeTime** | **String** | Local wall-clock time, HH:MM, 24-hour. Africa/Nairobi (ADR-005). | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


