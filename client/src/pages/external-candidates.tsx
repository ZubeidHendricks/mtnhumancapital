import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { candidateService } from "@/lib/api";
import {
  RefreshCw,
  Download,
  UserPlus,
  Users,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  MapPin
} from "lucide-react";

interface ExternalProfile {
  id: string;
  phone_number?: string;
  job_title?: string;
  skills?: string[];
  years_experience?: number;
  location?: string;
  education?: any[];
  work_history?: { company?: string; position?: string; description?: string }[];
  certifications?: string[];
  status?: string;
  completion_score?: number;
  original_filename?: string;
  original_file_url?: string;
  created_at?: string;
  first_name?: string;
  surname?: string;
}

interface Contact {
  id: string;
  first_name: string;
  surname: string;
  whatsapp: string;
  source?: string;
  created_at?: string;
}

interface ProfilesApiResponse {
  success: boolean;
  count: number;
  profiles: ExternalProfile[];
}

interface ContactsApiResponse {
  success: boolean;
  count: number;
  contacts: Contact[];
}

type ImportStatus = "idle" | "pending" | "success" | "error";

interface ProfileWithStatus extends ExternalProfile {
  importStatus: ImportStatus;
  importError?: string;
}

const EXTERNAL_API_BASE = "https://wefindjobs.co.za";

