import 'dart:async';

import 'package:bookflow/app.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
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

  testWidgets('a user with no business sees the setup stub', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      appWith(
        session: SessionStatus.signedIn,
        membership: MembershipStatus.none,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Finish setting up'), findsOneWidget);
    expect(find.text('Your account is ready'), findsOneWidget);
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

    expect(find.text('Signed in'), findsOneWidget);
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

  @override
  SessionStatus status;

  final StreamController<SessionStatus> _controller =
      StreamController<SessionStatus>.broadcast();

  @override
  Stream<SessionStatus> statusChanges() => _controller.stream;

  @override
  Future<void> signOut() async {
    status = SessionStatus.signedOut;
    _controller.add(SessionStatus.signedOut);
  }
}

class _FakeMembershipRepository implements MembershipRepository {
  const _FakeMembershipRepository(this.status);

  final MembershipStatus status;

  @override
  Future<MembershipStatus> currentStatus() async => status;
}
