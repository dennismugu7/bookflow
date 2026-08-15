plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.mugulabs.bookflow"

    // Pinned, NOT `flutter.compileSdkVersion`, as of PR 3a.
    //
    // `flutter_secure_storage` — which holds the session refresh token in the
    // Android Keystore rather than in SharedPreferences — declares a minimum
    // compileSdk of 37, above the Flutter SDK's current default. Building
    // against the default fails at `:app:checkDebugAarMetadata`:
    //
    //   Dependency ':flutter_secure_storage' requires libraries and
    //   applications that compileSdk of at least 37.
    //
    // compileSdk is the API level the app is COMPILED against; it is not
    // minSdk and does not change which devices can install the app. `minSdk`
    // below still tracks the Flutter default, so device support is unchanged.
    //
    // Raise this when a plugin demands it, and say which plugin — a bare
    // version bump here is indistinguishable from someone chasing a number.
    compileSdk = 37
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.mugulabs.bookflow"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
