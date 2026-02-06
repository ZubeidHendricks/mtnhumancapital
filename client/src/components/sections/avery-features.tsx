import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Sparkles, Users, MessageSquare, Mail } from "lucide-react";

export function AHCFeatures() {
  return (
    <div className="w-full bg-gray-100 dark:bg-zinc-900 text-foreground dark:text-white py-20">
      <div className="container mx-auto px-6">
        
        {/* Hero Section */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Auto-evaluate
            </h2>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              AHC evaluates candidates <span className="text-white font-semibold">10x faster</span> than your regular Recruiter, 
              and it reads the context like no one before to avoid biases and detect hidden gems.
            </p>
          </motion.div>
        </div>

        {/* Feature Grid 1: Speed & Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32 items-center">
          <motion.div 
             initial={{ opacity: 0, x: -50 }}
             whileInView={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
             className="order-2 md:order-1"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 p-8 flex items-center justify-center">
               <div className="relative z-10 flex flex-col gap-4 w-full max-w-xs">
                  {[1, 2, 3].map((i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.2, repeat: Infinity, repeatDelay: 3, duration: 2 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-lg flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="h-2 bg-white/20 rounded w-3/4"></div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-1 md:order-2"
          >
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">SPEED</Badge>
            <h3 className="text-4xl font-bold mb-4">10x your screening speed.</h3>
            <p className="text-gray-400 text-lg mb-6">
              No more CV scanning. AHC helps you identify talent at unprecedented speed. Intelligently.
            </p>
            <Button variant="outline" className="border-white/20 hover:bg-white hover:text-black transition-colors rounded-full px-8">
              Try AHC free
            </Button>
          </motion.div>
        </div>

        {/* Feature Grid 2: Hidden Gems */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20">DISCOVERY</Badge>
            <h3 className="text-4xl font-bold mb-4">Read through the lines.</h3>
            <p className="text-gray-400 text-lg mb-6">
              Spot hidden, growing, unusual talent, before your competitor does.
            </p>
            <Button variant="outline" className="border-white/20 hover:bg-white hover:text-black transition-colors rounded-full px-8">
              Try AHC
            </Button>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, x: 50 }}
             whileInView={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
          >
             <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 p-8 flex items-center justify-center">
               <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 blur-sm opacity-50"></div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/50 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]"
                  >
                    <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <div className="h-2 bg-blue-400/50 rounded w-1/2 mb-1"></div>
                    <div className="h-2 bg-blue-400/30 rounded w-3/4"></div>
                  </motion.div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 blur-sm opacity-50"></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 blur-sm opacity-50"></div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Grid 3: Bias Reduction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32 items-center">
          <motion.div 
             initial={{ opacity: 0, x: -50 }}
             whileInView={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
             className="order-2 md:order-1"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 p-8 flex items-center justify-center">
               <div className="flex gap-4 items-end">
                  <motion.div initial={{ height: 20 }} whileInView={{ height: 120 }} className="w-12 bg-white/10 rounded-t-lg"></motion.div>
                  <motion.div initial={{ height: 20 }} whileInView={{ height: 180 }} className="w-12 bg-primary rounded-t-lg shadow-[0_0_20px_rgba(13,148,136,0.5)]"></motion.div>
                  <motion.div initial={{ height: 20 }} whileInView={{ height: 90 }} className="w-12 bg-white/10 rounded-t-lg"></motion.div>
               </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-1 md:order-2"
          >
            <Badge className="mb-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20">FAIRNESS</Badge>
            <h3 className="text-4xl font-bold mb-4">Built to reduce, not amplify biases.</h3>
            <p className="text-gray-400 text-lg mb-6">
              AHC's matching algorithm aims for the best competence match, regardless of look or personality.
            </p>
            <Button variant="outline" className="border-white/20 hover:bg-white hover:text-black transition-colors rounded-full px-8">
              De-bias your hiring
            </Button>
          </motion.div>
        </div>

        {/* Augment Outreach Section */}
        <div className="bg-gray-200 dark:bg-zinc-800/50 border border-white/5 rounded-3xl p-12 mb-32 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
           >
             <Badge className="mb-6 bg-teal-600/10 text-teal-700 dark:text-teal-400 hover:bg-teal-600/20 border-teal-600/20">OUTREACH</Badge>
             <h2 className="text-4xl font-bold mb-6">Augment your outreach</h2>
             <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
               Get in contact with the best-fitting talent without leaving AHC. And with Agent Mode, you outreach to all suitable candidates in batch.
             </p>
             
             <div className="flex flex-col md:flex-row gap-8 justify-center items-center mb-10">
                <div className="flex items-center gap-2 text-gray-300">
                   <Mail className="w-5 h-5" /> Emails
                </div>
                <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                <div className="flex items-center gap-2 text-gray-300">
                   <MessageSquare className="w-5 h-5" /> Linkedin InMail
                </div>
                <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                <div className="text-gray-300">All-in-one</div>
             </div>

             <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-8 py-6 text-lg font-medium">
               Book a demo
             </Button>
           </motion.div>
        </div>

        {/* Coming Soon: Agentic Mode */}
        <div className="relative border border-white/10 rounded-3xl p-12 overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 -z-10"></div>
           <div className="absolute top-0 right-0 p-4">
              <Badge variant="outline" className="border-primary text-primary bg-primary/5">COMING SOON</Badge>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                 <h2 className="text-4xl font-bold mb-6">Agentic Mode: hiring on auto-pilot.</h2>
                 <p className="text-gray-400 text-lg mb-8">
                   AHC advanced Agentic Mode helps you enrich contacts, outreach shortlisted candidates, and even (video) interview.
                 </p>
                 
                 <div className="space-y-6">
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                          <Users className="w-6 h-6 text-gray-300" />
                       </div>
                       <div>
                          <h4 className="text-xl font-bold mb-2">You are in control.</h4>
                          <p className="text-gray-400">
                             Toggle Agentic Mode ON and OFF at any time, and include human checks anywhere in the process.
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-black/50 rounded-xl border border-white/10 p-6 aspect-video flex items-center justify-center relative">
                 {/* Mock Agent UI */}
                 <div className="w-full space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-mono text-green-500">AGENT ACTIVE</span>
                       </div>
                       <div className="flex gap-2">
                          <div className="w-20 h-2 bg-white/10 rounded"></div>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="bg-white/5 p-3 rounded text-xs font-mono text-gray-400">
                          {'>'} Searching for candidates...
                       </div>
                       <div className="bg-white/5 p-3 rounded text-xs font-mono text-gray-400">
                          {'>'} Found 12 matches.
                       </div>
                       <div className="bg-primary/10 p-3 rounded text-xs font-mono text-primary border border-primary/20">
                          {'>'} Initiating outreach sequence (3/12 sent)
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
