import { motion } from "framer-motion";

export function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-mono text-sm tracking-widest uppercase mb-6 block">Firm Philosophy</span>
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight mb-8">
              "We believe that complex problems are solved by thinking deeply before acting, not by rushing to write code."
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              South Sea Solutions was founded on a simple premise: organisations facing genuinely hard problems deserve purpose-built tools, not adapted off-the-shelf software. We specialise in web-based SaaS products across a broad range of sectors, including education, transport, logistics, finance, and more. We work selectively, embedding with clients who need a trusted partner rather than a vendor, and we bring the same disciplined approach to every engagement.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
