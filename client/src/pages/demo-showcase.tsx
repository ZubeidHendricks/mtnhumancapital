import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  Briefcase, 
  BarChart3, 
  Clock, 
  GraduationCap,
  ExternalLink,
  Sparkles,
  Cpu,
  Globe,
  Zap
} from "lucide-react";

interface ProductCard {
  name: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: string[];
  status: "live" | "beta" | "coming-soon";
}

const products: ProductCard[] = [
  {
    name: "AI Fleet Manager",
    description: "AI-powered fleet and logistics management system with real-time tracking, driver management, weighbridge integration, and automated salary calculations.",
    url: "https://aifleetmanager.co.za/dashboard/executive",
    icon: Truck,
    color: "from-teal-600 to-amber-500",
    features: ["Fleet Tracking", "Driver Management", "Weighbridge AI", "Load Reconciliation", "Salary Automation"],
    status: "live"
  },
  {
    name: "We Find Jobs",
    description: "Job search and recruitment platform connecting candidates with opportunities. Features AI-powered job matching and application tracking.",
    url: "https://wefindjobs.co.za/",
    icon: Briefcase,
    color: "from-blue-500 to-indigo-500",
    features: ["Job Search", "CV Upload", "Application Tracking", "Job Alerts", "Company Profiles"],
    status: "live"
  },
  {
    name: "Data Vision Automation",
    description: "Advanced data analytics and automation platform for business intelligence. Transform raw data into actionable insights with AI-driven analytics.",
    url: "https://data-vision-automation-fresh-xvyx9.ondigitalocean.app/",
    icon: BarChart3,
    color: "from-blue-500 to-pink-500",
    features: ["Data Analytics", "AI Insights", "Automated Reports", "Dashboard Builder", "Data Integration"],
    status: "live"
  },
  {
    name: "CARTA Time & Attendance",
    description: "Comprehensive time and attendance management system. Track employee hours, manage leave, and generate payroll-ready reports.",
    url: "https://carta-ta-ji5og.ondigitalocean.app/auth/login",
    icon: Clock,
    color: "from-green-500 to-emerald-500",
    features: ["Clock In/Out", "Leave Management", "Shift Scheduling", "Payroll Integration", "Attendance Reports"],
    status: "live"
  },
  {
    name: "Learning Management System",
    description: "Enterprise LMS for employee training and development. Create courses, track progress, issue certificates, and measure learning outcomes.",
    url: "http://165.227.113.197/",
    icon: GraduationCap,
    color: "from-cyan-500 to-blue-500",
    features: ["Course Creation", "Progress Tracking", "Certificates", "Assessments", "Leaderboards"],
    status: "live"
  }
];

export default function DemoShowcase() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">D8taVision Product Suite</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-500 to-pink-500 bg-clip-text text-transparent">
            Intelligent Software Solutions
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            D8taVision builds AI-powered enterprise software that transforms how businesses operate. 
            From fleet management to HR automation, our solutions drive efficiency and growth.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">Cloud-Native</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm">Enterprise-Ready</span>
            </div>
          </div>
        </div>

        {/* About D8taVision */}
        <Card className="mb-12 bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">About D8taVision</CardTitle>
            <CardDescription className="text-base">
              Pioneering the future of enterprise automation
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              D8taVision is a technology company specializing in AI-driven enterprise software solutions. 
              We combine cutting-edge artificial intelligence with deep industry expertise to create 
              software that not only automates processes but intelligently adapts to your business needs.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our product suite spans across multiple domains including human capital management, 
              fleet logistics, recruitment, learning & development, and business intelligence. 
              Each solution is designed to integrate seamlessly with your existing infrastructure 
              while providing powerful AI capabilities that drive measurable business outcomes.
            </p>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <h2 className="text-2xl font-bold mb-6">Our Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <Card 
                key={product.name} 
                className="group hover:border-primary/50 transition-all duration-300 overflow-hidden"
                data-testid={`card-product-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        product.status === "live" 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" 
                          : product.status === "beta"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                      }
                    >
                      {product.status === "live" ? "Live" : product.status === "beta" ? "Beta" : "Coming Soon"}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {product.features.map((feature, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs bg-muted/50"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  
                  <a 
                    href={product.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      className={`w-full bg-gradient-to-r ${product.color} hover:opacity-90 transition-opacity`}
                      data-testid={`button-visit-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Application
                    </Button>
                  </a>
                  
                  <p className="text-xs text-muted-foreground mt-2 truncate text-center">
                    {product.url}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact Section */}
        <Card className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-pink-500/10 border-primary/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Interested in Our Solutions?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Contact D8taVision to learn how our AI-powered software can transform your business operations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Request a Demo
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
