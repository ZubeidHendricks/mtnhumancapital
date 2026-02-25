import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  CheckCircle2,
  XCircle,
  Send,
  Plus,
  Building2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Interview {
  id: string;
  candidateName: string;
  position: string;
  date: string;
  time: string;
  location: string;
  interviewer: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
}

export default function InterviewFaceToFace() {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [location, setLocation] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [notes, setNotes] = useState("");

  const interviews: Interview[] = [
    { 
      id: "1", 
      candidateName: "John Smith", 
      position: "Senior Developer", 
      date: "2024-02-15",
      time: "10:00",
      location: "Conference Room A",
      interviewer: "Sarah Manager",
      status: "scheduled"
    },
    { 
      id: "2", 
      candidateName: "Emily Brown", 
      position: "Project Manager", 
      date: "2024-02-14",
      time: "14:00",
      location: "Main Office",
      interviewer: "John Director",
      status: "completed",
      notes: "Strong candidate, good communication skills"
    },
    { 
      id: "3", 
      candidateName: "Mike Wilson", 
      position: "Data Analyst", 
      date: "2024-02-12",
      time: "11:00",
      location: "Meeting Room B",
      interviewer: "Lisa HR",
      status: "cancelled"
    },
  ];

  const candidates = [
    { id: "1", name: "John Smith", position: "Senior Developer" },
    { id: "2", name: "Sarah Johnson", position: "Project Manager" },
    { id: "3", name: "Mike Wilson", position: "Data Analyst" },
    { id: "4", name: "Emily Brown", position: "HR Coordinator" },
  ];

  const interviewers = [
    { id: "1", name: "Sarah Manager" },
    { id: "2", name: "John Director" },
    { id: "3", name: "Lisa HR" },
    { id: "4", name: "Tom Lead" },
  ];

  const handleScheduleInterview = () => {
    if (!selectedCandidate || !interviewDate || !interviewTime || !location || !interviewer) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Interview Scheduled",
      description: "The face-to-face interview has been scheduled successfully.",
    });
    
    setScheduleDialogOpen(false);
    setSelectedCandidate("");
    setInterviewDate("");
    setInterviewTime("");
    setLocation("");
    setInterviewer("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-muted/20 text-foreground dark:text-foreground border-border/30">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-muted/20 text-foreground border-border/30">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Face-to-Face Interviews
          </h1>
          <p className="text-muted-foreground mt-2">
            Schedule and manage in-person interviews with candidates
          </p>
        </div>
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Face-to-Face Interview</DialogTitle>
              <DialogDescription>
                Set up an in-person interview with a candidate
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Candidate</Label>
                <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                  <SelectTrigger data-testid="select-candidate">
                    <SelectValue placeholder="Select a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} - {candidate.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    data-testid="input-interview-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input 
                    type="time" 
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    data-testid="input-interview-time"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  placeholder="e.g., Conference Room A, Main Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  data-testid="input-location"
                />
              </div>
              <div className="space-y-2">
                <Label>Interviewer</Label>
                <Select value={interviewer} onValueChange={setInterviewer}>
                  <SelectTrigger data-testid="select-interviewer">
                    <SelectValue placeholder="Select an interviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewers.map((int) => (
                      <SelectItem key={int.id} value={int.id}>
                        {int.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea 
                  placeholder="Any additional notes or requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleScheduleInterview} data-testid="button-schedule">
                <Send className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-border dark:border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {interviews.filter(i => i.status === "scheduled").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {interviews.filter(i => i.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive dark:border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {interviews.filter(i => i.status === "cancelled").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Schedule</CardTitle>
          <CardDescription>All scheduled face-to-face interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div 
                key={interview.id} 
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                data-testid={`interview-${interview.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{interview.candidateName}</h3>
                    <p className="text-sm text-muted-foreground">{interview.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{interview.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{interview.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{interview.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserPlus className="w-4 h-4" />
                    <span>{interview.interviewer}</span>
                  </div>
                  {getStatusBadge(interview.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
