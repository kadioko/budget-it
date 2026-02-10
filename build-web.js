const { execSync } = require('child_process');
const fs = require('fs');

// Write env vars to .env.local so Expo Metro bundler can read them
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('=== Build Web Script ===');
console.log('EXPO_PUBLIC_SUPABASE_URL present:', !!url, 'length:', url.length);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY present:', !!key, 'length:', key.length);

const envContent = `EXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${key}\n`;
fs.writeFileSync('.env.local', envContent);
console.log('.env.local written successfully');
console.log('.env.local contents:', fs.readFileSync('.env.local', 'utf8'));

// Run Expo export
console.log('Running: npx expo export --platform web');
execSync('npx expo export --platform web', { stdio: 'inherit' });
console.log('Build complete!');
