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
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <main>
        <Hero />
        
        <AHCFeatures />

        <section className="py-24 bg-[#F8F8F8] border-y border-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,203,0,0.05)_0%,rgba(0,0,0,0)_60%)]" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#002868]">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFCB00] to-[#E6B800]">AI Interview Suite</span>
              </h2>
              <p className="text-gray-600 text-lg">
                Revolutionize your hiring process with our dual-stage AI assessment platform.
                From voice-first screening to personalized video interviews.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white border-gray-200 hover:border-[#002868]/30 transition-all group" data-testid="card-voice-interview">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-[#002868]/10 flex items-center justify-center mb-4 border border-[#002868]/20 group-hover:scale-110 transition-transform">
                    <Mic className="w-6 h-6 text-[#002868]" />
                  </div>
                  <CardTitle className="text-2xl text-[#002868]">AI Voice Interview</CardTitle>
                  <CardDescription className="text-gray-600">Stage 1: Interactive Roleplay Practice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-gray-600">
                    Practice with an AI that transforms into any interviewer character you need. Get real-time feedback on your performance with empathic voice technology.
                  </p>
                  <Link href="/interview/voice">
                    <Button className="w-full bg-[#002868] hover:bg-[#001844] text-white group-hover:shadow-lg group-hover:shadow-[#002868]/20" data-testid="button-voice-demo">
                      Try Voice Demo <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 hover:border-[#FFCB00]/50 transition-all group" data-testid="card-video-interview">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-[#FFCB00]/10 flex items-center justify-center mb-4 border border-[#FFCB00]/30 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-[#002868]" />
                  </div>
                  <CardTitle className="text-2xl text-[#002868]">Cloned Video Interview</CardTitle>
                  <CardDescription className="text-gray-600">Stage 2: Deep Dive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-gray-600">
                    Conduct personalized video interviews using digital twin technology. Cloned avatars ask role-specific questions with human-like presence.
                  </p>
                  <Link href="/interview/video">
                    <Button className="w-full bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold group-hover:shadow-lg group-hover:shadow-[#FFCB00]/20" data-testid="button-video-demo">
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

        <section className="py-24 border-t border-gray-200 bg-gradient-to-b from-white to-[#F8F8F8]">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6 text-[#002868]">Ready to Transform Your Operations?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-10 text-lg">
              Join the future of human capital and operational management with MTN - Human Capital's intelligent advisory solutions.
            </p>
            <form className="max-w-md mx-auto flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFCB00]/50 focus:border-[#FFCB00]"
                data-testid="input-email-cta"
              />
              <button className="bg-[#FFCB00] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#E6B800] transition-colors" data-testid="button-get-started">
                Get Started
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-[#002868] text-white py-12">
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
              <p className="text-white/60 max-w-xs">
                MTN - Human Capital. <br/>
                Pioneering the intersection of human potential and artificial intelligence.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-[#FFCB00]">Solutions</h3>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="#" className="hover:text-[#FFCB00] transition-colors">Executive Dashboard</a></li>
                <li><a href="#" className="hover:text-[#FFCB00] transition-colors">Finance Automation</a></li>
                <li><a href="#" className="hover:text-[#FFCB00] transition-colors">AI Recruitment</a></li>
                <li><a href="#" className="hover:text-[#FFCB00] transition-colors">Integrity Checks</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-[#FFCB00]">Contact</h3>
              <ul className="space-y-3 text-white/60 text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> contact@mtn-gpt.com</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +27 (0) 83 123 4567</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Johannesburg, South Africa</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-white/40">
            © {new Date().getFullYear()} MTN - Human Capital. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
