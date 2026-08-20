import 'package:bookflow/features/media/media_models.dart';
import 'package:bookflow/features/media/media_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

/// Holds what logic this feature has (ADR-028).

final Provider<MediaRepository> mediaRepositoryProvider =
    Provider<MediaRepository>(
      (Ref ref) => ApiMediaRepository(ref.watch(apiClientProvider)),
    );

/// The gallery picker.
///
/// A provider rather than a bare `ImagePicker()` so a widget test can supply
/// one that returns a fixed file without touching a platform channel — which is
/// the only way any of this is testable off a device.
final Provider<ImagePicker> imagePickerProvider = Provider<ImagePicker>(
  (Ref ref) => ImagePicker(),
);

/// The salon's gallery. An empty list is data, not an error (ADR-028).
final FutureProvider<List<PortfolioImage>> myPortfolioProvider =
    FutureProvider<List<PortfolioImage>>(
      (Ref ref) => ref.watch(mediaRepositoryProvider).listPortfolio(),
    );

/// Picking, uploading and removing.
///
/// ══ ONE CONTROLLER FOR ALL THREE PURPOSES ═══════════════════════════════════
///
/// A banner, a team photo and a portfolio image differ only in the `purpose`
/// they are sent with — the pick, the read, the multipart post and the error
/// mapping are identical. Three controllers would be three places for the size
/// message to drift.
///
/// **It never navigates and never refreshes anything but the gallery.** A team
/// photo's URL is handed back to the editor sheet, which attaches it with the
/// team module's own PATCH; a banner's goes to the business PATCH. Doing either
/// here would put two features' writes in one place.
class ImageUploadController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  /// Opens the gallery, uploads what was chosen, and returns its public URL.
  ///
  /// `null` means the owner cancelled the picker — **not** a failure, and the
  /// caller must not show an error for it. That is the one case a bare
  /// `AsyncValue` cannot express here, which is why the URL is returned rather
  /// than held in state.
  Future<UploadedImage?> pickAndUpload(ImagePurpose purpose) async {
    final XFile? picked = await ref
        .read(imagePickerProvider)
        .pickImage(source: ImageSource.gallery);
    if (picked == null) return null;

    state = const AsyncLoading<void>();

    UploadedImage? uploaded;
    // `AsyncValue.guard` rather than try/catch: it captures the error AND the
    // stack, which a bare catch drops.
    state = await AsyncValue.guard<void>(() async {
      uploaded = await ref
          .read(mediaRepositoryProvider)
          .upload(
            purpose: purpose,
            bytes: await picked.readAsBytes(),
            filename: picked.name,
          );

      if (purpose == ImagePurpose.portfolio) {
        ref.invalidate(myPortfolioProvider);
        await ref.read(myPortfolioProvider.future);
      }
    });

    return state.hasError ? null : uploaded;
  }

  Future<void> removePortfolioImage(String id) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref.read(mediaRepositoryProvider).deletePortfolioImage(id);
      ref.invalidate(myPortfolioProvider);
      await ref.read(myPortfolioProvider.future);
    });
  }
}

final AutoDisposeNotifierProvider<ImageUploadController, AsyncValue<void>>
imageUploadControllerProvider =
    AutoDisposeNotifierProvider<ImageUploadController, AsyncValue<void>>(
      ImageUploadController.new,
    );

/// What the owner reads when an upload fails.
///
/// One map, so three screens cannot describe the same 503 three ways. The two
/// cases are genuinely different remedies: one is "choose a different picture",
/// the other is "try again in a moment".
String uploadFailureMessage(Object error) => switch (error) {
  UploadRejected() => 'Use a JPG or PNG under 5 MB.',
  UploadUnavailable() => 'Could not upload right now. Try again.',
  _ => 'Something went wrong. Check your connection and try again.',
};
