import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, Wallet, Briefcase, Users, ShieldCheck, UserPlus, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: LayoutDashboard,
    title: "Executive Dashboard",
    description: "Real-time insights integrating company-wide updates, project status, and financial alerts directly to your device.",
    color: "text-[#002868]"
  },
  {
    icon: Wallet,
    title: "Finance Automation",
    description: "Enhance Zoho Finance with automated payment requests, approvals, and secure bank integrations.",
    color: "text-[#002868]"
  },
  {
    icon: Briefcase,
    title: "Operations & Projects",
    description: "Automated contract management, KPI tracking, and fleet management for seamless execution.",
    color: "text-[#002868]"
  },
  {
    icon: Users,
    title: "AI Recruitment Agents",
    description: "Deploy AI agents to source, screen, and rank candidates based on your precise hiring needs.",
    color: "text-[#002868]"
  },
  {
    icon: ShieldCheck,
    title: "Integrity Evaluation",
    description: "Automated background checks, fingerprint processing, and risk assessment for total peace of mind.",
    color: "text-[#002868]"
  },
  {
    icon: UserPlus,
    title: "Onboarding Automation",
    description: "Streamline welcome packages, equipment provisioning, and orientation with digital workflows.",
    color: "text-[#002868]"
  },
  {
    icon: TrendingUp,
    title: "Performance Management",
    description: "Qualitative KPI tracking and AI-assisted reporting to drive employee growth and efficiency.",
    color: "text-[#002868]"
  },
  {
    icon: Zap,
    title: "Tender Management",
    description: "Automated document reading, ranking, and submission systems to win more business.",
    color: "text-[#002868]"
  }
];

export function Services() {
  return (
    <section id="solutions" className="py-24 bg-[#F8F8F8] relative">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#002868]">
            Comprehensive <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFCB00] to-[#E6B800]">Business Intelligence</span>
          </h2>
          <p className="text-gray-600 text-lg">
            Our suite of advisory services leverages cutting-edge automation and AI to optimize every facet of your organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-white border-gray-200 hover:border-[#FFCB00]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#FFCB00]/10 group" data-testid={`card-service-${index}`}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-[#FFCB00]/10 flex items-center justify-center mb-4 group-hover:bg-[#FFCB00]/20 group-hover:scale-110 transition-all duration-300 border border-[#FFCB00]/20">
                    <service.icon className={`w-6 h-6 ${service.color}`} />
                  </div>
                  <CardTitle className="text-xl text-[#002868] group-hover:text-[#FFCB00] transition-colors">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed text-gray-600">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
