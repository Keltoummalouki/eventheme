import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Shell from "@/components/eventheme/Shell";
import { About, Catalog, Legal, Services } from "@/components/eventheme/Pages";
import InquiryForm from "@/components/eventheme/InquiryForm";
import QuoteStudio from "@/components/eventheme/QuoteStudio";
import { brand } from "@/data/eventheme";

/** Pages du plan du site (cahier des charges §03) : titre et description uniques. */
const pages: Record<string, { title: string; description: string }> = {
  "a-propos": {
    title: "À propos",
    description: `${brand.name}, production technique événementielle au Maroc : vision, valeurs, expertise technique et méthode de travail.`,
  },
  services: {
    title: "Nos expertises techniques",
    description:
      "Scènes et podiums, structures truss, écrans LED et vidéo, sonorisation, éclairage professionnel et régie technique pour vos événements au Maroc.",
  },
  materiel: {
    title: "Matériel événementiel",
    description:
      "Catalogue de matériel technique : écrans LED, sonorisation, éclairage, structures, scènes et effets spéciaux. Ajoutez vos équipements à votre demande de devis.",
  },
  realisations: {
    title: "Réalisations",
    description: `Galas, événements corporate, concerts, festivals et conférences : les réalisations ${brand.name}, classées par type d’événement.`,
  },
  contact: {
    title: "Contact",
    description: `Contactez ${brand.name} par téléphone, WhatsApp ou formulaire pour parler de la technique de votre prochain événement.`,
  },
  devis: {
    title: "Demande de devis",
    description:
      "Sélectionnez vos prestations et votre matériel, décrivez votre événement et envoyez votre demande de devis, sans engagement.",
  },
  "mentions-legales": {
    title: "Mentions légales",
    description: `Mentions légales du site ${brand.name}.`,
  },
  "politique-de-confidentialite": {
    title: "Politique de confidentialité",
    description: `Politique de confidentialité du site ${brand.name}.`,
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return pages[page] ?? {};
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { page } = await params;
  const query = await searchParams;
  if (!pages[page]) notFound();
  return (
    <Shell>
      {page === "services" ? (
        <Services />
      ) : page === "materiel" ? (
        <Catalog />
      ) : page === "realisations" ? (
        <Catalog projects />
      ) : page === "a-propos" ? (
        <About />
      ) : page === "contact" ? (
        <InquiryForm />
      ) : page === "devis" ? (
        <QuoteStudio as="h1" eventId={query.event || ""} />
      ) : (
        <Legal privacy={page === "politique-de-confidentialite"} />
      )}
    </Shell>
  );
}
