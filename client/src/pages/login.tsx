import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cpu, Lock, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      // Login via API - user lookup by email only (cross-tenant)
      const response = await axios.post("/api/auth/login", {
        username: username,
        password: password
      });
      
      const { token, user } = response.data;
      
      // Store auth token
      localStorage.setItem("ahc_auth_token", token);
      localStorage.setItem("ahc_user", JSON.stringify(user));
      
      // Redirect to dashboard
      setLocation("/hr-dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid email or password");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Keep demo bypass for development
    localStorage.setItem("ahc_auth_token", "demo_token");
    setLocation("/hr-dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Cpu className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your Avatar Human Capital workspace</p>
        </div>

        <Card className="border-border dark:border-white/10 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="admin"
                  data-testid="input-username" 
                  className="bg-black/20 border-border dark:border-white/10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button variant="link" className="p-0 h-auto text-xs text-primary">Forgot password?</Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-9 bg-black/20 border-border dark:border-white/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border dark:border-white/5 pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account? <span className="text-primary cursor-pointer hover:underline">Contact Sales</span>
            </div>
            
            {/* Demo Bypass */}
            <div className="w-full pt-4 border-t border-border dark:border-white/5">
              <p className="text-xs text-center text-muted-foreground mb-2">Dev Mode Options</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-border dark:border-white/10 hover:bg-white/5"
                onClick={handleDemoLogin}
              >
                Use Demo Credentials (Mock)
              </Button>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>System Status: Operational</span>
            <span className="mx-2">•</span>
            <span>v1.2.0 (Production)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}