import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

// tests for UpdateServiceRequestInput
void main() {
  final instance = UpdateServiceRequestInputBuilder();
  // TODO add properties to the builder and call build()

  group(UpdateServiceRequestInput, () {
    // Required. Trimmed. 1–200 characters after trimming.
    // String name
    test('to test the property `name`', () async {
      // TODO
    });

    // Whole minutes. 1–1440.
    // int durationMinutes
    test('to test the property `durationMinutes`', () async {
      // TODO
    });

    // Whole Kenyan shillings. Not minor units — see the schema note.
    // int priceKes
    test('to test the property `priceKes`', () async {
      // TODO
    });

    // Display order. Ties break on creation time.
    // int position
    test('to test the property `position`', () async {
      // TODO
    });
  });
}
