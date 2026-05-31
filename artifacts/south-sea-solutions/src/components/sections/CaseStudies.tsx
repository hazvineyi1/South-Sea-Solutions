import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CaseStudies() {
  return (
    <section id="work" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <h2 className="text-3xl md:text-5xl font-semibold mb-6">Proven in the field.</h2>
            <p className="text-muted-foreground text-lg">Delivering critical systems where stakes are high and infrastructure is developing.</p>
          </motion.div>
        </div>

        <div className="space-y-24 md:space-y-32">
          {/* Drivewise Case Study - Flagship */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          >
            <div className="order-2 lg:order-1">
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary font-mono text-xs uppercase tracking-wider mb-6">Flagship Engagement</div>
              <h3 className="text-3xl md:text-4xl font-semibold mb-6">Drivewise</h3>
              <p className="text-xl text-foreground mb-4">Driver-risk and certification platform for commercial transport.</p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Operating in Botswana's harsh mining and logistics corridors, Drivewise provides hauliers, insurers, and mining conglomerates with irrefutable oversight. We architected a complete ecosystem handling fleet tracking, fatigue monitoring, and rigorous driver certification. The platform eliminates compliance ambiguity, protecting assets, lives, and corporate liability in extreme environments.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-border/50">
                <div>
                  <span className="block text-sm text-muted-foreground mb-1">Sector</span>
                  <span className="font-medium">Logistics & Mining</span>
                </div>
                <div>
                  <span className="block text-sm text-muted-foreground mb-1">Region</span>
                  <span className="font-medium">Botswana, Southern Africa</span>
                </div>
              </div>
              <button className="flex items-center text-primary font-medium hover:text-white transition-colors group">
                Read full brief <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="order-1 lg:order-2 relative aspect-[4/3] w-full overflow-hidden bg-secondary">
              <img src="/images/drivewise.png" alt="Drivewise platform dashboard overlay on Botswana map" className="w-full h-full object-cover" />
              <div className="absolute inset-0 border border-white/10 mix-blend-overlay"></div>
            </div>
          </motion.div>

          {/* Secondary Case Study 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
              <img src="/images/logistics-port.png" alt="Industrial port infrastructure" className="w-full h-full object-cover" />
              <div className="absolute inset-0 border border-white/10 mix-blend-overlay"></div>
            </div>
            <div>
              <div className="inline-block px-3 py-1 bg-white/5 text-muted-foreground font-mono text-xs uppercase tracking-wider mb-6">Confidential Client</div>
              <h3 className="text-3xl md:text-4xl font-semibold mb-6">Port Operations Gateway</h3>
              <p className="text-muted-foreground leading-relaxed mb-8">
                A unified customs and clearance gateway for a major East African port authority. Replaced fragmented legacy systems with a secure, high-throughput platform that accelerated cargo processing by 40%. Delivered comprehensive audit trails and integration with national revenue services.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-border/50">
                <div>
                  <span className="block text-sm text-muted-foreground mb-1">Sector</span>
                  <span className="font-medium">Maritime & Customs</span>
                </div>
                <div>
                  <span className="block text-sm text-muted-foreground mb-1">Scope</span>
                  <span className="font-medium">Architecture & Delivery</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Secondary Case Study 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          >
            <div className="order-2 lg:order-1">
              <div className="inline-block px-3 py-1 bg-white/5 text-muted-foreground font-mono text-xs uppercase tracking-wider mb-6">Confidential Client</div>
              <h3 className="text-3xl md:text-4xl font-semibold mb-6">Agritech Yield Predictor</h3>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Machine learning pipeline and field-agent application deployed across 40,000 smallholder farms in West Africa. Engineered for offline-first functionality and low-bandwidth synchronization, allowing co-operatives to predict yields and secure forward financing before harvest.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-border/50">
                <div>
                  <span className="block text-sm text-muted-foreground mb-1">Sector</span>
                  <span className="font-medium">Agriculture & Finance</span>
                </div>
                <div>
                  <span className="block text-sm text-muted-foreground mb-1">Scope</span>
                  <span className="font-medium">Data Strategy & Mobile</span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative aspect-[4/3] w-full overflow-hidden bg-secondary">
              <img src="/images/strategy-architecture.png" alt="Abstract data architecture" className="w-full h-full object-cover" />
              <div className="absolute inset-0 border border-white/10 mix-blend-overlay"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
