import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { DashboardPreview } from "@/components/sections/dashboard-preview";
import { AHCFeatures } from "@/components/sections/avery-features";
import { Cpu, Mail, MapPin, Phone, Mic, Video, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      
      <main>
        <Hero />
        
        {/* NEW: AHC/Recruitment AI Features Module */}
        <AHCFeatures />

        {/* NEW: Interview Suite Section */}
        <section className="py-24 bg-black/20 border-y border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.1)_0%,rgba(0,0,0,0)_60%)]" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">AI Interview Suite</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Revolutionize your hiring process with our dual-stage AI assessment platform.
                From voice-first screening to personalized video interviews.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Voice Interview Card */}
              <Card className="bg-card/30 border-white/10 hover:border-purple-500/30 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20 group-hover:scale-110 transition-transform">
                    <Mic className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl">Chit-Chet Voice Interview</CardTitle>
                  <CardDescription>Stage 1: Empathic Screening</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    Engage candidates with an empathic voice interface that understands tone, sentiment, and nuance. Perfect for initial screening and soft-skills assessment.
                  </p>
                  <Link href="/interview/voice">
                    <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white group-hover:shadow-lg group-hover:shadow-purple-500/20">
                      Try Voice Demo <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Video Interview Card */}
              <Card className="bg-card/30 border-white/10 hover:border-indigo-500/30 transition-all group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-indigo-400" />
                  </div>
                  <CardTitle className="text-2xl">Cloned Video Interview</CardTitle>
                  <CardDescription>Stage 2: Deep Dive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    Conduct personalized video interviews using digital twin technology. Cloned avatars ask role-specific questions with human-like presence.
                  </p>
                  <Link href="/interview/video">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20">
                      Try Video Demo <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Services />
        <DashboardPreview />

        {/* CTA Section */}
        <section className="py-24 border-t border-white/10 bg-gradient-to-b from-background to-black">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Operations?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
              Join the future of human capital and operational management with Avatar Human Capital's intelligent advisory solutions.
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
              <div className="flex items-center mb-6 py-8 px-8">
                <img 
                  src="/logos/light-logo.png" 
                  alt="Avatar Human Capital" 
                  className="h-16 w-auto object-contain"
                />
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