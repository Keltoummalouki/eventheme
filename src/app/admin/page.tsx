import Admin from "@/components/eventheme/Admin";
import {
  getEntries,
  getInquiries,
  localMode,
  serverNow,
  verifyAdmin,
} from "@/lib/eventheme/server";
import { mailMode } from "@/lib/eventheme/mailer";
import { teamRecipients } from "@/lib/eventheme/notifications";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await verifyAdmin();
  const entries = await getEntries(true);
  return (
    <Admin
      initialEntries={entries}
      initialInquiries={await getInquiries()}
      local={localMode()}
      now={await serverNow()}
      mail={{ mode: mailMode(), recipients: teamRecipients(entries) }}
    />
  );
}
