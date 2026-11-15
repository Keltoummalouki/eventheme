import { after } from "next/server";
import { submitInquiry } from "@/lib/eventheme/submit";

/** Formulaires publics : demande de rappel, devis, message de contact. */
export const POST = (request: Request) => submitInquiry(request, (task) => after(task));
