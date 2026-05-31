import { motion } from "framer-motion";

const steps = [
  {
    phase: "01",
    title: "Discovery & Audit",
    desc: "We do not accept assumptions. We audit existing systems, map organizational constraints, and identify the actual problem rather than the stated one."
  },
  {
    phase: "02",
    title: "Architecture & Blueprinting",
    desc: "Before development, we produce rigorous technical specifications. Data models, API contracts, and infrastructure plans are defined and approved."
  },
  {
    phase: "03",
    title: "Iterative Engineering",
    desc: "We build in controlled, testable increments. Regular deployments ensure alignment and allow for necessary course corrections early in the cycle."
  },
  {
    phase: "04",
    title: "Deployment & Handover",
    desc: "We stay until it works. We handle the deployment, train your internal teams, and ensure operational continuity before stepping back."
  }
];

export function Process() {
  return (
    <section id="process" className="py-24 md:py-32 bg-secondary/20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 md:mb-24"
        >
          <h2 className="text-3xl md:text-5xl font-semibold mb-6">Methodology.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">A disciplined approach to removing ambiguity. We engineer predictability into complex builds.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.phase}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative p-8 border border-border bg-card/50 hover:bg-card transition-colors"
            >
              <div className="text-primary font-mono text-xl mb-8">{step.phase}</div>
              <h3 className="text-xl font-medium mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
