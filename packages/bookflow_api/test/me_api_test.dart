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

    // The caller's own business
    //
    // Answers \"do I have a business, and which one\" without needing its id. A 404 means the account has not created one yet — an ordinary state, not an error. Clients must not surface it as a failure.
    //
    //Future<Business> getMyBusiness() async
    test('test getMyBusiness', () async {
      // TODO
    });
  });
}