export default function ExternalCandidates() {
  const queryClient = useQueryClient();
  const [importStatuses, setImportStatuses] = useState<Record<string, { status: ImportStatus; error?: string }>>({});
  const [isImportingAll, setIsImportingAll] = useState(false);

  const { data: profiles, isLoading, isError, error, refetch, isFetching } = useQuery<ExternalProfile[]>({
    queryKey: ["external-profiles"],
    queryFn: async () => {
      const [profilesRes, contactsRes] = await Promise.all([
        fetch(`${EXTERNAL_API_BASE}/api/profiles`),
        fetch(`${EXTERNAL_API_BASE}/api/contacts`)
      ]);
      
      if (!profilesRes.ok) {
        throw new Error(`Failed to fetch profiles: ${profilesRes.statusText}`);
      }
      
      const profilesData: ProfilesApiResponse = await profilesRes.json();
      const contactsData: ContactsApiResponse = contactsRes.ok ? await contactsRes.json() : { contacts: [] };
      
      const contactsByPhone = new Map<string, Contact>();
      (contactsData.contacts || []).forEach(contact => {
        const normalizedPhone = contact.whatsapp?.replace(/\D/g, '').slice(-9);
        if (normalizedPhone) {
          contactsByPhone.set(normalizedPhone, contact);
        }
      });
      
      return (profilesData.profiles || []).map(profile => {
        const normalizedPhone = profile.phone_number?.replace(/\D/g, '').slice(-9);
        const contact = normalizedPhone ? contactsByPhone.get(normalizedPhone) : undefined;
        return {
          ...profile,
          first_name: contact?.first_name?.trim(),
          surname: contact?.surname?.trim()
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const importMutation = useMutation({
    mutationFn: async (profile: ExternalProfile) => {
      const fullName = profile.first_name && profile.surname 
        ? `${profile.first_name} ${profile.surname}`
        : profile.job_title || `Candidate ${profile.phone_number}`;
      
      const candidateData = {
        fullName,
        email: null,
        phone: profile.phone_number || null,
        role: profile.job_title || null,
        skills: profile.skills || [],
        experience: profile.work_history ? JSON.stringify(profile.work_history) : null,
        education: profile.education ? JSON.stringify(profile.education) : null,
        status: "New",
        stage: "Sourcing",
        source: "wefindjobs.co.za",
        summary: profile.certifications?.join(", ") || null,
        location: profile.location || null,
      };
      return candidateService.create(candidateData);
    },
    onSuccess: (_, profile) => {
      setImportStatuses(prev => ({
        ...prev,
        [profile.id]: { status: "success" }
      }));
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (error: Error, profile) => {
      setImportStatuses(prev => ({
        ...prev,
        [profile.id]: { status: "error", error: error.message }
      }));
    },
  });

  const getDisplayName = (profile: ExternalProfile) => {
    if (profile.first_name && profile.surname) {
      return `${profile.first_name} ${profile.surname}`;
    }
    return profile.job_title || `Candidate ${profile.phone_number?.slice(-4) || "Unknown"}`;
  };

  const handleImport = async (profile: ExternalProfile) => {
    setImportStatuses(prev => ({
      ...prev,
      [profile.id]: { status: "pending" }
    }));
    
    try {
      await importMutation.mutateAsync(profile);
      toast.success(`Successfully imported ${getDisplayName(profile)}`);
    } catch (err: any) {
      toast.error(`Failed to import ${getDisplayName(profile)}: ${err.message}`);
    }
  };

  const handleImportAll = async () => {
    if (!profiles || profiles.length === 0) return;

    setIsImportingAll(true);
    const unimportedProfiles = profiles.filter(
      p => importStatuses[p.id]?.status !== "success"
    );

    let successCount = 0;
    let errorCount = 0;

    for (const profile of unimportedProfiles) {
      setImportStatuses(prev => ({
        ...prev,
        [profile.id]: { status: "pending" }
      }));

      try {
        await importMutation.mutateAsync(profile);
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    setIsImportingAll(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} candidate(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} candidate(s)`);
    }
  };

  const handleDownloadCV = (profileId: string) => {
    window.open(`${EXTERNAL_API_BASE}/api/profiles/${profileId}/download`, "_blank");
  };

  const getStatusBadge = (status: ImportStatus, error?: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Importing...
          </Badge>
        );
      case "success":
        return (
          <Badge variant="default" className="gap-1 bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Imported
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1" title={error}>
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatExperience = (experience: any): string => {
    if (!experience) return "No experience data";
    if (typeof experience === "string") return experience;
    if (Array.isArray(experience)) {
      return experience.slice(0, 2).map((exp: any) => 
        typeof exp === "string" ? exp : (exp.title || exp.role || exp.company || "")
      ).filter(Boolean).join(", ") || "Experience available";
    }
    if (typeof experience === "object") {
      return experience.summary || experience.title || "Experience available";
    }
    return "Experience available";
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">
                  External Candidates
                </h1>
                <p className="text-muted-foreground mt-1">
                  Import candidates from wefindjobs.co.za
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  data-testid="button-refresh"
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleImportAll}
                  disabled={isLoading || isImportingAll || !profiles || profiles.length === 0}
                  data-testid="button-import-all"
                  className="gap-2"
                >
                  {isImportingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  Import All
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-zinc-900/50 border-border dark:border-white/10">
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <Card className="bg-zinc-900/50 border-border dark:border-red-500/30">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-semibold text-red-400 mb-2">
                    Failed to Load Profiles
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {error instanceof Error ? error.message : "An unexpected error occurred"}
                  </p>
                  <Button variant="outline" onClick={() => refetch()} data-testid="button-retry">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : profiles && profiles.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" data-testid="text-profile-count">
                    {profiles.length} profile(s) found
                  </p>
                  <a 
                    href={EXTERNAL_API_BASE} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Visit wefindjobs.co.za
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {profiles.map((profile) => {
                      const status = importStatuses[profile.id] || { status: "idle" as ImportStatus };
                      const displayName = getDisplayName(profile);
                      
                      return (
                        <Card 
                          key={profile.id} 
                          className="bg-zinc-900/50 border-border dark:border-white/10 hover:border-border hover:dark:border-white/20 transition-colors"
                          data-testid={`card-profile-${profile.id}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg truncate" data-testid={`text-name-${profile.id}`}>
                                  {displayName}
                                </CardTitle>
                                {profile.location && (
                                  <CardDescription className="flex items-center gap-1 mt-1">
                                    <Briefcase className="w-3 h-3" />
                                    {profile.location}
                                  </CardDescription>
                                )}
                                {profile.completion_score !== undefined && (
                                  <Badge 
                                    variant={profile.completion_score >= 70 ? "default" : "secondary"}
                                    className={`mt-1 text-xs ${profile.completion_score >= 70 ? "bg-green-500/20 text-green-400" : ""}`}
                                  >
                                    {profile.completion_score}% Complete
                                  </Badge>
                                )}
                              </div>
                              {getStatusBadge(status.status, status.error)}
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            <div className="space-y-2 text-sm">
                              {profile.phone_number && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="w-4 h-4 shrink-0" />
                                  <span data-testid={`text-phone-${profile.id}`}>{profile.phone_number}</span>
                                </div>
                              )}
                            </div>

                            {profile.skills && profile.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {profile.skills.slice(0, 4).map((skill, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="secondary" 
                                    className="text-xs bg-zinc-800 border-zinc-700"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {profile.skills.length > 4 && (
                                  <Badge variant="secondary" className="text-xs bg-zinc-800 border-zinc-700">
                                    +{profile.skills.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            )}

                            {profile.work_history && profile.work_history.length > 0 && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {profile.work_history[0]?.position} at {profile.work_history[0]?.company}
                              </p>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadCV(profile.id)}
                                data-testid={`button-download-${profile.id}`}
                                className="flex-1"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                CV
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleImport(profile)}
                                disabled={status.status === "pending" || status.status === "success"}
                                data-testid={`button-import-${profile.id}`}
                                className="flex-1"
                              >
                                {status.status === "pending" ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : status.status === "success" ? (
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                ) : (
                                  <UserPlus className="w-4 h-4 mr-1" />
                                )}
                                {status.status === "success" ? "Imported" : "Import"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <Card className="bg-zinc-900/50 border-border dark:border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Profiles Found</h3>
                  <p className="text-muted-foreground text-center">
                    There are no external profiles available at the moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
