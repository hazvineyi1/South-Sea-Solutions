import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-semibold mb-6">Start a conversation.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-12 max-w-lg">
              If you have a complex platform requirement, let's discuss how we can structure the architecture and execution. We engage selectively to ensure uncompromised quality.
            </p>
            <div className="space-y-6 text-lg">
              <div>
                <span className="block text-sm text-muted-foreground font-mono mb-1">General Inquiries</span>
                <a href="mailto:strategy@southseasolutions.com" className="hover:text-primary transition-colors">strategy@southseasolutions.com</a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-secondary/30 p-8 md:p-12 border border-border"
          >
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Name</label>
                <input 
                  type="text" 
                  className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Organization</label>
                <input 
                  type="text" 
                  className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Brief</label>
                <textarea 
                  className="w-full bg-background border border-border px-4 py-3 focus:outline-none focus:border-primary transition-colors h-32 resize-none"
                  placeholder="Outline your requirements"
                ></textarea>
              </div>
              <button className="w-full bg-primary text-primary-foreground px-6 py-4 font-medium flex items-center justify-center hover:bg-primary/90 transition-colors">
                Submit Inquiry
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
