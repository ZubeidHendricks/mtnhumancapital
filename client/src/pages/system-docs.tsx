import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Users, 
  Building2, 
  GraduationCap, 
  Trophy, 
  Award, 
  Video, 
  FileCheck,
  Shield,
  Zap,
  Settings,
  CreditCard
} from "lucide-react";

export default function SystemDocs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              System Documentation
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete guide to the Avatar Human Capital platform and its features
            </p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tenants">Multi-Tenancy</TabsTrigger>
              <TabsTrigger value="lms">LMS Module</TabsTrigger>
              <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
              <TabsTrigger value="admin">Admin Guide</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Overview</CardTitle>
                  <CardDescription>
                    Avatar Human Capital is a comprehensive HR management platform with AI-powered features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Core Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Users className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-semibold">Recruitment & Hiring</h4>
                          <p className="text-sm text-muted-foreground">
                            AI-powered candidate screening, interviews, and pipeline management
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-semibold">Learning Management</h4>
                          <p className="text-sm text-muted-foreground">
                            Course creation, assessments, gamification, and certificates
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-semibold">Integrity Checks</h4>
                          <p className="text-sm text-muted-foreground">
                            Background verification and social media screening
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Zap className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-semibold">AI Agents</h4>
                          <p className="text-sm text-muted-foreground">
                            Voice and video interviews, document automation
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Technology Stack</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Frontend</span>
                        <Badge variant="outline">React + TypeScript + Vite</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Backend</span>
                        <Badge variant="outline">Node.js + Express</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Database</span>
                        <Badge variant="outline">PostgreSQL</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">AI Integration</span>
                        <Badge variant="outline">OpenAI + Hume AI</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Multi-Tenancy */}
            <TabsContent value="tenants" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Multi-Tenant Architecture
                  </CardTitle>
                  <CardDescription>
                    How the system manages multiple organizations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Tenant Isolation</h3>
                    <p className="text-muted-foreground mb-4">
                      Each tenant (organization) has complete data isolation. Users, candidates, courses, 
                      and all other data are strictly separated by tenant ID.
                    </p>
                    <div className="bg-muted p-4 rounded-lg">
                      <code className="text-sm">
                        All database queries include: WHERE tenant_id = ?
                      </code>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Tenant Configuration</h3>
                    <p className="text-muted-foreground mb-4">
                      Each tenant can be configured with:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>
                          <span className="font-medium">Custom Domain:</span> Unique subdomain or custom domain
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>
                          <span className="font-medium">Branding:</span> Logo, colors, company name
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>
                          <span className="font-medium">Module Access:</span> Enable/disable specific features
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>
                          <span className="font-medium">Payment Status:</span> Trial, Active, Suspended, Cancelled
                        </div>
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Admin Controls</h3>
                    <p className="text-muted-foreground mb-4">
                      Admins can manage tenants through the Admin Dashboard:
                    </p>
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold">Module Control</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Toggle LMS, Gamification, AI Lecturers, and Certificates on/off per tenant
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold">Billing Management</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          View payment status, subscription tier, and expiration dates
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LMS Module */}
            <TabsContent value="lms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Learning Management System
                  </CardTitle>
                  <CardDescription>
                    Complete training and development platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Courses */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Course Management</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Create and manage training courses with modules and lessons
                    </p>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Course Creation</span>
                        <Badge>Available</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Module Structure</span>
                        <Badge>Available</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Enrollment Tracking</span>
                        <Badge>Available</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress Monitoring</span>
                        <Badge>Available</Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Assessments */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Assessments</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Regular assessments delivered via email and WhatsApp
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Multiple question types (MCQ, True/False, Essay)</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Automated delivery schedules</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Time limits and attempt tracking</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Pass/fail with configurable thresholds</div>
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  {/* Gamification */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Gamification</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Motivate learners with badges, leaderboards, and achievements
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg text-center">
                        <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <h4 className="font-semibold">Leaderboards</h4>
                        <p className="text-sm text-muted-foreground">Top performers by points</p>
                      </div>
                      <div className="p-4 border rounded-lg text-center">
                        <Award className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <h4 className="font-semibold">Badges</h4>
                        <p className="text-sm text-muted-foreground">Achievement unlocks</p>
                      </div>
                      <div className="p-4 border rounded-lg text-center">
                        <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <h4 className="font-semibold">Streaks</h4>
                        <p className="text-sm text-muted-foreground">Learning consistency</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* AI Lecturers */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">AI Lecturers</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Create training videos using AI personas with custom voices and avatars
                    </p>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">
                        Generate video content for courses automatically. Configure persona styles, 
                        upload scripts, and the system generates professional training videos.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Certificates */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Digital Certificates</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Issue and verify certificates upon course completion
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Upload custom certificate templates</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Auto-populate with user and course details</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Unique verification codes</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>Download and share certificates</div>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recruitment */}
            <TabsContent value="recruitment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recruitment Module</CardTitle>
                  <CardDescription>AI-powered hiring and candidate management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The recruitment module includes candidate pipeline management, AI-powered screening, 
                    voice and video interviews, and integrity checks.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Candidate Pipeline</h4>
                      <p className="text-sm text-muted-foreground">
                        Track candidates through stages: Applied → Screened → Interviewed → Offered
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">AI Interviews</h4>
                      <p className="text-sm text-muted-foreground">
                        Automated voice and video interviews with sentiment analysis
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin Guide */}
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Administrator Guide</CardTitle>
                  <CardDescription>Managing the platform as an administrator</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Accessing Admin Dashboard</h3>
                    <p className="text-muted-foreground mb-2">
                      Navigate to <code className="bg-muted px-2 py-1 rounded">/admin-dashboard</code>
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Managing Tenants</h3>
                    <ol className="space-y-3">
                      <li className="flex gap-3">
                        <span className="font-bold text-primary">1.</span>
                        <div>
                          <p className="font-medium">Select a Tenant</p>
                          <p className="text-sm text-muted-foreground">
                            Click on a tenant from the list to view their details
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-primary">2.</span>
                        <div>
                          <p className="font-medium">View Payment Status</p>
                          <p className="text-sm text-muted-foreground">
                            Check subscription tier and payment status (Trial/Active/Suspended)
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-primary">3.</span>
                        <div>
                          <p className="font-medium">Control Modules</p>
                          <p className="text-sm text-muted-foreground">
                            Toggle LMS, Gamification, AI Lecturers, and Certificates on or off
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-primary">4.</span>
                        <div>
                          <p className="font-medium">View Tenant Dashboard</p>
                          <p className="text-sm text-muted-foreground">
                            Click "View Dashboard" to see the tenant's perspective
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Payment-Based Module Control</h3>
                    <p className="text-muted-foreground mb-4">
                      If a tenant doesn't pay, you can:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-2" />
                        <div>Change payment status to "Suspended"</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-2" />
                        <div>Disable specific modules (e.g., turn off LMS)</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-2" />
                        <div>Downgrade subscription tier</div>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
