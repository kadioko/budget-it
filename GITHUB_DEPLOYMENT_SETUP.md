# Budget It - GitHub & Vercel Deployment Setup

Your project is ready to deploy! Follow these steps to push to GitHub and deploy to Vercel.

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click **+** → **New repository**
3. Name it: `budget-it`
4. Description: `Personal finance tracker with Expo, React Native, and Supabase`
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README (we already have one)
7. Click **Create repository**

## Step 2: Push to GitHub

After creating the repo, you'll see commands. Run these in your terminal:

```bash
cd "C:\Users\USER\Documents\Coding\Projects\Budget It"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/budget-it.git

# Rename branch to main (optional but recommended)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Note**: You may need to authenticate. GitHub will prompt you to:
- Use a Personal Access Token (recommended)
- Or use GitHub CLI (`gh auth login`)

### Getting a Personal Access Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Name: `budget-it-deploy`
4. Select scopes: `repo` (full control of private repositories)
5. Click **Generate token**
6. Copy the token (you won't see it again!)
7. Use this token as your password when git prompts

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
npm install -g vercel
vercel
```

Follow the prompts:
- Link to existing project? → **No**
- Project name → `budget-it`
- Framework → **Expo**
- Root directory → `./`
- Build command → `npm run build`
- Output directory → `dist`

### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Paste your GitHub repo URL: `https://github.com/YOUR_USERNAME/budget-it`
5. Click **Import**
6. Configure:
   - **Framework Preset**: Expo
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
7. **Environment Variables**:
   - Add `EXPO_PUBLIC_SUPABASE_URL`: `https://gbdhastkkfbpypddwvke.supabase.co`
   - Add `EXPO_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_JL1243zS8c08QeObe3v5FA_TsRTkgdD`
8. Click **Deploy**

## Step 4: Verify Deployment

After deployment completes:

1. Vercel will show your live URL (e.g., `https://budget-it.vercel.app`)
2. Visit the URL to test the app
3. Test the full flow:
   - Sign up with a test email
   - Set budget targets
   - Add a transaction
   - View dashboard

## Step 5: Set Up Supabase Database Schema

**Important**: You still need to run the SQL schema in your Supabase project.

1. Go to [supabase.com](https://supabase.com) and log in to your project
2. Go to **SQL Editor**
3. Click **New Query**
4. Paste the SQL schema from `README.md` (Supabase Schema Setup section)
5. Click **Run**

This creates the tables and RLS policies needed for the app to work.

## Troubleshooting

### "git push" fails with authentication error
- Use a Personal Access Token instead of password
- Or use GitHub CLI: `gh auth login`

### Vercel build fails
- Check build logs in Vercel dashboard
- Ensure environment variables are set correctly
- Run `npm run type-check` locally to verify TypeScript

### App shows "Missing Supabase environment variables"
- Verify environment variables are set in Vercel project settings
- Redeploy after adding variables
- Check that variable names start with `EXPO_PUBLIC_`

### App works locally but not on Vercel
- Check browser console for errors (F12)
- Verify Supabase URL and key are correct
- Check that RLS policies are enabled in Supabase

## Next Steps

1. ✅ Push to GitHub
2. ✅ Deploy to Vercel
3. ✅ Run Supabase schema
4. Test the live app
5. Share the Vercel URL with others
6. Build Android APK: `eas build --platform android --type apk`

## Quick Commands Reference

```bash
# View git status
git status

# View commit history
git log --oneline

# View remote URL
git remote -v

# Make changes and push
git add .
git commit -m "Your message"
git push

# View Vercel deployments
vercel list
```

## Environment Variables (Already Set)

```
EXPO_PUBLIC_SUPABASE_URL=https://gbdhastkkfbpypddwvke.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_JL1243zS8c08QeObe3v5FA_TsRTkgdD
```

These are already in your `.env.local` file and should be added to Vercel project settings.

---

**Status**: Project initialized with git, ready for GitHub push and Vercel deployment!
