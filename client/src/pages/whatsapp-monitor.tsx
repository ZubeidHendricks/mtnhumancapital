import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { PopupModal, useCalendlyEventListener } from "react-calendly";
import { Navbar } from "@/components/layout/navbar";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageCircle,
  Search,
  Phone,
  FileText,
  Calendar,
  Send,
  MoreVertical,
  User,
  ExternalLink,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Paperclip,
  PhoneCall,
  Video,
  UserCheck,
  Loader2,
  Filter,
  ArrowUpRight,
  FileUp,
  CalendarPlus,
  Link2,
  CalendarCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface WhatsappConversation {
  id: string;
  tenantId: string;
  waId: string;
  phone: string;
  profileName?: string;
  candidateId?: string;
  type: string;
  subject?: string;
  status: string;
  unreadCount: number;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  priority?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WhatsappMessage {
  id: string;
  conversationId: string;
  whatsappMessageId?: string;
  direction: string;
  senderType: string;
  senderId?: string;
  messageType: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
  status: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

interface DocumentRequest {
  id: string;
  conversationId: string;
  documentType: string;
  documentName: string;
  description?: string;
  status: string;
  dueDate?: Date;
  receivedAt?: Date;
  notes?: string;
  createdAt: Date;
}

interface Appointment {
  id: string;
  conversationId: string;
  appointmentType: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number;
  location?: string;
  status: string;
  candidateResponse?: string;
  confirmedAt?: Date;
  notes?: string;
  createdAt: Date;
}

interface Candidate {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
  status?: string;
  skills?: string[];
}

interface ConversationDetail {
  conversation: WhatsappConversation;
  messages: WhatsappMessage[];
  documentRequests: DocumentRequest[];
  appointments: Appointment[];
  candidate?: Candidate;
}

export default function WhatsAppMonitor() {
  const queryClient = useQueryClient();
  const searchParams = useSearch();
  const [, navigate] = useLocation();
  const urlParams = new URLSearchParams(searchParams);
  const conversationIdFromUrl = urlParams.get('conversationId');
  
  const conversationsKey = useTenantQueryKey(['whatsapp', 'conversations']);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdFromUrl);
  const conversationDetailKey = useTenantQueryKey(['whatsapp', 'conversation', selectedConversationId || 'none']);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl]);

  const [isDocRequestOpen, setIsDocRequestOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [isLinkCandidateOpen, setIsLinkCandidateOpen] = useState(false);
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);

  const [docType, setDocType] = useState("");
  const [docName, setDocName] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docDueDate, setDocDueDate] = useState("");

  const [aptType, setAptType] = useState("");
  const [aptTitle, setAptTitle] = useState("");
  const [aptDescription, setAptDescription] = useState("");
  const [aptScheduledAt, setAptScheduledAt] = useState("");
  const [aptDuration, setAptDuration] = useState("60");
  const [aptLocation, setAptLocation] = useState("");

  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const { data: whatsappStatus } = useQuery({
    queryKey: useTenantQueryKey(['whatsapp', 'status']),
    queryFn: async () => {
      const response = await api.get('/whatsapp/status');
      return response.data;
    },
  });

  const { data: calendlyConfig } = useQuery({
    queryKey: useTenantQueryKey(['calendly', 'config']),
    queryFn: async () => {
      const response = await api.get('/calendly/config');
      return response.data;
    },
  });

  useCalendlyEventListener({
    onEventScheduled: async (e) => {
      if (!isCalendlyOpen) {
        return;
      }
      
      if (selectedConversationId && conversationDetail?.conversation) {
        try {
          const eventData = e.data?.payload;
          
          const inviteeEmail = eventData?.invitee?.email?.toLowerCase();
          const candidateEmail = conversationDetail?.candidate?.email?.toLowerCase();
          const profileName = conversationDetail?.conversation?.profileName?.toLowerCase();
          const inviteeName = eventData?.invitee?.name?.toLowerCase();
          
          const emailMatches = inviteeEmail && candidateEmail && inviteeEmail === candidateEmail;
          const nameMatches = inviteeName && profileName && inviteeName.includes(profileName);
          
          if (!emailMatches && !nameMatches) {
            console.log("Calendly event does not match current conversation, skipping");
            setIsCalendlyOpen(false);
            return;
          }
          
          const scheduledTime = eventData?.event?.start_time 
            ? new Date(eventData.event.start_time).toLocaleString('en-ZA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'scheduled time';
          
          await api.post(`/whatsapp/conversations/${selectedConversationId}/messages`, {
            body: `Great news! Your appointment has been confirmed via Calendly for ${scheduledTime}. You'll receive a calendar invite with the meeting details shortly.`,
            senderType: 'ai'
          });
          
          await api.post(`/whatsapp/conversations/${selectedConversationId}/appointment`, {
            appointmentType: 'interview',
            title: eventData?.event?.name || 'Calendly Meeting',
            scheduledAt: eventData?.event?.start_time || new Date().toISOString(),
            duration: 30,
            location: 'Calendly Link',
            description: `Booked via Calendly by ${eventData?.invitee?.name || 'candidate'}`
          });

          queryClient.invalidateQueries({ queryKey: conversationDetailKey });
          queryClient.invalidateQueries({ queryKey: conversationsKey });
          toast.success("Calendly meeting scheduled and notification sent!");
        } catch (error) {
          console.error("Error processing Calendly event:", error);
          toast.error("Meeting scheduled but failed to notify candidate");
        }
      }
      setIsCalendlyOpen(false);
    }
  });

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<WhatsappConversation[]>({
    queryKey: conversationsKey,
    queryFn: async () => {
      const response = await api.get('/whatsapp/conversations');
      return response.data;
    },
    refetchInterval: 10000,
  });

  const { data: conversationDetail, isLoading: isLoadingDetail } = useQuery<ConversationDetail>({
    queryKey: conversationDetailKey,
    queryFn: async () => {
      const response = await api.get(`/whatsapp/conversations/${selectedConversationId}`);
      return response.data;
    },
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  const { data: allCandidates = [] } = useQuery<Candidate[]>({
    queryKey: useTenantQueryKey(['candidates']),
    queryFn: async () => {
      const response = await api.get('/candidates');
      return response.data;
    },
  });

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationDetail?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await api.post(`/whatsapp/conversations/${selectedConversationId}/messages`, { body, senderType: 'human' });
      return response.data;
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: conversationDetailKey });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const documentRequestMutation = useMutation({
    mutationFn: async (data: { documentType: string; documentName: string; description?: string; dueDate?: string }) => {
      const response = await api.post(`/whatsapp/conversations/${selectedConversationId}/document-request`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Document request sent");
      setIsDocRequestOpen(false);
      setDocType("");
      setDocName("");
      setDocDescription("");
      setDocDueDate("");
      queryClient.invalidateQueries({ queryKey: conversationDetailKey });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      toast.error("Failed to send document request");
    },
  });

  const appointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/whatsapp/conversations/${selectedConversationId}/appointment`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Appointment scheduled");
      setIsAppointmentOpen(false);
      setAptType("");
      setAptTitle("");
      setAptDescription("");
      setAptScheduledAt("");
      setAptDuration("60");
      setAptLocation("");
      queryClient.invalidateQueries({ queryKey: conversationDetailKey });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      toast.error("Failed to schedule appointment");
    },
  });

  const linkCandidateMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const response = await api.post(`/whatsapp/conversations/${selectedConversationId}/link-candidate`, { candidateId });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Candidate linked successfully");
      setIsLinkCandidateOpen(false);
      setSelectedCandidateId("");
      queryClient.invalidateQueries({ queryKey: conversationDetailKey });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      toast.error("Failed to link candidate");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await api.post(`/whatsapp/conversations/${conversationId}/mark-read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });

  const handleSelectConversation = (conversation: WhatsappConversation) => {
    setSelectedConversationId(conversation.id);
    if (conversation.unreadCount > 0) {
      markReadMutation.mutate(conversation.id);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync(messageInput.trim());
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDocumentRequest = () => {
    if (!docType || !docName) {
      toast.error("Document type and name are required");
      return;
    }
    documentRequestMutation.mutate({
      documentType: docType,
      documentName: docName,
      description: docDescription || undefined,
      dueDate: docDueDate || undefined,
    });
  };

  const handleAppointment = () => {
    if (!aptType || !aptTitle || !aptScheduledAt) {
      toast.error("Appointment type, title, and scheduled time are required");
      return;
    }
    appointmentMutation.mutate({
      appointmentType: aptType,
      title: aptTitle,
      description: aptDescription || undefined,
      scheduledAt: aptScheduledAt,
      duration: parseInt(aptDuration),
      location: aptLocation || undefined,
    });
  };

  const handleLinkCandidate = () => {
    if (!selectedCandidateId) {
      toast.error("Please select a candidate");
      return;
    }
    linkCandidateMutation.mutate(selectedCandidateId);
  };

  const openWhatsAppCall = async () => {
    if (!selectedConversationId) return;
    try {
      const response = await api.get(`/whatsapp/conversations/${selectedConversationId}/call-link`);
      window.open(response.data.callLink, '_blank');
    } catch {
      toast.error("Failed to get call link");
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === "" || 
      (conv.profileName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      conv.phone.includes(searchQuery);
    const matchesType = filterType === "all" || conv.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "recruitment":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">Recruitment</Badge>;
      case "document_request":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/20">Documents</Badge>;
      case "appointment":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/20">Appointment</Badge>;
      case "general":
      default:
        return <Badge className="bg-white/10 text-muted-foreground border-white/10">General</Badge>;
    }
  };

  const getMessageStatusIcon = (message: WhatsappMessage) => {
    if (message.direction === 'inbound') return null;
    switch (message.status) {
      case "read":
        return <CheckCircle2 className="h-3 w-3 text-blue-500" />;
      case "delivered":
        return <CheckCircle2 className="h-3 w-3 text-gray-500" />;
      case "sent":
        return <Clock className="h-3 w-3 text-gray-400" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="whatsapp-monitor-page">
      <Navbar />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="page-title">WhatsApp Monitor</h1>
              <p className="text-muted-foreground mt-1">Manage candidate conversations and AI interactions</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                {conversations.length} Active
              </Badge>
            </div>
          </div>
          {whatsappStatus && !whatsappStatus.configured && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-yellow-400">WhatsApp API is not configured. Messages will be stored but not sent.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6 h-[calc(100vh-200px)]">
          <Card className="bg-card/50 border-white/10 flex flex-col" data-testid="conversation-list-panel">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-white/10"
                    data-testid="search-conversations"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-white/10" data-testid="filter-button">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterType("all")}>All</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType("general")}>General</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType("recruitment")}>Recruitment</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType("document_request")}>Documents</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType("appointment")}>Appointments</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${
                          selectedConversationId === conv.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                        }`}
                        onClick={() => handleSelectConversation(conv)}
                        data-testid={`conversation-item-${conv.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-green-500/20 text-green-400">
                              {(conv.profileName || conv.phone).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">
                                {conv.profileName || conv.phone}
                              </span>
                              {conv.unreadCount > 0 && (
                                <Badge className="bg-green-500 text-white ml-2">{conv.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conv.lastMessagePreview || "No messages yet"}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getTypeBadge(conv.type)}
                              {conv.lastMessageAt && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10 flex flex-col" data-testid="message-thread-panel">
            {selectedConversationId && conversationDetail ? (
              <>
                <CardHeader className="border-b border-white/10 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSelectedConversationId(null)}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Avatar>
                        <AvatarFallback className="bg-green-500/20 text-green-400">
                          {(conversationDetail.conversation.profileName || conversationDetail.conversation.phone).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {conversationDetail.conversation.profileName || conversationDetail.conversation.phone}
                        </h3>
                        <p className="text-sm text-muted-foreground">{conversationDetail.conversation.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-white/10"
                        onClick={openWhatsAppCall}
                        title="Start WhatsApp call"
                        data-testid="btn-whatsapp-call"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="border-white/10" data-testid="conversation-menu">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setIsDocRequestOpen(true)}>
                            <FileUp className="h-4 w-4 mr-2" />
                            Request Document
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsAppointmentOpen(true)}>
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Schedule Appointment
                          </DropdownMenuItem>
                          {calendlyConfig?.configured && (
                            <DropdownMenuItem onClick={() => setIsCalendlyOpen(true)}>
                              <CalendarCheck className="h-4 w-4 mr-2" />
                              Schedule via Calendly
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setIsLinkCandidateOpen(true)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Link to Candidate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-4 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    {isLoadingDetail ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : conversationDetail.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation by sending a message</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {conversationDetail.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                            data-testid={`message-${message.id}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                message.direction === 'outbound'
                                  ? message.senderType === 'ai'
                                    ? 'bg-purple-500/20 text-purple-200'
                                    : 'bg-primary text-primary-foreground'
                                  : 'bg-white/10 text-foreground'
                              }`}
                            >
                              {message.senderType === 'ai' && message.direction === 'outbound' && (
                                <div className="text-xs font-medium mb-1 opacity-70">AI Assistant</div>
                              )}
                              <p className="whitespace-pre-wrap">{message.body}</p>
                              {message.mediaUrl && (
                                <div className="mt-2">
                                  <a
                                    href={message.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm underline"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    View attachment
                                  </a>
                                </div>
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                message.direction === 'outbound' && message.senderType !== 'ai'
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}>
                                <span>
                                  {format(new Date(message.createdAt), 'HH:mm')}
                                </span>
                                {getMessageStatusIcon(message)}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messageEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                <CardFooter className="border-t p-4">
                  <div className="flex items-end gap-2 w-full">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="min-h-[44px] max-h-32 resize-none"
                      data-testid="message-input"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isSending}
                      data-testid="btn-send-message"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                <h3 className="text-lg font-medium">Select a conversation</h3>
                <p className="text-sm opacity-70">Choose a conversation from the list to view messages</p>
              </div>
            )}
          </Card>

          <Card className="bg-card/50 border-white/10" data-testid="details-panel">
            {selectedConversationId && conversationDetail ? (
              <Tabs defaultValue="info" className="h-full flex flex-col">
                <TabsList className="w-full justify-start border-b border-white/10 rounded-none bg-transparent">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <TabsContent value="info" className="m-0 p-4">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact Info</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{conversationDetail.conversation.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span>WA ID: {conversationDetail.conversation.waId}</span>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-white/10" />

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Conversation</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Type</span>
                            {getTypeBadge(conversationDetail.conversation.type)}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            {getStatusBadge(conversationDetail.conversation.status)}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Created</span>
                            <span className="text-sm">
                              {format(new Date(conversationDetail.conversation.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-white/10" />

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Linked Candidate</h4>
                          {!conversationDetail.candidate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsLinkCandidateOpen(true)}
                              data-testid="btn-link-candidate"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Link
                            </Button>
                          )}
                        </div>
                        {conversationDetail.candidate ? (
                          <Card className="p-3 bg-white/5 border-white/10">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-500/20 text-blue-400">
                                  {conversationDetail.candidate.fullName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{conversationDetail.candidate.fullName}</p>
                                <p className="text-xs text-muted-foreground">{conversationDetail.candidate.position || 'Candidate'}</p>
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <p className="text-sm text-muted-foreground">No candidate linked</p>
                        )}
                      </div>

                      <Separator className="bg-white/10" />

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h4>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start border-white/10"
                            onClick={() => setIsDocRequestOpen(true)}
                            data-testid="btn-request-document"
                          >
                            <FileUp className="h-4 w-4 mr-2" />
                            Request Document
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start border-white/10"
                            onClick={() => setIsAppointmentOpen(true)}
                            data-testid="btn-schedule-appointment"
                          >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Schedule Appointment
                          </Button>
                          {calendlyConfig?.configured && (
                            <Button
                              variant="outline"
                              className="w-full justify-start border-white/10 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                              onClick={() => setIsCalendlyOpen(true)}
                              data-testid="btn-calendly"
                            >
                              <CalendarCheck className="h-4 w-4 mr-2" />
                              Schedule via Calendly
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={openWhatsAppCall}
                            data-testid="btn-call"
                          >
                            <PhoneCall className="h-4 w-4 mr-2" />
                            Start Call
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="m-0 p-4">
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsDocRequestOpen(true)}
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        New Document Request
                      </Button>

                      {conversationDetail.documentRequests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No document requests yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {conversationDetail.documentRequests.map((doc) => (
                            <Card key={doc.id} className="p-3" data-testid={`doc-request-${doc.id}`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-sm">{doc.documentName}</p>
                                  <p className="text-xs text-gray-500">{doc.documentType}</p>
                                </div>
                                <Badge variant={doc.status === 'received' ? 'default' : 'outline'}>
                                  {doc.status}
                                </Badge>
                              </div>
                              {doc.dueDate && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Due: {format(new Date(doc.dueDate), 'MMM d, yyyy')}
                                </p>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="appointments" className="m-0 p-4">
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsAppointmentOpen(true)}
                      >
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        New Appointment
                      </Button>

                      {conversationDetail.appointments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No appointments scheduled</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {conversationDetail.appointments.map((apt) => (
                            <Card key={apt.id} className="p-3" data-testid={`appointment-${apt.id}`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-sm">{apt.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(apt.scheduledAt), 'MMM d, yyyy HH:mm')}
                                  </p>
                                </div>
                                <Badge variant={apt.status === 'confirmed' ? 'default' : 'outline'}>
                                  {apt.status}
                                </Badge>
                              </div>
                              {apt.location && (
                                <p className="text-xs text-gray-500 mt-2">{apt.location}</p>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <User className="h-12 w-12 mb-3 text-gray-200" />
                <p className="text-sm">Select a conversation to view details</p>
              </div>
            )}
          </Card>
        </div>

        <Dialog open={isDocRequestOpen} onOpenChange={setIsDocRequestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Document</DialogTitle>
              <DialogDescription>
                Send a document request to the candidate via WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger data-testid="select-doc-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id_document">ID Document</SelectItem>
                    <SelectItem value="cv">CV / Resume</SelectItem>
                    <SelectItem value="qualification">Qualification Certificate</SelectItem>
                    <SelectItem value="reference">Reference Letter</SelectItem>
                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                    <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Name</Label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g., Copy of ID Card"
                  data-testid="input-doc-name"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Additional instructions..."
                  data-testid="input-doc-description"
                />
              </div>
              <div>
                <Label>Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={docDueDate}
                  onChange={(e) => setDocDueDate(e.target.value)}
                  data-testid="input-doc-due-date"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDocRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDocumentRequest}
                disabled={documentRequestMutation.isPending}
                data-testid="btn-submit-doc-request"
              >
                {documentRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAppointmentOpen} onOpenChange={setIsAppointmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
              <DialogDescription>
                Schedule an appointment and notify the candidate via WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Appointment Type</Label>
                <Select value={aptType} onValueChange={setAptType}>
                  <SelectTrigger data-testid="select-apt-type">
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="screening">Screening Call</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="document_collection">Document Collection</SelectItem>
                    <SelectItem value="orientation">Orientation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  placeholder="e.g., First Round Interview"
                  data-testid="input-apt-title"
                />
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={aptScheduledAt}
                  onChange={(e) => setAptScheduledAt(e.target.value)}
                  data-testid="input-apt-datetime"
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Select value={aptDuration} onValueChange={setAptDuration}>
                  <SelectTrigger data-testid="select-apt-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location (Optional)</Label>
                <Input
                  value={aptLocation}
                  onChange={(e) => setAptLocation(e.target.value)}
                  placeholder="e.g., Office Building A, Room 101"
                  data-testid="input-apt-location"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={aptDescription}
                  onChange={(e) => setAptDescription(e.target.value)}
                  placeholder="Additional details..."
                  data-testid="input-apt-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAppointmentOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAppointment}
                disabled={appointmentMutation.isPending}
                data-testid="btn-submit-appointment"
              >
                {appointmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CalendarPlus className="h-4 w-4 mr-2" />
                )}
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLinkCandidateOpen} onOpenChange={setIsLinkCandidateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link to Candidate</DialogTitle>
              <DialogDescription>
                Link this WhatsApp conversation to an existing candidate profile
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Candidate</Label>
                <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                  <SelectTrigger data-testid="select-candidate">
                    <SelectValue placeholder="Choose a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCandidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.fullName} - {candidate.position || 'Candidate'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLinkCandidateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkCandidate}
                disabled={linkCandidateMutation.isPending || !selectedCandidateId}
                data-testid="btn-confirm-link-candidate"
              >
                {linkCandidateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Link Candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {calendlyConfig?.configured && calendlyConfig.url && (
          <PopupModal
            url={calendlyConfig.url}
            onModalClose={() => setIsCalendlyOpen(false)}
            open={isCalendlyOpen}
            rootElement={document.getElementById("root") as HTMLElement}
            prefill={{
              email: conversationDetail?.candidate?.email || "",
              name: conversationDetail?.candidate?.fullName || conversationDetail?.conversation?.profileName || ""
            }}
          />
        )}
      </main>
    </div>
  );
}
