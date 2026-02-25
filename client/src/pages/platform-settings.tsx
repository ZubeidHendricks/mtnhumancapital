import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, Key, CheckCircle, AlertCircle, Loader2, Eye, EyeOff,
  Linkedin, FileSearch, Search, ExternalLink, Shield, Save
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PlatformConfig {
  platform: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isConfigured: boolean;
  apiKeyEnvVar: string;
  docsUrl: string;
  requiredKeys: { key: string; label: string; description: string }[];
}

const PLATFORMS: Omit<PlatformConfig, "isConfigured">[] = [
  {
    platform: "linkedin",
    name: "LinkedIn Recruiter",
    description: "Access LinkedIn's talent pool and professional network data",
    icon: Linkedin,
    color: "bg-muted",
    apiKeyEnvVar: "LINKEDIN_API_KEY",
    docsUrl: "https://developer.linkedin.com/",
    requiredKeys: [
      { key: "LINKEDIN_API_KEY", label: "API Key", description: "Your LinkedIn API access key" },
      { key: "LINKEDIN_API_SECRET", label: "API Secret", description: "Your LinkedIn API secret" },
    ],
  },
  {
    platform: "pnet",
    name: "PNet Recruiter",
    description: "Connect to South Africa's largest recruitment platform",
    icon: FileSearch,
    color: "bg-muted",
    apiKeyEnvVar: "PNET_API_KEY",
    docsUrl: "https://www.pnet.co.za/",
    requiredKeys: [
      { key: "PNET_API_KEY", label: "API Key", description: "Your PNet recruiter API key" },
      { key: "PNET_COMPANY_ID", label: "Company ID", description: "Your PNet company identifier" },
    ],
  },
  {
    platform: "indeed",
    name: "Indeed Employer",
    description: "Access Indeed's resume database and job seeker profiles",
    icon: Search,
    color: "bg-muted",
    apiKeyEnvVar: "INDEED_API_KEY",
    docsUrl: "https://developer.indeed.com/",
    requiredKeys: [
      { key: "INDEED_API_KEY", label: "API Key", description: "Your Indeed employer API key" },
      { key: "INDEED_EMPLOYER_ID", label: "Employer ID", description: "Your Indeed employer account ID" },
    ],
  },
];

export default function PlatformSettings() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: platformStatus, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["platform-status"],
    queryFn: async () => {
      const response = await api.get("/platform-status");
      return response.data;
    },
  });

  const toggleShowKey = (keyName: string) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const getPlatformStatus = (platform: string): boolean => {
    return platformStatus?.[platform] || false;
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-muted to-background">
                <Settings className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-muted to-background bg-clip-text text-transparent">
                  Platform Settings
                </h1>
                <p className="text-zinc-400">
                  Configure API keys for job board integrations
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-gray-100/50 border-gray-200 dark:border-zinc-800 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-foreground dark:text-foreground" />
                Security Notice
              </CardTitle>
              <CardDescription>
                API keys are stored securely as environment secrets. For security, you cannot view existing keys - 
                only their configuration status. To update a key, you'll need to set a new value.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {PLATFORMS.map((platform) => {
              const IconComponent = platform.icon;
              const isConfigured = getPlatformStatus(platform.platform);
              
              return (
                <Card key={platform.platform} className="bg-gray-100/50 border-gray-200 dark:border-zinc-800" data-testid={`card-platform-${platform.platform}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${platform.color}`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platform.name}</CardTitle>
                          <CardDescription>{platform.description}</CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={isConfigured 
                          ? "border-border text-foreground" 
                          : "border-zinc-600 text-zinc-400"
                        }
                        data-testid={`status-${platform.platform}`}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : isConfigured ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {isConfigured ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      {platform.requiredKeys.map((keyConfig) => (
                        <div key={keyConfig.key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-zinc-300">{keyConfig.label}</Label>
                            <code className="text-xs text-zinc-500 bg-gray-200 px-2 py-1 rounded">
                              {keyConfig.key}
                            </code>
                          </div>
                          <p className="text-xs text-zinc-500">{keyConfig.description}</p>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={showKeys[keyConfig.key] ? "text" : "password"}
                                placeholder={isConfigured ? "••••••••••••••••" : "Enter API key..."}
                                className="bg-gray-200 border-gray-300 dark:border-zinc-700 pr-10"
                                disabled={isConfigured}
                                data-testid={`input-${keyConfig.key.toLowerCase()}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => toggleShowKey(keyConfig.key)}
                              >
                                {showKeys[keyConfig.key] ? (
                                  <EyeOff className="h-4 w-4 text-zinc-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-zinc-400" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="bg-zinc-700" />
                    
                    <div className="flex items-center justify-between">
                      <a 
                        href={platform.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-foreground dark:text-foreground hover:text-foreground dark:hover:text-foreground flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View API Documentation
                      </a>
                      <div className="flex items-center gap-2">
                        {isConfigured ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-zinc-600"
                            data-testid={`button-update-${platform.platform}`}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Update Keys
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-muted to-background"
                            data-testid={`button-save-${platform.platform}`}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Configuration
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-gray-100/50 border-gray-200 dark:border-zinc-800 mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-foreground" />
                How to Configure API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-zinc-400">
                <p>
                  <strong className="text-zinc-300">1. Get API Credentials:</strong> Register as a developer 
                  or employer on each platform to obtain API keys.
                </p>
                <p>
                  <strong className="text-zinc-300">2. Set Environment Variables:</strong> API keys are stored 
                  as secure environment secrets. Use the Secrets tab in your Replit project to add them.
                </p>
                <p>
                  <strong className="text-zinc-300">3. Required Variables:</strong>
                </p>
                <div className="bg-gray-200 rounded-lg p-4 font-mono text-xs space-y-1">
                  <p># LinkedIn</p>
                  <p>LINKEDIN_API_KEY=your_linkedin_api_key</p>
                  <p>LINKEDIN_API_SECRET=your_linkedin_secret</p>
                  <p className="mt-2"># PNet</p>
                  <p>PNET_API_KEY=your_pnet_api_key</p>
                  <p>PNET_COMPANY_ID=your_company_id</p>
                  <p className="mt-2"># Indeed</p>
                  <p>INDEED_API_KEY=your_indeed_api_key</p>
                  <p>INDEED_EMPLOYER_ID=your_employer_id</p>
                </div>
                <p className="text-foreground/80">
                  Note: Currently, the sourcing specialists use AI to simulate candidate searches. 
                  Real API integration will be enabled once credentials are configured.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
