import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for PublicApi
void main() {
  final instance = BookflowApi().getPublicApi();

  group(PublicApi, () {
    // A published salon’s booking page
    //
    // Unauthenticated. Returns an allowlist projection — no ids beyond the service and team-member ids booking will reference, no owner, no timestamps. A handle that does not exist and a salon that is not published are the same 404, deliberately: distinguishing them would let anyone enumerate unpublished salons by name.
    //
    //Future<PublicSalon> getPublicSalon(String handle) async
    test('test getPublicSalon', () async {
      // TODO
    });
  });
}
