import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for MeApi
void main() {
  final instance = BookflowApi().getMeApi();

  group(MeApi, () {
    // The authenticated owner's profile
    //
    // Screen #20 renders this. Keyed by the caller's own id, so it does not exercise the membership scoping rule — see GET /v1/businesses/{businessId}.
    //
    //Future<Profile> getMe() async
    test('test getMe', () async {
      // TODO
    });
  });
}
