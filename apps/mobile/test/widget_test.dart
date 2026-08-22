import 'dart:async';

import 'package:bookflow/app.dart';
import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The shell, rendered.
///
/// `router_redirect_test.dart` proves which destination each state produces;
/// this proves the app actually builds and shows the screen at that destination
/// — that the router is wired to `MaterialApp.router`, the theme applies, and no
/// screen throws on its first frame.
///
/// Nothing here initialises Supabase: `authGatewayProvider` is overridden, which
/// is the whole reason it throws by default rather than constructing a real one.
void main() {
  Widget appWith({
    required SessionStatus session,
    required MembershipStatus membership,
  }) {
    return ProviderScope(
      overrides: <Override>[
        authGatewayProvider.overrideWithValue(
          _FakeAuthGateway(status: session),
        ),
        membershipRepositoryProvider.overrideWithValue(
          _FakeMembershipRepository(membership),
        ),
        // The signed-in shell is screen #20 as of PR 3b, and it fetches. Stubbed
        // so these shell tests stay about ROUTING — without it they would fail
        // on a socket, which says nothing about which shell was chosen.
        profileRepositoryProvider.overrideWithValue(const _StubProfile()),
        // Screen #12 took `/home` in T7+T8 and reads the business. Without
        // this the dashboard renders its ERROR state — correctly, per
        // criterion 46 — and the shell assertions below would fail for a
        // reason that has nothing to do with routing.
        businessRepositoryProvider.overrideWithValue(const _StubBusiness()),
      ],
      child: const BookflowApp(),
    );
  }

  testWidgets('an unauthenticated user sees the welcome shell', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      appWith(
        session: SessionStatus.signedOut,
        membership: MembershipStatus.none,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Bookflow'), findsOneWidget);
    expect(find.text('Create for free'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('a user with no business is sent to create one', (
    WidgetTester tester,
  ) async {
    // Was "sees the setup stub", asserting "Finish setting up" and "Your
    // account is ready". ADR-032 called that stub "deliberate debt … replaced
    // by the onboarding slice", and this is that slice — the destination is
    // unchanged, its content is not.
    await tester.pumpWidget(
      appWith(
        session: SessionStatus.signedIn,
        membership: MembershipStatus.none,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Your business'), findsOneWidget);
    expect(find.byKey(const Key('create-business-name')), findsOneWidget);
  });

  testWidgets('a user with a business gets past the stub', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      appWith(
        session: SessionStatus.signedIn,
        membership: MembershipStatus.member,
      ),
    );
    await tester.pumpAndSettle();

    // Was `My profile` — screen #20 held `/home` from PR 3b until decision 12
    // gave it to the dashboard. #20 is now pushed at `/profile`, behind the
    // account menu.
    expect(find.byKey(const Key('setup-continuation')), findsOneWidget);
    // Was `find.text('Ada Lovelace')`, which screen #20 rendered. The dashboard
    // shows the profile as INITIALS in the avatar — the same read, a different
    // rendering — and the avatar is also the path to everything behind it.
    expect(find.byKey(const Key('dashboard-avatar')), findsOneWidget);
    expect(find.text('AL'), findsOneWidget);
    expect(find.text('Finish setting up'), findsNothing);
  });

  testWidgets('the first frame is the splash, not the welcome screen', (
    WidgetTester tester,
  ) async {
    // Pumped once, not settled: this is the cold start. Showing the welcome
    // screen here — to a user who is signed in — is the bug the startup
    // destination exists to prevent, and it would be invisible in a test that
    // settled first.
    await tester.pumpWidget(
      appWith(
        session: SessionStatus.signedIn,
        membership: MembershipStatus.member,
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Create for free'), findsNothing);

    await tester.pumpAndSettle();
  });
}

class _FakeAuthGateway implements AuthGateway {
  _FakeAuthGateway({required this.status});

  // The entry flow's operations. This fake does not perform them, and a throw
  // says so at the line rather than letting a test pass on a fake success.
  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) => throw UnimplementedError();

  @override
  Future<void> verifySignupCode({
    required String email,
    required String code,
  }) => throw UnimplementedError();

  @override
  Future<void> resendSignupCode({required String email}) =>
      throw UnimplementedError();

  @override
  Future<void> requestPasswordReset({required String email}) =>
      throw UnimplementedError();

  @override
  Future<void> verifyRecoveryCode({
    required String email,
    required String code,
  }) => throw UnimplementedError();

  @override
  Future<void> setNewPassword({required String newPassword}) =>
      throw UnimplementedError();

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => throw UnimplementedError();

  @override
  SessionStatus status;

  final StreamController<SessionStatus> _controller =
      StreamController<SessionStatus>.broadcast();

  @override
  Stream<SessionStatus> statusChanges() => _controller.stream;

  @override
  String? currentAccessToken() =>
      status == SessionStatus.signedIn ? 'fake-token' : null;

  @override
  String? currentEmail() =>
      status == SessionStatus.signedIn ? 'owner@bookflow.test' : null;

  @override
  Future<void> signOut() async {
    status = SessionStatus.signedOut;
    _controller.add(SessionStatus.signedOut);
  }
}

class _StubProfile implements ProfileRepository {
  const _StubProfile();

  @override
  Future<OwnerProfile> fetchMine() async => const OwnerProfile(
    id: '00000000-0000-4000-8000-000000000001',
    firstName: 'Ada',
    lastName: 'Lovelace',
  );

  @override
  Future<OwnerProfile> rename({
    required String firstName,
    required String lastName,
  }) => throw UnimplementedError('these tests never edit the profile');

  @override
  Future<void> deleteAccount({
    required String password,
    required String? reason,
  }) => throw UnimplementedError('these tests never delete the account');
}

class _FakeMembershipRepository implements MembershipRepository {
  const _FakeMembershipRepository(this.status);

  final MembershipStatus status;

  @override
  Future<MembershipStatus> currentStatus() async => status;
}

/// Enough for the dashboard to render its data branch. These tests are about
/// which SHELL the router picks, not about what the shell contains.
class _StubBusiness implements BusinessRepository {
  const _StubBusiness();

  @override
  Future<BusinessStatus> fetchMine() async => const HasBusiness(
    OwnedBusiness(id: 'b1', name: 'Demo Salon', published: false),
  );

  @override
  Future<OwnedBusiness> create(String name) =>
      throw UnimplementedError('not used here');

  @override
  Future<OwnedBusiness> rename({
    required String id,
    required String name,
    String? tagline,
    String? about,
    String? category,
    String? address,
    String? mapsUrl,
  }) => throw UnimplementedError('not used here');

  @override
  Future<PublishedSalon> publish() => throw UnimplementedError('not used here');
}
