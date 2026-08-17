import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';


/// tests for HealthApi
void main() {
  final instance = BookflowApi().getHealthApi();

  group(HealthApi, () {
    // Liveness probe
    //
    // Reports that the process is up and answering. Deliberately says nothing about the environment, the version or the database — this endpoint is unauthenticated.
    //
    //Future<HealthResponse> getHealth() async
    test('test getHealth', () async {
      // TODO
    });

  });
}
