import { motion } from "framer-motion";

const studies = [
  {
    tag: "Confidential Client",
    title: "Fleet Risk and Certification Platform",
    summary: "Driver risk management and certification system for a commercial transport operator.",
    detail:
      "A complete platform for managing driver compliance, fatigue monitoring, and professional certification across a large fleet. The system gave operators irrefutable oversight of driver status and qualifications, enabling them to win contracts with clients that impose strict safety standards.",
    sector: "Transport and Logistics",
    scope: "Architecture and Delivery",
    image: "/images/drivewise.png",
    imageAlt: "Fleet management platform dashboard",
    order: "left",
  },
  {
    tag: "Confidential Client",
    title: "Customs and Clearance Gateway",
    summary: "Unified cargo processing platform for a major port authority.",
    detail:
      "Replaced fragmented legacy systems with a secure, high-throughput platform that accelerated cargo processing by 40%. Delivered comprehensive audit trails and integration with national revenue services.",
    sector: "Maritime and Customs",
    scope: "Architecture and Delivery",
    image: "/images/logistics-port.png",
    imageAlt: "Industrial port infrastructure",
    order: "right",
  },
  {
    tag: "Confidential Client",
    title: "Field Intelligence and Yield Platform",
    summary: "Machine learning pipeline and mobile application for distributed field operations.",
    detail:
      "An offline-first mobile platform deployed across tens of thousands of field agents, engineered for low-bandwidth environments. Enabled organisations to collect structured data, run predictive models, and act on insights without reliable connectivity.",
    sector: "Agriculture and Finance",
    scope: "Data Strategy and Mobile",
    image: "/images/strategy-architecture.png",
    imageAlt: "Abstract data architecture visualisation",
    order: "left",
  },
];

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
            <p className="text-muted-foreground text-lg">
              Delivering critical systems where stakes are high and the margin for error is low.
            </p>
          </motion.div>
        </div>

        <div className="space-y-24 md:space-y-32">
          {studies.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
            >
              <div className={`${s.order === "left" ? "order-2 lg:order-1" : ""}`}>
                <div className="inline-block px-3 py-1 bg-white/5 text-muted-foreground font-mono text-xs uppercase tracking-wider mb-6">
                  {s.tag}
                </div>
                <h3 className="text-3xl md:text-4xl font-semibold mb-4">{s.title}</h3>
                <p className="text-xl text-foreground mb-4">{s.summary}</p>
                <p className="text-muted-foreground leading-relaxed mb-8">{s.detail}</p>
                <div className="grid grid-cols-2 gap-6 py-6 border-y border-border/50">
                  <div>
                    <span className="block text-sm text-muted-foreground mb-1">Sector</span>
                    <span className="font-medium">{s.sector}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-muted-foreground mb-1">Scope</span>
                    <span className="font-medium">{s.scope}</span>
                  </div>
                </div>
              </div>
              <div
                className={`relative aspect-[4/3] w-full overflow-hidden bg-secondary ${
                  s.order === "left" ? "order-1 lg:order-2" : ""
                }`}
              >
                <img src={s.image} alt={s.imageAlt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 border border-white/10 mix-blend-overlay" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
