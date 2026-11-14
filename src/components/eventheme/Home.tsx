"use client";
import Curtain from "@/components/layout/Curtain";
import MotionRoot from "@/components/layout/MotionRoot";
import CTA from "@/components/sections/CTA";
import Gallery from "@/components/sections/Gallery";
import Hero from "@/components/sections/Hero";
import Presentation from "@/components/sections/Presentation";
import Rental from "@/components/sections/Rental";
import Services from "@/components/sections/Services";
import WhyUs from "@/components/sections/WhyUs";
import QuoteStudio from "./QuoteStudio";

/**
 * Accueil, dans l’ordre du cahier des charges (§04 A) : hero, introduction,
 * expertises, réalisations, matériel, « Why EVENTHEMES », puis la demande de
 * devis et l’invitation finale. Les chiffres clés n’apparaîtront qu’avec des
 * données réelles et vérifiables fournies par EVENTHEMES.
 */
export default function Home() {
  return (
    <>
      <MotionRoot />
      <Curtain />
      <Hero />
      <Presentation />
      <Services />
      <Gallery />
      <Rental />
      <WhyUs />
      <QuoteStudio />
      <CTA />
    </>
  );
}
