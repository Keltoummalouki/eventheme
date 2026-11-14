import { homePage, pageMetadata } from "@/components/eventheme/Routes";
export const generateMetadata = () => pageMetadata("en", "home");
export default function Page() {
  return homePage("en");
}
