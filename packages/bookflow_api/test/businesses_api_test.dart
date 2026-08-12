import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for BusinessesApi
void main() {
  final instance = BookflowApi().getBusinessesApi();

  group(BusinessesApi, () {
    // A business the caller belongs to
    //
    // Scoped through membership: user → membership → business. A business the caller has no membership in is indistinguishable from one that does not exist.
    //
    //Future<Business> getBusiness(String businessId) async
    test('test getBusiness', () async {
      // TODO
    });
  });
}
