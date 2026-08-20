import 'package:bookflow/features/hours/hours_models.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **The only file in `features/hours/` that may import
/// `package:bookflow_api`.**
abstract interface class HoursRepository {
  Future<List<DayHours>> fetch();

  /// Replaces the whole week. Days that are absent become closed.
  Future<List<DayHours>> replace(List<DayHours> days);
}

class ApiHoursRepository implements HoursRepository {
  const ApiHoursRepository(this._api);

  final BookflowApi _api;

  @override
  Future<List<DayHours>> fetch() async {
    final Response<BuiltList<OpeningHoursEntry>> response = await _api
        .getOpeningHoursApi()
        .getMyOpeningHours();

    return (response.data ?? BuiltList<OpeningHoursEntry>())
        .map(_toModel)
        .toList();
  }

  @override
  Future<List<DayHours>> replace(List<DayHours> days) async {
    // ── THE WHOLE WEEK, EVERY TIME ──────────────────────────────────────────
    //
    // The endpoint is a PUT and the body IS the week afterwards: a day left out
    // is removed, which is how "closed on Sundays" is expressed. So this cannot
    // send a delta, and a caller that passed only the days it changed would
    // silently close the rest.
    final Response<BuiltList<OpeningHoursEntry>> response = await _api
        .getOpeningHoursApi()
        .replaceMyOpeningHours(
          replaceOpeningHoursRequestInput: ReplaceOpeningHoursRequestInput(
            (ReplaceOpeningHoursRequestInputBuilder b) => b.days.addAll(
              days.map(
                (DayHours day) => OpeningHoursEntryInput(
                  (OpeningHoursEntryInputBuilder e) => e
                    ..dayOfWeek = day.dayOfWeek
                    ..openTime = day.openTime
                    ..closeTime = day.closeTime,
                ),
              ),
            ),
          ),
        );

    return (response.data ?? BuiltList<OpeningHoursEntry>())
        .map(_toModel)
        .toList();
  }

  static DayHours _toModel(OpeningHoursEntry entry) => DayHours(
    dayOfWeek: entry.dayOfWeek,
    openTime: entry.openTime,
    closeTime: entry.closeTime,
  );
}
