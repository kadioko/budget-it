import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { BudgetNotificationRecord } from '@/types/index';

type NotificationPreferenceState = {
  browserAlertsEnabled: boolean;
  overspendAlertsEnabled: boolean;
  recurringAlertsEnabled: boolean;
  weeklySummaryAlertsEnabled: boolean;
  inbox: BudgetNotificationRecord[];
  loading: boolean;
  setBrowserAlertsEnabled: (enabled: boolean) => void;
  setOverspendAlertsEnabled: (enabled: boolean) => void;
  setRecurringAlertsEnabled: (enabled: boolean) => void;
  setWeeklySummaryAlertsEnabled: (enabled: boolean) => void;
  loadPreferences: (userId: string) => Promise<void>;
  syncPreferences: (userId: string) => Promise<void>;
  fetchInbox: (userId: string) => Promise<void>;
  markInboxItemRead: (notificationId: string) => Promise<void>;
  triggerScheduler: (userId?: string) => Promise<void>;
};

const localStorageAdapter = {
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
};

const notificationStorage = createJSONStorage(() => (
  Platform.OS === 'web' ? localStorageAdapter : AsyncStorage
));

export const useNotificationSettingsStore = create<NotificationPreferenceState>()(
  persist(
    (set, get) => ({
      browserAlertsEnabled: true,
      overspendAlertsEnabled: true,
      recurringAlertsEnabled: true,
      weeklySummaryAlertsEnabled: true,
      inbox: [],
      loading: false,
      setBrowserAlertsEnabled: (enabled) => set({ browserAlertsEnabled: enabled }),
      setOverspendAlertsEnabled: (enabled) => set({ overspendAlertsEnabled: enabled }),
      setRecurringAlertsEnabled: (enabled) => set({ recurringAlertsEnabled: enabled }),
      setWeeklySummaryAlertsEnabled: (enabled) => set({ weeklySummaryAlertsEnabled: enabled }),
      loadPreferences: async (userId) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            await get().syncPreferences(userId);
            return;
          }

          set({
            browserAlertsEnabled: data.browser_alerts_enabled,
            overspendAlertsEnabled: data.overspend_alerts_enabled,
            recurringAlertsEnabled: data.recurring_alerts_enabled,
            weeklySummaryAlertsEnabled: data.weekly_summary_alerts_enabled,
          });
        } finally {
          set({ loading: false });
        }
      },
      syncPreferences: async (userId) => {
        const state = get();
        await supabase.from('notification_preferences').upsert({
          user_id: userId,
          browser_alerts_enabled: state.browserAlertsEnabled,
          overspend_alerts_enabled: state.overspendAlertsEnabled,
          recurring_alerts_enabled: state.recurringAlertsEnabled,
          weekly_summary_alerts_enabled: state.weeklySummaryAlertsEnabled,
          updated_at: new Date().toISOString(),
        });
      },
      fetchInbox: async (userId) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('budget_notifications')
            .select('*')
            .eq('user_id', userId)
            .is('read_at', null)
            .order('scheduled_for', { ascending: false })
            .limit(8);

          if (error) throw error;
          set({ inbox: data || [] });
        } finally {
          set({ loading: false });
        }
      },
      markInboxItemRead: async (notificationId) => {
        const { error } = await supabase
          .from('budget_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);
        if (error) throw error;
        set((state) => ({
          inbox: state.inbox.filter((item) => item.id !== notificationId),
        }));
      },
      triggerScheduler: async (userId) => {
        const { error } = await supabase.functions.invoke('schedule-budget-alerts', {
          body: userId ? { userId } : {},
        });
        if (error) throw error;
      },
    }),
    {
      name: 'budget-it-notification-settings',
      storage: notificationStorage,
      partialize: (state) => ({
        browserAlertsEnabled: state.browserAlertsEnabled,
        overspendAlertsEnabled: state.overspendAlertsEnabled,
        recurringAlertsEnabled: state.recurringAlertsEnabled,
        weeklySummaryAlertsEnabled: state.weeklySummaryAlertsEnabled,
      }),
    }
  )
);
