import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BookOpen, Award, Upload, Video, Users, Trophy, Target, FileText, Plus, Edit, Trash2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  status: string;
  enrolledCount?: number;
}

interface Assessment {
  id: string;
  title: string;
  courseId: string;
  type: string;
  questions: any[];
  passingScore: number;
}

interface Certificate {
  id: string;
  name: string;
  templateUrl: string;
}

export default function LMSManagement() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("courses");
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["lms-courses"],
    queryFn: async () => {
      const response = await api.get("/lms/courses");
      return response.data;
    },
  });

  const { data: assessments = [] } = useQuery<Assessment[]>({
    queryKey: ["lms-assessments"],
    queryFn: async () => {
      const response = await api.get("/lms/assessments");
      return response.data;
    },
  });

  const { data: certificates = [] } = useQuery<Certificate[]>({
    queryKey: ["lms-certificates"],
    queryFn: async () => {
      const response = await api.get("/lms/certificates");
      return response.data;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/lms/courses", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-courses"] });
      toast.success("Course created successfully");
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/lms/assessments", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-assessments"] });
      toast.success("Assessment created successfully");
    },
  });

  const uploadCertificateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadingFile(true);
      const response = await api.post("/lms/certificates/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-certificates"] });
      toast.success("Certificate template uploaded");
      setUploadingFile(false);
    },
    onError: () => {
      toast.error("Failed to upload certificate");
      setUploadingFile(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    if (type === "certificate") {
      uploadCertificateMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Learning Management System</h1>
            <p className="text-muted-foreground">Manage courses, assessments, and certifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Learners</p>
                  <p className="text-2xl font-bold">{courses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0)}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Assessments</p>
                  <p className="text-2xl font-bold">{assessments.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Certificates</p>
                  <p className="text-2xl font-bold">{certificates.length}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="gamification">Gamification</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Course Catalogue</CardTitle>
                    <CardDescription>Manage training courses and content</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Course</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createCourseMutation.mutate(Object.fromEntries(formData));
                        }}
                      >
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="title">Course Title</Label>
                            <Input id="title" name="title" required />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" rows={3} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="category">Category</Label>
                              <Select name="category">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="compliance">Compliance</SelectItem>
                                  <SelectItem value="technical">Technical</SelectItem>
                                  <SelectItem value="soft_skills">Soft Skills</SelectItem>
                                  <SelectItem value="leadership">Leadership</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="difficulty">Difficulty</Label>
                              <Select name="difficulty">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input id="duration" name="duration" type="number" />
                          </div>
                          <div>
                            <Label htmlFor="videoUrl">Video URL (or upload)</Label>
                            <Input id="videoUrl" name="videoUrl" type="url" />
                            <Input type="file" accept="video/*" className="mt-2" />
                          </div>
                        </div>
                        <DialogFooter className="mt-4">
                          <Button type="submit">Create Course</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course) => (
                    <Card key={course.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <Badge>{course.category}</Badge>
                          <Badge variant="outline">{course.difficulty}</Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{course.duration} min</span>
                          <span className="text-muted-foreground">{course.enrolledCount || 0} enrolled</span>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Video className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Assessments</CardTitle>
                    <CardDescription>Create and manage course assessments</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Assessment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Assessment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Assessment Title</Label>
                          <Input placeholder="Enter assessment title" />
                        </div>
                        <div>
                          <Label>Course</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Delivery Method</Label>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm">Email</Button>
                            <Button variant="outline" size="sm">WhatsApp</Button>
                            <Button variant="outline" size="sm">In-App</Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button>Create Assessment</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <Card key={assessment.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{assessment.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {assessment.questions.length} questions · Passing score: {assessment.passingScore}%
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gamification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gamification Tools</CardTitle>
                <CardDescription>Manage badges, leaderboards, and awards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                      <h3 className="font-semibold mb-2">Badges</h3>
                      <p className="text-sm text-muted-foreground mb-4">Award badges for achievements</p>
                      <Button size="sm">Manage Badges</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Target className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                      <h3 className="font-semibold mb-2">Leaderboard</h3>
                      <p className="text-sm text-muted-foreground mb-4">View top performers</p>
                      <Button size="sm">View Leaderboard</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Award className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                      <h3 className="font-semibold mb-2">Awards</h3>
                      <p className="text-sm text-muted-foreground mb-4">Distribute learning awards</p>
                      <Button size="sm">Manage Awards</Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Certificate Templates</CardTitle>
                    <CardDescription>Upload and manage certificate templates</CardDescription>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="cert-upload"
                      accept=".pdf,.docx,.png,.jpg"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "certificate")}
                    />
                    <Button asChild disabled={uploadingFile}>
                      <label htmlFor="cert-upload">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Template
                      </label>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload certificate templates with placeholders
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use {"{name}"}, {"{course}"}, {"{date}"}, {"{score}"} as placeholders
                    </p>
                  </div>
                  {certificates.map((cert) => (
                    <Card key={cert.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{cert.name}</h3>
                            <p className="text-sm text-muted-foreground">{cert.templateUrl}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Preview</Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
