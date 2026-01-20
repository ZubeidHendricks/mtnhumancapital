import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  DollarSign,
  Users,
  Settings,
  Zap,
  Shield,
  TrendingUp,
  Building2,
  CreditCard,
  ToggleLeft,
  Eye,
  Bell,
  FileText,
  CheckCircle2,
  ArrowRight,
  Code,
  Database,
  Layout,
} from "lucide-react";

export default function PlatformDocumentation() {
  const [activeSection, setActiveSection] = useState("overview");

  const features = [
    {
      icon: Users,
      title: "Multi-Tenant Architecture",
      description: "Complete tenant isolation with subdomain routing and branded workspaces",
      color: "text-blue-500",
    },
    {
      icon: DollarSign,
      title: "Payment Tracking",
      description: "Record and monitor all tenant payments with complete transaction history",
      color: "text-green-500",
    },
    {
      icon: Settings,
      title: "Subscription Management",
      description: "Four-tier subscription system with trial period and status tracking",
      color: "text-purple-500",
    },
    {
      icon: ToggleLeft,
      title: "Module Control",
      description: "Enable/disable features per tenant based on subscription and payment",
      color: "text-orange-500",
    },
  ];

  const tiers = [
    {
      name: "Free Trial",
      price: "R0",
      period: "30 days",
      modules: ["Recruitment"],
      limits: ["10 candidates", "3 jobs", "1 user"],
      color: "border-gray-500",
    },
    {
      name: "Basic",
      price: "R499",
      period: "/month",
      modules: ["Recruitment", "Integrity", "Onboarding"],
      limits: ["100 candidates", "20 jobs", "5 users"],
      color: "border-blue-500",
      popular: true,
    },
    {
      name: "Professional",
      price: "R999",
      period: "/month",
      modules: ["All Modules"],
      limits: ["Unlimited candidates", "Unlimited jobs", "20 users"],
      color: "border-purple-500",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      modules: ["All + Custom"],
      limits: ["Unlimited everything", "Custom integrations", "White-label"],
      color: "border-orange-500",
    },
  ];

  const workflows = [
    {
      title: "New Tenant Onboarding",
      steps: [
        "Visit /customer-onboarding page",
        "Enter company details and choose subdomain",
        "System creates tenant with trial status",
        "Redirect to branded workspace",
        "30-day trial begins automatically",
      ],
    },
    {
      title: "Trial to Paid Conversion",
      steps: [
        "Tenant contacts admin to upgrade",
        "Admin records payment in system",
        "Admin updates status to 'Active'",
        "Admin enables purchased modules",
        "Tenant gets instant access",
      ],
    },
    {
      title: "Suspend Non-Paying Tenant",
      steps: [
        "Payment date passes without payment",
        "Admin updates status to 'Suspended'",
        "Admin disables all modules",
        "Tenant cannot access system",
        "When paid: record payment, reactivate",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-4 md:p-6 space-y-8 pt-20 md:pt-24">
        <BackButton fallbackPath="/admin-dashboard" />

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold text-white">
              Platform Documentation
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Complete guide to the multi-tenant SaaS platform with payment tracking and subscription management
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
              Version 1.0.0
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Production Ready
            </Badge>
          </div>
        </div>

        {/* Quick Navigation */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Overview", icon: Layout, href: "#overview" },
                { label: "Features", icon: Zap, href: "#features" },
                { label: "Workflows", icon: ArrowRight, href: "#workflows" },
                { label: "API Reference", icon: Code, href: "#api" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    const element = document.querySelector(item.href);
                    element?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition-colors text-white"
                >
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-black/40 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="migration">Setup</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-black/40 border-white/10" id="overview">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" />
                  System Overview
                </CardTitle>
                <CardDescription>
                  A complete multi-tenant SaaS platform with subscription and payment management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-invert max-w-none">
                  <p className="text-muted-foreground">
                    This platform provides everything needed to run a B2B SaaS business with multiple tenants.
                    Each tenant gets their own branded workspace, isolated data, and access to modules based on
                    their subscription tier.
                  </p>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {features.map((feature) => (
                    <div
                      key={feature.title}
                      className="p-4 rounded-lg bg-black/20 border border-white/5"
                    >
                      <feature.icon className={`w-8 h-8 ${feature.color} mb-3`} />
                      <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Key Capabilities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Self-service tenant onboarding",
                      "Automated 30-day trial tracking",
                      "Manual payment recording",
                      "Subscription status management",
                      "Real-time module control",
                      "Revenue tracking per tenant",
                      "Admin tenant switching",
                      "Branded workspaces with custom subdomains",
                    ].map((capability) => (
                      <div key={capability} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Diagram */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">System Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5">
                    <div className="text-center space-y-6">
                      <div className="inline-block p-4 rounded-lg bg-black/40">
                        <Users className="w-8 h-8 text-blue-400" />
                        <p className="text-white mt-2 font-semibold">Multiple Tenants</p>
                      </div>
                      <div className="text-2xl text-white">↓</div>
                      <div className="inline-block p-4 rounded-lg bg-black/40">
                        <Shield className="w-8 h-8 text-purple-400" />
                        <p className="text-white mt-2 font-semibold">Tenant Middleware</p>
                        <p className="text-xs text-muted-foreground">Resolves subdomain</p>
                      </div>
                      <div className="text-2xl text-white">↓</div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-black/40">
                          <Database className="w-6 h-6 text-green-400 mx-auto" />
                          <p className="text-white mt-2 text-sm">Isolated Data</p>
                        </div>
                        <div className="p-4 rounded-lg bg-black/40">
                          <Settings className="w-6 h-6 text-orange-400 mx-auto" />
                          <p className="text-white mt-2 text-sm">Module Access</p>
                        </div>
                        <div className="p-4 rounded-lg bg-black/40">
                          <TrendingUp className="w-6 h-6 text-blue-400 mx-auto" />
                          <p className="text-white mt-2 text-sm">Analytics</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Tiers */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Subscription Tiers</CardTitle>
                <CardDescription>Four flexible pricing plans to suit any business size</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tiers.map((tier) => (
                    <div
                      key={tier.name}
                      className={`p-6 rounded-lg bg-black/20 border-2 ${tier.color} relative`}
                    >
                      {tier.popular && (
                        <Badge className="absolute top-2 right-2 bg-blue-500">Popular</Badge>
                      )}
                      <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-white">{tier.price}</span>
                        <span className="text-muted-foreground">{tier.period}</span>
                      </div>
                      <Separator className="mb-4 bg-white/10" />
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-white mb-2">Modules:</p>
                          {tier.modules.map((module) => (
                            <Badge key={module} variant="secondary" className="text-xs mr-1 mb-1">
                              {module}
                            </Badge>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white mb-2">Limits:</p>
                          {tier.limits.map((limit) => (
                            <div key={limit} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              {limit}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  Platform Features
                </CardTitle>
                <CardDescription>
                  Complete breakdown of all system capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  <AccordionItem value="payment" className="border border-white/10 rounded-lg px-4 bg-black/20">
                    <AccordionTrigger className="text-white hover:no-underline">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <span>Payment Tracking</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3 pt-3">
                      <p>Complete payment transaction management system for tracking all tenant payments.</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Record Manual Payments</p>
                            <p className="text-xs">Bank transfers, invoices, card payments</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Payment Status Tracking</p>
                            <p className="text-xs">Pending, completed, failed, refunded</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Transaction History</p>
                            <p className="text-xs">Complete audit trail with amounts and dates</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Revenue Calculation</p>
                            <p className="text-xs">Automatic total revenue per tenant</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="subscription" className="border border-white/10 rounded-lg px-4 bg-black/20">
                    <AccordionTrigger className="text-white hover:no-underline">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-purple-500" />
                        <span>Subscription Management</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3 pt-3">
                      <p>Control tenant subscriptions with flexible tier-based access.</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Four Subscription Tiers</p>
                            <p className="text-xs">Free Trial, Basic (R499), Professional (R999), Enterprise (Custom)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Status Management</p>
                            <p className="text-xs">Trial, Active, Suspended, Cancelled</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Trial Period Tracking</p>
                            <p className="text-xs">30-day automatic trial with end date tracking</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Payment Date Management</p>
                            <p className="text-xs">Track next payment date and billing cycle</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="modules" className="border border-white/10 rounded-lg px-4 bg-black/20">
                    <AccordionTrigger className="text-white hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ToggleLeft className="w-5 h-5 text-orange-500" />
                        <span>Module Control</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3 pt-3">
                      <p>Enable or disable specific modules per tenant based on their subscription.</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Real-Time Toggle</p>
                            <p className="text-xs">Instant module activation/deactivation</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Four Core Modules</p>
                            <p className="text-xs">Recruitment, Integrity, Onboarding, HR Management</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Instant Effect</p>
                            <p className="text-xs">Changes reflect immediately in tenant's workspace</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">UI Integration</p>
                            <p className="text-xs">Navbar and menus update automatically</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tenant-switching" className="border border-white/10 rounded-lg px-4 bg-black/20">
                    <AccordionTrigger className="text-white hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-500" />
                        <span>Admin Tenant Switching</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3 pt-3">
                      <p>View any tenant's workspace as an admin for support and debugging.</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">One-Click Switching</p>
                            <p className="text-xs">Instantly switch to any tenant's view</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Visual Indicator</p>
                            <p className="text-xs">"Viewing" badge shows when impersonating</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Easy Exit</p>
                            <p className="text-xs">Return to own workspace with one click</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-white text-sm">Persistent Session</p>
                            <p className="text-xs">Selection persists across page reloads</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6">
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowRight className="w-6 h-6 text-primary" />
                  Common Workflows
                </CardTitle>
                <CardDescription>
                  Step-by-step guides for common platform operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {workflows.map((workflow, idx) => (
                  <div key={workflow.title} className="p-4 rounded-lg bg-black/20 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm">
                        {idx + 1}
                      </span>
                      {workflow.title}
                    </h3>
                    <div className="space-y-3 ml-10">
                      {workflow.steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-muted-foreground text-xs shrink-0 mt-0.5">
                            {stepIdx + 1}
                          </div>
                          <p className="text-muted-foreground">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Separator className="bg-white/10" />

                {/* Admin Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Admin Actions Quick Reference</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        Record Payment
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Go to Tenant Management</li>
                        <li>Select tenant & click "View"</li>
                        <li>Click "Record Payment"</li>
                        <li>Enter amount and details</li>
                        <li>Save</li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-500" />
                        Suspend Tenant
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Go to Tenant Management</li>
                        <li>Find tenant & click "View"</li>
                        <li>Click "Update" subscription</li>
                        <li>Change status to "Suspended"</li>
                        <li>Save</li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <ToggleLeft className="w-4 h-4 text-blue-500" />
                        Toggle Modules
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Select tenant in list</li>
                        <li>View subscription details</li>
                        <li>Use toggle switches</li>
                        <li>Changes apply instantly</li>
                        <li>Tenant sees updated menu</li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-500" />
                        Switch Tenant View
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Click tenant selector dropdown</li>
                        <li>Select tenant to view</li>
                        <li>Page reloads with tenant data</li>
                        <li>Debug or provide support</li>
                        <li>Click "Exit Tenant View"</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Code className="w-6 h-6 text-primary" />
                  API Reference
                </CardTitle>
                <CardDescription>
                  Complete API endpoints documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    {
                      method: "GET",
                      endpoint: "/api/admin/tenants",
                      description: "Get all tenants",
                      auth: "Admin required",
                      response: "TenantConfig[]",
                    },
                    {
                      method: "GET",
                      endpoint: "/api/admin/tenants/:tenantId/payments",
                      description: "Get payment history for a tenant",
                      auth: "Admin required",
                      response: "TenantPayment[]",
                    },
                    {
                      method: "POST",
                      endpoint: "/api/admin/tenants/:tenantId/payments",
                      description: "Record a new payment",
                      auth: "Admin required",
                      body: "{ amount, status, paymentMethod, description }",
                    },
                    {
                      method: "PATCH",
                      endpoint: "/api/admin/tenants/:tenantId/subscription",
                      description: "Update subscription details",
                      auth: "Admin required",
                      body: "{ subscriptionStatus, subscriptionTier, modulesEnabled }",
                    },
                    {
                      method: "POST",
                      endpoint: "/api/admin/impersonate-tenant",
                      description: "Switch to tenant view",
                      auth: "Admin required",
                      body: "{ tenantId }",
                    },
                    {
                      method: "POST",
                      endpoint: "/api/public/tenant-config",
                      description: "Create new tenant (onboarding)",
                      auth: "Public",
                      body: "{ companyName, subdomain, industry }",
                    },
                  ].map((api) => (
                    <div
                      key={api.endpoint}
                      className="p-4 rounded-lg bg-black/20 border border-white/5 space-y-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={api.method === "GET" ? "default" : "secondary"}
                          className={
                            api.method === "GET"
                              ? "bg-blue-500"
                              : api.method === "POST"
                              ? "bg-green-500"
                              : "bg-orange-500"
                          }
                        >
                          {api.method}
                        </Badge>
                        <code className="text-white font-mono text-sm">{api.endpoint}</code>
                      </div>
                      <p className="text-muted-foreground text-sm">{api.description}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          Auth: <span className="text-white">{api.auth}</span>
                        </span>
                        {api.response && (
                          <span className="text-muted-foreground">
                            Response: <span className="text-white">{api.response}</span>
                          </span>
                        )}
                        {api.body && (
                          <span className="text-muted-foreground">
                            Body: <code className="text-white">{api.body}</code>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="migration" className="space-y-6">
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-6 h-6 text-primary" />
                  Database Setup
                </CardTitle>
                <CardDescription>
                  Run the migration to add payment and subscription tables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-yellow-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-yellow-300 font-semibold">Migration Required</p>
                      <p className="text-yellow-200/80 mt-1 text-sm">
                        You must run the database migration before using the payment and subscription features.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold mb-2">Step 1: Run Migration Script</h3>
                    <div className="p-4 rounded-lg bg-black/40 border border-white/10">
                      <code className="text-green-400 text-sm">
                        psql -U postgres -d your_database -f migrations/add-subscription-tracking.sql
                      </code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Step 2: Verify Tables Created</h3>
                    <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-2">
                      <p className="text-muted-foreground text-sm">Check these tables exist:</p>
                      <ul className="list-disc list-inside text-green-400 text-sm space-y-1">
                        <li>tenant_payments</li>
                        <li>subscription_plans</li>
                        <li>tenant_config (with new columns)</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Step 3: Test the System</h3>
                    <div className="p-4 rounded-lg bg-black/40 border border-white/10">
                      <ol className="list-decimal list-inside text-muted-foreground text-sm space-y-2">
                        <li>Navigate to /tenant-management</li>
                        <li>Verify tenant list loads</li>
                        <li>Try recording a test payment</li>
                        <li>Try toggling a module</li>
                        <li>Verify changes persist</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <h3 className="text-white font-semibold mb-3">What the Migration Adds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                      <h4 className="text-white text-sm font-semibold mb-2">New Tables</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• tenant_payments (payment history)</li>
                        <li>• subscription_plans (pricing tiers)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                      <h4 className="text-white text-sm font-semibold mb-2">Extended Fields</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• subscription_tier</li>
                        <li>• subscription_status</li>
                        <li>• trial_ends_at</li>
                        <li>• next_payment_date</li>
                        <li>• + 5 more fields</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environment Variables */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Environment Variables</CardTitle>
                <CardDescription>Required configuration for production</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <code className="text-green-400">ADMIN_API_KEY</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required for admin endpoint authentication. Set to a strong random key.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <code className="text-green-400">DATABASE_URL</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      PostgreSQL database connection string.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <CardContent className="p-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-4">
              Run the migration and start managing your tenants!
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/tenant-management">
                <Badge className="bg-primary hover:bg-primary/90 cursor-pointer px-4 py-2 text-base">
                  Go to Tenant Management →
                </Badge>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
