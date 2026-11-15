import { homePage, pageMetadata } from "@/components/eventheme/Routes";
export const generateMetadata = () => pageMetadata("ar", "home");
export default function Page() {
  return homePage("ar");
}
