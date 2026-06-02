import { Link } from "wouter";
import { LockKeyhole } from "lucide-react";
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
                <Link
                          href="/login"
                          className="fixed right-5 top-5 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-accent"
                        >
                        <LockKeyhole className="h-4 w-4" />
                        Client portal
                </Link>
                <a
                          href="https://aftrak.southseasolutions.com"
                          className="fixed right-40 top-5 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-accent"
                        >
                        Aftrak
                </a>
                <Hero />
                <Capabilities />
                <CaseStudies />
                <Process />
                <Markets />
                <About />
                <Contact />
                <Footer />
          </main>main>
        );
}</main>
