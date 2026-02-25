import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { 
  Upload, 
  FileText, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Download,
  Eye,
  Search,
  FileOutput,
  Sparkles,
  Building2,
  GraduationCap,
  Briefcase,
  User,
  MapPin,
  Phone,
  Mail,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface Candidate {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role?: string;
  location?: string;
  status?: string;
  skills?: string[];
  experience?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    year?: string;
  }>;
  createdAt?: string;
}

interface TemplatePreviewData {
  personalProfile: {
    jobApplication?: string | null;
    employmentEquityStatus?: string | null;
    nationality?: string | null;
    fullName: string;
    idNumber?: string | null;
    residentialLocation?: string | null;
    currentCompany?: string | null;
    currentPosition?: string | null;
    currentRemuneration?: string | null;
    expectedRemuneration?: string | null;
    noticePeriod?: string | null;
  };
  education?: {
    secondary?: {
      school?: string | null;
      grade?: string | null;
      year?: string | null;
    } | null;
    tertiary?: Array<{
      institution?: string | null;
      courses?: string | null;
      yearCompleted?: string | null;
    }> | null;
    otherCourses?: string | null;
  } | null;
  computerLiteracy?: string | null;
  attributesAchievementsSkills?: string | null;
  employmentHistory?: Array<{
    employer: string;
    periodOfService?: string | null;
    position?: string | null;
    mainResponsibilities?: string | null;
    reasonForLeaving?: string | null;
  }> | null;
}

