# Push Budget It to GitHub

Your code is ready to push! Follow these steps:

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `budget-it`
3. Description: `Personal finance tracker with Expo, React Native, and Supabase`
4. Choose **Public** or **Private**
5. **IMPORTANT**: Do NOT check "Initialize this repository with a README"
6. Click **Create repository**

## Step 2: After Creating Repo

Once the repo is created, GitHub will show you commands. Your repo is ready at:
```
https://github.com/kadioko/budget-it
```

## Step 3: Push Your Code

After creating the empty repo on GitHub, run this command:

```bash
cd "C:\Users\USER\Documents\Coding\Projects\Budget It"
git push -u origin main
```

When prompted for authentication:
- Use your GitHub username: `kadioko`
- For password, use a Personal Access Token:
  1. Go to https://github.com/settings/tokens
  2. Click "Generate new token" → "Generate new token (classic)"
  3. Name: `budget-it-deploy`
  4. Select scope: `repo`
  5. Generate and copy the token
  6. Paste as password when git asks

## Your Repository URL

Once pushed, your repo will be at:
```
https://github.com/kadioko/budget-it
```

## Next: Deploy to Vercel

After pushing to GitHub, deploy to Vercel:

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Paste: `https://github.com/kadioko/budget-it`
5. Configure:
   - Framework: Expo
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables:
   - `EXPO_PUBLIC_SUPABASE_URL`: `https://gbdhastkkfbpypddwvke.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_JL1243zS8c08QeObe3v5FA_TsRTkgdD`
7. Click "Deploy"

Your live app will be at: `https://budget-it.vercel.app`

---

**Current Status**: Code is committed locally and ready to push.
