import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

export function HumeVisualizer({ state }: { state: "listening" | "speaking" | "processing" | "idle" }) {
  // A complex animated orb to mimic Hume's aesthetic
  
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Core Orb */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1, 1.2, 1] : state === "listening" ? [1, 1.05, 1] : 1,
          rotate: state === "processing" ? 360 : 0,
        }}
        transition={{
          duration: state === "speaking" ? 2 : state === "listening" ? 4 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`relative z-10 w-32 h-32 rounded-full blur-xl transition-colors duration-1000 ${
          state === "listening" ? "bg-cyan-400/60" :
          state === "speaking" ? "bg-blue-500/60" :
          state === "processing" ? "bg-amber-400/60" :
          "bg-white/20"
        }`}
      />
      
      {/* Outer Glow Layers */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1.2, 1.5, 1.2] : state === "listening" ? [1.1, 1.2, 1.1] : 1,
          opacity: state === "speaking" ? [0.5, 0.8, 0.5] : 0.3,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
        className={`absolute w-48 h-48 rounded-full mix-blend-screen filter blur-2xl transition-colors duration-1000 ${
           state === "listening" ? "bg-blue-500/40" :
           state === "speaking" ? "bg-pink-500/40" :
           "bg-white/5"
        }`}
      />
      
      <motion.div
        animate={{
          scale: state === "speaking" ? [1.1, 1.4, 1.1] : 1,
          rotate: [0, -180, -360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
        className={`absolute w-40 h-40 rounded-full border border-white/10 mix-blend-overlay`}
      />

      {/* Particles/Noise (Mocking the grainy texture) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay rounded-full" />
    </div>
  );
}