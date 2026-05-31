import { motion } from "framer-motion";

const capabilities = [
  {
    id: "01",
    title: "Platform Strategy",
    description: "Rigorous technical planning. We turn complex business requirements into precise product specifications before development begins."
  },
  {
    id: "02",
    title: "Product Design",
    description: "Interfaces built for high-stakes operations. We design for clarity, speed, and zero ambiguity, regardless of the environment or user."
  },
  {
    id: "03",
    title: "SaaS Development",
    description: "Web-based platforms built to scale. From multi-tenant architecture to role-based access and subscription workflows, we handle the full stack."
  },
  {
    id: "04",
    title: "Delivery Management",
    description: "End-to-end execution. We oversee the entire lifecycle, ensuring alignment between stakeholders, engineers, and end-users."
  },
  {
    id: "05",
    title: "Data & Compliance",
    description: "Secure data pipelines, compliance tracking, and audit-ready architectures for heavily regulated industries."
  }
];

export function Capabilities() {
  return (
    <section id="capabilities" className="py-24 md:py-32 bg-secondary/30 relative">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="sticky top-32"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-6">Precision at every stage.</h2>
              <p className="text-muted-foreground leading-relaxed">
                We are not a dev shop. We are a boutique consultancy that operates as a precision instrument for clients who cannot afford to build the wrong thing.
              </p>
            </motion.div>
          </div>
          
          <div className="lg:col-span-8">
            <div className="flex flex-col gap-12">
              {capabilities.map((cap, i) => (
                <motion.div 
                  key={cap.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group"
                >
                  <div className="flex items-start gap-6 pb-12 border-b border-border group-last:border-0 group-last:pb-0">
                    <span className="font-mono text-primary text-xl mt-1">{cap.id}</span>
                    <div>
                      <h3 className="text-2xl font-medium mb-4">{cap.title}</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">{cap.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
