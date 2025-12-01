import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Phone, MapPin, Briefcase, Calendar, Award, Languages, FileText, ShieldCheck, Mic, ChevronDown, Clock, MessageCircle, User, Bot, ArrowLeft, Download, ExternalLink, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Candidate, InterviewSession } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CandidateDetail() {
  const [, params] = useRoute("/candidates/:id");
  const [, setLocation] = useLocation();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (params?.id) {
      fetchCandidate(params.id);
      fetchInterviewSessions(params.id);
    }
  }, [params?.id]);

  const fetchCandidate = async (id: string) => {
    try {
      const response = await fetch(`/api/candidates/${id}`);
      if (!response.ok) throw new Error("Candidate not found");
      const data = await response.json();
      setCandidate(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load candidate details",
        variant: "destructive",
      });
      setLocation("/candidates-list");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewSessions = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/interview-sessions/candidate/${candidateId}`);
      if (response.ok) {
        const data = await response.json();
        setInterviewSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch interview sessions:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center text-muted-foreground">Loading candidate details...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center text-muted-foreground">Candidate not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/candidates-list">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-candidates">
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Button>
        </Link>
        
        <Link href={`/integrity-agent?candidateId=${candidate.id}`}>
          <Button variant="default" size="sm" data-testid="button-integrity-check">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Run Integrity Check
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl" data-testid="text-candidate-name">{candidate.fullName}</CardTitle>
                {candidate.role && (
                  <CardDescription className="text-lg mt-2" data-testid="text-candidate-role">
                    {candidate.role}
                  </CardDescription>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {candidate.match !== null && candidate.match > 0 && (
                  <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-match-score">
                    {candidate.match}% Match
                  </Badge>
                )}
                <Badge variant="outline" data-testid="badge-status">
                  {candidate.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {candidate.email && (
                <div className="flex items-center gap-2" data-testid="contact-email">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${candidate.email}`} className="text-sm hover:underline">
                    {candidate.email}
                  </a>
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-2" data-testid="contact-phone">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${candidate.phone}`} className="text-sm hover:underline">
                    {candidate.phone}
                  </a>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2" data-testid="contact-location">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{candidate.location}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {candidate.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Professional Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed" data-testid="text-summary">{candidate.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* CV / Resume */}
        {candidate.cvUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CV / Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Resume Document</p>
                    <p className="text-sm text-muted-foreground">
                      {candidate.cvUrl.split('/').pop() || 'Resume.pdf'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-cv">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>CV Preview - {candidate.fullName}</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-hidden rounded-lg border">
                        {candidate.cvUrl.endsWith('.pdf') ? (
                          <iframe
                            src={candidate.cvUrl}
                            className="w-full h-full min-h-[60vh]"
                            title="CV Preview"
                          />
                        ) : candidate.cvUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img 
                            src={candidate.cvUrl} 
                            alt="CV Preview" 
                            className="w-full h-auto object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">Preview not available</p>
                            <p className="text-sm text-muted-foreground mb-4">
                              This file type cannot be previewed in the browser.
                            </p>
                            <a 
                              href={candidate.cvUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button className="gap-2">
                                <ExternalLink className="h-4 w-4" />
                                Open in New Tab
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <a 
                    href={candidate.cvUrl} 
                    download 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-cv">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </a>
                  <a 
                    href={candidate.cvUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-open-cv">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills & Experience Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" data-testid={`badge-skill-${index}`}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.yearsOfExperience !== null && (
                <div className="flex items-center justify-between" data-testid="info-experience-years">
                  <span className="text-sm text-muted-foreground">Years of Experience</span>
                  <span className="font-medium">{candidate.yearsOfExperience} years</span>
                </div>
              )}
              {candidate.languages && candidate.languages.length > 0 && (
                <div data-testid="info-languages">
                  <span className="text-sm text-muted-foreground">Languages</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {candidate.languages.map((lang, index) => (
                      <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-language-${index}`}>
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {candidate.linkedinUrl && (
                <div data-testid="info-linkedin">
                  <span className="text-sm text-muted-foreground">LinkedIn</span>
                  <a 
                    href={candidate.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    View Profile
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Work Experience */}
        {candidate.experience && Array.isArray(candidate.experience) && candidate.experience.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {candidate.experience.map((exp: any, index: number) => (
                  <div key={index} data-testid={`experience-${index}`}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-lg" data-testid={`text-exp-title-${index}`}>{exp.title}</h4>
                        <p className="text-sm text-muted-foreground" data-testid={`text-exp-company-${index}`}>
                          {exp.company} {exp.location && `• ${exp.location}`}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-exp-duration-${index}`}>
                          <Calendar className="h-3 w-3" />
                          {exp.duration}
                        </p>
                      </div>
                      {exp.responsibilities && exp.responsibilities.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {exp.responsibilities.map((resp: string, respIndex: number) => (
                            <li key={respIndex} className="text-muted-foreground" data-testid={`text-exp-resp-${index}-${respIndex}`}>
                              {resp}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidate.education.map((edu: any, index: number) => (
                  <div key={index} data-testid={`education-${index}`}>
                    {index > 0 && <Separator className="my-4" />}
                    <div>
                      <h4 className="font-semibold" data-testid={`text-edu-degree-${index}`}>{edu.degree}</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-edu-institution-${index}`}>{edu.institution}</p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-edu-year-${index}`}>
                        {edu.year} {edu.location && `• ${edu.location}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {candidate.certifications && candidate.certifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                {candidate.certifications.map((cert, index) => (
                  <li key={index} className="text-sm" data-testid={`certification-${index}`}>{cert}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        {candidate.metadata && typeof candidate.metadata === 'object' && 'aiAnalysis' in candidate.metadata && (
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-ai-analysis">
                {(candidate.metadata as any).aiAnalysis}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Voice Interviews */}
        {interviewSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-purple-500" />
                Voice Interviews
              </CardTitle>
              <CardDescription>
                AI-powered voice interview sessions with transcripts and emotion analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interviewSessions.map((session) => (
                  <Collapsible
                    key={session.id}
                    open={expandedInterview === session.id}
                    onOpenChange={() => setExpandedInterview(expandedInterview === session.id ? null : session.id)}
                  >
                    <Card className="bg-muted/30 border-muted">
                      <CollapsibleTrigger asChild>
                        <div className="w-full cursor-pointer">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  session.status === 'completed' ? 'bg-green-500' :
                                  session.status === 'started' ? 'bg-yellow-500' :
                                  session.status === 'expired' ? 'bg-gray-500' :
                                  'bg-blue-500'
                                }`} />
                                <div>
                                  <p className="font-medium text-sm">
                                    {session.interviewType === 'voice' ? 'Voice Interview' : 'Video Interview'}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {session.createdAt && format(new Date(session.createdAt), 'MMM d, yyyy HH:mm')}
                                    {session.duration && (
                                      <span className="ml-2">
                                        Duration: {Math.floor(session.duration / 60)}m {session.duration % 60}s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  session.status === 'completed' ? 'default' :
                                  session.status === 'started' ? 'secondary' :
                                  'outline'
                                }>
                                  {session.status}
                                </Badge>
                                {session.overallScore && (
                                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                    Score: {session.overallScore}%
                                  </Badge>
                                )}
                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedInterview === session.id ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </CardHeader>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Separator className="mb-4" />
                          
                          {/* Emotion Analysis */}
                          {session.emotionAnalysis && (
                            <div className="mb-4 p-3 bg-background/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Emotion Analysis</p>
                              <div className="flex flex-wrap gap-2">
                                {typeof session.emotionAnalysis === 'object' && Object.entries(session.emotionAnalysis as Record<string, any>).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="text-xs">
                                    {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Feedback */}
                          {session.feedback && (
                            <div className="mb-4 p-3 bg-background/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-2">AI Feedback</p>
                              <p className="text-sm">{session.feedback}</p>
                            </div>
                          )}
                          
                          {/* Transcripts */}
                          {session.transcripts && Array.isArray(session.transcripts) && session.transcripts.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                Conversation Transcript
                              </p>
                              <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-3">
                                  {(session.transcripts as Array<{role: string; text: string; emotion?: string}>).map((msg, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      {msg.role !== 'user' && (
                                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                          <Bot className="h-3 w-3 text-purple-400" />
                                        </div>
                                      )}
                                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        msg.role === 'user'
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted'
                                      }`}>
                                        <p className="text-sm">{msg.text}</p>
                                        {msg.emotion && (
                                          <p className="text-xs opacity-70 mt-1">Emotion: {msg.emotion}</p>
                                        )}
                                      </div>
                                      {msg.role === 'user' && (
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                          <User className="h-3 w-3 text-primary" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}

                          {/* No transcript message */}
                          {(!session.transcripts || !Array.isArray(session.transcripts) || session.transcripts.length === 0) && session.status !== 'completed' && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {session.status === 'pending' ? 'Interview not yet started' :
                               session.status === 'started' ? 'Interview in progress...' :
                               'No transcript available'}
                            </p>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
