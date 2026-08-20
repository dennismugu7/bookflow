import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for OpeningHoursApi
void main() {
  final instance = BookflowApi().getOpeningHoursApi();

  group(OpeningHoursApi, () {
    // The caller's opening hours
    //
    // Ascending by day, 0 = Monday. An absent day is CLOSED (A6) — there is no row meaning \"shut\", only the absence of one.
    //
    //Future<BuiltList<OpeningHoursEntry>> getMyOpeningHours() async
    test('test getMyOpeningHours', () async {
      // TODO
    });

    // Replace the week
    //
    // The submitted array becomes the whole week: days that are absent are removed. Applied in one statement, so a request either lands entirely or not at all — a half-applied week would be a salon open at hours nobody chose. A day may appear at most once and closeTime must be after openTime.
    //
    //Future<BuiltList<OpeningHoursEntry>> replaceMyOpeningHours(ReplaceOpeningHoursRequestInput replaceOpeningHoursRequestInput) async
    test('test replaceMyOpeningHours', () async {
      // TODO
    });
  });
}
