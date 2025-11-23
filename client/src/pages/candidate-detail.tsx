import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Briefcase, Calendar, Award, Languages, FileText, Upload, ShieldCheck } from "lucide-react";
import type { Candidate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function CandidateDetail() {
  const [, params] = useRoute("/candidates/:id");
  const [, setLocation] = useLocation();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (params?.id) {
      fetchCandidate(params.id);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !candidate) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("cv", file);

    try {
      const response = await fetch(`/api/candidates/${candidate.id}/upload-cv`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setCandidate(data.candidate);
      
      toast({
        title: "CV Uploaded Successfully",
        description: "The CV has been parsed and candidate profile updated",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload CV",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
        <BackButton fallbackPath="/candidates-list" label="Back to Candidates" />
        
        <div className="flex items-center gap-2">
          <Link href={`/integrity-agent?candidateId=${candidate.id}`}>
            <Button variant="default" size="sm" data-testid="button-integrity-check">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Run Integrity Check
            </Button>
          </Link>
          
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="cv-upload"
              data-testid="input-cv-file"
            />
            <label htmlFor="cv-upload">
              <Button 
                variant="outline" 
                size="sm"
                disabled={uploading}
                data-testid="button-upload-cv"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload CV"}
                </span>
              </Button>
            </label>
          </div>
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
      </div>
    </div>
  );
}
