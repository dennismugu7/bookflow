import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for ServicesApi
void main() {
  final instance = BookflowApi().getServicesApi();

  group(ServicesApi, () {
    // Add a service
    //
    // Names are unique within a salon: a duplicate is refused with 409 duplicate-name and writes nothing. Price is in whole Kenyan shillings.
    //
    //Future<Service> createService(CreateServiceRequestInput createServiceRequestInput) async
    test('test createService', () async {
      // TODO
    });

    // Remove a service
    //
    // Hard delete (ADR-036). Bookings snapshot their service (ADR-006), so removing one never rewrites a booking that used it.
    //
    //Future deleteService(String serviceId) async
    test('test deleteService', () async {
      // TODO
    });

    // The caller's services
    //
    // In display order, ties broken by creation time. An account with no business gets an empty list, not a 404 — nothing was refused.
    //
    //Future<BuiltList<Service>> listMyServices() async
    test('test listMyServices', () async {
      // TODO
    });

    // Change a service
    //
    // Every field is optional and at least one must be present. A service that is not the caller’s is indistinguishable from one that does not exist.
    //
    //Future<Service> updateService(String serviceId, UpdateServiceRequestInput updateServiceRequestInput) async
    test('test updateService', () async {
      // TODO
    });
  });
}