export default function CVTemplatePage() {
  const candidatesKey = useTenantQueryKey(["candidates"]);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewData, setPreviewData] = useState<TemplatePreviewData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: candidatesKey,
    queryFn: async () => {
      const res = await fetch("/api/candidates");
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const body = await res.json();
      return Array.isArray(body) ? body : body.data ?? [];
    },
  });

  const filteredCandidates = candidates.filter(c => 
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setPreviewData(null);
    } else {
      toast.error("Please upload a PDF file");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setPreviewData(null);
    } else {
      toast.error("Please upload a PDF file");
    }
  }, []);

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error("Please select a CV file first");
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("cv", selectedFile);
      if (jobTitle) {
        formData.append("jobTitle", jobTitle);
      }

      const res = await fetch("/api/cv-template/preview", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to extract CV data");
      }

      const result = await res.json();
      setPreviewData(result.data);
      toast.success("CV data extracted successfully");
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to extract CV data");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error("Please select a CV file first");
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("cv", selectedFile);
      if (jobTitle) {
        formData.append("jobTitle", jobTitle);
      }

      const res = await fetch("/api/cv-template/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to generate CV template");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers.get("content-disposition");
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || "CV_Template.docx";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("CV template generated and downloaded");
    } catch (error) {
      console.error("Generate error:", error);
      toast.error("Failed to generate CV template");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadFromCandidate = async (candidateId: string, fullName: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/cv-template`);

      if (!res.ok) {
        throw new Error("Failed to generate CV template");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_Template_${fullName.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`CV template downloaded for ${fullName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate CV template");
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedCandidates.size === 0) {
      toast.error("Please select at least one candidate");
      return;
    }

    setIsBulkGenerating(true);
    try {
      const res = await fetch("/api/candidates/bulk-cv-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateIds: Array.from(selectedCandidates),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate bulk CV templates");
      }

      const generationStatus = res.headers.get("x-generation-status");
      const templatesGenerated = res.headers.get("x-templates-generated");
      const templatesFailed = res.headers.get("x-templates-failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentType = res.headers.get("content-type");
      const contentDisposition = res.headers.get("content-disposition");
      if (contentType?.includes("zip")) {
        a.download = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || "CV_Templates_Bulk.zip";
      } else {
        a.download = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || "CV_Template.docx";
      }
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      if (generationStatus === 'failed') {
        toast.error("No CV templates could be generated. Check the downloaded report for details.");
      } else if (generationStatus === 'partial') {
        toast.warning(`Generated ${templatesGenerated} template(s), ${templatesFailed} failed. Check the report in the ZIP.`);
      } else {
        toast.success(`Generated ${templatesGenerated || selectedCandidates.size} CV template(s)`);
      }
      setSelectedCandidates(new Set());
    } catch (error) {
      console.error("Bulk generate error:", error);
      toast.error("Failed to generate bulk CV templates");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    const newSelection = new Set(selectedCandidates);
    if (newSelection.has(candidateId)) {
      newSelection.delete(candidateId);
    } else {
      newSelection.add(candidateId);
    }
    setSelectedCandidates(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <FileOutput className="h-8 w-8 text-primary" />
            CV Template Generator
          </h1>
          <p className="text-gray-600 mt-2">
            Convert CVs to the MTN - Human Capital standardized format
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload CV
                </CardTitle>
                <CardDescription>
                  Upload a CV file to extract data and generate standardized template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver 
                      ? "border-primary bg-primary/5" 
                      : "border-gray-300 dark:border-gray-700 hover:border-primary"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="dropzone-cv"
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewData(null);
                        }}
                        data-testid="button-clear-file"
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-12 w-12 text-gray-400" />
                      <p className="text-gray-600">
                        Drag & drop a CV file here, or click to browse
                      </p>
                      <p className="text-sm text-gray-400">PDF files only</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="cv-upload"
                    data-testid="input-cv-upload"
                  />
                  {!selectedFile && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => document.getElementById("cv-upload")?.click()}
                      data-testid="button-browse-file"
                    >
                      Browse Files
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="jobTitle">Job Title (Optional)</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g., Senior Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="mt-1"
                    data-testid="input-job-title"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Helps the AI better categorize the candidate's application
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handlePreview}
                    disabled={!selectedFile || isGenerating}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-preview"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview Data
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={!selectedFile || isGenerating}
                    className="flex-1"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Generate Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {previewData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-foreground" />
                    Extracted Data Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                          <User className="h-4 w-4" />
                          Personal Profile
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">Full Name:</div>
                          <div className="font-medium">{previewData.personalProfile.fullName}</div>
                          {previewData.personalProfile.jobApplication && (
                            <>
                              <div className="text-gray-500">Position:</div>
                              <div>{previewData.personalProfile.jobApplication}</div>
                            </>
                          )}
                          {previewData.personalProfile.residentialLocation && (
                            <>
                              <div className="text-gray-500">Location:</div>
                              <div>{previewData.personalProfile.residentialLocation}</div>
                            </>
                          )}
                          {previewData.personalProfile.currentCompany && (
                            <>
                              <div className="text-gray-500">Current Company:</div>
                              <div>{previewData.personalProfile.currentCompany}</div>
                            </>
                          )}
                          {previewData.personalProfile.currentPosition && (
                            <>
                              <div className="text-gray-500">Current Position:</div>
                              <div>{previewData.personalProfile.currentPosition}</div>
                            </>
                          )}
                          {previewData.personalProfile.noticePeriod && (
                            <>
                              <div className="text-gray-500">Notice Period:</div>
                              <div>{previewData.personalProfile.noticePeriod}</div>
                            </>
                          )}
                        </div>
                      </div>

                      {previewData.education?.tertiary && previewData.education.tertiary.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                            <GraduationCap className="h-4 w-4" />
                            Education
                          </h3>
                          <div className="space-y-2">
                            {previewData.education.tertiary.map((edu, i) => (
                              <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                                <p className="font-medium">{edu.institution}</p>
                                <p className="text-gray-600">{edu.courses}</p>
                                {edu.yearCompleted && (
                                  <p className="text-gray-500 text-xs">{edu.yearCompleted}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {previewData.employmentHistory && previewData.employmentHistory.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                            <Briefcase className="h-4 w-4" />
                            Employment History
                          </h3>
                          <div className="space-y-3">
                            {previewData.employmentHistory.slice(0, 3).map((job, i) => (
                              <div key={i} className="p-3 border rounded text-sm">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{job.position}</p>
                                    <p className="text-gray-600 flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {job.employer}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {job.periodOfService}
                                  </Badge>
                                </div>
                                {job.mainResponsibilities && (
                                  <p className="text-gray-500 mt-2 text-xs line-clamp-2">
                                    {job.mainResponsibilities}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {previewData.attributesAchievementsSkills && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Skills & Attributes</h3>
                          <p className="text-sm text-gray-600">
                            {previewData.attributesAchievementsSkills}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Generate from Existing Candidates
              </CardTitle>
              <CardDescription>
                Select candidates to generate standardized CV templates from their stored data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search candidates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-candidates"
                  />
                </div>
                <Button
                  onClick={handleBulkGenerate}
                  disabled={selectedCandidates.size === 0 || isBulkGenerating}
                  data-testid="button-bulk-generate"
                >
                  {isBulkGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generate ({selectedCandidates.size})
                </Button>
              </div>

              {selectedCandidates.size > 0 && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedCandidates.size} candidate(s) selected
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select All ({filteredCandidates.length})
                </Label>
              </div>

              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No candidates found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`p-3 border rounded-lg transition-colors ${
                          selectedCandidates.has(candidate.id)
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        }`}
                        data-testid={`candidate-card-${candidate.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedCandidates.has(candidate.id)}
                            onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                            data-testid={`checkbox-candidate-${candidate.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate" data-testid={`text-name-${candidate.id}`}>
                                {candidate.fullName}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadFromCandidate(candidate.id, candidate.fullName)}
                                className="shrink-0"
                                data-testid={`button-download-${candidate.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                            {candidate.role && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {candidate.role}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                              {candidate.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {candidate.email}
                                </span>
                              )}
                              {candidate.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {candidate.location}
                                </span>
                              )}
                            </div>
                            {candidate.skills && candidate.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.skills.slice(0, 4).map((skill, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {candidate.skills.length > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{candidate.skills.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About MTN - Human Capital CV Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Personal Profile</h4>
                  <p className="text-sm text-gray-600">
                    Name, contact details, employment equity status, current position, and salary expectations
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Education</h4>
                  <p className="text-sm text-gray-600">
                    Secondary and tertiary qualifications, additional courses, and computer literacy
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Employment History</h4>
                  <p className="text-sm text-gray-600">
                    Complete work history with responsibilities and reasons for leaving
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
