import { useEffect, useState, useRef, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Briefcase, Calendar, Award, Languages, FileText, ShieldCheck, Mic, ChevronDown, Clock, MessageCircle, User, Bot, ArrowLeft, Download, ExternalLink, Eye, Plus, CheckCircle, AlertCircle, FileCheck, Send, RefreshCcw, MessageSquare, UserCheck, Zap, CalendarClock, FileUp, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Candidate, InterviewSession, IntegrityDocumentRequirement, CandidateDocument } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DocumentRequirement {
  id: string;
  documentType: string;
  description: string;
  status: string;
  referenceCode: string;
  dueDate?: string;
  receivedAt?: string;
  remindersSent?: number;
}

interface CollectedDocument {
  id: string;
  documentType: string;
  fileName: string;
  status: string;
  referenceCode: string;
  collectedVia: string;
  createdAt?: string;
}

interface WhatsappConversation {
  id: string;
  candidateId: string | null;
  phone: string;
  name: string;
  status: string;
  type: string;
  handoffMode: 'ai' | 'human';
  handoffAt?: string;
  handoffBy?: string;
  assignedTo?: string;
  unreadCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
}

interface WhatsappMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  senderType: 'candidate' | 'ai' | 'human' | 'system';
  messageType: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  status: string;
  createdAt: string;
}

const DOC_TYPE_OPTIONS = [
  { value: "id_document", label: "ID Document" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "police_clearance", label: "Police Clearance" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "qualification_certificate", label: "Qualification Certificate" },
  { value: "reference_letter", label: "Reference Letter" },
  { value: "work_permit", label: "Work Permit" },
  { value: "cv_resume", label: "CV/Resume" },
  { value: "payslip", label: "Payslip" },
  { value: "tax_certificate", label: "Tax Certificate" },
  { value: "medical_certificate", label: "Medical Certificate" },
];

