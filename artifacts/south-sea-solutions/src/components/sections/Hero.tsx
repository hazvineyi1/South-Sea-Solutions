import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Background with abstract topography */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10" />
        <img 
          src="/images/hero-abstract.png" 
          alt="Abstract deep ocean topography representing complex data structures" 
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
            }}
          >
            <motion.div variants={fadeInUp} className="flex items-center gap-4 mb-8">
              <div className="w-12 h-[2px] bg-primary"></div>
              <span className="text-primary font-mono text-sm tracking-widest uppercase">South Sea Solutions</span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-semibold leading-tight tracking-tight mb-8"
            >
              The quiet intelligence behind <br className="hidden md:block" />
              <span className="text-primary">mission-critical platforms.</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-12"
            >
              We design and deliver web-based SaaS platforms for organisations across sectors. We do the hard thinking before a single line of code is written, and we stay until the product ships.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <a href="#work" className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-4 font-medium transition-transform hover:-translate-y-1">
                Explore our work
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
              <a href="#contact" className="inline-flex items-center justify-center px-8 py-4 font-medium border border-border transition-colors hover:bg-white/5">
                Engage us
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-6 md:left-1/2 md:-translate-x-1/2 z-10 animate-bounce">
        <a href="#capabilities" className="text-muted-foreground hover:text-primary transition-colors">
          <ChevronDown className="w-6 h-6" />
        </a>
      </div>
    </section>
  );
}
