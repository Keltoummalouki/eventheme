import Admin from "@/components/eventheme/Admin";
import {
  getEntries,
  getInquiries,
  localMode,
  serverNow,
  verifyAdmin,
} from "@/lib/eventheme/server";
import { isAdminView, utcOffset } from "@/lib/eventheme/dashboard";
import { mailMode } from "@/lib/eventheme/mailer";
import { teamRecipients } from "@/lib/eventheme/notifications";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const account = await verifyAdmin();
  const entries = await getEntries(true);
  // « /admin?vue=quotes » : l’onglet ouvert au rechargement ; toute autre valeur ramène à l’accueil.
  const { vue } = await searchParams;
  const now = await serverNow();
  return (
    <Admin
      initialEntries={entries}
      initialInquiries={await getInquiries()}
      local={localMode()}
      now={now}
      offset={utcOffset(new Date(now))}
      mail={{ mode: mailMode(), recipients: teamRecipients(entries) }}
      account={account}
      initialView={isAdminView(vue) ? vue : "dashboard"}
    />
  );
}
