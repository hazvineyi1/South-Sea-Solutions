import { motion } from "framer-motion";

export function Markets() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <img 
          src="/images/mining-environment.png" 
          alt="Harsh logistics environment" 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-background/90 z-10" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-semibold mb-6">Built for where it matters.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              We work across sectors where complexity is structural and software failure has serious consequences. Our platforms integrate with legacy systems, withstand regulatory scrutiny, and perform reliably in varied operational conditions.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Transport', 'Logistics', 'Finance', 'Agriculture', 'Government', 'Resources', 'Healthcare', 'Maritime'].map((tag) => (
                <span key={tag} className="px-4 py-2 border border-border text-sm font-medium tracking-wide">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
