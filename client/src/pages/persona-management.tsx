import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, User, Sparkles, MessageSquare, Copy } from "lucide-react";
import { tavusService } from "@/lib/api";
import { toast } from "sonner";

export default function PersonaManagement() {
  const [personaName, setPersonaName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [context, setContext] = useState("");
  const [replicaId, setReplicaId] = useState("r9d30b0e55ac");
  const [createdPersona, setCreatedPersona] = useState<{ personaId: string; personaName: string; createdAt: string } | null>(null);

  const createPersonaMutation = useMutation({
    mutationFn: async () => {
      if (!systemPrompt.trim()) {
        throw new Error("System prompt is required");
      }
      return await tavusService.createPersona({
        personaName: personaName.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        context: context.trim() || undefined,
        replicaId: replicaId.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success("Persona created successfully!");
      setCreatedPersona(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create persona");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPersonaMutation.mutate();
  };

  const handleCopyPersonaId = () => {
    if (createdPersona) {
      navigator.clipboard.writeText(createdPersona.personaId);
      toast.success("Persona ID copied to clipboard!");
    }
  };

  const loadJaneSmithTemplate = () => {
    setPersonaName("Jane Smith - HR Interviewer");
    setSystemPrompt(`You are Jane Smith, a seasoned Principal at a top-tier global consulting firm with multiple years of experience. You're conducting a first-round case interview for entry-level consultant candidates. You are professional yet approachable, aiming to assess both communication skills and basic problem-solving abilities.

Your job is to assess the candidate through a structured but conversational case interview about SodaPop, a leading beverage company considering launching "Light Bolt," a low-sugar, electrolyte-focused sports drink.

You'll guide the candidate through a high-level analysis of market positioning, profitability, and strategies to capture market share. As this is a first-round interview, you're more interested in communication skills and thought process than technical depth.

Structure the conversation like a real human interviewer would: Begin with a friendly introduction about yourself and the firm. Ask a few background questions to learn about the candidate. Explain the interview format clearly. Present the case study scenario in a conversational manner. Ask broad questions that assess basic structured thinking. Respond thoughtfully to the candidate's answers. Provide guidance when the candidate seems stuck. Ask follow-up questions to better understand their reasoning.

Your responses will be spoken aloud, so: Speak naturally as an experienced interviewer would. Avoid any formatting, bullet points, or stage directions. Use a conversational tone with appropriate pauses. Never refer to yourself as an AI, assistant, or language model.

Pay attention to the flow of the interview. This first-round interview should be more supportive than challenging, helping the candidate showcase their potential while gathering information about their fit for the firm.`);
    setContext(`You are Jane Smith, a Principal at Morrison & Blackwell, one of the world's premier management consulting firms. You're conducting a first-round case interview for an entry-level consultant position at your firm's New York office.

Today's case study involves SodaPop Inc., a major beverage company that dominates the carbonated drinks market but wants to expand into the growing sports drink category with a new product called "Light Bolt." This low-sugar, electrolyte-focused sports drink would compete against established brands like Gatorade and Powerade.

This is an initial screening interview to assess the candidate's potential fit for the firm. Financial information: Market size $15B, growth 8% annually, dev costs $2.5M, unit cost $0.35, retail $2.49, marketing $10M Y1, target 12% share. Customer segments: fitness 35%, athletes 25%, health-conscious 20%, youth 15%, others 5%.`);
    toast.success("Template loaded! You can modify and save.");
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <BackButton />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Persona Management</h1>
            <p className="text-gray-400">Create custom AI personas for Tavus video interviews</p>
          </div>
        </div>

        {createdPersona && (
          <Alert className="mb-6 border-green-500/30 bg-green-500/10" data-testid="alert-persona-created">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Persona Created Successfully!</strong>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm">Persona ID:</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {createdPersona.personaId}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCopyPersonaId}
                      data-testid="button-copy-persona-id"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs mt-2">
                    Update your TAVUS_PERSONA_ID secret with this ID to use it in interviews.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5" />
                Create New Persona
              </CardTitle>
              <CardDescription className="text-gray-400">
                Define the personality, behavior, and context for your AI interviewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  onClick={loadJaneSmithTemplate}
                  data-testid="button-load-template"
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Load Jane Smith Template (Consulting Interviewer)
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="personaName" className="text-white">
                    Persona Name <span className="text-gray-500 text-sm">(optional)</span>
                  </Label>
                  <Input
                    id="personaName"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="e.g., Jane Smith - HR Interviewer"
                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                    data-testid="input-persona-name"
                  />
                  <p className="text-xs text-gray-500">A friendly name to identify this persona</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replicaId" className="text-white">
                    Replica ID <span className="text-gray-500 text-sm">(optional)</span>
                  </Label>
                  <Input
                    id="replicaId"
                    value={replicaId}
                    onChange={(e) => setReplicaId(e.target.value)}
                    placeholder="e.g., r9d30b0e55ac"
                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                    data-testid="input-replica-id"
                  />
                  <p className="text-xs text-gray-500">The default replica to use with this persona</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemPrompt" className="text-white">
                    System Prompt <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are an experienced HR interviewer who..."
                    className="min-h-[300px] font-mono text-sm bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                    required
                    data-testid="input-system-prompt"
                  />
                  <p className="text-xs text-gray-500">
                    Define the persona's role, personality, and interview approach. This guides all conversations.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context" className="text-white">
                    Context <span className="text-gray-500 text-sm">(optional)</span>
                  </Label>
                  <Textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Additional background information, case study details, or specific scenarios..."
                    className="min-h-[200px] font-mono text-sm bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                    data-testid="input-context"
                  />
                  <p className="text-xs text-gray-500">
                    Additional context like case study details, company background, or specific scenarios. Keep under 500 characters for best performance.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={createPersonaMutation.isPending || !systemPrompt.trim()}
                  className="w-full"
                  data-testid="button-create-persona"
                >
                  {createPersonaMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Persona...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create Persona
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-2">
              <ol className="list-decimal list-inside space-y-2">
                <li>Create a persona using the form above or load the Jane Smith template</li>
                <li>Copy the generated Persona ID from the success message</li>
                <li>Update your <code className="bg-black/40 px-1 py-0.5 rounded text-primary">TAVUS_PERSONA_ID</code> secret in the Replit Secrets tab</li>
                <li>All new video interviews will use this persona automatically</li>
              </ol>
              <p className="mt-4 text-xs text-gray-400">
                <strong>Tip:</strong> The system prompt defines how the AI behaves, while context provides specific information about the interview scenario.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
