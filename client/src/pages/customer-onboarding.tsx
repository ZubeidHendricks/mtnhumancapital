import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, 
  Globe, 
  Palette, 
  CheckCircle2, 
  Cpu, 
  ShieldCheck, 
  UserPlus, 
  LayoutDashboard, 
  CreditCard, 
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Lock,
  BookOpen,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CustomerOnboarding() {
  const [step, setStep] = useState(1);
  const [_, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    companyName: "",
    subdomain: "",
    primaryColor: "#0ea5e9",
    industry: "Technology",
    modules: {
      recruitment: true,
      integrity: true,
      onboarding: true,
      hr_management: true
    }
  });

  const totalSteps = 4;

  const saveTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use public endpoint for initial setup
      const response = await api.post("/public/tenant-config", data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Workspace configured successfully!");
      
      // Redirect to subdomain
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      
      // For localhost, redirect with tenant query param
      if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
        window.location.href = `${protocol}//${hostname}:${window.location.port}?tenant=${data.subdomain}`;
      } else {
        // For production, redirect to subdomain
        const baseDomain = hostname.split('.').slice(-2).join('.');
        window.location.href = `${protocol}//${data.subdomain}.${baseDomain}`;
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to save configuration";
      toast.error(message);
    },
  });

  const handleLaunchTenant = () => {
    saveTenantMutation.mutate({
      companyName: formData.companyName,
      subdomain: formData.subdomain,
      primaryColor: formData.primaryColor,
      industry: formData.industry,
      modulesEnabled: formData.modules,
      apiKeysConfigured: {},
    });
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12 px-6 container mx-auto flex flex-col items-center justify-center">
        
        {/* Progress Indicator */}
        <div className="w-full max-w-3xl mb-12">
          <div className="flex justify-between mb-4">
            {["Company Profile", "Branding & Domain", "Module Selection", "Integrations"].map((label, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 ${step > i + 1 ? "text-primary" : step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  step > i + 1 ? "bg-primary border-primary text-black" : 
                  step === i + 1 ? "border-primary text-primary" : 
                  "border-border dark:border-white/10 bg-white/5"
                }`}>
                  {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden md:block">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Wizard Content */}
        <Card className="w-full max-w-3xl bg-card/30 border-border dark:border-white/10 backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary opacity-50" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && (
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Let's build your workspace</h2>
                    <p className="text-muted-foreground">Enter your company details to initialize your private tenant.</p>
                  </div>
                  
                  <div className="grid gap-6 max-w-md mx-auto">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Acme Corp" 
                          className="pl-10 bg-white/5 border-border dark:border-white/10"
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Industry Sector</Label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-border dark:border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.industry}
                        onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      >
                        <option>Technology</option>
                        <option>Finance</option>
                        <option>Healthcare</option>
                        <option>Manufacturing</option>
                        <option>Retail</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Company Logo</Label>
                      <div className="border-2 border-dashed border-border dark:border-white/10 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer">
                        <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">SVG, PNG, JPG (max 2MB)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Configure your Brand</h2>
                    <p className="text-muted-foreground">Customize how your employees experience the platform.</p>
                  </div>

                  <div className="grid gap-8 max-w-md mx-auto">
                    <div className="space-y-2">
                      <Label>Platform Domain</Label>
                      <div className="flex items-center">
                        <div className="relative flex-1">
                          <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="company" 
                            className="pl-10 bg-white/5 border-border dark:border-white/10 rounded-r-none border-r-0"
                            value={formData.subdomain}
                            onChange={(e) => setFormData({...formData, subdomain: e.target.value})}
                          />
                        </div>
                        <div className="h-10 px-4 bg-white/10 border border-border dark:border-white/10 rounded-r-md flex items-center text-sm text-muted-foreground">
                          .ahc.ai
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">This will be your dedicated login URL.</p>
                    </div>

                    <div className="space-y-4">
                      <Label>Primary Brand Color</Label>
                      <div className="grid grid-cols-5 gap-4">
                        {["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"].map((color) => (
                          <div 
                            key={color}
                            onClick={() => setFormData({...formData, primaryColor: color})}
                            className={`h-10 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110 ${formData.primaryColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""}`}
                            style={{ backgroundColor: color }}
                          >
                            {formData.primaryColor === color && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className="mt-4 p-4 rounded-lg border border-border dark:border-white/10 bg-black/40">
                      <p className="text-xs text-muted-foreground mb-2">Preview</p>
                      <div className="flex gap-2 mb-4">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-opacity-20" style={{ backgroundColor: formData.primaryColor + '33' }}>
                          <Cpu className="w-4 h-4" style={{ color: formData.primaryColor }} />
                        </div>
                        <div>
                          <div className="h-2 w-20 bg-white/20 rounded mb-1" />
                          <div className="h-2 w-12 bg-white/10 rounded" />
                        </div>
                      </div>
                      <Button size="sm" className="w-full text-white" style={{ backgroundColor: formData.primaryColor }}>
                        Sign In to {formData.companyName || "Your Company"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Activate Intelligence Modules</h2>
                    <p className="text-muted-foreground">Select the AI agents you want to deploy immediately.</p>
                  </div>

                  <div className="grid gap-4">
                    {[
                      { id: "recruitment", title: "Recruitment & Selection", desc: "Job Mgmt, Sourcing, Screening, Interviews", icon: UserPlus },
                      { id: "integrity", title: "Integrity Evaluation (IE)", desc: "Background Verification, Risk Assessment", icon: ShieldCheck },
                      { id: "onboarding", title: "Company Onboarding", desc: "Welcome, Docs, IT Provisioning, Orientation", icon: CheckCircle2 },
                      { id: "hr_management", title: "HR Management", desc: "Performance, Training, Payroll (Zoho), Relations", icon: LayoutDashboard },
                    ].map((module) => (
                      <div key={module.id} className="flex items-center justify-between p-4 rounded-lg border border-border dark:border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <module.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium">{module.title}</h3>
                            <p className="text-sm text-muted-foreground">{module.desc}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={formData.modules[module.id as keyof typeof formData.modules]}
                          onCheckedChange={(checked) => setFormData({
                            ...formData, 
                            modules: { ...formData.modules, [module.id]: checked }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Connect Your Ecosystem</h2>
                    <p className="text-muted-foreground">Securely link your existing operational tools.</p>
                  </div>

                  <div className="grid gap-4 max-w-lg mx-auto">
                    
                    <div className="p-4 rounded-lg border border-border dark:border-white/10 bg-white/5 space-y-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-[#0080FF] rounded flex items-center justify-center font-bold text-white">DO</div>
                         <div className="flex-1">
                           <h4 className="text-sm font-medium">DigitalOcean Backend</h4>
                           <p className="text-xs text-muted-foreground">aihr-backend-hmew5.ondigitalocean.app</p>
                         </div>
                       </div>
                       <div className="flex items-center justify-between text-xs text-muted-foreground bg-black/20 p-2 rounded">
                          <span>Status:</span>
                          <span className="text-foreground flex items-center gap-1"><div className="w-2 h-2 bg-muted rounded-full"/> Connected</span>
                       </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border dark:border-white/10 bg-white/5 space-y-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-[#0077b5] rounded flex items-center justify-center font-bold text-white">in</div>
                         <div className="flex-1">
                           <h4 className="text-sm font-medium">LinkedIn Talent Solutions</h4>
                           <p className="text-xs text-muted-foreground">For candidate sourcing</p>
                         </div>
                       </div>
                       <div className="relative">
                         <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                         <Input type="password" placeholder="Paste Client Secret" className="pl-9 bg-black/20 border-border dark:border-white/10" />
                       </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border dark:border-white/10 bg-white/5 space-y-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-[#25D366] rounded flex items-center justify-center font-bold text-white">WA</div>
                         <div className="flex-1">
                           <h4 className="text-sm font-medium">WhatsApp Business API</h4>
                           <p className="text-xs text-muted-foreground">For executive alerts & candidate chat</p>
                         </div>
                       </div>
                       <div className="relative">
                         <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                         <Input type="password" placeholder="Paste API Key" className="pl-9 bg-black/20 border-border dark:border-white/10" />
                       </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border dark:border-white/10 bg-white/5 space-y-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold text-white">Z</div>
                         <div className="flex-1">
                           <h4 className="text-sm font-medium">Zoho Finance</h4>
                           <p className="text-xs text-muted-foreground">For payroll & expense sync</p>
                         </div>
                       </div>
                       <Button variant="outline" size="sm" className="w-full border-border dark:border-white/10 hover:bg-white/5">
                         Authenticate via OAuth
                       </Button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation */}
          <div className="p-6 border-t border-border dark:border-white/10 bg-black/20 flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={prevStep} 
              disabled={step === 1}
              className="text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <div className="flex gap-2">
              {step < totalSteps ? (
                <Button onClick={nextStep} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleLaunchTenant}
                  disabled={saveTenantMutation.isPending || !formData.companyName}
                  className="bg-muted hover:bg-muted text-white shadow-[0_0_20px_-5px_rgba(22,163,74,0.5)]"
                >
                  {saveTenantMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Configuring...
                    </>
                  ) : (
                    <>
                      Launch Tenant <Cpu className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

      </main>
    </div>
  );
}