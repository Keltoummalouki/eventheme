import type { Metadata } from "next";
import { renderPage, slugMetadata } from "@/components/eventheme/Routes";
type Params = Promise<{ page: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return slugMetadata("fr", (await params).page);
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderPage("fr", (await params).page, await searchParams);
}
