import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for PublishingApi
void main() {
  final instance = BookflowApi().getPublishingApi();

  group(PublishingApi, () {
    // Publish the salon
    //
    // Requires a name, at least one service and at least one open day; otherwise 409 publish-requirements-not-met, which names nothing the caller does not already have. On success the business becomes publicly readable and is assigned a permanent handle (ADR-021), derived from the name with a random suffix on collision. Idempotent: publishing an already-published salon returns the handle it already has and never mints a second.
    //
    //Future<PublishedBusiness> publishMyBusiness() async
    test('test publishMyBusiness', () async {
      // TODO
    });
  });
}
