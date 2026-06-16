import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const keepAliveSecret = Deno.env.get("KEEP_ALIVE_SECRET") ?? "";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-keep-alive-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const getBearerToken = (request: Request) => {
  const authHeader = request.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
};

const isAuthorized = (request: Request) => {
  if (!keepAliveSecret) return false;
  const headerSecret = request.headers.get("x-keep-alive-secret") ?? "";
  const bearerToken = getBearerToken(request);
  return headerSecret === keepAliveSecret || bearerToken === keepAliveSecret;
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables." }, 500);
  }

  try {
    const { count, error } = await admin
      .from("budgets")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return json({
      ok: true,
      checked: "budgets",
      count: count ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
