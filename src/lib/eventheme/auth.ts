// Shared by the proxy, the admin pages and the tests: keep it free of server-only imports.
export const adminHome = "/admin";
export const adminLogin = "/admin/connexion";

export const authConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

// Only the service role can write app_metadata; user_metadata is editable by the user and never trusted.
export const hasAdminRole = (
  subject: { app_metadata?: { [key: string]: unknown } } | null | undefined,
) => subject?.app_metadata?.role === "admin";

/** The signed-in administrator, as the back office shows it (greeting, account card). */
export type AdminAccount = { email: string; name: string };

/**
 * Display details of a Supabase user. The name comes from user_metadata, which the
 * user can edit: it is shown, never trusted for access (that is app_metadata's job).
 */
export function accountOf(
  user: { email?: string | null; user_metadata?: { [key: string]: unknown } | null } | null | undefined,
): AdminAccount {
  const metadata = user?.user_metadata ?? {};
  const name = [metadata.full_name, metadata.name, metadata.first_name].find(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
  return { email: user?.email ?? "", name: name?.trim().slice(0, 80) ?? "" };
}

// Post-login destination: an admin page on this origin, never the login page or another site.
export function adminRedirectPath(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/")) return adminHome;
  const base = "http://eventheme.invalid";
  const url = new URL(next, base);
  const inside =
    url.origin === base &&
    (url.pathname === adminHome || url.pathname.startsWith(`${adminHome}/`));
  return inside && url.pathname !== adminLogin ? url.pathname : adminHome;
}
