plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "iq.fib.eamic"
    compileSdk = 34
    ndkVersion = "26.1.10909125"

    defaultConfig {
        applicationId = "iq.fib.eamic"
        minSdk = 26
        targetSdk = 34
        versionCode = 9
        versionName = "1.0.9"

        vectorDrawables { useSupportLibrary = true }

        // whisper.cpp is built via CMake (see src/main/cpp/CMakeLists.txt).
        externalNativeBuild {
            cmake {
                cppFlags += "-std=c++17"
                arguments += "-DANDROID_STL=c++_shared"
            }
        }
        ndk {
            // Ship arm64 only — every modern phone (incl. Galaxy S24) is arm64.
            // Drops the duplicate x86_64 native libs to keep the APK small.
            abiFilters += listOf("arm64-v8a")
        }
    }

    // Release signing — keys come from the environment (decoded from repo
    // secrets in CI). When the keystore isn't present (e.g. a local UI-only
    // build), the release build stays unsigned and you can still use debug.
    val keystorePath: String? = System.getenv("ANDROID_KEYSTORE_PATH")
    val hasSigning = keystorePath != null && file(keystorePath).exists()
    signingConfigs {
        if (hasSigning) {
            create("release") {
                storeFile = file(keystorePath!!)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                storeType = "PKCS12"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasSigning) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    // Only wired up once you drop whisper.cpp sources into src/main/cpp/whisper.
    // Until then, comment this block out so the app builds UI-only.
    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.lifecycle:lifecycle-service:2.8.4")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Downloadable Google Fonts: Newsreader (serif), Hanken Grotesk (sans), JetBrains Mono
    implementation("androidx.compose.ui:ui-text-google-fonts")

    // Persisted settings + history (DataStore; history serialized as JSON via org.json)
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.compose.ui:ui-tooling-preview")
}
