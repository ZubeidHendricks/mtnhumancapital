import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, X } from "lucide-react";
import { Link } from "wouter";
import demoVideo from "@/assets/videos/ahc-explainer.mp4";

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#FFCB00]/10 to-transparent" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFCB00]/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <img 
              src="/logos/mtn-new-logo.svg" 
              alt="MTN - Human Capital" 
              className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto object-contain mb-8"
              data-testid="img-hero-logo"
            />
            <span className="inline-block py-1.5 px-4 rounded-full bg-[#FFCB00]/15 border border-[#FFCB00]/30 text-[#002868] text-xs font-medium tracking-wide mb-6">
              NEXT GEN ADVISORY SERVICES
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-[#002868]"
          >
            Operational Excellence <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFCB00] to-[#E6B800]">Powered by Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
          >
            Unify your HR, Finance, and Operations with our AI-driven advisory platform. 
            Automate compliance, streamline workflows, and visualize success.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-[#FFCB00]/25 bg-[#FFCB00] text-black font-semibold hover:bg-[#E6B800]" data-testid="button-start-transformation">
                Start Transformation <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-8 text-base border-[#002868]/20 text-[#002868] hover:bg-[#002868]/5"
              onClick={() => setShowDemo(true)}
              data-testid="button-watch-demo"
            >
              <PlayCircle className="mr-2 w-4 h-4" /> Watch Demo
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      <Dialog open={showDemo} onOpenChange={setShowDemo}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0 overflow-hidden">
          <DialogTitle className="sr-only">AHC Platform Demo Video</DialogTitle>
          <button
            onClick={() => setShowDemo(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            data-testid="button-close-demo"
          >
            <X className="h-5 w-5" />
          </button>
          <video
            src={demoVideo}
            controls
            autoPlay
            className="w-full h-auto max-h-[80vh]"
            data-testid="video-demo"
          >
            Your browser does not support the video tag.
          </video>
        </DialogContent>
      </Dialog>
    </section>
  );
}
