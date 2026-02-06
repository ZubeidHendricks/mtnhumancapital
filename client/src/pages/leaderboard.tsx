import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Star, Zap } from "lucide-react";

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalPoints: number;
  coursesCompleted: number;
  badgesEarned: number;
  rank: number;
}

interface Achievement {
  id: number;
  achievementType: string;
  title: string;
  description: string;
  points: number;
  earnedAt: string;
}

export default function Leaderboard() {
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/gamification/leaderboard"],
  });

  const { data: myAchievements = [] } = useQuery<Achievement[]>({
    queryKey: ["/api/gamification/achievements/me"],
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-teal-400" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getAchievementIcon = (type: string) => {
    const icons = {
      badge: <Badge className="h-8 w-8 text-blue-500" />,
      award: <Award className="h-8 w-8 text-blue-500" />,
      milestone: <Star className="h-8 w-8 text-yellow-500" />,
    };
    return icons[type as keyof typeof icons] || <Zap className="h-8 w-8 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <BackButton />

        <div className="mt-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Leaderboard & Achievements</h1>
            <p className="text-muted-foreground mt-1">
              Track your progress and compete with your peers
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Learners
                </CardTitle>
                <CardDescription>Current leaderboard rankings</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No leaderboard data yet</p>
                    <p className="text-sm">Complete courses to earn points!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          entry.rank <= 3 ? "bg-primary/5 border-primary/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 flex justify-center">
                            {getRankIcon(entry.rank)}
                          </div>
                          <div>
                            <p className="font-medium">{entry.username}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{entry.coursesCompleted} courses</span>
                              <span>{entry.badgesEarned} badges</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {entry.totalPoints}
                          </p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  My Achievements
                </CardTitle>
                <CardDescription>Recently earned</CardDescription>
              </CardHeader>
              <CardContent>
                {myAchievements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No achievements yet</p>
                    <p className="text-sm">Start learning to earn badges!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAchievements.slice(0, 10).map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-shrink-0">
                          {getAchievementIcon(achievement.achievementType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{achievement.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {achievement.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              +{achievement.points} pts
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(achievement.earnedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Achievement Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Trophy className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {myAchievements.filter(a => a.achievementType === "badge").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Badges Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Award className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {myAchievements.filter(a => a.achievementType === "award").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Awards Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-yellow-100">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {myAchievements.reduce((sum, a) => sum + a.points, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
