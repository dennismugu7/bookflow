import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';


/// tests for AuthApi
void main() {
  final instance = BookflowApi().getAuthApi();

  group(AuthApi, () {
    // Create an owner account
    //
    // Mediated sign-up (ADR-037). The client never calls GoTrue directly. Creates the account, records terms acceptance with a SERVER-supplied version, and asks GoTrue to send its own activation email. Answers identically whether or not the address already has an account.
    //
    //Future<SignupAccepted> signUp(SignupRequestInput signupRequestInput) async
    test('test signUp', () async {
      // TODO
    });

  });
}
