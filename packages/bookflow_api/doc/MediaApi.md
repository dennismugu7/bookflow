# bookflow_api.api.MediaApi

## Load the API package
```dart
import 'package:bookflow_api/api.dart';
```

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**deletePortfolioImage**](MediaApi.md#deleteportfolioimage) | **DELETE** /v1/me/business/portfolio-images/{imageId} | Remove a gallery image
[**listMyPortfolioImages**](MediaApi.md#listmyportfolioimages) | **GET** /v1/me/business/portfolio-images | The caller&#39;s gallery
[**uploadBusinessImage**](MediaApi.md#uploadbusinessimage) | **POST** /v1/me/business/images | Upload an image


# **deletePortfolioImage**
> deletePortfolioImage(imageId)

Remove a gallery image

Removes the row and then the stored object. If the object cannot be removed the request still succeeds — the image is off the page, which is what was asked, and the orphan is logged.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMediaApi();
final String imageId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deletePortfolioImage(imageId);
} catch on DioException (e) {
    print('Exception when calling MediaApi->deletePortfolioImage: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **imageId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyPortfolioImages**
> BuiltList<PortfolioImage> listMyPortfolioImages()

The caller's gallery

In display order, ties broken by creation time.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMediaApi();

try {
    final response = api.listMyPortfolioImages();
    print(response);
} catch on DioException (e) {
    print('Exception when calling MediaApi->listMyPortfolioImages: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**BuiltList&lt;PortfolioImage&gt;**](PortfolioImage.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **uploadBusinessImage**
> UploadedImage uploadBusinessImage()

Upload an image

multipart/form-data with a `file` part and a `purpose` field of banner, team or portfolio. JPEG and PNG only, 5 MB maximum. Returns a public URL: a banner is stored on the business, a portfolio image creates a gallery row, and a team photo is handed back for the caller to attach with PATCH.

### Example
```dart
import 'package:bookflow_api/api.dart';

final api = BookflowApi().getMediaApi();

try {
    final response = api.uploadBusinessImage();
    print(response);
} catch on DioException (e) {
    print('Exception when calling MediaApi->uploadBusinessImage: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**UploadedImage**](UploadedImage.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

