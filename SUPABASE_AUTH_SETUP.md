# Supabase Auth Setup

Use this after deploying the app so password reset and Google sign-in links return to the right place.

## Password Reset

1. Open Supabase.
2. Go to `Authentication` -> `URL Configuration`.
3. Set `Site URL` to your deployed app URL.
4. Add these `Redirect URLs`:

```text
http://localhost:8081/**
http://localhost:19006/**
https://YOUR-DOMAIN.com/**
```

5. Go to `Authentication` -> `Email Templates` -> `Reset Password`.
6. Keep the default `{{ .ConfirmationURL }}` link in the email template.

## Google Sign-In

1. Go to `Authentication` -> `Providers`.
2. Open `Google`.
3. Turn Google on.
4. Add your Google OAuth `Client ID` and `Client Secret`.
5. In Google Cloud Console, add this authorized redirect URI:

```text
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

6. In Supabase `Authentication` -> `URL Configuration`, make sure your app URL is still allowed as a redirect URL.

Replace `YOUR-DOMAIN.com` and `YOUR-PROJECT-REF` with your real values.
