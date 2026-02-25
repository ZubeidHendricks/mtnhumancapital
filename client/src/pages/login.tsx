import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

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
      const response = await axios.post("/api/auth/login", {
        username: username,
        password: password
      });
      
      const { token, user } = response.data;
      
      localStorage.setItem("ahc_auth_token", token);
      localStorage.setItem("ahc_user", JSON.stringify(user));
      
      setLocation("/hr-dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid email or password");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem("ahc_auth_token", "demo_token");
    setLocation("/hr-dashboard");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <img 
            src="/logos/mtn-new-logo.svg" 
            alt="MTN" 
            className="h-20 w-auto object-contain mx-auto mb-6"
            data-testid="img-login-logo"
          />
          <h1 className="text-3xl font-bold tracking-tight text-black">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your MTN - Human Capital workspace</p>
        </div>

        <Card className="border-gray-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Authentication</CardTitle>
            <CardDescription className="text-gray-500">Enter your credentials to access the platform</CardDescription>
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
                <Label htmlFor="username" className="text-black">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="admin"
                  data-testid="input-username" 
                  className="bg-white border-gray-300 text-black"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-black">Password</Label>
                  <Button variant="link" className="p-0 h-auto text-xs text-black">Forgot password?</Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-9 bg-white border-gray-300 text-black"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
                data-testid="button-sign-in"
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
          <CardFooter className="flex flex-col gap-4 border-t border-gray-200 pt-6">
            <div className="text-center text-sm text-gray-500">
              Don't have an account? <span className="text-black cursor-pointer hover:underline font-medium">Contact Sales</span>
            </div>
            
            <div className="w-full pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-400 mb-2">Dev Mode Options</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-gray-300 text-black hover:bg-gray-50"
                onClick={handleDemoLogin}
                data-testid="button-demo-login"
              >
                Use Demo Credentials (Mock)
              </Button>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
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
