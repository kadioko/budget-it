#!/bin/bash
# Write Vercel env vars to .env.local so Expo Metro can read them
echo "EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL" > .env.local
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY" >> .env.local
echo "--- .env.local contents ---"
cat .env.local
echo "---"
npx expo export --platform web
