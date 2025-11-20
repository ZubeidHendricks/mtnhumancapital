import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { DashboardPreview } from "@/components/sections/dashboard-preview";
import { Cpu, Mail, MapPin, Phone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      
      <main>
        <Hero />
        <Services />
        <DashboardPreview />

        {/* CTA Section */}
        <section className="py-24 border-t border-white/10 bg-gradient-to-b from-background to-black">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Operations?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
              Join the future of human capital and operational management with AHC's intelligent advisory solutions.
            </p>
            <form className="max-w-md mx-auto flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="w-6 h-6 text-primary" />
                <span className="font-display font-bold text-xl tracking-tight">AHC</span>
              </div>
              <p className="text-muted-foreground max-w-xs">
                Avatar Human Capital. <br/>
                Pioneering the intersection of human potential and artificial intelligence.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-white">Solutions</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Executive Dashboard</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Finance Automation</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">AI Recruitment</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Integrity Checks</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-white">Contact</h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> contact@ahc.ai</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +1 (555) 000-0000</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Tech District, Innovation City</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Avatar Human Capital. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}