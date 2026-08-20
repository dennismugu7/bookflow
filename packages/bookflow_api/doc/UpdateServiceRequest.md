# bookflow_api.model.UpdateServiceRequest

## Load the model package
```dart
import 'package:bookflow_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | Required. Trimmed. 1–200 characters after trimming. | [optional] 
**durationMinutes** | **int** | Whole minutes. 1–1440. | [optional] 
**priceKes** | **int** | Whole Kenyan shillings. Not minor units — see the schema note. | [optional] 
**position** | **int** | Display order. Ties break on creation time. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


