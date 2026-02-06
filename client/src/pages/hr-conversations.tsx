import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, User, Bot, UserCheck, Search, Filter, Phone, 
  Clock, Send, RefreshCcw, AlertCircle, CheckCircle, Loader2,
  ArrowLeft, FileUp, CalendarClock, Mic, Eye, Briefcase, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

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

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface DocumentRequirement {
  id: string;
  candidateId: string;
  documentType: string;
  description?: string;
  referenceCode: string;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  dueDate?: string;
  createdAt: string;
}

const DOC_TYPE_OPTIONS = [
  { value: "id_document", label: "ID Document" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "police_clearance", label: "Police Clearance" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "bank_statement", label: "Bank Statement" },
];

export default function HRConversations() {
  const [conversations, setConversations] = useState<WhatsappConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<WhatsappConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<WhatsappConversation | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate>>({});
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<'all' | 'ai' | 'human' | 'unread'>('all');
  const [showQuickAction, setShowQuickAction] = useState<'document' | 'appointment' | null>(null);
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/whatsapp/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        
        // Fetch candidate details for linked conversations
        const candidateIds = Array.from(new Set(data.filter((c: WhatsappConversation) => c.candidateId).map((c: WhatsappConversation) => c.candidateId))) as string[];
        const candidateMap: Record<string, Candidate> = {};
        
        for (const id of candidateIds) {
          try {
            const candResponse = await fetch(`/api/candidates/${id}`);
            if (candResponse.ok) {
              const cand = await candResponse.json();
              candidateMap[id as string] = cand;
            }
          } catch (e) {
            console.error("Failed to fetch candidate:", id);
          }
        }
        
        setCandidates(candidateMap);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchMessages = async (conversationId: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchConversations();
      if (activeConversation) {
        fetchMessages(activeConversation.id, true);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchConversations, activeConversation]);

  useEffect(() => {
    let filtered = [...conversations];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.phone.includes(query) || 
        c.name?.toLowerCase().includes(query) ||
        c.lastMessagePreview?.toLowerCase().includes(query) ||
        (c.candidateId && candidates[c.candidateId]?.fullName.toLowerCase().includes(query))
      );
    }
    
    // Apply mode filter
    switch (filterMode) {
      case 'ai':
        filtered = filtered.filter(c => c.handoffMode === 'ai');
        break;
      case 'human':
        filtered = filtered.filter(c => c.handoffMode === 'human');
        break;
      case 'unread':
        filtered = filtered.filter(c => c.unreadCount > 0);
        break;
    }
    
    // Sort by last message time
    filtered.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
    
    setFilteredConversations(filtered);
  }, [conversations, searchQuery, filterMode, candidates]);

  const fetchDocumentRequirements = async (conversationId: string, candidateId?: string | null) => {
    try {
      // First try to get WhatsApp-specific document requests for the conversation
      const whatsappResponse = await fetch(`/api/whatsapp/conversations/${conversationId}`);
      if (whatsappResponse.ok) {
        const convData = await whatsappResponse.json();
        if (convData.documentRequests && convData.documentRequests.length > 0) {
          // Map WhatsApp document requests to the expected format
          const mappedRequests = convData.documentRequests.map((req: any) => ({
            id: req.id,
            candidateId: req.candidateId,
            documentType: req.documentType,
            description: req.description || req.documentName,
            referenceCode: req.referenceCode || 'N/A',
            status: req.status === 'requested' ? 'pending' : req.status,
            dueDate: req.dueDate,
            createdAt: req.createdAt,
          }));
          setDocumentRequirements(mappedRequests);
          return;
        }
      }
      
      // Fallback to candidate's integrity document requirements
      if (candidateId) {
        const response = await fetch(`/api/candidates/${candidateId}/document-requirements`);
        if (response.ok) {
          const data = await response.json();
          setDocumentRequirements(data);
          return;
        }
      }
      
      setDocumentRequirements([]);
    } catch (error) {
      console.error("Failed to fetch document requirements:", error);
      setDocumentRequirements([]);
    }
  };

  const handleSelectConversation = (conv: WhatsappConversation) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
    // Fetch document requirements for this conversation
    fetchDocumentRequirements(conv.id, conv.candidateId);
    // Mark as read
    fetch(`/api/whatsapp/conversations/${conv.id}/mark-read`, { method: "POST" });
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
        fetchConversations();
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
        fetchConversations();
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
        setShowQuickAction(null);
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
        setShowQuickAction(null);
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

  const getConversationName = (conv: WhatsappConversation) => {
    if (conv.candidateId && candidates[conv.candidateId]) {
      return candidates[conv.candidateId].fullName;
    }
    return conv.name || conv.phone;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const aiControlled = conversations.filter(c => c.handoffMode === 'ai').length;
  const humanControlled = conversations.filter(c => c.handoffMode === 'human').length;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hr-dashboard">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-500" />
              WhatsApp Conversations
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all candidate WhatsApp conversations
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchConversations} data-testid="button-refresh">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{conversations.length}</div>
            <p className="text-xs text-muted-foreground">Total Conversations</p>
          </CardContent>
        </Card>
        <Card className={totalUnread > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${totalUnread > 0 ? 'text-red-600' : ''}`}>
              {totalUnread}
            </div>
            <p className="text-xs text-muted-foreground">Unread Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{aiControlled}</div>
            <p className="text-xs text-muted-foreground">AI Controlled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{humanControlled}</div>
            <p className="text-xs text-muted-foreground">HR Controlled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
        {/* Conversations List */}
        <div className="col-span-4 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as any)} className="mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Unread {totalUnread > 0 && `(${totalUnread})`}
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
                  <TabsTrigger value="human" className="text-xs">HR</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          activeConversation?.id === conv.id ? 'bg-muted' : ''
                        }`}
                        data-testid={`conversation-${conv.id}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-sm truncate flex-1">
                            {getConversationName(conv)}
                          </div>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs ml-2">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Phone className="h-3 w-3" />
                          {conv.phone}
                        </div>
                        {conv.lastMessagePreview && (
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {conv.lastMessagePreview}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant={conv.handoffMode === 'human' ? 'default' : 'secondary'} className="text-xs">
                            {conv.handoffMode === 'human' ? (
                              <><UserCheck className="h-3 w-3 mr-1" /> HR</>
                            ) : (
                              <><Bot className="h-3 w-3 mr-1" /> AI</>
                            )}
                          </Badge>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No conversations found
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Conversation Detail */}
        <div className="col-span-8 flex flex-col">
          <Card className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">
                        {getConversationName(activeConversation)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {activeConversation.phone}
                        {activeConversation.candidateId && (
                          <Link href={`/candidates/${activeConversation.candidateId}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Profile
                            </Button>
                          </Link>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activeConversation.handoffMode === 'human' ? 'default' : 'secondary'}>
                        {activeConversation.handoffMode === 'human' ? (
                          <><UserCheck className="h-3 w-3 mr-1" /> HR Control</>
                        ) : (
                          <><Bot className="h-3 w-3 mr-1" /> AI Control</>
                        )}
                      </Badge>
                      {activeConversation.handoffMode === 'ai' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleTakeover}
                          data-testid="button-takeover"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Take Over
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={handleReleaseToAI}
                          data-testid="button-release"
                        >
                          <Bot className="h-4 w-4 mr-1" />
                          Release to AI
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Reference Codes Panel */}
                {documentRequirements.length > 0 && (
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileUp className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Active Document Requests</span>
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                        {documentRequirements.filter(r => r.status === 'pending').length} pending
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {documentRequirements.map((req) => (
                        <div 
                          key={req.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                            req.status === 'pending' 
                              ? 'bg-white border border-amber-200' 
                              : req.status === 'submitted'
                              ? 'bg-blue-50 border border-blue-200'
                              : req.status === 'verified'
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                              {req.referenceCode}
                            </code>
                            <span className="text-gray-700">
                              {req.description || DOC_TYPE_OPTIONS.find(d => d.value === req.documentType)?.label || req.documentType}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              req.status === 'pending' ? 'text-amber-600 border-amber-300' :
                              req.status === 'submitted' ? 'text-blue-600 border-blue-300' :
                              req.status === 'verified' ? 'text-green-600 border-green-300' :
                              'text-red-600 border-red-300'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  {/* Messages */}
                  {messagesLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
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
                                {format(new Date(msg.createdAt), 'MMM d, HH:mm')}
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
                      </div>
                    </ScrollArea>
                  )}

                  {/* Quick Actions & Input */}
                  <div className="border-t p-4 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowQuickAction(showQuickAction === 'document' ? null : 'document')}
                        data-testid="button-quick-document"
                      >
                        <FileUp className="h-4 w-4 mr-1" />
                        Request Doc
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowQuickAction(showQuickAction === 'appointment' ? null : 'appointment')}
                        data-testid="button-quick-appointment"
                      >
                        <CalendarClock className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchMessages(activeConversation.id)}
                        data-testid="button-refresh-messages"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    {showQuickAction === 'document' && (
                      <Card className="p-3">
                        <h5 className="text-sm font-medium mb-2">Request Document</h5>
                        <div className="grid grid-cols-3 gap-2">
                          {DOC_TYPE_OPTIONS.map((doc) => (
                            <Button
                              key={doc.value}
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickDocRequest(doc.value, doc.label)}
                              className="text-xs h-8"
                            >
                              {doc.label}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    )}

                    {showQuickAction === 'appointment' && (
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
                          >
                            <Briefcase className="h-3 w-3 mr-1" />
                            HR Meeting
                          </Button>
                        </div>
                      </Card>
                    )}

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
                        data-testid="button-send"
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
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
