import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { DashboardPreview } from "@/components/sections/dashboard-preview";
import { AHCFeatures } from "@/components/sections/avery-features";
import { Cpu, Mail, MapPin, Phone, Mic, Video, ArrowRight, Workflow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black overflow-x-hidden">
      <main>
        <Hero />
        
        <AHCFeatures />

        <section className="py-24 bg-secondary border-y border-border relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-black">
                The AI Interview Suite
              </h2>
              <p className="text-muted-foreground text-lg">
                Revolutionize your hiring process with our dual-stage AI assessment platform.
                From voice-first screening to personalized video interviews.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white border-border hover:border-black/20 transition-all group" data-testid="card-voice-interview">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-4 border border-border group-hover:bg-black group-hover:scale-110 transition-all">
                    <Mic className="w-6 h-6 text-black group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-2xl text-black">AI Voice Interview</CardTitle>
                  <CardDescription className="text-muted-foreground">Stage 1: Interactive Roleplay Practice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    Practice with an AI that transforms into any interviewer character you need. Get real-time feedback on your performance with empathic voice technology.
                  </p>
                  <Link href="/interview/voice">
                    <Button className="w-full bg-black hover:bg-gray-800 text-white group-hover:shadow-lg" data-testid="button-voice-demo">
                      Try Voice Demo <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white border-border hover:border-black/20 transition-all group" data-testid="card-video-interview">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-4 border border-border group-hover:bg-black group-hover:scale-110 transition-all">
                    <Video className="w-6 h-6 text-black group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-2xl text-black">Cloned Video Interview</CardTitle>
                  <CardDescription className="text-muted-foreground">Stage 2: Deep Dive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    Conduct personalized video interviews using digital twin technology. Cloned avatars ask role-specific questions with human-like presence.
                  </p>
                  <Link href="/interview/video">
                    <Button className="w-full bg-black hover:bg-gray-800 text-white group-hover:shadow-lg" data-testid="button-video-demo">
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

        <section className="py-24 border-t border-border bg-secondary">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6 text-black">Ready to Transform Your Operations?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
              Join the future of human capital and operational management with MTN - Human Capital's intelligent advisory solutions.
            </p>
            <form className="max-w-md mx-auto flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-1 bg-white border border-border rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                data-testid="input-email-cta"
              />
              <button className="bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors" data-testid="button-get-started">
                Get Started
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            
            <div className="md:col-span-2">
              <div className="flex items-center mb-6 py-6 px-6">
                <img 
                  src="/logos/mtn-new-logo.svg" 
                  alt="MTN - Human Capital" 
                  className="h-16 w-auto object-contain"
                  data-testid="img-footer-logo"
                />
              </div>
              <p className="text-white/50 max-w-xs">
                MTN - Human Capital. <br/>
                Pioneering the intersection of human potential and artificial intelligence.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-white">Solutions</h3>
              <ul className="space-y-2 text-white/50 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Executive Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Finance Automation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Recruitment</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrity Checks</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-white">Contact</h3>
              <ul className="space-y-3 text-white/50 text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> contact@mtn-gpt.com</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +27 (0) 83 123 4567</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Johannesburg, South Africa</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-white/30">
            © {new Date().getFullYear()} MTN - Human Capital. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
