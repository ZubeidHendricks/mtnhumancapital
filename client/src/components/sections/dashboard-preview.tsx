import { motion } from "framer-motion";
import dashImg from "@assets/generated_images/futuristic_executive_dashboard_interface.png";
import { CheckCircle2 } from "lucide-react";

export function DashboardPreview() {
  return (
    <section id="platform" className="py-24 relative overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Text Content */}
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight text-foreground">
                Control Center for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-700">Modern Leadership</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                The AHC Executive Dashboard unifies data from HR, Finance, and Operations into a single source of truth. Receive real-time alerts via WhatsApp integration and monitor contract timelines effortlessly.
              </p>

              <ul className="space-y-4">
                {[
                  "Real-time Financial Alerts & Approvals",
                  "Live Project & Fleet Monitoring (Net Start Tracker)",
                  "AI-Driven Risk & Compliance Notifications",
                  "Unified Document & Tender Management"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Image/Graphic */}
          <div className="lg:w-1/2 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
              whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card backdrop-blur-xl group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src={dashImg} 
                alt="Executive Dashboard Interface" 
                className="w-full h-auto rounded-2xl"
              />
              
              {/* Floating UI Elements */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-6 -left-6 bg-card border border-border p-4 rounded-xl shadow-xl hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-xs text-muted-foreground">System Status</p>
                    <p className="font-mono text-sm font-bold text-green-600 dark:text-green-400">OPTIMAL</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="absolute -top-6 -right-6 bg-card border border-border p-4 rounded-xl shadow-xl hidden md:block"
              >
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Efficiency Gain</p>
                  <p className="font-mono text-2xl font-bold text-primary">+245%</p>
                </div>
              </motion.div>

            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
