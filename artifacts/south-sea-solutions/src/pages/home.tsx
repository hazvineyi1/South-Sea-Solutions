import { Hero } from "@/components/sections/Hero";
import { Capabilities } from "@/components/sections/Capabilities";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { Process } from "@/components/sections/Process";
import { Markets } from "@/components/sections/Markets";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="min-h-screen w-full">
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
