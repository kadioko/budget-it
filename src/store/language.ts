import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppLanguage = 'en' | 'sw';

type TranslationLeaf = string;
type TranslationTree = {
  [key: string]: TranslationLeaf | TranslationTree;
};

interface LanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

const webStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
}));

export const translations = {
  en: {
    common: {
      appName: 'Budget It',
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading...',
      settings: 'Settings',
      help: 'Help',
      guides: 'Guides',
      questionMark: '?',
      english: 'English',
      swahili: 'Swahili',
    },
    auth: {
      heroBadge: 'Smarter personal finance, built for everyday use',
      heroTitle: 'Budget with clarity, not guesswork.',
      heroSubtitle:
        'Track spending, monitor your balance, and stay on top of your goals with a cleaner, faster budgeting flow designed to work well on both desktop and mobile.',
      featureTracking: 'Clear daily and monthly tracking',
      featureQuickLogging: 'Quick transaction logging',
      featureResponsive: 'Mobile-friendly responsive web app',
      featureSecure: 'Secure account-based access',
      metricVisibility: 'budget visibility',
      metricOneView: 'for balances and trends',
      metricSetup: 'setup and onboarding',
      tagLine: 'Track your spending, save smarter',
      welcomeBack: 'Welcome back',
      welcomeSubtitle: 'Sign in to continue tracking your budget, balances, and recent spending.',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      createAccount: 'Create your account',
      signUp: 'Sign up free',
      signingUp: 'Creating account...',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      confirmPasswordPlaceholder: 'Confirm password',
      fillAllFields: 'Please fill in all fields',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordsDoNotMatch: 'Passwords do not match',
      signupSuccess: 'Account created! Check your email to verify, then sign in.',
      loginError: 'Login failed. Check your credentials.',
      signupError: 'Signup failed',
    },
    dashboard: {
      overview: 'Overview',
      budgetAtGlance: 'Your budget at a glance',
      daysLeftInCycle: 'days left in cycle',
      allAccounts: 'All accounts',
      bankAccount: 'Bank account',
      quickAddFood: 'Add food expense',
      quickLogIncome: 'Log income',
      quickMoveMoney: 'Move money',
      history: 'History',
      analytics: 'Analytics',
      helpTitle: 'Guides',
      recentTransactions: 'Recent Transactions',
      viewAll: 'View all',
      noTransactions: 'No transactions yet',
      addFirstTransaction: 'Add your first transaction',
      alertsAndSummaries: 'Alerts and summaries',
      notifications: 'Notifications',
    },
    settings: {
      preferences: 'Preferences',
      settingsTitle: 'Settings',
      appearance: 'Appearance',
      appearanceSubtitle: 'Choose how the web app looks. Your preference is saved on this device.',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      toggleTo: 'Toggle to',
      languageAndHelp: 'Language & help',
      languageSubtitle: 'Choose the language you want to use in the app and open quick guides when you need a refresher.',
      appLanguage: 'App language',
      openQuickGuides: 'Open quick guides',
      quickGuidesSubtitle: 'Learn the basics, transfers, recurring entries, and budget-cycle tips in one place.',
      budgetTargets: 'Budget Targets',
      account: 'Account',
      signedInAs: 'Signed in as',
      signOut: 'Sign Out',
      confirmSignOut: 'Confirm Sign Out',
    },
    guides: {
      eyebrow: 'Quick Guides',
      title: 'How to use Budget It',
      subtitle:
        'Short walkthroughs for the most important parts of the app, so you can get unstuck fast without leaving your budget flow.',
      cardGettingStarted: 'Getting started',
      cardGettingStartedBody:
        'Set your daily target, monthly target, currency, and cycle start day in Settings first. Then add your first transaction from the dashboard.',
      cardTransfers: 'Moving money',
      cardTransfersBody:
        'Use Move money when cash shifts between your bank account and envelopes. Transfers change balances without counting as spending.',
      cardRecurring: 'Recurring transactions',
      cardRecurringBody:
        'Use recurring transactions for salary, rent, subscriptions, and bills. The dashboard alerts area will show items coming up soon.',
      cardInsights: 'Insights and limits',
      cardInsightsBody:
        'Category limits power warnings, while the dashboard and analytics screens compare your spending pace against the current budget cycle.',
      cardTags: 'Merchants and tags',
      cardTagsBody:
        'Add a merchant and a few tags when logging transactions. This helps the app suggest matches and makes future insights more useful.',
      tipTitle: 'Pro tip',
      tipBody:
        'If your budget resets on a day other than the 1st, update the cycle start day in Settings so all analytics follow your real routine.',
      needAnythingElse: 'Need anything else?',
      needAnythingElseBody:
        'You can return here anytime from the question-mark button in the top navigation or the Language & help card in Settings.',
    },
  },
  sw: {
    common: {
      appName: 'Budget It',
      back: 'Rudi',
      save: 'Hifadhi',
      cancel: 'Ghairi',
      loading: 'Inapakia...',
      settings: 'Mipangilio',
      help: 'Msaada',
      guides: 'Mwongozo',
      questionMark: '?',
      english: 'Kiingereza',
      swahili: 'Kiswahili',
    },
    auth: {
      heroBadge: 'Fedha binafsi zenye akili, kwa matumizi ya kila siku',
      heroTitle: 'Panga bajeti kwa uwazi, si kubahatisha.',
      heroSubtitle:
        'Fuatilia matumizi, angalia salio lako, na simamia malengo yako kwa mfumo safi na wa haraka unaofanya kazi vizuri kwenye kompyuta na simu.',
      featureTracking: 'Ufuatiliaji wazi wa kila siku na kila mwezi',
      featureQuickLogging: 'Kuingiza miamala kwa haraka',
      featureResponsive: 'Programu ya wavuti rafiki kwa simu',
      featureSecure: 'Upatikanaji salama wa akaunti',
      metricVisibility: 'muonekano wa bajeti',
      metricOneView: 'kwa salio na mwenendo',
      metricSetup: 'usanidi na kuanza kutumia',
      tagLine: 'Fuatilia matumizi yako, okoa kwa busara',
      welcomeBack: 'Karibu tena',
      welcomeSubtitle: 'Ingia uendelee kufuatilia bajeti, salio, na matumizi yako ya hivi karibuni.',
      signIn: 'Ingia',
      signingIn: 'Inaingia...',
      createAccount: 'Fungua akaunti yako',
      signUp: 'Jisajili bure',
      signingUp: 'Inatengeneza akaunti...',
      noAccount: 'Huna akaunti?',
      haveAccount: 'Tayari una akaunti?',
      emailPlaceholder: 'Anwani ya barua pepe',
      passwordPlaceholder: 'Nenosiri',
      confirmPasswordPlaceholder: 'Thibitisha nenosiri',
      fillAllFields: 'Tafadhali jaza sehemu zote',
      passwordTooShort: 'Nenosiri lazima liwe angalau herufi 6',
      passwordsDoNotMatch: 'Nenosiri halifanani',
      signupSuccess: 'Akaunti imefunguliwa! Angalia barua pepe yako kuthibitisha, kisha ingia.',
      loginError: 'Kuingia kumeshindikana. Hakikisha taarifa zako ni sahihi.',
      signupError: 'Usajili umeshindikana',
    },
    dashboard: {
      overview: 'Muhtasari',
      budgetAtGlance: 'Muonekano wa haraka wa bajeti yako',
      daysLeftInCycle: 'siku zilizobaki kwenye mzunguko',
      allAccounts: 'Akaunti zote',
      bankAccount: 'Akaunti ya benki',
      quickAddFood: 'Ongeza matumizi ya chakula',
      quickLogIncome: 'Weka mapato',
      quickMoveMoney: 'Hamisha fedha',
      history: 'Historia',
      analytics: 'Takwimu',
      helpTitle: 'Mwongozo',
      recentTransactions: 'Miamala ya hivi karibuni',
      viewAll: 'Tazama yote',
      noTransactions: 'Hakuna miamala bado',
      addFirstTransaction: 'Ongeza muamala wako wa kwanza',
      alertsAndSummaries: 'Tahadhari na muhtasari',
      notifications: 'Arifa',
    },
    settings: {
      preferences: 'Mapendeleo',
      settingsTitle: 'Mipangilio',
      appearance: 'Mwonekano',
      appearanceSubtitle: 'Chagua jinsi programu ya wavuti itaonekana. Chaguo lako litahifadhiwa kwenye kifaa hiki.',
      lightMode: 'Mwanga',
      darkMode: 'Giza',
      toggleTo: 'Badili kwenda',
      languageAndHelp: 'Lugha na msaada',
      languageSubtitle: 'Chagua lugha ya kutumia kwenye programu na fungua mwongozo wa haraka unapohitaji ukumbusho.',
      appLanguage: 'Lugha ya programu',
      openQuickGuides: 'Fungua mwongozo wa haraka',
      quickGuidesSubtitle: 'Jifunze mambo ya msingi, uhamisho, miamala ya kurudia, na vidokezo vya mzunguko wa bajeti sehemu moja.',
      budgetTargets: 'Malengo ya bajeti',
      account: 'Akaunti',
      signedInAs: 'Umeingia kama',
      signOut: 'Toka',
      confirmSignOut: 'Thibitisha kutoka',
    },
    guides: {
      eyebrow: 'Mwongozo wa Haraka',
      title: 'Jinsi ya kutumia Budget It',
      subtitle:
        'Maelezo mafupi ya sehemu muhimu zaidi za programu ili usipoteze muda unapohitaji msaada wa haraka.',
      cardGettingStarted: 'Kuanza',
      cardGettingStartedBody:
        'Weka lengo la kila siku, lengo la kila mwezi, sarafu, na siku ya kuanza mzunguko kwenye Mipangilio kwanza. Kisha ongeza muamala wako wa kwanza kutoka dashboard.',
      cardTransfers: 'Kuhamisha fedha',
      cardTransfersBody:
        'Tumia Hamisha fedha pale pesa zinapotoka kwenye benki kwenda kwenye envelope au kurudi. Uhamisho hubadilisha salio bila kuhesabika kama matumizi.',
      cardRecurring: 'Miamala ya kurudia',
      cardRecurringBody:
        'Tumia miamala ya kurudia kwa mshahara, kodi, subscription, na bili. Eneo la tahadhari kwenye dashboard litaonyesha kinachokaribia.',
      cardInsights: 'Taarifa na mipaka',
      cardInsightsBody:
        'Mipaka ya category huleta tahadhari, huku dashboard na analytics zikilinganisha kasi ya matumizi yako dhidi ya mzunguko wa sasa wa bajeti.',
      cardTags: 'Wafanyabiashara na tagi',
      cardTagsBody:
        'Ongeza merchant na tagi chache unapoweka muamala. Hii husaidia programu kutoa mapendekezo bora na kufanya taarifa za baadaye ziwe na maana zaidi.',
      tipTitle: 'Kidokezo',
      tipBody:
        'Ikiwa bajeti yako inaanza siku nyingine tofauti na tarehe 1, badilisha siku ya kuanza mzunguko kwenye Mipangilio ili takwimu zote zifuate ratiba yako halisi.',
      needAnythingElse: 'Unahitaji kitu kingine?',
      needAnythingElseBody:
        'Unaweza kurudi hapa wakati wowote kupitia kitufe cha alama ya swali kwenye juu ya ukurasa au kadi ya Lugha na msaada ndani ya Mipangilio.',
    },
  },
} as const satisfies Record<AppLanguage, TranslationTree>;

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'budget-it-language',
      storage: webStorage,
    }
  )
);

const getNestedTranslation = (tree: TranslationTree, path: string): string | undefined => {
  const value = path.split('.').reduce<TranslationLeaf | TranslationTree | undefined>((acc, key) => {
    if (!acc || typeof acc === 'string') return undefined;
    return acc[key];
  }, tree);

  return typeof value === 'string' ? value : undefined;
};

export const translate = (language: AppLanguage, key: string, fallback?: string) =>
  getNestedTranslation(translations[language], key) ||
  getNestedTranslation(translations.en, key) ||
  fallback ||
  key;

export const useI18n = () => {
  const language = useLanguageStore((state) => state.language);
  return {
    language,
    t: (key: string, fallback?: string) => translate(language, key, fallback),
  };
};
