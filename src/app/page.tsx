import { homePage, pageMetadata } from "@/components/eventheme/Routes";
export const generateMetadata = () => pageMetadata("fr", "home");
export default function Page() {
  return homePage("fr");
}
