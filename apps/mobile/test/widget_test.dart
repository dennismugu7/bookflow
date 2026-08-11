import 'package:bookflow/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('placeholder screen renders its headline and body', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const BookflowApp());

    expect(find.text(placeholderHeadline), findsOneWidget);
    expect(find.text(placeholderBody), findsOneWidget);
  });

  testWidgets('none of the flutter create demo scaffolding survives', (
    WidgetTester tester,
  ) async {
    // A real regression guard rather than a tautology. `flutter create` ships a
    // counter demo — an AppBar, a FloatingActionButton and an incrementing
    // integer. If any of it reappears, someone has regenerated the project over
    // the top of this one, which would also have reset the package identifier
    // back to com.example.
    await tester.pumpWidget(const BookflowApp());

    expect(find.byType(FloatingActionButton), findsNothing);
    expect(find.byType(AppBar), findsNothing);
    expect(find.text('0'), findsNothing);
    expect(find.textContaining('You have pushed the button'), findsNothing);
  });
}
