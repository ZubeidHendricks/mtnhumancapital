import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Cpu, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Solutions", href: "/#solutions" },
    { name: "Platform", href: "/#platform" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight leading-none">AHC</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Avatar Human Capital</span>
            </div>
          </a>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.name}
            </a>
          ))}
          
          <div className="h-6 w-px bg-white/10 mx-2" />

          {/* Dashboard Links */}
          <Link href="/hr-dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
              HR Portal
            </Button>
          </Link>

          <Link href="/executive-dashboard">
            <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10 hover:text-primary gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Exec Dashboard
            </Button>
          </Link>

          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-white/10 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  className="text-lg font-medium text-foreground/80 hover:text-primary"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px bg-white/10 my-2" />
              <Link href="/hr-dashboard">
                <Button variant="ghost" className="w-full justify-start mb-2">HR Portal</Button>
              </Link>
               <Link href="/executive-dashboard">
                <Button variant="outline" className="w-full justify-start mb-2">Exec Dashboard</Button>
              </Link>
              <Button className="w-full bg-primary text-primary-foreground">Get Started</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}