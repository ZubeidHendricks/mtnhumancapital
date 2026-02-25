import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Award, Play, Search, Trophy, Star, TrendingUp, Plus, Users, GraduationCap, Target, Loader2, MessageSquare, Send } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  learningObjectives: string[] | null;
  tags: string[] | null;
  status: string | null;
  progress?: number;
  enrolledCount?: number;
  completedCount?: number;
}

interface LearnerProgress {
  progressId?: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  status: string;
  timeSpent: number;
  userName?: string;
  userId?: string;
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  level: number;
  rank: number;
}

interface UserBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  rarity: string;
  points: number;
  earnedAt: string;
}

interface UserStats {
  totalPoints: number;
  level: number;
  rank: number;
  coursesCompleted: number;
  hoursLearned: number;
  badgesEarned: number;
}

export default function LearningManagement() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderProgress, setReminderProgress] = useState<LearnerProgress | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category: "compliance",
    difficulty: "beginner",
    duration: 60,
    learningObjectives: "",
    tags: ""
  });

  const tenantId = tenant?.id || "";
  const headers = { "x-tenant-id": tenantId };

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/lms/courses", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/lms/courses", { headers });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
    enabled: !!tenantId
  });

  const { data: allProgress = [] } = useQuery<LearnerProgress[]>({
    queryKey: ["/api/lms/all-progress", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/lms/all-progress", { headers });
      if (!res.ok) return [];
      const data = await res.json();
      // Transform nested structure to flat structure
      return data.map((item: { progress: any; course: any; user: any }) => ({
        progressId: item.progress?.id,
        courseId: item.progress?.courseId || item.course?.id,
        courseTitle: item.course?.title || "Unknown Course",
        progress: item.progress?.progress || 0,
        status: item.progress?.status || "not_started",
        timeSpent: item.progress?.timeSpent || 0,
        userName: item.user?.username || "Unknown User",
        userId: item.user?.id
      }));
    },
    enabled: !!tenantId
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/lms/employees", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/lms/employees", { headers });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/lms/leaderboard", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/lms/leaderboard", { headers });
      if (!res.ok) return [];
      const data = await res.json();
      // Transform to expected format with user names
      return data.map((item: any, index: number) => ({
        userId: item.userId,
        userName: item.userName || `User ${index + 1}`,
        points: item.points || 0,
        level: item.level || 1,
        rank: item.rank || index + 1
      }));
    },
    enabled: !!tenantId
  });

  const { data: allBadges = [] } = useQuery<(UserBadge & { userName?: string })[]>({
    queryKey: ["/api/lms/all-badges", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/lms/all-badges", { headers });
      if (!res.ok) return [];
      const data = await res.json();
      // Transform nested structure to flat structure
      return data.map((item: { badge: any; user: any; earnedAt: string }) => ({
        id: item.badge?.id,
        name: item.badge?.name || "Unknown Badge",
        description: item.badge?.description || "",
        imageUrl: item.badge?.imageUrl,
        rarity: item.badge?.rarity || "common",
        points: item.badge?.points || 0,
        earnedAt: item.earnedAt,
        userName: item.user?.username || "Unknown User"
      }));
    },
    enabled: !!tenantId
  });

  const { data: myPoints } = useQuery<UserStats>({
    queryKey: ["/api/lms/my-points", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/lms/my-points", { headers });
      if (!res.ok) return { totalPoints: 0, level: 1, rank: 0, coursesCompleted: 0, hoursLearned: 0, badgesEarned: 0 };
      const data = await res.json();
      // Transform to expected format
      return {
        totalPoints: data.points || 0,
        level: data.level || 1,
        rank: data.rank || 1,
        coursesCompleted: 0,
        hoursLearned: 0,
        badgesEarned: 0
      };
    },
    enabled: !!tenantId
  });

  const createCourseMutation = useMutation({
    mutationFn: async (courseData: typeof newCourse) => {
      const res = await fetch("/api/lms/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          difficulty: courseData.difficulty,
          duration: courseData.duration,
          learningObjectives: courseData.learningObjectives.split(",").map(s => s.trim()).filter(Boolean),
          tags: courseData.tags.split(",").map(s => s.trim()).filter(Boolean),
          status: "published"
        })
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", tenantId] });
      setCreateDialogOpen(false);
      setNewCourse({ title: "", description: "", category: "compliance", difficulty: "beginner", duration: 60, learningObjectives: "", tags: "" });
      toast.success("Course created successfully!");
    },
    onError: () => {
      toast.error("Failed to create course");
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/lms/courses/${courseId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ status: "in_progress", progress: 0 })
      });
      if (!res.ok) throw new Error("Failed to enroll");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/my-progress", tenantId] });
      toast.success("Enrolled in course!");
    }
  });

  const assignCourseMutation = useMutation({
    mutationFn: async ({ courseId, userId }: { courseId: string; userId: string }) => {
      const res = await fetch("/api/lms/assign-course", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ courseId, userId })
      });
      if (!res.ok) throw new Error("Failed to assign course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lms/all-progress", tenantId] });
      setSelectedCourseId("");
      setSelectedEmployeeId("");
      toast.success("Course assigned successfully!");
    },
    onError: () => {
      toast.error("Failed to assign course");
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ userId, courseId, learnerProgressId, message }: { 
      userId: string; 
      courseId: string; 
      learnerProgressId: string; 
      message: string 
    }) => {
      const res = await fetch("/api/lms/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ userId, courseId, learnerProgressId, message })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(data.message || "Please wait before sending another reminder");
        }
        throw new Error(data.message || "Failed to send reminder");
      }
      return data;
    },
    onSuccess: (data) => {
      setReminderDialogOpen(false);
      setReminderProgress(null);
      setReminderMessage("");
      if (data.deliveryMethod === "whatsapp") {
        toast.success("Reminder sent via WhatsApp!");
      } else if (data.deliveryMethod === "in_app") {
        toast.success("Reminder logged (WhatsApp not configured or no phone number)");
      } else {
        toast.warning("Reminder recorded but delivery failed");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const openReminderDialog = (progress: LearnerProgress) => {
    setReminderProgress(progress);
    const defaultMessage = `Hi ${progress.userName}! This is a friendly reminder to continue your "${progress.courseTitle}" course. You're at ${progress.progress}% completion. Keep up the great work!`;
    setReminderMessage(defaultMessage);
    setReminderDialogOpen(true);
  };

  const handleSendReminder = () => {
    if (!reminderProgress || !reminderMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (!reminderProgress.progressId || !reminderProgress.userId || !reminderProgress.courseId) {
      toast.error("Missing required information to send reminder");
      return;
    }
    sendReminderMutation.mutate({
      userId: reminderProgress.userId,
      courseId: reminderProgress.courseId,
      learnerProgressId: reminderProgress.progressId,
      message: reminderMessage
    });
  };

  const stats = myPoints || {
    totalPoints: 0,
    level: 1,
    rank: 0,
    coursesCompleted: allProgress.filter(p => p.status === "completed").length,
    hoursLearned: Math.round(allProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / 60),
    badgesEarned: allBadges.length
  };

  const getProgressForCourse = (courseId: string) => {
    const progress = allProgress.find(p => p.courseId === courseId);
    return progress?.progress || 0;
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: "All Courses", count: courses.length },
    { id: "compliance", label: "Compliance", count: courses.filter(c => c.category === "compliance").length },
    { id: "technical", label: "Technical", count: courses.filter(c => c.category === "technical").length },
    { id: "leadership", label: "Leadership", count: courses.filter(c => c.category === "leadership").length },
    { id: "soft_skills", label: "Soft Skills", count: courses.filter(c => c.category === "soft_skills").length },
  ];

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "beginner": return "bg-muted/10 text-foreground border-border/20";
      case "intermediate": return "bg-muted/10 text-foreground border-border/20";
      case "advanced": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-secondary0/10 text-gray-600 border-gray-500/20";
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "border-gray-500";
      case "rare": return "border-border";
      case "epic": return "border-border";
      case "legendary": return "border-border";
      default: return "border-gray-500";
    }
  };

  const handleCreateCourse = () => {
    if (!newCourse.title) {
      toast.error("Please enter a course title");
      return;
    }
    createCourseMutation.mutate(newCourse);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-4 md:p-6 space-y-6 pt-20 md:pt-24">
        <BackButton fallbackPath="/hr-dashboard" />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Learning Management</h1>
            <p className="text-muted-foreground">Develop your skills and advance your career</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-course">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Course Title</Label>
                  <Input
                    placeholder="e.g., Workplace Safety Training"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    data-testid="input-course-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe what employees will learn..."
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    data-testid="input-course-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newCourse.category} onValueChange={(v) => setNewCourse({ ...newCourse, category: v })}>
                      <SelectTrigger data-testid="select-course-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="leadership">Leadership</SelectItem>
                        <SelectItem value="soft_skills">Soft Skills</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={newCourse.difficulty} onValueChange={(v) => setNewCourse({ ...newCourse, difficulty: v })}>
                      <SelectTrigger data-testid="select-course-difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: parseInt(e.target.value) || 60 })}
                    data-testid="input-course-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Learning Objectives (comma-separated)</Label>
                  <Input
                    placeholder="Objective 1, Objective 2, Objective 3"
                    value={newCourse.learningObjectives}
                    onChange={(e) => setNewCourse({ ...newCourse, learningObjectives: e.target.value })}
                    data-testid="input-learning-objectives"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    placeholder="safety, mandatory, hr"
                    value={newCourse.tags}
                    onChange={(e) => setNewCourse({ ...newCourse, tags: e.target.value })}
                    data-testid="input-course-tags"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCourse} disabled={createCourseMutation.isPending} data-testid="button-submit-course">
                  {createCourseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-black/40 border-border dark:border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Active Courses
              </CardDescription>
              <CardTitle className="text-2xl text-foreground">{courses.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Across all departments</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-border dark:border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Enrolled Employees
              </CardDescription>
              <CardTitle className="text-2xl text-foreground">{allProgress.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Total enrollments</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-border dark:border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Completion Rate
              </CardDescription>
              <CardTitle className="text-2xl text-foreground">
                {allProgress.length > 0 
                  ? Math.round((allProgress.filter(p => p.status === "completed").length / allProgress.length) * 100)
                  : 0}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Target: 85%</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-border dark:border-white/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Certifications
              </CardDescription>
              <CardTitle className="text-2xl text-foreground">{allBadges.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Badges earned</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-black/40 border border-border dark:border-white/10">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="assignments">Assign Courses</TabsTrigger>
            <TabsTrigger value="progress">Learner Progress</TabsTrigger>
            <TabsTrigger value="gamification">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black/40 border-border dark:border-white/10"
                  data-testid="input-search-courses"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="whitespace-nowrap"
                    data-testid={`button-category-${cat.id}`}
                  >
                    {cat.label} ({cat.count})
                  </Button>
                ))}
              </div>
            </div>

            {coursesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {courses.length === 0 ? "Create your first course to get started" : "Try adjusting your search or filters"}
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => {
                  const progress = getProgressForCourse(course.id);
                  return (
                    <Card key={course.id} className="bg-black/40 border-border dark:border-white/10 overflow-hidden group hover:border-primary/50 transition-all" data-testid={`card-course-${course.id}`}>
                      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-background/20 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-primary/50" />
                        </div>
                        {progress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-foreground text-lg line-clamp-2">{course.title}</CardTitle>
                          {progress === 100 && (
                            <Award className="w-5 h-5 text-foreground shrink-0" />
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">{course.description || "No description"}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                            {course.difficulty || "beginner"}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{course.duration || 0}min</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(course.tags || []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button 
                          className="w-full" 
                          variant={progress > 0 ? "default" : "outline"}
                          onClick={() => progress === 0 && enrollMutation.mutate(course.id)}
                          disabled={enrollMutation.isPending}
                          data-testid={`button-enroll-${course.id}`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {progress === 0 ? "Start Course" : progress === 100 ? "Review" : `Continue (${progress}%)`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card className="bg-black/40 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Assign Courses to Employees
                </CardTitle>
                <CardDescription>Select employees and assign them to training courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-foreground mb-2 block">Select Course</Label>
                      <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger className="bg-black/40 border-border dark:border-white/10" data-testid="select-course">
                          <SelectValue placeholder="Choose a course..." />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground mb-2 block">Select Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="bg-black/40 border-border dark:border-white/10" data-testid="select-employee">
                          <SelectValue placeholder="Choose an employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.fullName} - {emp.department || 'No Department'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    className="w-full md:w-auto"
                    onClick={() => {
                      if (selectedCourseId && selectedEmployeeId) {
                        assignCourseMutation.mutate({ courseId: selectedCourseId, userId: selectedEmployeeId });
                      } else {
                        toast.error("Please select both a course and an employee");
                      }
                    }}
                    disabled={assignCourseMutation.isPending || !selectedCourseId || !selectedEmployeeId}
                    data-testid="button-assign-course"
                  >
                    {assignCourseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Assign Course
                  </Button>
                </div>

                <div className="mt-8">
                  <h4 className="text-foreground font-medium mb-4">Current Assignments</h4>
                  <div className="space-y-3">
                    {allProgress.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No course assignments yet</p>
                    ) : (
                      allProgress.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-foreground font-medium">{item.userName}</p>
                            <p className="text-sm text-muted-foreground">{item.courseTitle}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={item.status === "completed" ? "default" : item.status === "in_progress" ? "secondary" : "outline"}>
                              {item.status === "completed" ? "Completed" : item.status === "in_progress" ? `${item.progress}%` : "Not Started"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardHeader className="pb-3">
                  <CardDescription>Courses Completed</CardDescription>
                  <CardTitle className="text-3xl text-foreground">{allProgress.filter(p => p.status === "completed").length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardHeader className="pb-3">
                  <CardDescription>Hours Learned</CardDescription>
                  <CardTitle className="text-3xl text-foreground">{Math.round(allProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / 60)}h</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardHeader className="pb-3">
                  <CardDescription>In Progress</CardDescription>
                  <CardTitle className="text-3xl text-foreground">{allProgress.filter(p => p.status === "in_progress").length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardHeader className="pb-3">
                  <CardDescription>Badges Earned</CardDescription>
                  <CardTitle className="text-3xl text-foreground">{allBadges.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="bg-black/40 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-foreground" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allProgress.filter(p => p.status === "in_progress").length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No courses in progress.</p>
                ) : (
                  allProgress.filter(p => p.status === "in_progress").map((progress, idx) => (
                    <div key={`${progress.courseId}-${idx}`} className="space-y-2" data-testid={`progress-course-${progress.courseId}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-foreground font-medium">{progress.userName}</h3>
                          <p className="text-sm text-muted-foreground">{progress.courseTitle}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{progress.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Award className="w-5 h-5 text-foreground" />
                    Completed Courses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allProgress.filter(p => p.status === "completed").length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No completed courses yet.</p>
                  ) : (
                    allProgress.filter(p => p.status === "completed").map((progress, idx) => (
                      <div key={`completed-${idx}`} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/20">
                        <div>
                          <p className="text-foreground font-medium">{progress.userName}</p>
                          <p className="text-sm text-muted-foreground">{progress.courseTitle}</p>
                        </div>
                        <Badge className="bg-muted text-white">100%</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-border dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    Not Started
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allProgress.filter(p => p.status === "not_started").length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">All assigned courses have been started.</p>
                  ) : (
                    allProgress.filter(p => p.status === "not_started").map((progress, idx) => (
                      <div key={`notstarted-${idx}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-border dark:border-white/10">
                        <div>
                          <p className="text-foreground font-medium">{progress.userName}</p>
                          <p className="text-sm text-muted-foreground">{progress.courseTitle}</p>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-black/40 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-foreground">All Learner Progress</CardTitle>
                <CardDescription>Complete overview of all employees' training progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-white/10">
                        <th className="text-left p-3 text-muted-foreground font-medium">Employee</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Course</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Progress</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Time Spent</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProgress.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted-foreground">
                            No learning progress recorded. Assign courses to employees to get started.
                          </td>
                        </tr>
                      ) : (
                        allProgress.map((progress, idx) => (
                          <tr key={`row-${idx}`} className="border-b border-border dark:border-white/5 hover:bg-white/5">
                            <td className="p-3 text-foreground">{progress.userName}</td>
                            <td className="p-3 text-muted-foreground">{progress.courseTitle}</td>
                            <td className="p-3">
                              <Badge 
                                variant={progress.status === "completed" ? "default" : progress.status === "in_progress" ? "secondary" : "outline"}
                                className={progress.status === "completed" ? "bg-muted" : ""}
                              >
                                {progress.status === "completed" ? "Completed" : progress.status === "in_progress" ? "In Progress" : "Not Started"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${progress.status === "completed" ? "bg-muted" : "bg-primary"}`}
                                    style={{ width: `${progress.progress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{Math.round((progress.timeSpent || 0) / 60)}h</td>
                            <td className="p-3">
                              {progress.status !== "completed" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openReminderDialog(progress)}
                                  data-testid={`button-remind-${progress.userId}-${progress.courseId}`}
                                  className="gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  Remind
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gamification" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-primary/20 to-background/20 border-primary/30">
                <CardHeader>
                  <CardDescription>Total Points</CardDescription>
                  <CardTitle className="text-4xl text-foreground flex items-center gap-2">
                    <Trophy className="w-8 h-8 text-foreground" />
                    {stats.totalPoints || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-muted/20 to-background/20 border-border/30">
                <CardHeader>
                  <CardDescription>Current Level</CardDescription>
                  <CardTitle className="text-4xl text-foreground flex items-center gap-2">
                    <Star className="w-8 h-8 text-foreground" />
                    {stats.level || 1}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-muted/20 to-background/20 border-border/30">
                <CardHeader>
                  <CardDescription>Global Rank</CardDescription>
                  <CardTitle className="text-4xl text-foreground flex items-center gap-2">
                    <TrendingUp className="w-8 h-8 text-foreground" />
                    #{stats.rank || "-"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="bg-black/40 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-foreground">Badges Earned by Employees</CardTitle>
                <CardDescription>Recognition for learning achievements across the organization</CardDescription>
              </CardHeader>
              <CardContent>
                {allBadges.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No badges earned yet. Assign courses to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allBadges.map((badge, idx) => (
                      <div
                        key={`${badge.id}-${idx}`}
                        className={`p-4 rounded-lg bg-black/40 border-2 ${getRarityColor(badge.rarity)} flex items-center gap-4 hover:scale-[1.02] transition-transform`}
                        data-testid={`badge-${badge.id}`}
                      >
                        {badge.imageUrl ? (
                          <img src={badge.imageUrl} alt={badge.name} className="w-12 h-12" />
                        ) : (
                          <div className="text-4xl">🏆</div>
                        )}
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{badge.userName}</p>
                          <p className="text-sm text-muted-foreground">{badge.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {badge.rarity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">+{badge.points} pts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-black/40 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-foreground">Top Learners</CardTitle>
                <CardDescription>Employee rankings based on learning achievements</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Complete courses to join the leaderboard!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-4 p-4 rounded-lg bg-black/20 border border-border dark:border-white/5`}
                        data-testid={`leaderboard-entry-${entry.userId}`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          index === 0 ? "bg-muted/20 text-foreground" :
                          index === 1 ? "bg-muted/20 text-muted-foreground" :
                          index === 2 ? "bg-muted/20 text-foreground" :
                          "bg-primary/20 text-primary"
                        }`}>
                          {entry.rank || index + 1}
                        </div>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-background text-foreground font-semibold">
                          {entry.userName?.substring(0, 2).toUpperCase() || "??"}
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{entry.userName}</p>
                          <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-bold">{entry.points}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="bg-black/95 border-border dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send Course Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-white/5 p-4 rounded-lg border border-border dark:border-white/10">
              <p className="text-sm text-muted-foreground mb-1">Sending reminder to:</p>
              <p className="text-foreground font-medium">{reminderProgress?.userName}</p>
              <p className="text-sm text-muted-foreground mt-2 mb-1">About course:</p>
              <p className="text-foreground">{reminderProgress?.courseTitle}</p>
              <p className="text-sm text-muted-foreground mt-2">Current progress: {reminderProgress?.progress}%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-message" className="text-foreground">Message</Label>
              <Textarea
                id="reminder-message"
                placeholder="Enter your reminder message..."
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={4}
                className="bg-white/5 border-border dark:border-white/10 text-foreground"
                data-testid="input-reminder-message"
              />
              <p className="text-xs text-muted-foreground">This message will be sent via WhatsApp if the employee has a phone number on file.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)} data-testid="button-cancel-reminder">
              Cancel
            </Button>
            <Button 
              onClick={handleSendReminder} 
              disabled={sendReminderMutation.isPending || !reminderMessage.trim()}
              data-testid="button-send-reminder"
            >
              {sendReminderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
