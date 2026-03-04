import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsService, candidateService } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase, Upload, Eye, FileText, CheckCircle2, Loader2, MapPin, Building2, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

// ─── Job Spec Preview Dialog ─────────────────────────────────────────────────

function JobSpecPreviewDialog({ open, onOpenChange, job }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
}) {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{job.title}</DialogTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            {job.department && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                <Building2 className="w-3 h-3 mr-1" />{job.department}
              </Badge>
            )}
            {job.location && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                <MapPin className="w-3 h-3 mr-1" />{job.location}
              </Badge>
            )}
            {job.employmentType && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                <Clock className="w-3 h-3 mr-1" />{job.employmentType}
              </Badge>
            )}
            {job.salaryRange && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                <DollarSign className="w-3 h-3 mr-1" />{job.salaryRange}
              </Badge>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed pt-2">
            {job.description || "No job specification available."}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upload CV Dialog ────────────────────────────────────────────────────────

function UploadCvDialog({ open, onOpenChange, jobId, jobTitle }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = (val: boolean) => {
    if (!val) {
      setUploaded(false);
      setUploading(false);
    }
    onOpenChange(val);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);

      const res = await fetch("/api/documents/upload/cvs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      // Link candidate to job — response shape: { results: [{ candidateId }] }
      const candidateId = data.results?.[0]?.candidateId;
      if (candidateId) {
        await candidateService.update(candidateId, { jobId });
      }

      setUploaded(true);
      toast.success("CV uploaded successfully!");
    } catch (err) {
      toast.error("Failed to upload CV. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [jobId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload CV</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Applying for <span className="font-medium text-foreground">{jobTitle}</span>
          </p>
        </DialogHeader>

        {uploaded ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-medium">CV Uploaded Successfully!</p>
            <p className="text-sm text-muted-foreground">Your application has been submitted.</p>
            <Button variant="outline" onClick={() => handleClose(false)} className="mt-2">Close</Button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-[#FFCB00] bg-[#FFCB00]/10"
                : "border-border hover:border-[#FFCB00]/50"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#FFCB00]" />
                <p className="text-sm text-muted-foreground">Uploading your CV...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Drag & drop your CV here, or
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#FFCB00]/30 bg-[#FFCB00]/10 hover:bg-[#FFCB00]/20 text-[#FFCB00]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX accepted</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Careers Dialog ─────────────────────────────────────────────────────

export function CareersDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const jobsKey = useTenantQueryKey(["jobs"]);
  const candidatesKey = useTenantQueryKey(["candidates"]);

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: jobsKey,
    queryFn: jobsService.getAll,
    retry: 1,
  });

  const { data: candidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
    retry: 1,
  });

  const [uploadJob, setUploadJob] = useState<{ id: number; title: string } | null>(null);
  const [previewJob, setPreviewJob] = useState<any>(null);

  const activeJobs = (jobs || []).filter((j: any) => j.status === "Active");

  const getCandidateCount = (jobId: number) =>
    (candidates || []).filter((c: any) => c.jobId === jobId).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Briefcase className="w-5 h-5 text-[#FFCB00]" />
              Open Careers
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Browse open positions and submit your application
            </p>
          </DialogHeader>

          {/* Summary Card */}
          <Card className="border-[#FFCB00]/20 bg-[#FFCB00]/5">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#FFCB00]/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#FFCB00]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeJobs.length}</p>
                <p className="text-xs text-muted-foreground">Open Roles</p>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          <ScrollArea className="max-h-[55vh]">
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Header */}
              <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm text-foreground font-semibold">
                <div className="col-span-4">Job Title</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Candidates</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Loading */}
              {loadingJobs && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FFCB00]" />
                </div>
              )}

              {/* Empty State */}
              {!loadingJobs && activeJobs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No open positions at the moment.</p>
                  <p className="text-xs mt-1">Check back soon!</p>
                </div>
              )}

              {/* Rows */}
              {activeJobs.map((job: any) => {
                const candidateCount = getCandidateCount(job.id);
                return (
                  <div
                    key={job.id}
                    className="px-4 py-3 grid grid-cols-12 items-center border-t border-border hover:bg-white/5 transition-colors"
                  >
                    <div className="col-span-4">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {job.location || "Johannesburg, Gauteng"}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-foreground font-semibold">
                      {job.department}
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        {candidateCount} {candidateCount === 1 ? "Candidate" : "Candidates"}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">
                        {job.status}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-right flex justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-[#FFCB00] hover:bg-[#FFCB00]/80 text-black font-medium h-8"
                        onClick={() => setUploadJob({ id: job.id, title: job.title })}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload CV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setPreviewJob(job)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Nested Dialogs */}
      {uploadJob && (
        <UploadCvDialog
          open={!!uploadJob}
          onOpenChange={(val) => { if (!val) setUploadJob(null); }}
          jobId={uploadJob.id}
          jobTitle={uploadJob.title}
        />
      )}

      <JobSpecPreviewDialog
        open={!!previewJob}
        onOpenChange={(val) => { if (!val) setPreviewJob(null); }}
        job={previewJob}
      />
    </>
  );
}
