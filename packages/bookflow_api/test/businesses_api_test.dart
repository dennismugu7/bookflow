import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for BusinessesApi
void main() {
  final instance = BookflowApi().getBusinessesApi();

  group(BusinessesApi, () {
    // Create the caller's business
    //
    // Creates the business and the caller's owner membership in one statement, so neither can exist without the other. An account may hold only one business (ADR-003): a second attempt is refused with 409 business-already-exists and writes nothing. The name is trimmed before it is stored.
    //
    //Future<Business> createBusiness(CreateBusinessRequestInput createBusinessRequestInput) async
    test('test createBusiness', () async {
      // TODO
    });

    // A business the caller belongs to
    //
    // Scoped through membership: user → membership → business. A business the caller has no membership in is indistinguishable from one that does not exist.
    //
    //Future<Business> getBusiness(String businessId) async
    test('test getBusiness', () async {
      // TODO
    });

    // Rename a business the caller belongs to
    //
    // The name is the only editable field. Scoped through membership: a business the caller has no membership in is indistinguishable from one that does not exist. The name is trimmed before it is stored.
    //
    //Future<Business> renameBusiness(String businessId, RenameBusinessRequestInput renameBusinessRequestInput) async
    test('test renameBusiness', () async {
      // TODO
    });
  });
}
