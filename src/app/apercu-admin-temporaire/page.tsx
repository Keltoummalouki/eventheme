// TEMPORAIRE — aperçu visuel du tableau de bord en développement. À supprimer.
import { notFound } from "next/navigation";
import Admin from "@/components/eventheme/Admin";
import { isAdminView, utcOffset } from "@/lib/eventheme/dashboard";
import { getEntries, getInquiries, serverNow } from "@/lib/eventheme/server";
import { statuses, type Inquiry } from "@/lib/eventheme/types";

export const metadata = { robots: { index: false, follow: false } };

function synthetic(now: number): Inquiry[] {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const names = ["Salma Idrissi", "Youssef Benali", "Nadia Alaoui", "Omar Tazi", "Imane Chraibi", "Karim Berrada", "Lina Fassi", "Mehdi Amrani"];
  const companies = ["", "", "Atlas Events", "OCP Group", "Hôtel Mamounia", "Agence Nova"];
  const cities = ["Casablanca", "Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
  const events = ["gala", "concert", "corporate", "conference", "soiree", "lancement", "prive"];
  const services = ["scenes", "structures", "led-video", "sonorisation", "eclairage", "regie", "complementaires"];
  const products = ["mur-led", "line-array", "micros-hf", "console", "lyre", "par-led", "truss", "scene"];
  const day = 86_400_000;
  return Array.from({ length: 64 }, (_, index) => {
    const age = Math.floor(random() ** 1.6 * 200) * day + Math.floor(random() * day);
    const kind = pick(["quote", "quote", "quote", "callback", "contact"] as const);
    const created = new Date(now - age);
    const ahead = Math.round(random() * 70) - 12;
    const date = kind === "contact" ? "" : new Date(now + ahead * day).toISOString().slice(0, 10);
    const status = age < 4 * day ? "Nouveau" : pick(statuses);
    return {
      kind,
      name: pick(names),
      email: "client@exemple.ma",
      phone: "+212600000000",
      company: pick(companies),
      city: kind === "contact" ? "" : pick(cities),
      address: "",
      message: "",
      subject: kind === "contact" ? "Question" : "",
      event: kind === "contact" ? "" : pick(events),
      date,
      duration: 6,
      rentalDays: 1,
      guests: Math.round(random() * 800),
      budget: 0,
      contactMethod: "WhatsApp",
      consent: true,
      website: "",
      startedAt: 0,
      basket: {
        services: kind === "quote" ? services.filter(() => random() < 0.35) : [],
        products: kind === "quote" ? products.filter(() => random() < 0.25).map((id) => ({ id, quantity: 1 + Math.floor(random() * 6), variant: "" })) : [],
      },
      id: `apercu-${index}`,
      reference: `EVT-2026-${String(index + 1).padStart(4, "0")}`,
      createdAt: created.toISOString(),
      status,
      notes: "",
      estimate: kind === "quote" ? Math.round(random() * 90) * 1000 : 0,
      hasUnpriced: random() < 0.3,
      summary: [],
    } satisfies Inquiry;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { demo, vue, vide } = await searchParams;
  const now = await serverNow();
  const entries = await getEntries(true);
  const inquiries = vide ? [] : demo ? synthetic(now) : await getInquiries();
  return (
    <Admin
      initialEntries={entries}
      initialInquiries={inquiries}
      local
      now={now}
      offset={utcOffset(new Date(now))}
      mail={{ mode: "preview", recipients: [] }}
      account={{ email: "keltoum@exemple.ma", name: "" }}
      initialView={isAdminView(vue) ? vue : "dashboard"}
    />
  );
}
