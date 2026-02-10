# Deploy Budget It to Vercel

Your GitHub repo is ready! Now deploy to Vercel using the dashboard.

## Step 1: Go to Vercel Dashboard

1. Go to https://vercel.com
2. Sign in with your GitHub account (or create account)
3. Click **Add New** → **Project**

## Step 2: Import GitHub Repository

1. Click **Import Git Repository**
2. Paste your repo URL: `https://github.com/kadioko/budget-it`
3. Click **Import**

## Step 3: Configure Project

On the configuration page:

**Project Name**: `budget-it`

**Framework Preset**: Select **Other** (Expo is not in the list)

**Root Directory**: `./`

**Build Command**: `npm run build`

**Output Directory**: `dist`

**Install Command**: `npm install`

## Step 4: Add Environment Variables

Click **Environment Variables** and add:

1. **Name**: `EXPO_PUBLIC_SUPABASE_URL`
   **Value**: `https://gbdhastkkfbpypddwvke.supabase.co`

2. **Name**: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   **Value**: `sb_publishable_JL1243zS8c08QeObe3v5FA_TsRTkgdD`

## Step 5: Deploy

Click **Deploy** and wait for the build to complete (usually 2-5 minutes).

## Step 6: Your Live App

Once deployed, your app will be live at:
```
https://budget-it.vercel.app
```

## Test the Deployment

1. Visit your Vercel URL
2. Sign up with a test email
3. Set budget targets
4. Add a transaction
5. View the dashboard

## Important: Set Up Supabase Database

Before testing, you MUST run the SQL schema in your Supabase project:

1. Go to https://supabase.com and log in
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the SQL schema from the README.md file
6. Click **Run**

This creates the necessary tables and RLS policies.

## Troubleshooting

**Build fails**: Check build logs in Vercel dashboard
**App shows error**: Check browser console (F12) for errors
**"Missing Supabase environment variables"**: Verify env vars are set in Vercel
**"RLS policy violation"**: Ensure SQL schema was run in Supabase

## Next Steps

- Test the live app
- Build Android APK: `eas build --platform android --type apk`
- Share your Vercel URL with others
- Monitor deployments in Vercel dashboard

---

**Your GitHub**: https://github.com/kadioko/budget-it
**Your Vercel App**: https://budget-it.vercel.app (after deployment)
