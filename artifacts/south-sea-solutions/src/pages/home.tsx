import { LockKeyhole } from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { Capabilities } from "@/components/sections/Capabilities";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { Process } from "@/components/sections/Process";
import { Markets } from "@/components/sections/Markets";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

/**
 * The single door into the product.
 *
 * There used to be two buttons here and neither of them worked the way a visitor
 * would assume. "Client portal" went to /login, which is the old Aftrak fleet and
 * driver-certification portal. "Beltari" went to beltari.southseasolutions.com,
 * which is not Beltari at all: it is a separate placeholder app serving a mock
 * sign-in form that is wired to nothing.
 *
 * So a customer arriving at this page had a choice between the previous product
 * and a dead end, and no way of telling which was which. One button, pointing at
 * the real platform, is the whole fix.
 *
 * Keep the destination in one constant. When the branded subdomain is repointed
 * at the live Beltari deployment, this is the only line that changes.
 */
const PORTAL_URL = "https://beltari.southseasolutions.com";

export default function Home() {
  return (
    <main className="min-h-screen w-full">
      <a
        href={PORTAL_URL}
        className="fixed right-5 top-5 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary"
      >
        <LockKeyhole className="h-4 w-4" />
        Client portal
      </a>
      <Hero />
      <Capabilities />
      <CaseStudies />
      <Process />
      <Markets />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
