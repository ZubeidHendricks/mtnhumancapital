import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, X } from "lucide-react";
import { Link } from "wouter";
import heroBg from "@assets/generated_images/abstract_tech_network_visualization.png";
import demoVideo from "@/assets/videos/ahc-explainer.mp4";

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-background">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBg} 
          alt="Digital Network Background" 
          className="w-full h-full object-cover opacity-20 dark:opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)]" />
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
              src="/logos/main-logo.png" 
              alt="Avatar Human Capital" 
              className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto object-contain mb-8"
            />
            <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-6">
              NEXT GEN ADVISORY SERVICES
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground"
          >
            Operational Excellence <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-700">Powered by Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
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
              <Button size="lg" className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105">
                Start Transformation <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-8 text-base border-border hover:bg-accent"
              onClick={() => setShowDemo(true)}
              data-testid="button-watch-demo"
            >
              <PlayCircle className="mr-2 w-4 h-4" /> Watch Demo
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Demo Video Modal */}
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
