# NesAI Student mobile app readiness

## Current app

- The student experience is part of the main NesAI TanStack Start app, not the separate Marketplace app. Its core routes include sign-in, the AI study chat, Vault resources, profile settings, Premium, and account deletion.
- The web app is server-rendered and also owns API routes for chat, PayPal billing, and administration. It uses Supabase Auth and database/storage directly from the browser.
- The client calls server routes with relative `/api/...` URLs. A locally bundled mobile shell will need a production API origin, because its WebView origin is not the website origin.
- A first code step now supports `VITE_API_BASE_URL` for the study chat and subscription API requests; the normal website continues to use its current origin when that setting is absent.
- The mobile build configuration now creates a separate SPA shell and its API host defaults to the production NesAI domain. API routes need to allow only the Capacitor iOS/Android origins so browser security permits authenticated mobile requests.
- Sign-up confirmation, password recovery, and email changes use the native `nesai://app` callback in Capacitor builds, while the website continues to use its configured web origin. The native callback handler and URL scheme are implemented. Supabase Auth still needs `nesai://app/**` added to the redirect allowlist before email links can return to an installed app.
- The profile now includes an in-app account deletion action, and `/account-deletion` provides public deletion instructions. The endpoint deletes the authenticated Supabase user, cascading their profile, chats, subscription rows, and quota records. It warns that payment-provider subscriptions must be cancelled separately.
- `/privacy` now provides a public privacy notice linked from the app navigation. Confirm the legal publisher name, active AI processor, provider retention terms and final wording before store submission.
- Website Premium uses PayPal. The mobile Premium screen now uses native store purchase, restore, and subscription-management actions. The mobile build has Capacitor Android/iOS projects and a dedicated SPA shell.
- Store subscription verification is wired into server endpoints. Google Play validation uses the Android Publisher API; Apple uses Apple's official App Store Server Library to verify signed StoreKit transactions. Renewal and cancellation updates now have verified App Store Server Notifications V2 and Google Play RTDN endpoints.
- This Windows workspace has no Android SDK/Java toolchain or Xcode. Capacitor 8 needs Node 22+, Android Studio 2025.2.1 with Android SDK API 36 for Android, and Xcode 26.0+ on macOS for iOS. GitHub Actions build validation is configured for an Android debug APK and iOS Simulator app; these are not store-signed release builds.

## Recommended implementation

Use Capacitor for the student app, keeping the existing web site and backend. Build a mobile-specific local web shell rather than shipping a bare WebView that simply opens the website. TanStack Start has a supported SPA-shell mode that can produce static client assets while its server routes remain hosted remotely. Configure API requests to reach the existing production server, and keep Supabase/Auth, AI secrets, PayPal secrets, and privileged operations on trusted servers.

**Product decision confirmed:** Premium will use Apple and Google in-app subscriptions in the mobile apps; PayPal remains available on the website. The mobile UI must not route store users through the web PayPal checkout for digital Premium access.

**Billing-service decision confirmed:** Use direct Apple and Google transaction verification rather than a paid subscription aggregator, per the preference to choose the free option. Store transaction APIs still need server credentials and ongoing integration maintenance; the stores' own transaction fees still apply.

Add mobile-specific value as part of the product, not just the package: saved Vault PDFs for offline study, native share/open flows for learning files, study reminders, and platform-consistent navigation and keyboard handling. Vault PDFs can now be saved in device IndexedDB, opened without a network connection, shared through the native share sheet, and removed to reclaim storage. Students can schedule a daily on-device reminder from their profile. Validate sharing, notification permissions, reminder timing, and keyboard behavior on real iOS and Android phones.

## Store and account requirements to plan for

