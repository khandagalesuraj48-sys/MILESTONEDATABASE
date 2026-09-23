# Android Build Guide

## Prerequisites

| Requirement | Version |
|---|---|
| Android Studio | Latest stable (Hedgehog 2023.1+ or later) |
| JDK | 17 or later |
| Android SDK | API 34 (Android 14) |
| Gradle | 8.x (managed by wrapper) |
| Android device / emulator | API 26+ (Android 8.0+) |

---

## 1. Setup

### 1.1 Install Android Studio

Download from: https://developer.android.com/studio

During installation, ensure these SDK components are selected:
- Android SDK Platform 34
- Android SDK Build-Tools 34
- Android Emulator
- Intel x86 Emulator Accelerator (HAXM)

### 1.2 Configure API URL

Before building, create `android/app/local.properties`:

```properties
# This file is NOT committed to version control
# Replace with your actual Apps Script deployment URL
API_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Get the URL from your Apps Script deployment (see SETUP.md).

---

## 2. Open the Project

1. Open Android Studio
2. **File → Open**
3. Navigate to: `c:\Users\aghug\Desktop\WEBSITE AND APP\Interview tracker\android`
4. Click **OK**
5. Wait for Gradle sync to complete

If Gradle sync fails:
- Check your internet connection (dependencies download from Maven Central)
- **File → Invalidate Caches → Invalidate and Restart**

---

## 3. Build Debug APK

### Via Android Studio

1. Build → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Via Command Line (PowerShell)

```powershell
cd "c:\Users\aghug\Desktop\WEBSITE AND APP\Interview tracker\android"
.\gradlew assembleDebug
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

---

## 4. Install on Device

### USB (Physical Device)

1. Enable Developer Options on your Android device:
   - Settings → About Phone → tap Build Number 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging → ON
3. Connect via USB
4. Install:
```powershell
adb install "app\build\outputs\apk\debug\app-debug.apk"
```

### Android Studio

1. Connect device or start emulator
2. Click **Run** (green triangle) or press **Shift+F10**

---

## 5. Build Release AAB

For Google Play Store submission:

### 5.1 Generate Keystore (first time only)

```powershell
keytool -genkey -v -keystore interview-tracker.jks -alias interview-tracker -keyalg RSA -keysize 2048 -validity 10000
```

Save the keystore file securely. Never commit it to git.

### 5.2 Configure Signing

In `android/app/build.gradle.kts`, update the `signingConfigs` block:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("interview-tracker.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias = "interview-tracker"
        keyPassword = System.getenv("KEY_PASSWORD") ?: ""
    }
}
```

Or use `local.properties` for local builds:
```properties
KEYSTORE_FILE=../interview-tracker.jks
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=interview-tracker
KEY_PASSWORD=your_key_password
```

### 5.3 Build Release Bundle

```powershell
.\gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### 5.4 Build Release APK (sideloading)

```powershell
.\gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

---

## 6. Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/interview/tracker/
│   │   │   ├── data/           API layer + Repository
│   │   │   ├── domain/         Models + Use Cases
│   │   │   ├── ui/             Screens + ViewModels + Components
│   │   │   └── util/           Utilities
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts
│   └── local.properties        ← API_BASE_URL (NOT in git)
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

---

## 7. Key Dependencies

| Dependency | Purpose |
|---|---|
| `androidx.compose.bom` | Jetpack Compose BOM |
| `material3` | Material You UI |
| `navigation-compose` | Screen navigation |
| `retrofit2` | HTTP client |
| `okhttp3` | HTTP transport |
| `kotlinx-coroutines` | Async/await |
| `lifecycle-viewmodel-compose` | MVVM |
| `room` | Local draft storage |
| `datastore-preferences` | Settings persistence |
| `hilt-android` | Dependency injection |

---

## 8. Permissions

The app requires:
- `INTERNET` — for API calls
- `READ_EXTERNAL_STORAGE` (API < 33) — for PDF picker

Both are declared in `AndroidManifest.xml`.

---

## 9. Common Issues

### "API_BASE_URL not found"
→ Create `android/app/local.properties` with the `API_BASE_URL` key.

### "Network error" in app
→ Ensure the Apps Script web app URL is correct and deployed with "Anyone" access.

### Gradle sync fails
→ Check internet, use VPN if Maven Central is blocked, or try `./gradlew --refresh-dependencies`.

### Emulator too slow
→ Enable Intel HAXM in Android Studio SDK Manager, or use x86_64 system image.

### PDF picker returns nothing
→ Ensure the device has a file manager app installed. On emulator, push a PDF first: `adb push test.pdf /sdcard/`.

---

## 10. Debug Logging

All API calls are logged with OkHttp logging interceptor in Debug builds.

View in Android Studio → Logcat, filter by tag `OkHttp`.

---

## 11. Running Tests

### Unit Tests
```powershell
.\gradlew test
```

### Instrumented Tests
```powershell
.\gradlew connectedAndroidTest
```

---

## 12. .gitignore Additions

Add these to your `.gitignore`:
```
android/app/local.properties
android/interview-tracker.jks
android/.gradle/
android/app/build/
```

