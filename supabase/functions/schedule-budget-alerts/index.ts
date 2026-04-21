import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type BudgetRow = {
  user_id: string;
  monthly_target: number;
  currency: string;
  month_start_day: number;
  category_budgets: Record<string, number> | null;
};

type TransactionRow = {
  amount: number;
  category: string;
  date: string;
};

type RecurringRow = {
  id: string;
  category: string;
  type: "income" | "expense";
  next_date: string;
};

type PreferenceRow = {
  browser_alerts_enabled: boolean;
  overspend_alerts_enabled: boolean;
  recurring_alerts_enabled: boolean;
  weekly_summary_alerts_enabled: boolean;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getBudgetCycleWindow = (referenceDate: Date, monthStartDay = 1) => {
  const safeStartDay = Math.max(1, Math.min(28, monthStartDay));
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const date = referenceDate.getUTCDate();

  const startMonth = date >= safeStartDay ? month : month - 1;
  const cycleStart = new Date(Date.UTC(year, startMonth, safeStartDay, 0, 0, 0, 0));
  const cycleEnd = new Date(Date.UTC(year, startMonth + 1, safeStartDay, 0, 0, 0, 0));
  cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1);
  cycleEnd.setUTCHours(23, 59, 59, 999);

  return { monthStart: cycleStart, monthEnd: cycleEnd };
};

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const upsertNotification = async (
  userId: string,
  kind: "overspend" | "category" | "recurring" | "weekly",
  tone: "info" | "warning" | "success",
  title: string,
  body: string,
  dedupeKey: string,
  metadata: Record<string, unknown> = {},
) => {
  const { error } = await admin.from("budget_notifications").upsert({
    user_id: userId,
    kind,
    tone,
    title,
    body,
    dedupe_key: dedupeKey,
    metadata,
    scheduled_for: new Date().toISOString(),
  }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });

  if (error) throw error;
};

