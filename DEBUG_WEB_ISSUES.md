# Debug Web Issues - Budget It

The app shows blank on web. Let's debug this step by step.

## Immediate Debugging Steps

### 1. Check Browser Console
1. Go to https://budget-it-theta.vercel.app
2. Press F12 (or right-click → Inspect)
3. Click **Console** tab
4. Look for any red error messages

### 2. Check Network Tab
1. In the same DevTools, click **Network** tab
2. Refresh the page (F5)
3. Look for any failed requests (red status codes)

### 3. Check if it's a routing issue
The app might be stuck on the auth check or root layout.

## Common Issues & Fixes

### Issue 1: Expo Router Web Entry Point
The App.tsx might not be properly configured for web.

### Issue 2: Missing Web Dependencies
React Native components might not have web equivalents.

### Issue 3: Environment Variables
Supabase credentials might not be properly loaded.

### Issue 4: Auth State Loading
The app might be stuck in loading state.

## Quick Fix Attempts

Let me check and fix the most likely issues:

1. **Fix App.tsx for web**
2. **Add web-specific dependencies**
3. **Update package.json scripts**
4. **Check environment variables**

## What to Share

Please share:
1. Any console errors you see
2. Network tab errors
3. What happens when you visit the URL

This will help me identify the exact issue and fix it quickly.