- Treat Premium as a digital subscription. The normal path is Apple In-App Purchase and Google Play Billing in the respective apps, with PayPal remaining on the website. Existing web subscribers can share entitlements across platforms, but Apple requires those cross-platform items to also be available as in-app purchases. The server must validate store transactions and map them to the existing student entitlement model.
- Provide a discoverable in-app account deletion path and a public web page for deletion instructions. Both are implemented; verify the public route and deletion flow in staging before release.
- The app must provide meaningful student utility beyond a repackaged site. Apple App Review Guideline 4.2 and Google Play's limited-functionality policy both make a thin wrapper a review risk.
- As of 31 August 2026, Google Play requires new apps and updates to target Android 16 (API 36) or higher.
- App Store submission needs a macOS/Xcode build and signing workflow. Play Store submission needs a signed Android App Bundle and a Play Console account. Both stores need final privacy disclosures, store metadata, screenshots, and review access to a working account.

## Milestones

1. Confirm the app's permanent bundle/package ID and store publisher identity.
2. Add a separate mobile build configuration, Capacitor Android/iOS projects, app icons/splash assets, and mobile API/auth callback handling without changing the website deployment. (Scaffolded; mobile production build and Capacitor sync succeed.)
3. Finish StoreKit and Play Billing verification, configure store products and credentials, and verify cross-platform entitlement sync. (Purchase, restore, manage UI, signed purchase verification, and renewal notification endpoints are implemented; live store credentials/products and notification registration remain.)
4. Add offline study resources and native share/reminder/navigation behavior; test responsive layouts, accessibility, login links, uploads, subscriptions, and failure/offline states on both platforms. (Offline Vault PDFs, PDF sharing, and local daily reminders are implemented; device validation remains.)
5. Prepare signing, store listings and privacy disclosures, then run internal/beta tests before submitting for review. (A public privacy notice is drafted at `/privacy`; the publisher and provider disclosures still need review.)

## Build validation workflow

`.github/workflows/mobile-build.yml` builds an installable Android debug APK and an iOS Simulator app on GitHub Actions for pull requests or manual runs. Configure the repository Actions variables `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` first. `NESAI_API_BASE_URL` is optional and defaults to `https://www.nesai.co.za`. The workflow does not sign Android App Bundles or iOS archives for store distribution.

## Decisions / access still needed

- Confirm the permanent app identifier (bundle ID / Android application ID) before generating store projects.
- Legal publisher name and the Apple Developer / Google Play Console accounts that will own the listings.
- Access to a Mac with Xcode for iOS simulator/device builds and signing; Android Studio/SDK for Android builds.
- Configure the GitHub Actions public app variables above to run the native build-validation workflow.
- Add `nesai://app/**` to the Supabase Auth redirect URL allowlist and configure the documented store product IDs and verifier secrets.
- Register `https://www.nesai.co.za/api/payments/apple-notifications` as the App Store Server Notifications V2 URL. Configure Google Play RTDN to publish to Cloud Pub/Sub with an OIDC-authenticated push subscription targeting `https://www.nesai.co.za/api/payments/google-notifications`; set the matching audience and service account email in server secrets.
- Configure `VITE_IOS_PREMIUM_PRODUCT_ID`, `VITE_ANDROID_PREMIUM_PRODUCT_ID`, `VITE_ANDROID_PREMIUM_BASE_PLAN_ID` for the client and matching `IOS_PREMIUM_PRODUCT_ID`, `ANDROID_PREMIUM_PRODUCT_ID`, `ANDROID_PREMIUM_BASE_PLAN_ID`, `ANDROID_PACKAGE_NAME`, and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` server secrets. Apple verification needs `IOS_BUNDLE_ID`, numeric `APPLE_APP_ID`, and Apple root certificates in `APPLE_ROOT_CERTIFICATES_BASE64` (comma-separated base64 DER certificates). These products and credentials must be created in the store consoles first.

## Policy and technical references

- [Capacitor: add to an existing web app](https://capacitorjs.com/docs/getting-started)
- [Capacitor platform setup requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
- [TanStack Start SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play functionality policy](https://support.google.com/googleplay/android-developer/answer/9898783)
- [Google Play billing policy](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Google Play account deletion policy](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play target API policy](https://support.google.com/googleplay/android-developer/answer/11926878)
