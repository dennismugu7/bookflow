import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

// tests for OpeningHoursEntryInput
void main() {
  final instance = OpeningHoursEntryInputBuilder();
  // TODO add properties to the builder and call build()

  group(OpeningHoursEntryInput, () {
    // 0 = Monday, 6 = Sunday. NOT PostgreSQL extract(dow).
    // int dayOfWeek
    test('to test the property `dayOfWeek`', () async {
      // TODO
    });

    // Local wall-clock time, HH:MM, 24-hour. Africa/Nairobi (ADR-005).
    // String openTime
    test('to test the property `openTime`', () async {
      // TODO
    });

    // Local wall-clock time, HH:MM, 24-hour. Africa/Nairobi (ADR-005).
    // String closeTime
    test('to test the property `closeTime`', () async {
      // TODO
    });
  });
}
