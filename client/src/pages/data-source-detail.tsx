import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database, RefreshCw, ArrowLeft, CheckCircle, Clock, XCircle, Activity,
  AlertCircle, Loader2, Zap, Settings, Calendar, Link as LinkIcon,
  BarChart3, FileText, History, Target, Edit2, Save
} from "lucide-react";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import type { DataSource, DataSourceSyncHistory, KpiTemplate } from "@shared/schema";

export default function DataSourceDetailPage() {
  const [, params] = useRoute("/data-sources/:id");
  const sourceId = params?.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [savingValues, setSavingValues] = useState(false);

  const queryClient = useQueryClient();
  const dataSourceKey = useTenantQueryKey(["data-source", sourceId || ""]);
  const syncHistoryKey = useTenantQueryKey(["data-source-sync-history", sourceId || ""]);
  const linkedKpisKey = useTenantQueryKey(["data-source-kpis", sourceId || ""]);

  const { data: source, isLoading } = useQuery<DataSource>({
    queryKey: dataSourceKey,
    queryFn: async () => {
      const response = await api.get(`/data-sources/${sourceId}`);
      return response.data;
    },
    enabled: !!sourceId
  });

  const { data: syncHistory = [] } = useQuery<DataSourceSyncHistory[]>({
    queryKey: syncHistoryKey,
    queryFn: async () => {
      const response = await api.get(`/data-sources/${sourceId}/sync-history`);
      return response.data;
    },
    enabled: !!sourceId
  });

  const { data: linkedKpis = [] } = useQuery<KpiTemplate[]>({
    queryKey: linkedKpisKey,
    queryFn: async () => {
      const response = await api.get(`/kpi-templates?dataSourceId=${sourceId}`);
      return response.data;
    },
    enabled: !!sourceId
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      setTestingConnection(true);
      const response = await api.post(`/data-sources/${sourceId}/test-connection`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataSourceKey });
      setTestingConnection(false);
    },
    onError: () => {
      setTestingConnection(false);
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true);
      const response = await api.post(`/data-sources/${sourceId}/sync`);
      return response.data;
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: dataSourceKey });
        queryClient.invalidateQueries({ queryKey: syncHistoryKey });
        setSyncing(false);
      }, 2500);
    },
    onError: () => {
      setSyncing(false);
    }
  });

  const saveManualValuesMutation = useMutation({
    mutationFn: async (updates: { kpiId: string; value: number }[]) => {
      setSavingValues(true);
      const promises = updates.map(({ kpiId, value }) => 
        api.patch(`/kpi-templates/${kpiId}`, { 
          currentValue: value,
          lastMeasuredAt: new Date().toISOString()
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkedKpisKey });
      queryClient.invalidateQueries({ queryKey: dataSourceKey });
      setManualValues({});
      setSavingValues(false);
    },
    onError: () => {
      setSavingValues(false);
    }
  });

  const handleSaveManualValues = () => {
    const updates = Object.entries(manualValues)
      .filter(([_, value]) => value !== "" && !isNaN(parseFloat(value)))
      .map(([kpiId, value]) => ({
        kpiId,
        value: parseFloat(value)
      }));
    
    if (updates.length > 0) {
      saveManualValuesMutation.mutate(updates);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }> = {
      active: { variant: "default", icon: CheckCircle, color: "text-green-400" },
      pending: { variant: "secondary", icon: Clock, color: "text-yellow-400" },
      error: { variant: "destructive", icon: XCircle, color: "text-red-400" },
      inactive: { variant: "outline", icon: AlertCircle, color: "text-gray-400" },
    };
    const { variant, icon: Icon, color } = config[status] || config.inactive;
    return (
      <Badge variant={variant} className={`gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getSyncStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      success: { color: "text-green-400 bg-green-500/10", icon: CheckCircle },
      failed: { color: "text-red-400 bg-red-500/10", icon: XCircle },
      running: { color: "text-blue-400 bg-blue-500/10", icon: Loader2 },
      partial: { color: "text-yellow-400 bg-yellow-500/10", icon: AlertCircle },
    };
    const { color, icon: Icon } = config[status] || config.running;
    return (
      <Badge className={`gap-1 ${color}`}>
        <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-12 text-center">
              <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Data Source Not Found</h3>
              <p className="text-gray-400 mb-4">The requested data source could not be found.</p>
              <Link href="/data-sources">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Data Sources
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/data-sources">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="page-title">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Database className="h-6 w-6 text-blue-400" />
                </div>
                {source.name}
              </h1>
              <p className="text-gray-400 mt-1 capitalize">{source.type.replace(/_/g, " ")} Data Source</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(source.status)}
            <Button
              variant="outline"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testingConnection}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              data-testid="button-test-connection"
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncing || source.status !== "active"}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-sync"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Health Score</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-health">{source.healthScore || 0}%</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <Progress value={source.healthScore || 0} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Last Sync</p>
                  <p className="text-lg font-medium text-white" data-testid="stat-last-sync">
                    {source.lastSyncAt
                      ? formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })
                      : "Never"}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Sync Frequency</p>
                  <p className="text-lg font-medium text-white capitalize" data-testid="stat-frequency">
                    {source.refreshSchedule || "Manual"}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Linked KPIs</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-kpis">{linkedKpis.length}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Target className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-600">
              <History className="h-4 w-4 mr-2" />
              Sync History
            </TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-blue-600">
              <Target className="h-4 w-4 mr-2" />
              Linked KPIs
            </TabsTrigger>
            {source.type === "manual" && (
              <TabsTrigger value="entry" className="data-[state=active]:bg-blue-600">
                <Edit2 className="h-4 w-4 mr-2" />
                Data Entry
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Source Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.description && (
                    <div>
                      <p className="text-gray-400 text-sm">Description</p>
                      <p className="text-white">{source.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Type</p>
                      <p className="text-white capitalize">{source.type.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Category</p>
                      <p className="text-white">{source.category || "General"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Connection Type</p>
                      <p className="text-white capitalize">{source.connectionType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Auth Type</p>
                      <p className="text-white capitalize">{source.authType?.replace(/_/g, " ") || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Created</p>
                    <p className="text-white">{format(new Date(source.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    Last Sync Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.lastSyncAt ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status</span>
                        {source.lastSyncStatus && getSyncStatusBadge(source.lastSyncStatus)}
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Time</p>
                        <p className="text-white">{format(new Date(source.lastSyncAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      {source.lastSyncMessage && (
                        <div>
                          <p className="text-gray-400 text-sm">Message</p>
                          <p className="text-white">{source.lastSyncMessage}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No sync has been performed yet</p>
                      <Button
                        onClick={() => syncMutation.mutate()}
                        disabled={syncing || source.status !== "active"}
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run First Sync
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-400" />
                  Sync History
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Recent synchronization attempts and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No sync history available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syncHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                        data-testid={`history-entry-${entry.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getSyncStatusBadge(entry.status)}
                            <span className="text-white">
                              {format(new Date(entry.startedAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          {entry.completedAt && (
                            <span className="text-gray-400 text-sm">
                              Duration: {Math.round((new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)}s
                            </span>
                          )}
                        </div>
                        {(entry.recordsProcessed || entry.recordsCreated || entry.recordsUpdated) && (
                          <div className="mt-3 flex gap-6 text-sm">
                            <span className="text-gray-400">
                              Processed: <span className="text-white">{entry.recordsProcessed || 0}</span>
                            </span>
                            <span className="text-gray-400">
                              Created: <span className="text-green-400">{entry.recordsCreated || 0}</span>
                            </span>
                            <span className="text-gray-400">
                              Updated: <span className="text-blue-400">{entry.recordsUpdated || 0}</span>
                            </span>
                          </div>
                        )}
                        {entry.errorMessage && (
                          <p className="mt-2 text-red-400 text-sm">{entry.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kpis" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-400" />
                  Linked KPI Templates
                </CardTitle>
                <CardDescription className="text-gray-400">
                  KPIs that collect data from this source
                </CardDescription>
              </CardHeader>
              <CardContent>
                {linkedKpis.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No KPIs are linked to this data source</p>
                    <Link href="/kpi-management">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Go to KPI Management
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedKpis.map((kpi) => (
                      <div
                        key={kpi.id}
                        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                        data-testid={`kpi-${kpi.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-medium">{kpi.name}</h4>
                            <p className="text-gray-400 text-sm">{kpi.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{kpi.category}</Badge>
                            <Badge variant="outline" className="capitalize">
                              {kpi.frequency}
                            </Badge>
                          </div>
                        </div>
                        {kpi.sourceFieldMapping && (
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <span className="text-gray-400">
                              Field: <span className="text-white font-mono">{kpi.sourceFieldMapping}</span>
                            </span>
                            {kpi.aggregationMethod && (
                              <span className="text-gray-400">
                                Aggregation: <span className="text-white capitalize">{kpi.aggregationMethod}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {source.type === "manual" && (
            <TabsContent value="entry" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-purple-400" />
                    Manual Data Entry
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Enter values for KPIs linked to this manual data source
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {linkedKpis.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No KPIs linked to this data source</p>
                      <p className="text-gray-500 text-sm mb-4">
                        Create a KPI template and select this data source to enable manual data entry
                      </p>
                      <Link href="/kpi-management">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <Target className="h-4 w-4 mr-2" />
                          Create KPI Template
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {linkedKpis.map((kpi) => (
                          <div
                            key={kpi.id}
                            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <Label className="text-white font-medium">{kpi.name}</Label>
                                <p className="text-gray-400 text-sm mt-1">{kpi.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                                  <span className="text-gray-500">
                                    Type: <span className="text-gray-300 capitalize">{kpi.measurementType || "Value"}</span>
                                  </span>
                                  {kpi.currentValue !== null && kpi.currentValue !== undefined && (
                                    <span className="text-gray-500">
                                      Current: <span className="text-green-400 font-medium">{kpi.currentValue}</span>
                                    </span>
                                  )}
                                  {kpi.targetValue !== null && kpi.targetValue !== undefined && (
                                    <span className="text-gray-500">
                                      Target: <span className="text-blue-400">{kpi.targetValue}</span>
                                    </span>
                                  )}
                                  {kpi.lastMeasuredAt && (
                                    <span className="text-gray-500">
                                      Last updated: <span className="text-gray-400">{new Date(kpi.lastMeasuredAt).toLocaleString()}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="w-40">
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="Enter value"
                                  value={manualValues[kpi.id] || ""}
                                  onChange={(e) => setManualValues({
                                    ...manualValues,
                                    [kpi.id]: e.target.value
                                  })}
                                  className="bg-gray-800 border-gray-700 text-white"
                                  data-testid={`input-kpi-${kpi.id}`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <p className="text-gray-400 text-sm">
                          {Object.values(manualValues).filter(v => v !== "").length} value(s) ready to save
                        </p>
                        <Button
                          onClick={handleSaveManualValues}
                          disabled={savingValues || Object.values(manualValues).filter(v => v !== "").length === 0}
                          className="bg-purple-600 hover:bg-purple-700"
                          data-testid="button-save-values"
                        >
                          {savingValues ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Values
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-400" />
                  Configuration
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Data source connection and sync settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Connection URL</p>
                    <p className="text-white font-mono text-sm bg-gray-800/50 p-2 rounded">
                      {source.connectionUrl || "Not configured"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Data Endpoint</p>
                    <p className="text-white font-mono text-sm bg-gray-800/50 p-2 rounded">
                      {source.dataEndpoint || "Not configured"}
                    </p>
                  </div>
                </div>

                {source.dataMapping ? (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Field Mapping</p>
                    <pre className="text-white text-sm bg-gray-800/50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(source.dataMapping, null, 2) as string}
                    </pre>
                  </div>
                ) : null}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
                  <Link href="/data-sources">
                    <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to List
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="border-red-700 text-red-400 hover:bg-red-500/10"
                    disabled
                  >
                    Delete Data Source
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
