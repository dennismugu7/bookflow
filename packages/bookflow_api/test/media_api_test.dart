import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for MediaApi
void main() {
  final instance = BookflowApi().getMediaApi();

  group(MediaApi, () {
    // Remove a gallery image
    //
    // Removes the row and then the stored object. If the object cannot be removed the request still succeeds — the image is off the page, which is what was asked, and the orphan is logged.
    //
    //Future deletePortfolioImage(String imageId) async
    test('test deletePortfolioImage', () async {
      // TODO
    });

    // The caller's gallery
    //
    // In display order, ties broken by creation time.
    //
    //Future<BuiltList<PortfolioImage>> listMyPortfolioImages() async
    test('test listMyPortfolioImages', () async {
      // TODO
    });

    // Upload an image
    //
    // multipart/form-data with a `file` part and a `purpose` field of banner, team or portfolio. JPEG and PNG only, 5 MB maximum. Returns a public URL: a banner is stored on the business, a portfolio image creates a gallery row, and a team photo is handed back for the caller to attach with PATCH.
    //
    //Future<UploadedImage> uploadBusinessImage() async
    test('test uploadBusinessImage', () async {
      // TODO
    });
  });
}
