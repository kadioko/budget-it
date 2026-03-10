---
description: Install and use the 21st.dev IDE extension safely in this Expo + React Native Web project
---
# 21st.dev IDE Extension Workflow

1. Open your IDE extensions marketplace and search for `21st.dev`.
2. Install the `21st.dev` extension.
3. If the extension requests sign-in, authenticate with your 21st.dev account.
4. Before generating UI, decide whether the target screen is:
   - web-only (`App.tsx`, `web/*.tsx`) or
   - shared React Native / Expo Router (`app/*.tsx`).
5. For this repository, prefer using 21st.dev ideas and generated UI for the web-only surfaces first:
   - `App.tsx`
   - `web/dashboard-web.tsx`
   - `web/transactions-web.tsx`
   - `web/analytics-web.tsx`
   - `web/settings-web.tsx`
6. When prompting 21st.dev, explicitly mention these constraints:
   - Expo + React Native Web project
   - avoid Tailwind-only assumptions unless you are creating web-only markup
   - prefer inline styles or plain CSS-compatible React DOM output for `App.tsx` and `web/*.tsx`
   - keep layouts mobile friendly
   - do not require Next.js-only or shadcn-specific setup
7. Use prompts like:
   - `Create a premium mobile-friendly finance login screen for a React web view using inline styles.`
   - `Improve this dashboard card layout for narrow mobile screens without changing data flow.`
   - `Refactor this transactions list into a cleaner responsive card layout using plain React DOM and inline styles.`
8. Review generated code before applying it. In this codebase, verify:
   - no browser-only APIs are inserted into shared native screens unless guarded
   - no new dependency is required unless intentionally added
   - buttons and cards still work at widths around 320px to 390px
   - TypeScript types remain valid
9. After applying any generated UI changes, run validation:
   - `npm run type-check`
   - start the web app and inspect the changed screen on a narrow viewport
10. If a 21st.dev output assumes a standard React web app, adapt it into the existing Expo web structure instead of replacing the app architecture.
