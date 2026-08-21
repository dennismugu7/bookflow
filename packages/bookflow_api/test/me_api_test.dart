import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for MeApi
void main() {
  final instance = BookflowApi().getMeApi();

  group(MeApi, () {
    // Delete the authenticated owner’s account
    //
    // Irreversible. Deletes the caller’s business and everything it owns in one transaction, then its storage objects (best-effort — a storage failure is logged and does not stop the deletion), then the profile, then the Supabase Auth user LAST so that a partial failure leaves an account that can retry rather than one that cannot sign in. An optional reason is written to the structured log and is never stored. Answers 204.
    //
    //Future deleteMe(DeleteAccountRequestInput deleteAccountRequestInput) async
    test('test deleteMe', () async {
      // TODO
    });

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

    // Edit the authenticated owner’s own name
    //
    // Both names are required and are trimmed before storage. The email address is not editable here — it belongs to Supabase Auth and changing it is a verification flow. The avatar is not editable here either; the upload does not exist yet.
    //
    //Future<Profile> updateMe(UpdateProfileRequestInput updateProfileRequestInput) async
    test('test updateMe', () async {
      // TODO
    });
  });
}