serve(async (request) => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing Supabase environment variables." }, 500);
    }

    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const targetedUserId = typeof body?.userId === "string" ? body.userId : null;

    const budgetsQuery = admin.from("budgets").select("user_id, monthly_target, currency, month_start_day, category_budgets");
    const { data: budgets, error: budgetsError } = targetedUserId
      ? await budgetsQuery.eq("user_id", targetedUserId)
      : await budgetsQuery;

    if (budgetsError) throw budgetsError;
    if (!budgets?.length) return json({ processed: 0, inserted: 0 });

    let inserted = 0;

    for (const budget of budgets as BudgetRow[]) {
      const now = new Date();
      const { monthStart, monthEnd } = getBudgetCycleWindow(now, budget.month_start_day);
      const cycleStart = monthStart.toISOString().split("T")[0];
      const cycleEnd = monthEnd.toISOString().split("T")[0];
      const elapsedDays = Math.max(1, Math.ceil((now.getTime() - monthStart.getTime()) / 86400000) + 1);
      const cycleLength = Math.max(1, Math.ceil((monthEnd.getTime() - monthStart.getTime()) / 86400000) + 1);
      const weeklyStart = new Date(now);
      weeklyStart.setUTCDate(now.getUTCDate() - 6);
      const weeklyStartKey = weeklyStart.toISOString().split("T")[0];

      const { data: preferenceRow } = await admin
        .from("notification_preferences")
        .select("browser_alerts_enabled, overspend_alerts_enabled, recurring_alerts_enabled, weekly_summary_alerts_enabled")
        .eq("user_id", budget.user_id)
        .maybeSingle();

      const preferences: PreferenceRow = preferenceRow ?? {
        browser_alerts_enabled: true,
        overspend_alerts_enabled: true,
        recurring_alerts_enabled: true,
        weekly_summary_alerts_enabled: true,
      };

      const { data: transactions, error: txError } = await admin
        .from("transactions")
        .select("amount, category, date")
        .eq("user_id", budget.user_id)
        .gte("date", cycleStart)
        .lte("date", cycleEnd);

      if (txError) throw txError;

      const txRows = (transactions ?? []) as TransactionRow[];
      const spentMonthToDate = txRows
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const projectedMonthEnd = (spentMonthToDate / elapsedDays) * cycleLength;

      if (preferences.overspend_alerts_enabled && projectedMonthEnd > budget.monthly_target) {
        await upsertNotification(
          budget.user_id,
          "overspend",
          "warning",
          "Monthly overspend warning",
          `At the current pace, you are trending ${formatCurrency(projectedMonthEnd - budget.monthly_target, budget.currency)} over your cycle budget.`,
          `overspend:${cycleStart}`,
          { cycleStart, projectedMonthEnd, monthlyTarget: budget.monthly_target },
        );
        inserted += 1;
      }

      const categoryBudgets = budget.category_budgets ?? {};
      if (preferences.overspend_alerts_enabled && Object.keys(categoryBudgets).length > 0) {
        const risk = Object.entries(categoryBudgets)
          .map(([category, limit]) => {
            const spent = txRows
              .filter((tx) => tx.amount > 0 && tx.category === category)
              .reduce((sum, tx) => sum + tx.amount, 0);
            const ratio = limit > 0 ? spent / limit : 0;
            return { category, limit, spent, ratio };
          })
          .filter((row) => row.ratio >= 0.85)
          .sort((a, b) => b.ratio - a.ratio)[0];

        if (risk) {
          const over = risk.spent > risk.limit;
          await upsertNotification(
            budget.user_id,
            "category",
            over ? "warning" : "info",
            `${risk.category} is getting close`,
            over
              ? `You have already gone ${formatCurrency(risk.spent - risk.limit, budget.currency)} over your ${risk.category} limit.`
              : `${formatCurrency(risk.limit - risk.spent, budget.currency)} remains in ${risk.category} for this cycle.`,
            `category:${risk.category}:${cycleStart}`,
            { cycleStart, category: risk.category, spent: risk.spent, limit: risk.limit },
          );
          inserted += 1;
        }
      }

      if (preferences.recurring_alerts_enabled) {
        const { data: recurringRows, error: recurringError } = await admin
          .from("recurring_transactions")
          .select("id, category, type, next_date")
          .eq("user_id", budget.user_id)
          .gte("next_date", now.toISOString().split("T")[0])
          .lte("next_date", new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]);

        if (recurringError) throw recurringError;

        for (const recurring of (recurringRows ?? []) as RecurringRow[]) {
          const daysUntil = Math.max(0, Math.ceil((new Date(recurring.next_date).getTime() - now.getTime()) / 86400000));
          await upsertNotification(
            budget.user_id,
            "recurring",
            "info",
            `Upcoming recurring ${recurring.type}`,
            `${recurring.category} is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} on ${recurring.next_date}.`,
            `recurring:${recurring.id}:${recurring.next_date}`,
            { recurringId: recurring.id, nextDate: recurring.next_date },
          );
          inserted += 1;
        }
      }

      if (preferences.weekly_summary_alerts_enabled) {
        const weekSpent = txRows
          .filter((tx) => tx.amount > 0 && tx.date >= weeklyStartKey)
          .reduce((sum, tx) => sum + tx.amount, 0);
        const remainingDays = Math.max(1, Math.ceil((monthEnd.getTime() - now.getTime()) / 86400000));
        const monthlyRemaining = Math.max(0, budget.monthly_target - spentMonthToDate);
        const safeDailySpend = monthlyRemaining / remainingDays;

        await upsertNotification(
          budget.user_id,
          "weekly",
          "success",
          "Weekly summary",
          `Last 7 days: ${formatCurrency(weekSpent, budget.currency)} spent. Safe daily spend for the rest of this cycle is ${formatCurrency(safeDailySpend, budget.currency)}.`,
          `weekly:${weeklyStartKey}`,
          { weeklyStart: weeklyStartKey, weekSpent, safeDailySpend },
        );
        inserted += 1;
      }
    }

    return json({ processed: budgets.length, inserted });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
