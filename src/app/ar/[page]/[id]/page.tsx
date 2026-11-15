import type { Metadata } from "next";
import { detailMetadata, renderDetail } from "@/components/eventheme/Routes";
type Params = Promise<{ page: string; id: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { page, id } = await params;
  return detailMetadata("ar", page, id);
}
export default async function Page({ params }: { params: Params }) {
  const { page, id } = await params;
  return renderDetail("ar", page, id);
}
