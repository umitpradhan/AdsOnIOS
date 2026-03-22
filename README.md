# AdsOnIOS — Cocos Creator 2D + Google Mobile Ads

A production-ready iOS demo app built with **Cocos Creator 3.7.0** (TypeScript) and **Google Mobile Ads SDK** (Objective-C). Demonstrates a full TS ↔ native bridge for banner, interstitial, and rewarded video ads.

![Platform](https://img.shields.io/badge/platform-iOS-blue)
![Engine](https://img.shields.io/badge/Cocos%20Creator-3.7.0-green)
![Ads SDK](https://img.shields.io/badge/Google%20Mobile%20Ads-latest-orange)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Scene Setup Guide](#scene-setup-guide)
- [Build & Run](#build--run)
- [Ad Unit IDs](#ad-unit-ids)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Component | Technology |
|---|---|
| Engine | Cocos Creator 3.7.0 (2D) |
| Scripts | TypeScript |
| Native | Objective-C |
| Ads SDK | Google Mobile Ads (AdMob) |
| Package Manager | CocoaPods |
| Platform | iOS 13.0+ |

---

## Project Structure

```
AdsOnIOS/
├── assets/
│   ├── scenes/
│   │   └── approot.scene          # Main scene (create UI here in Editor)
│   └── scripts/
│       ├── Approot.ts             # Root bootstrap — inits AdBridge
│       ├── AdBridge.ts            # TS ↔ Native bridge abstraction
│       └── MainMenu.ts           # UI controller (buttons, coins, toast)
├── native/
│   └── engine/
│       └── ios/
│           ├── AdManager.h/.m     # Google Mobile Ads wrapper
│           ├── AdBridgeSetup.h/.m  # JsbBridge command router
│           ├── Podfile             # CocoaPods config
│           └── InfoPlist_Additions.plist  # Required Info.plist keys
├── README.md
└── package.json
```

---

## Scene Setup Guide

After cloning, open the project in **Cocos Creator 3.7.0** and set up the MainMenu scene:

### Step 1: Open the Scene

Open `assets/scenes/approot.scene` in the editor.

### Step 2: Create the UI Hierarchy

Build this node tree under **Canvas**:

```
Canvas
├── Approot              (Empty Node — attach Approot.ts)
├── TitleLabel           (Label — "Ads Demo")
├── CoinLabel            (Label — "Coins: 0")
├── ButtonContainer      (Empty Node — layout container)
│   ├── BannerButton     (Button — label: "Show Banner Ad")
│   ├── InterstitialButton (Button — label: "Show Interstitial Ad")
│   └── RewardedButton   (Button — label: "Show Rewarded Video Ad")
└── ToastLabel           (Label — empty string, initially inactive)
```

### Step 3: Attach Scripts

1. Select the **Approot** node → Add Component → **Custom Script** → `Approot`
2. Select the **Canvas** node → Add Component → **Custom Script** → `MainMenu`

### Step 4: Wire MainMenu Properties

Select **Canvas** node and in the **MainMenu** component inspector, drag & drop:

| Property | Node to Drag |
|---|---|
| `titleLabel` | `TitleLabel` |
| `coinLabel` | `CoinLabel` |
| `toastLabel` | `ToastLabel` |
| `bannerButton` | `BannerButton` |
| `interstitialButton` | `InterstitialButton` |
| `rewardedButton` | `RewardedButton` |

### Step 5: (Optional) Style the UI

- Set Canvas design resolution to **720 × 1280** (portrait)
- Use a `VerticalLayout` on `ButtonContainer` with spacing for neat button alignment
- Style `ToastLabel` with a semi-transparent background sprite

---

## Build & Run

### 1. Build iOS from Cocos Creator

1. Open **Project → Build** in Cocos Creator
2. Select **iOS** platform
3. Set Bundle Identifier (e.g. `com.yourname.adsonios`)
4. Click **Build**
5. This generates `native/engine/ios/` with the Xcode project

### 2. Add Native Files to Xcode

After the initial build:

1. Open the generated `.xcodeproj` in Xcode
2. In the Project Navigator, right-click the project target → **Add Files to...**
3. Add these files (check "Copy items if needed"):
   - `AdManager.h`, `AdManager.m`
   - `AdBridgeSetup.h`, `AdBridgeSetup.m`

### 3. Wire AdBridgeSetup in AppDelegate

Find `AppDelegate.mm` (or equivalent) in the Xcode project. Add the setup call:

```objc
#import "AdBridgeSetup.h"

// In application:didFinishLaunchingWithOptions: (after Cocos engine init)
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // ... existing Cocos setup ...

    [AdBridgeSetup setup];  // ← Add this line

    return YES;
}
```

### 4. Install CocoaPods

```bash
cd native/engine/ios
pod install
```

> **Important**: After `pod install`, always open the `.xcworkspace` file, NOT `.xcodeproj`.

### 5. Update Info.plist

Merge the keys from `InfoPlist_Additions.plist` into your project's `Info.plist`:

- `GADApplicationIdentifier` — Google test app ID
- `NSUserTrackingUsageDescription` — ATT prompt string
- `SKAdNetworkItems` — Required for attribution

### 6. Build & Run

1. Open `.xcworkspace` in Xcode
2. Select your device or simulator
3. Build and run (⌘R)

---

## Ad Unit IDs

The project ships with **official Google test ad unit IDs**. These display test ads and won't generate real revenue:

| Ad Type | Test Unit ID |
|---|---|
| Banner | `ca-app-pub-3940256099942544/2934735716` |
| Interstitial | `ca-app-pub-3940256099942544/4411468910` |
| Rewarded | `ca-app-pub-3940256099942544/1712485313` |
| App ID | `ca-app-pub-3940256099942544~1458002511` |

### Switching to Production IDs

1. **Ad Unit IDs**: Edit `native/engine/ios/AdManager.m` — replace the three `static NSString * const` values near the top
2. **App ID**: Edit `Info.plist` → `GADApplicationIdentifier` with your AdMob app ID
3. **Never ship with test IDs** in production

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           Cocos Creator (TypeScript)         │
│                                             │
│  MainMenu.ts ──→ AdBridge.ts                │
│       ↑              │                      │
│       │              ↓                      │
│       │    native.bridge.sendToNative()      │
│       │              │                      │
│       │    native.bridge.onNative()          │
│       │              ↑                      │
├───────│──────────────│──────────────────────┤
│       │    JsbBridge │  (Cocos Engine)       │
├───────│──────────────│──────────────────────┤
│       │              ↓                      │
│  AdBridgeSetup.m ──→ AdManager.m            │
│       │              │                      │
│       │      Google Mobile Ads SDK          │
│       │              │                      │
│       ←──── sendToScript ←──────┘           │
│                                             │
│              Native iOS (Obj-C)             │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **TS → Native**: `MainMenu` calls `AdBridge.showBanner()` → `native.bridge.sendToNative("show_banner")` → `JsbBridge` triggers `ICallback` → `AdBridgeSetup` routes to `AdManager.showBanner`
2. **Native → TS**: `AdManager` delegate callback fires → calls `JsbBridge.sendToScript("banner_shown")` → `native.bridge.onNative` handler in `AdBridge` → emits `EventTarget` event → `MainMenu` updates UI

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `native.bridge` is undefined | Ensure you're running on iOS native build, not WebGL/preview |
| Ads don't load on simulator | Interstitial/Rewarded often fail on simulator — test on device |
| `pod install` fails | Ensure CocoaPods is installed: `sudo gem install cocoapods` |
| Banner doesn't respect safe area | Check `AdManager.m` uses `safeAreaLayoutGuide` constraints |
| "No root view controller" error | Ensure ads are called after the app window is created |
| Build error: `JsbBridge.h` not found | Verify the header search path includes `$(SRCROOT)/../engine/common` |

---

## License

This project is provided as an assignment deliverable. Replace ad unit IDs and bundle identifiers for production use.