function getDocTypeLabel(docType: string): string {
  const option = DOC_TYPE_OPTIONS.find(o => o.value === docType);
  return option?.label || docType;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'requested':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Requested</Badge>;
    case 'received':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Received</Badge>;
    case 'verified':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    case 'expired':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function CandidateDetail() {
  const [, params] = useRoute("/candidates/:id");
  const [, setLocation] = useLocation();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const [collectedDocuments, setCollectedDocuments] = useState<CollectedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  const [newDocType, setNewDocType] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocDueDate, setNewDocDueDate] = useState("");
  const { toast } = useToast();

  // Conversation panel state
  const [conversations, setConversations] = useState<WhatsappConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<WhatsappConversation | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'document' | 'appointment' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchCandidate(params.id);
      fetchInterviewSessions(params.id);
      fetchDocumentRequirements(params.id);
      fetchCollectedDocuments(params.id);
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

  const fetchDocumentRequirements = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/integrity-document-requirements?candidateId=${candidateId}`);
      if (response.ok) {
        const data = await response.json();
        setDocumentRequirements(data);
      }
    } catch (error) {
      console.error("Failed to fetch document requirements:", error);
    }
  };

  const fetchCollectedDocuments = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/candidate-documents?candidateId=${candidateId}`);
      if (response.ok) {
        const data = await response.json();
        setCollectedDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch collected documents:", error);
    }
  };

  // Conversation functions
  const fetchConversations = useCallback(async (candidateId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/candidates/${candidateId}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        // Auto-select first conversation if none selected
        if (data.length > 0 && !activeConversation) {
          setActiveConversation(data[0]);
          fetchMessages(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, [activeConversation]);

  const fetchMessages = async (conversationId: string, silent = false) => {
    if (!silent) setConversationLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        // Scroll to bottom on new messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      if (!silent) setConversationLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: messageInput,
          senderType: "human",
        }),
      });
      
      if (response.ok) {
        setMessageInput("");
        fetchMessages(activeConversation.id, true);
        toast({
          title: "Message Sent",
          description: "Your message has been sent",
        });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTakeover = async () => {
    if (!activeConversation) return;
    
    try {
      const response = await fetch(`/api/whatsapp/conversations/${activeConversation.id}/takeover`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveConversation(data.conversation);
        if (params?.id) fetchConversations(params.id);
        toast({
          title: "Takeover Successful",
          description: "You are now controlling this conversation. AI will not auto-respond.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to take over conversation",
        variant: "destructive",
      });
    }
  };

  const handleReleaseToAI = async () => {
    if (!activeConversation) return;
    
    try {
      const response = await fetch(`/api/whatsapp/conversations/${activeConversation.id}/release`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveConversation(data.conversation);
        if (params?.id) fetchConversations(params.id);
        toast({
          title: "Released to AI",
          description: "AI will now handle this conversation automatically.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to release conversation",
        variant: "destructive",
      });
    }
  };

  const handleQuickDocRequest = async (docType: string, description: string) => {
    if (!activeConversation) return;
    
    try {
      const response = await fetch(`/api/whatsapp/conversations/${activeConversation.id}/document-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: docType,
          documentName: description,
          description,
        }),
      });
      
      if (response.ok) {
        setQuickActionType(null);
        setShowQuickActions(false);
        fetchMessages(activeConversation.id, true);
        toast({
          title: "Document Request Sent",
          description: `Requested ${description} from candidate`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send document request",
        variant: "destructive",
      });
    }
  };

  const handleQuickAppointment = async (appointmentType: string, title: string, scheduledAt: string) => {
    if (!activeConversation) return;
    
    try {
      const response = await fetch(`/api/whatsapp/conversations/${activeConversation.id}/appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentType,
          title,
          scheduledAt,
          duration: 30,
        }),
      });
      
      if (response.ok) {
        setQuickActionType(null);
        setShowQuickActions(false);
        fetchMessages(activeConversation.id, true);
        toast({
          title: "Appointment Scheduled",
          description: `${title} scheduled successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule appointment",
        variant: "destructive",
      });
    }
  };

  // Polling for real-time updates
  useEffect(() => {
    if (showConversationPanel && activeConversation) {
      // Start polling
      pollingRef.current = setInterval(() => {
        fetchMessages(activeConversation.id, true);
      }, 5000); // Poll every 5 seconds
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [showConversationPanel, activeConversation?.id]);

  // Fetch conversations when panel opens
  useEffect(() => {
    if (showConversationPanel && params?.id) {
      fetchConversations(params.id);
    }
  }, [showConversationPanel, params?.id, fetchConversations]);

  const handleAddDocumentRequirement = async () => {
    if (!newDocType || !params?.id) return;
    
    try {
      const response = await fetch("/api/integrity-document-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: params.id,
          documentType: newDocType,
          description: newDocDescription || getDocTypeLabel(newDocType),
          dueDate: newDocDueDate || undefined,
          reminderEnabled: 1,
          reminderIntervalHours: 24,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Document requirement added successfully",
        });
        setShowAddDocDialog(false);
        setNewDocType("");
        setNewDocDescription("");
        setNewDocDueDate("");
        fetchDocumentRequirements(params.id);
      } else {
        throw new Error("Failed to add requirement");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add document requirement",
        variant: "destructive",
      });
    }
  };

  const handleSendReminder = async (requirementId: string) => {
    if (!params?.id) return;
    
    try {
      const response = await fetch(`/api/integrity-document-requirements/${requirementId}/remind`, {
        method: "POST",
      });
      
      if (response.ok) {
        toast({
          title: "Reminder Sent",
          description: "Reminder has been sent to the candidate via WhatsApp",
        });
        fetchDocumentRequirements(params.id);
      } else {
        throw new Error("Failed to send reminder");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  const handleVerifyDocument = async (documentId: string, verified: boolean) => {
    if (!params?.id) return;
    
    try {
      const response = await fetch(`/api/candidate-documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verified ? "verified" : "rejected",
          verifiedAt: verified ? new Date().toISOString() : undefined,
        }),
      });
      
      if (response.ok) {
        toast({
          title: verified ? "Document Verified" : "Document Rejected",
          description: verified 
            ? "The document has been verified successfully" 
            : "The document has been marked as rejected",
        });
        fetchCollectedDocuments(params.id);
      } else {
        throw new Error("Failed to update document");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive",
      });
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
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowConversationPanel(true)}
            data-testid="button-open-conversation"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp Chat
            {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
              </Badge>
            )}
          </Button>
          <Link href={`/integrity-agent?candidateId=${candidate.id}`}>
            <Button variant="default" size="sm" data-testid="button-integrity-check">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Run Integrity Check
            </Button>
          </Link>
        </div>
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
                <Mic className="h-5 w-5 text-blue-500" />
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
                                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
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
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                          <Bot className="h-3 w-3 text-blue-600 dark:text-blue-400" />
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

        {/* Document Tracking Section */}
        <Card data-testid="card-document-tracking">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-500" />
                  Document Tracking
                </CardTitle>
                <CardDescription>
                  Required documents and collected submissions for integrity verification
                </CardDescription>
              </div>
              <Dialog open={showAddDocDialog} onOpenChange={setShowAddDocDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-doc-requirement">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Document Requirement</DialogTitle>
                    <DialogDescription>
                      Request a document from the candidate. They will be notified via WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Document Type</label>
                      <Select value={newDocType} onValueChange={setNewDocType}>
                        <SelectTrigger data-testid="select-doc-type">
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                      <Input
                        placeholder="Additional details about the document"
                        value={newDocDescription}
                        onChange={(e) => setNewDocDescription(e.target.value)}
                        data-testid="input-doc-description"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Due Date (Optional)</label>
                      <Input
                        type="date"
                        value={newDocDueDate}
                        onChange={(e) => setNewDocDueDate(e.target.value)}
                        data-testid="input-doc-due-date"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDocDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDocumentRequirement} disabled={!newDocType} data-testid="button-submit-doc-requirement">
                      Add Requirement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Pending Requirements */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Pending Requirements ({documentRequirements.filter(r => r.status === 'pending' || r.status === 'requested').length})
                </h4>
                {documentRequirements.filter(r => r.status === 'pending' || r.status === 'requested').length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Reminders</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentRequirements
                        .filter(r => r.status === 'pending' || r.status === 'requested')
                        .map((req) => (
                          <TableRow key={req.id} data-testid={`row-requirement-${req.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{getDocTypeLabel(req.documentType)}</p>
                                {req.description && req.description !== getDocTypeLabel(req.documentType) && (
                                  <p className="text-xs text-muted-foreground">{req.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">{req.referenceCode}</code>
                            </TableCell>
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                            <TableCell>
                              {req.dueDate ? format(new Date(req.dueDate), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {req.remindersSent || 0} sent
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(req.id)}
                                data-testid={`button-remind-${req.id}`}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Remind
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending document requirements
                  </p>
                )}
              </div>

              <Separator />

              {/* Collected Documents */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Collected Documents ({collectedDocuments.length})
                </h4>
                {collectedDocuments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collectedDocuments.map((doc) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{getDocTypeLabel(doc.documentType)}</p>
                              <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{doc.referenceCode}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {doc.collectedVia === 'whatsapp' ? '📱 WhatsApp' : 
                               doc.collectedVia === 'upload' ? '📤 Upload' : 
                               doc.collectedVia}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>
                            {doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/candidate-documents/${doc.id}/download`);
                                    if (!response.ok) {
                                      const error = await response.json();
                                      throw new Error(error.message || "Download failed");
                                    }
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = doc.fileName;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                    toast({ title: "Success", description: "Document downloaded" });
                                  } catch (error: any) {
                                    toast({ title: "Error", description: error.message || "Failed to download", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              {doc.status === 'received' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => handleVerifyDocument(doc.id, true)}
                                    data-testid={`button-verify-${doc.id}`}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600"
                                    onClick={() => handleVerifyDocument(doc.id, false)}
                                    data-testid={`button-reject-${doc.id}`}
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents collected yet
                  </p>
                )}
              </div>

              {/* Completed Requirements */}
              {documentRequirements.filter(r => r.status === 'received' || r.status === 'verified').length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      Completed Requirements ({documentRequirements.filter(r => r.status === 'received' || r.status === 'verified').length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {documentRequirements
                        .filter(r => r.status === 'received' || r.status === 'verified')
                        .map((req) => (
                          <Badge
                            key={req.id}
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                            data-testid={`badge-completed-${req.id}`}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {getDocTypeLabel(req.documentType)}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Conversation Panel */}
      <Dialog open={showConversationPanel} onOpenChange={setShowConversationPanel}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0" data-testid="dialog-conversation">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                WhatsApp Conversations - {candidate.fullName}
              </DialogTitle>
              {activeConversation && (
                <div className="flex items-center gap-2">
                  {activeConversation.handoffMode === 'ai' ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleTakeover}
                      className="gap-2"
                      data-testid="button-takeover"
                    >
                      <UserCheck className="h-4 w-4" />
                      Take Over
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleReleaseToAI}
                      className="gap-2"
                      data-testid="button-release"
                    >
                      <Bot className="h-4 w-4" />
                      Release to AI
                    </Button>
                  )}
                </div>
              )}
            </div>
            {activeConversation && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={activeConversation.handoffMode === 'human' ? 'default' : 'secondary'}>
                  {activeConversation.handoffMode === 'human' ? (
                    <><UserCheck className="h-3 w-3 mr-1" /> HR Control</>
                  ) : (
                    <><Bot className="h-3 w-3 mr-1" /> AI Control</>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activeConversation.phone}
                </span>
              </div>
            )}
          </DialogHeader>

          {/* Reference Codes Panel */}
          {documentRequirements.filter(r => r.status === 'pending' || r.status === 'requested').length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <FileUp className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Active Document Requests</span>
                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                  {documentRequirements.filter(r => r.status === 'pending' || r.status === 'requested').length} pending
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {documentRequirements
                  .filter(r => r.status === 'pending' || r.status === 'requested')
                  .map((req) => (
                    <div 
                      key={req.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-sm bg-white border border-amber-200"
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {req.referenceCode}
                        </code>
                        <span className="text-gray-700 text-xs">
                          {getDocTypeLabel(req.documentType)}
                        </span>
                      </div>
                      {req.dueDate && (
                        <span className="text-xs text-amber-600">
                          Due: {format(new Date(req.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            {/* Conversations List */}
            {conversations.length > 1 && (
              <div className="w-64 border-r overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv);
                      fetchMessages(conv.id);
                    }}
                    className={`w-full p-3 text-left border-b hover:bg-muted/50 transition-colors ${
                      activeConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                    data-testid={`button-conversation-${conv.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm truncate">{conv.phone}</div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.lastMessagePreview && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conv.lastMessagePreview}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs h-5">
                        {conv.handoffMode === 'human' ? 'HR' : 'AI'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {conversationLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length > 0 ? (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        {msg.direction === 'inbound' && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.direction === 'outbound'
                            ? msg.senderType === 'ai' 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'bg-blue-100 text-blue-900'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {msg.senderType === 'ai' && msg.direction === 'outbound' && (
                            <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                              <Bot className="h-3 w-3" /> AI
                            </div>
                          )}
                          {msg.senderType === 'human' && msg.direction === 'outbound' && (
                            <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> HR
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          {msg.mediaUrl && (
                            <div className="mt-2">
                              {msg.mediaType?.startsWith('image') ? (
                                <img 
                                  src={msg.mediaUrl} 
                                  alt="Attachment" 
                                  className="max-w-full rounded"
                                />
                              ) : (
                                <a 
                                  href={msg.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs underline"
                                >
                                  View Attachment
                                </a>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </p>
                        </div>
                        {msg.direction === 'outbound' && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.senderType === 'ai' ? 'bg-blue-200' : 'bg-blue-200'
                          }`}>
                            {msg.senderType === 'ai' ? (
                              <Bot className="h-4 w-4 text-blue-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              ) : activeConversation ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  No messages yet
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  {conversations.length === 0 
                    ? "No WhatsApp conversations with this candidate" 
                    : "Select a conversation to view messages"}
                </div>
              )}

              {/* Quick Actions & Message Input */}
              {activeConversation && (
                <div className="border-t p-4 space-y-3">
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuickActionType(quickActionType === 'document' ? null : 'document')}
                      className="gap-1"
                      data-testid="button-quick-document"
                    >
                      <FileUp className="h-4 w-4" />
                      Request Doc
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuickActionType(quickActionType === 'appointment' ? null : 'appointment')}
                      className="gap-1"
                      data-testid="button-quick-appointment"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => activeConversation && fetchMessages(activeConversation.id)}
                      data-testid="button-refresh-messages"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick Action Panels */}
                  {quickActionType === 'document' && (
                    <Card className="p-3">
                      <h5 className="text-sm font-medium mb-2">Request Document</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {DOC_TYPE_OPTIONS.slice(0, 6).map((doc) => (
                          <Button
                            key={doc.value}
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickDocRequest(doc.value, doc.label)}
                            className="text-xs h-8"
                            data-testid={`button-request-${doc.value}`}
                          >
                            {doc.label}
                          </Button>
                        ))}
                      </div>
                    </Card>
                  )}

                  {quickActionType === 'appointment' && (
                    <Card className="p-3">
                      <h5 className="text-sm font-medium mb-2">Schedule Appointment</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(10, 0, 0, 0);
                            handleQuickAppointment('voice_interview', 'Voice Interview', tomorrow.toISOString());
                          }}
                          className="text-xs h-8"
                          data-testid="button-schedule-voice"
                        >
                          <Mic className="h-3 w-3 mr-1" />
                          Voice Interview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(14, 0, 0, 0);
                            handleQuickAppointment('video_interview', 'Video Interview', tomorrow.toISOString());
                          }}
                          className="text-xs h-8"
                          data-testid="button-schedule-video"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Video Interview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const nextWeek = new Date();
                            nextWeek.setDate(nextWeek.getDate() + 7);
                            nextWeek.setHours(9, 0, 0, 0);
                            handleQuickAppointment('onboarding', 'Onboarding Session', nextWeek.toISOString());
                          }}
                          className="text-xs h-8"
                          data-testid="button-schedule-onboarding"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Onboarding
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const dayAfter = new Date();
                            dayAfter.setDate(dayAfter.getDate() + 2);
                            dayAfter.setHours(11, 0, 0, 0);
                            handleQuickAppointment('hr_meeting', 'HR Meeting', dayAfter.toISOString());
                          }}
                          className="text-xs h-8"
                          data-testid="button-schedule-hr"
                        >
                          <Briefcase className="h-3 w-3 mr-1" />
                          HR Meeting
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={activeConversation.handoffMode === 'human' 
                        ? "Type your message..." 
                        : "Take over to send messages manually..."}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={activeConversation.handoffMode !== 'human'}
                      className="flex-1 min-h-[44px] max-h-32 resize-none"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendingMessage || activeConversation.handoffMode !== 'human'}
                      className="self-end"
                      data-testid="button-send-message"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {activeConversation.handoffMode !== 'human' && (
                    <p className="text-xs text-muted-foreground text-center">
                      Click "Take Over" to send messages manually. AI is currently managing this conversation.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
