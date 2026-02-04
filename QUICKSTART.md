# Budget It - Quick Start Guide

Get Budget It running in 5 minutes.

## 1. Supabase Setup (2 min)

1. Go to [supabase.com](https://supabase.com) → Sign up
2. Create a new project (e.g., "budget-it")
3. In **SQL Editor**, paste and run the schema from `README.md` (Supabase Schema Setup section)
4. Go to **Settings → API** and copy:
   - Project URL
   - Anon Key (public)

## 2. Environment Setup (1 min)

Create `.env.local` in project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual Supabase credentials.

## 3. Install Dependencies (1 min)

```bash
cd "C:\Users\USER\Documents\Coding\Projects\Budget It"
npm install
```

## 4. Run Locally (1 min)

**Web**:
```bash
npm run web
```
Opens at `http://localhost:19006`

**Mobile (Expo Go)**:
```bash
npm start
```
Scan QR code with Expo Go app (iOS/Android)

## 5. Test the App

1. **Sign Up**: Create an account with email/password
2. **Set Budget**: Go to Settings → Set daily/monthly targets
3. **Add Transaction**: Click "Add" tab → Add a test expense
4. **View Dashboard**: See your spending stats

## Next Steps

- Read `README.md` for full documentation
- Read `DEPLOYMENT.md` for deployment instructions
- Run tests: `npm test`
- Check TypeScript: `npm run type-check`

## Troubleshooting

**"Missing Supabase environment variables"**
- Verify `.env.local` exists and has correct values
- Restart dev server after creating `.env.local`

**"Cannot connect to Supabase"**
- Check internet connection
- Verify Project URL is correct (should be `https://...supabase.co`)
- Check Supabase project is active

**"RLS policy violation"**
- Ensure SQL schema was run completely
- Check Supabase SQL Editor for any errors

**Port already in use**
- Web: Change port with `npm run web -- --port 19007`
- Mobile: Kill existing Expo process and restart
