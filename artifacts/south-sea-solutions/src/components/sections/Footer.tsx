export function Footer() {
  return (
    <footer className="border-t border-border py-12 bg-card/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-[2px] bg-primary"></div>
            <span className="font-mono text-sm tracking-widest uppercase">South Sea Solutions</span>
          </div>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#work" className="hover:text-primary transition-colors">Work</a>
            <a href="#process" className="hover:text-primary transition-colors">Methodology</a>
            <a href="#about" className="hover:text-primary transition-colors">Philosophy</a>
          </div>
        </div>
        
        <div className="mt-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} South Sea Solutions. All rights reserved.</p>
          <a href="#contact" className="hover:text-foreground transition-colors">Get in touch</a>
        </div>
      </div>
    </footer>
  );
}
