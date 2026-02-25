import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, Wallet, Briefcase, Users, ShieldCheck, UserPlus, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: LayoutDashboard,
    title: "Executive Dashboard",
    description: "Real-time insights integrating company-wide updates, project status, and financial alerts directly to your device.",
  },
  {
    icon: Wallet,
    title: "Finance Automation",
    description: "Enhance Zoho Finance with automated payment requests, approvals, and secure bank integrations.",
  },
  {
    icon: Briefcase,
    title: "Operations & Projects",
    description: "Automated contract management, KPI tracking, and fleet management for seamless execution.",
  },
  {
    icon: Users,
    title: "AI Recruitment Agents",
    description: "Deploy AI agents to source, screen, and rank candidates based on your precise hiring needs.",
  },
  {
    icon: ShieldCheck,
    title: "Integrity Evaluation",
    description: "Automated background checks, fingerprint processing, and risk assessment for total peace of mind.",
  },
  {
    icon: UserPlus,
    title: "Onboarding Automation",
    description: "Streamline welcome packages, equipment provisioning, and orientation with digital workflows.",
  },
  {
    icon: TrendingUp,
    title: "Performance Management",
    description: "Qualitative KPI tracking and AI-assisted reporting to drive employee growth and efficiency.",
  },
  {
    icon: Zap,
    title: "Tender Management",
    description: "Automated document reading, ranking, and submission systems to win more business.",
  }
];

export function Services() {
  return (
    <section id="solutions" className="py-24 bg-gray-50 relative">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-black">
            Comprehensive Business Intelligence
          </h2>
          <p className="text-gray-500 text-lg">
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
              <Card className="h-full bg-white border-gray-200 hover:border-black/20 transition-all duration-300 hover:shadow-lg group" data-testid={`card-service-${index}`}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-4 group-hover:bg-black group-hover:scale-110 transition-all duration-300 border border-gray-200">
                    <service.icon className="w-6 h-6 text-black group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-xl text-black">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed text-gray-500">
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
