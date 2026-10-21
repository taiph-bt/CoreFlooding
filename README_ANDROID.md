# PVU Core Flood Simulator - Android Studio Package Guide

This repository contains a full **Android Studio** project configured with Capacitor for the **PVU Core Flood Simulator** (`vn.edu.pvu.coreflood`).

---

## Prerequisites
- [Android Studio](https://developer.android.com/studio) (Hedgehog, Iguana, Jellyfish, Ladybug, Meerkat, or newer)
- Android SDK installed (API level 24 to 34+)
- JDK 17 or JDK 21 (bundled with Android Studio)

---

## Option 1: Open Directly in Android Studio (Recommended)

1. Open **Android Studio**.
2. Select **Open** (or `File > Open...`).
3. Browse to and select the **`android`** folder inside this repository:
   ```
   /path/to/this-project/android
   ```
4. Android Studio will open the project and automatically trigger Gradle Sync.
5. Once Gradle finishes syncing:
   - **To Build APK**: In the top menu, go to **`Build`** > **`Build Bundle(s) / APK(s)`** > **`Build APK(s)`**.
   - Android Studio will compile the APK. A notification popup will appear at the bottom-right: click **`locate`** to get your compiled `app-debug.apk` file (located in `android/app/build/outputs/apk/debug/app-debug.apk`).
   - **To Run Directly on Phone or Emulator**: Connect your Android phone with USB Debugging enabled (or start an Android Virtual Device / AVD), then click the green **▶ Run 'app'** button in the toolbar.

---

## Option 2: Build APK via Command Line

If you have Android SDK and Gradle installed, you can build the APK directly from the terminal without opening Android Studio:

```bash
# 1. Rebuild web assets and sync to Android
npm run build:android

# 2. Navigate to the android folder
cd android

# 3. Build debug APK using Gradle wrapper:
# On Linux / macOS:
./gradlew assembleDebug

# On Windows:
gradlew.bat assembleDebug
```

The resulting APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Project Specifications

- **Application ID / Package**: `vn.edu.pvu.coreflood`
- **Application Name**: `PVU Core Flood Simulator`
- **Min SDK**: API 22 (Android 5.1 Lollipop)
- **Target SDK**: API 34+ (Android 14)
- **Supported Architecture**: ARM64, ARMv7, x86_64
- **Webview Engine**: Hardware-accelerated Chromium WebView with HTML5 Canvas and WebGL support.
