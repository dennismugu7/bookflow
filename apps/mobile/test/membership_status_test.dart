import 'dart:async';

import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/platform/router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// T9 — the membership status, derived rather than constant.
///
/// ══ WHY 42 EXISTS SEPARATELY FROM 41 ════════════════════════════════════════
///
/// Criterion 41 can pass on state carried straight from the creation response:
/// invalidate a provider in the same process that just created the business and
/// of course it reports one. **42 is the one that catches a status that never
/// really left memory** — so it is driven by discarding the container entirely
/// and building a fresh one against the same backend, which is what a restart
/// is from the app's point of view. Nothing is carried across.
void main() {
  ProviderContainer containerWith(BusinessRepository business) {
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        authGatewayProvider.overrideWithValue(_FakeGateway()),
        businessRepositoryProvider.overrideWithValue(business),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  Future<void> settle(ProviderContainer container) async {
    await container.read(sessionStatusProvider.future);
    await container.read(membershipStatusProvider.future);
  }

  test(
    'criterion 41 — after creating a business the status reports it, not none',
    () async {
      // A backend that starts empty, exactly as a newly signed-up account is.
      final _MutableBackend backend = _MutableBackend();
      final ProviderContainer container = containerWith(backend);
      await settle(container);

      // 0 — the counter is driven from its starting value, not asserted at one
      // point. A status that always said `member` would pass the assertion
      // below on its own.
      expect(
        container.read(membershipStatusProvider).value,
        MembershipStatus.none,
        reason: 'a new account has no business',
      );
      expect(
        container.read(appDestinationProvider),
        AppDestination.setupRequired,
      );

      // Create, exactly as the screen does.
      await container
          .read(createBusinessControllerProvider.notifier)
          .create('Vera’s Salon');

      // 1 — and the destination follows, which is what carries the owner off
      // /setup with no new routing rule (criterion 25's mechanism).
      expect(
        container.read(membershipStatusProvider).value,
        MembershipStatus.member,
      );
      expect(container.read(appDestinationProvider), AppDestination.home);
    },
  );

  test(
    'criterion 42 — the status survives a restart, from the API and not from memory',
    () async {
      final _MutableBackend backend = _MutableBackend();

      // ── FIRST RUN — create, then throw the whole container away ───────────
      final ProviderContainer first = containerWith(backend);
      await settle(first);
      await first
          .read(createBusinessControllerProvider.notifier)
          .create('Vera’s Salon');
      expect(
        first.read(membershipStatusProvider).value,
        MembershipStatus.member,
      );
      first.dispose();

      // ── SECOND RUN — a new container over the same backend ────────────────
      //
      // This is the restart. Every provider is cold: nothing is carried over,
      // no cache, no invalidation, no notifier holding a result. If the status
      // still came from the old `MembershipStatus.none` constant this would
      // report `none` and the owner would be sent back to `/setup` — which is
      // the regression criterion 42 exists to catch.
      final ProviderContainer second = containerWith(backend);
      await settle(second);

      expect(
        second.read(membershipStatusProvider).value,
        MembershipStatus.member,
        reason: 'a reopened app must still recognise the business',
      );
      expect(
        second.read(appDestinationProvider),
        AppDestination.home,
        reason: 'and must not return the owner to /setup',
      );
    },
  );

  test('a restart with no business still reports none', () async {
    // The other direction. Without this, criterion 42's assertion is satisfied
    // by a status hard-coded to `member` — the same failure mode the old
    // constant had, pointing the other way.
    final ProviderContainer container = containerWith(_MutableBackend());
    await settle(container);

    expect(
      container.read(membershipStatusProvider).value,
      MembershipStatus.none,
    );
    expect(
      container.read(appDestinationProvider),
      AppDestination.setupRequired,
    );
  });
}

/// A backend that remembers, so a second container sees what the first wrote.
///
/// The whole point of criterion 42 is that the answer comes from outside the
/// app's memory, so this stands in for the API rather than for the repository's
/// cache.
class _MutableBackend implements BusinessRepository {
  OwnedBusiness? _stored;

  @override
  Future<BusinessStatus> fetchMine() async {
    final OwnedBusiness? business = _stored;
    return business == null ? const NoBusinessYet() : HasBusiness(business);
  }

  @override
  Future<OwnedBusiness> create(String name) async {
    final OwnedBusiness created = OwnedBusiness(
      id: 'created',
      name: name,
      published: false,
    );
    _stored = created;
    return created;
  }

  @override
  Future<OwnedBusiness> rename({required String id, required String name}) =>
      throw UnimplementedError('not used here');
}

class _FakeGateway implements AuthGateway {
  @override
  SessionStatus get status => SessionStatus.signedIn;

  @override
  Stream<SessionStatus> statusChanges() => const Stream<SessionStatus>.empty();

  @override
  String? currentAccessToken() => 'token';

  @override
  String? currentEmail() => 'owner@bookflow.test';

  @override
  Future<void> signOut() async {}
}
