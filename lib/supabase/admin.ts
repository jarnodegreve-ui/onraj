import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const adminConfigured = Boolean(url && serviceKey);

// Service-role client: omzeilt RLS. ALLEEN server-side gebruiken (nooit naar de
// browser sturen). Nodig voor flows zonder ingelogde sessie, zoals de
// Telegram-webhook die in Jarno's naam een notitie aanmaakt.
export function createAdminClient() {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let cachedOwnerId: string | null = null;

// user_id van de enige ONRAJ-gebruiker (via ALLOWED_EMAIL), nodig om zonder
// sessie in zijn naam te schrijven. Gecachet na de eerste lookup.
export async function getOwnerUserId(): Promise<string | null> {
  if (cachedOwnerId) return cachedOwnerId;
  if (!adminConfigured) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error || !data) return null;

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email
    ? (data.users.find((u) => u.email?.toLowerCase() === email) ??
      data.users[0])
    : data.users[0];

  cachedOwnerId = user?.id ?? null;
  return cachedOwnerId;
}
