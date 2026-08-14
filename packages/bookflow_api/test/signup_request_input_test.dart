import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

// tests for SignupRequestInput
void main() {
  final instance = SignupRequestInputBuilder();
  // TODO add properties to the builder and call build()

  group(SignupRequestInput, () {
    // Where the activation email is sent.
    // String email
    test('to test the property `email`', () async {
      // TODO
    });

    // At least 8 characters (ADR-030). No composition rules. May still be refused if it appears in a known breach corpus.
    // String password
    test('to test the property `password`', () async {
      // TODO
    });

    // Required. Trimmed. Rejected above 100 characters.
    // String firstName
    test('to test the property `firstName`', () async {
      // TODO
    });

    // Required. Trimmed. Rejected above 100 characters.
    // String lastName
    test('to test the property `lastName`', () async {
      // TODO
    });
  });
}
