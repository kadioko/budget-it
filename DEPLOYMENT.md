# Budget It - Deployment Guide

## Web Deployment (Vercel)

### Prerequisites
- Vercel account (free tier available)
- GitHub repository (optional but recommended)

### Steps

1. **Build locally to test**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**:
   
   **Option A: Using Vercel CLI**
   ```bash
   npm install -g vercel
   vercel
   ```
   Follow the prompts to link your project and deploy.

   **Option B: GitHub Integration**
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project" → Import your GitHub repo
   - Set environment variables in project settings:
     - `EXPO_PUBLIC_SUPABASE_URL`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy"

3. **Configure Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add your Supabase credentials
   - Redeploy

### Vercel Configuration
The `vercel.json` file is already configured for Expo web projects.

---

## Mobile Deployment (Android APK via EAS Build)

### Prerequisites
- Expo account (free tier available)
- EAS CLI: `npm install -g eas-cli`
- Google Play Developer account (for production releases)

### Steps

1. **Initialize EAS**:
   ```bash
   eas build:configure
   ```
   Select Android when prompted.

2. **Build APK**:
   ```bash
   eas build --platform android --type apk
   ```
   This creates a standalone APK you can install directly on Android devices.

3. **Build for Play Store** (production):
   ```bash
   eas build --platform android
   ```
   This creates an AAB (Android App Bundle) for Play Store submission.

4. **Download and Install**:
   - After build completes, download the APK from the EAS dashboard
   - Transfer to Android device or use `adb install` to install

### eas.json Configuration
Create `eas.json` in project root:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

---

## iOS Deployment (Future)

For iOS builds, you'll need:
- Apple Developer account ($99/year)
- Mac with Xcode
- Provisioning profiles and certificates

```bash
eas build --platform ios
```

---

## Environment Variables

### Required for All Platforms
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Vercel Specific
Set in Vercel Project Settings → Environment Variables

### EAS Build Specific
Set in `eas.json` or via EAS CLI:
```bash
eas secret:create
```

---

## Post-Deployment Checklist

- [ ] Test authentication (signup, login, logout)
- [ ] Test budget creation and editing
- [ ] Test transaction creation and deletion
- [ ] Verify dashboard calculations
- [ ] Test on multiple devices/browsers
- [ ] Check error handling and empty states
- [ ] Verify Supabase RLS policies are working
- [ ] Test offline behavior (if applicable)

---

## Troubleshooting

### Vercel Build Fails
- Check environment variables are set
- Verify `package.json` build script is correct
- Check for TypeScript errors: `npm run type-check`

### EAS Build Fails
- Ensure `app.json` is valid: `expo doctor`
- Check Android SDK version compatibility
- Verify Supabase credentials are correct

### Runtime Errors
- Check browser console (web) or Expo Go logs (mobile)
- Verify Supabase RLS policies allow your user
- Check network requests in browser DevTools

---

## Monitoring

### Web (Vercel)
- Vercel Dashboard shows build logs and analytics
- Set up error tracking with Sentry (optional)

### Mobile (EAS)
- Monitor app crashes via Sentry or Bugsnag
- Use Expo's built-in error reporting

---

## Rollback

### Vercel
- Go to Deployments tab
- Click on previous deployment
- Click "Redeploy"

### EAS
- Download previous APK from EAS dashboard
- Or rebuild from previous git commit
