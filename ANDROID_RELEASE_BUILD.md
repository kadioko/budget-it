# Android Release Build Guide

Use this guide whenever Budget It is being released through Google Play.

## Release Identity

- App: Budget It
- Android package name: `com.kadioko.budgetit`
- Google Play privacy policy: `https://budgetit.xyz/privacy-policy`
- Current configured version: `1.0.8` (`versionCode` `9`)

The package name is the permanent identity of the app in Google Play. Do not change it for an update.

## Version Every Play Release

Before creating a new production bundle, update both values in `app.json`:

```json
"version": "1.0.9",
"android": {
  "versionCode": 10
}
```

- `version` is the user-visible release version.
- `versionCode` is the Android/Google Play build number.
- Every bundle uploaded to Google Play must use a version code greater than every version code already uploaded for this package.
- Never rebuild or upload a new Play release with a version code that has already been uploaded. Increase it first.

## Preflight Checks

Run these from the project root before a production build:

```powershell
git status -sb
npm install
npm run type-check
npm test -- --runInBand
npx expo-doctor
npx expo export --platform android --clear
```

Commit the release source changes before starting the build so the shipped version can be reproduced later. Resolve any failed check before continuing.

## Build The Play Store AAB

Sign in to the correct Expo account, then start the production build:

```powershell
eas whoami
npm run build:android:playstore
```

This is equivalent to:

```powershell
eas build --platform android --profile production
```

The production profile in `eas.json` creates an `.aab` Android App Bundle. An AAB is for Google Play and cannot be installed directly on a phone.

To create an installable internal-test APK instead, use:

```powershell
npm run build:android:apk
```

The APK is only for testing. Do not upload it as the production Google Play release.

## Find And Download The Finished Build

Wait until EAS reports `FINISHED`. You can see the latest Android build with:

```powershell
eas build:list --platform android --limit 1
```

Open the returned build URL and download the AAB, or download its artifact URL locally:

```powershell
$releaseDir = Join-Path (Get-Location) 'builds'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
Invoke-WebRequest -Uri '<EAS_AAB_ARTIFACT_URL>' -OutFile (Join-Path $releaseDir 'budget-it-<version>-versionCode<code>.aab')
```

For example: `builds\budget-it-1.0.9-versionCode10.aab`. Build artifacts stay local and must not be committed to Git.

## Google Play Production Checklist

1. Open Google Play Console, select Budget It, and choose **Production**.
2. Select **Create new release** and upload the new `.aab`.
3. Set the internal release name to `Budget It <version> (<versionCode>)`.
4. Paste the release notes, wrapped in the correct language tag.
5. Confirm the privacy policy is exactly `https://budgetit.xyz/privacy-policy` and opens publicly in a private browser window.
6. Check App content, Data safety, content rating, store listing, icon, feature graphic, and screenshots remain complete.
7. Review the generated bundle version code, save, and send the release for review/publish.

Use the current store copy and graphics in [PLAY_STORE_LISTING.md](PLAY_STORE_LISTING.md).

## Release Notes Template

Paste this into the Google Play release-notes field and replace the contents with the actual user-facing changes:

```text
<en-US>
Improved Budget It with a smoother Android experience and important reliability updates.

- Add the most important new feature or improvement.
- Add one or two clear user-facing fixes.
- Mention any important security, performance, or reliability improvement.
</en-US>
```

Do not include internal implementation details, secrets, tokens, database names, or unpublished features in release notes.

## Hotfix And Rollback Rules

- Google Play does not allow replacing an uploaded AAB with the same version code.
- If an issue is found before publication, stop or discard the release in Play Console, fix the source, increase `versionCode`, and build a new AAB.
- If an issue is live, halt the rollout if available, prepare a hotfix with a new version code, test it using internal testing, then release it.
- Keep the previous release notes and EAS build link with the release record for traceability.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Play rejects the bundle version | Increase `android.versionCode` in `app.json`, then create a new AAB. |
| The build is still queued | Wait for EAS to reach `FINISHED`; an artifact is not ready before then. |
| The AAB will not install on a phone | This is expected. Use a preview APK or a Google Play internal-testing release. |
| EAS builds an APK instead of an AAB | Use `npm run build:android:playstore`, which uses the `production` profile. |
| Play rejects the privacy policy | Confirm `https://budgetit.xyz/privacy-policy` is public, uses HTTPS, and shows the policy without sign-in. |
| The app differs from web after update | Test the built APK or internal-testing track before promoting the new AAB to production. |

## Security

Never place Supabase access tokens, Expo tokens, keystore files, Google credentials, or any other secrets in this document, Git, release notes, or screenshots. Use the configured EAS and Supabase secret management instead.

For backend alert setup, see [SUPABASE_NOTIFICATIONS_SETUP.md](SUPABASE_NOTIFICATIONS_SETUP.md).
