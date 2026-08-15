import 'dart:async';

import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/platform/router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The auth-aware redirect (ADR-028, ADR-032).
///
/// ══ WHAT IS BEING TESTED, AND WHY IT IS TESTED THIS WAY ═════════════════════
///
/// `appDestinationProvider` is a pure derivation from two providers, so these
/// are assertions about the DECISION rather than about a rendered frame — no
/// widget tree, no navigator, no pumping. A test that drove a real `GoRouter`
/// would be slower, would fail for reasons unrelated to the redirect, and would
/// still not say which input produced which destination.
///
/// Everything that touches the outside world is overridden. Nothing here
/// initialises Supabase or opens the keystore, which is what keeps the mobile CI
/// job hermetic.
void main() {
  ProviderContainer containerWith({
    required SessionStatus session,
    MembershipStatus? membership,
    Object? membershipError,
  }) {
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        authGatewayProvider.overrideWithValue(
          _FakeAuthGateway(status: session),
        ),
        membershipRepositoryProvider.overrideWithValue(
          _FakeMembershipRepository(
            status: membership ?? MembershipStatus.none,
            error: membershipError,
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  /// Lets the stream and future providers settle. Without this every read
  /// returns `AsyncLoading` and every test would trivially see `/startup`.
  Future<void> settle(ProviderContainer container) async {
    await container
        .read(sessionStatusProvider.future)
        .catchError((Object _) => SessionStatus.signedOut);
    await container
        .read(membershipStatusProvider.future)
        .catchError((Object _) => MembershipStatus.none);
  }

  test('an unauthenticated user goes to the signed-out shell', () async {
    final ProviderContainer container = containerWith(
      session: SessionStatus.signedOut,
    );
    await settle(container);

    expect(container.read(appDestinationProvider), AppDestination.signedOut);
    expect(AppDestination.signedOut.path, '/welcome');
  });

  test('an authenticated user with no membership goes to the stub', () async {
    final ProviderContainer container = containerWith(
      session: SessionStatus.signedIn,
      membership: MembershipStatus.none,
    );
    await settle(container);

    expect(
      container.read(appDestinationProvider),
      AppDestination.setupRequired,
    );
    expect(AppDestination.setupRequired.path, '/setup');
  });

  test('an authenticated user with a membership goes past it', () async {
    // The branch nothing in production can currently reach — there is no way to
    // create a business yet (see membership_repository.dart). Overriding the
    // repository is what proves the redirect handles it, rather than the branch
    // sitting unexercised until onboarding ships.
    final ProviderContainer container = containerWith(
      session: SessionStatus.signedIn,
      membership: MembershipStatus.member,
    );
    await settle(container);

    expect(container.read(appDestinationProvider), AppDestination.home);
    expect(AppDestination.home.path, '/home');
  });

  test('the session is restored before anything is decided', () async {
    // Deliberately NOT settled — this is the cold-start state, before the
    // session provider has emitted anything. Without a startup destination the
    // app would fall through to the signed-out shell here, and a signed-in user
    // would see the welcome screen flash on every launch.
    final ProviderContainer container = containerWith(
      session: SessionStatus.signedIn,
    );

    expect(container.read(appDestinationProvider), AppDestination.startup);
  });

  test(
    'a membership that cannot be read does NOT become "no business"',
    () async {
      // The assertion this case exists for. Treating a failed read as "no
      // membership" would tell an owner who HAS a business to go and create one —
      // a confident wrong answer produced from a failure the app noticed.
      final ProviderContainer container = containerWith(
        session: SessionStatus.signedIn,
        membershipError: StateError('the API is unreachable'),
      );
      await settle(container);

      final AppDestination destination = container.read(appDestinationProvider);
      expect(destination, AppDestination.unavailable);
      expect(
        destination,
        isNot(AppDestination.setupRequired),
        reason:
            'an unreadable membership must never be reported as "no business"',
      );
    },
  );

  test('signing out moves an authenticated user back to the shell', () async {
    // The redirect is not only an entry check: it has to react to the session
    // ending while the user is sitting on an owner screen.
    final _FakeAuthGateway gateway = _FakeAuthGateway(
      status: SessionStatus.signedIn,
    );
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        authGatewayProvider.overrideWithValue(gateway),
        membershipRepositoryProvider.overrideWithValue(
          const _FakeMembershipRepository(status: MembershipStatus.member),
        ),
      ],
    );
    addTearDown(container.dispose);

    // Keep the provider alive, or Riverpod disposes it between reads and the
    // stream restarts from its initial value.
    final ProviderSubscription<AppDestination> subscription = container.listen(
      appDestinationProvider,
      (AppDestination? _, AppDestination _) {},
    );
    addTearDown(subscription.close);

    await settle(container);
    expect(container.read(appDestinationProvider), AppDestination.home);

    gateway.emit(SessionStatus.signedOut);
    await pumpEventQueue();

    expect(container.read(appDestinationProvider), AppDestination.signedOut);
  });
}

class _FakeAuthGateway implements AuthGateway {
  _FakeAuthGateway({required this.status});

  @override
  SessionStatus status;

  final StreamController<SessionStatus> _controller =
      StreamController<SessionStatus>.broadcast();

  void emit(SessionStatus next) {
    status = next;
    _controller.add(next);
  }

  /// Required by the interface as of the PR 3a review. The redirect does not
  /// use it — but a fake that could omit it is exactly how the real wiring came
  /// to attach no token at all.
  @override
  String? currentAccessToken() =>
      status == SessionStatus.signedIn ? 'fake-token' : null;

  @override
  Stream<SessionStatus> statusChanges() => _controller.stream;

  @override
  Future<void> signOut() async => emit(SessionStatus.signedOut);
}

class _FakeMembershipRepository implements MembershipRepository {
  const _FakeMembershipRepository({required this.status, this.error});

  final MembershipStatus status;
  final Object? error;

  @override
  Future<MembershipStatus> currentStatus() async {
    final Object? failure = error;
    if (failure != null) throw failure;
    return status;
  }
}
