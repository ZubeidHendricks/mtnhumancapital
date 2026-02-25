import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useTenantQueryKey } from "@/hooks/useTenant";
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
      active: { variant: "default", icon: CheckCircle, color: "text-foreground" },
      pending: { variant: "secondary", icon: Clock, color: "text-foreground" },
      error: { variant: "destructive", icon: XCircle, color: "text-destructive" },
      inactive: { variant: "outline", icon: AlertCircle, color: "text-muted-foreground" },
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
      success: { color: "text-foreground bg-muted/10", icon: CheckCircle },
      failed: { color: "text-destructive bg-destructive/10", icon: XCircle },
      running: { color: "text-foreground dark:text-foreground bg-muted/10", icon: Loader2 },
      partial: { color: "text-foreground bg-muted/10", icon: AlertCircle },
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
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-12 text-center">
              <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Data Source Not Found</h3>
              <p className="text-muted-foreground mb-4">The requested data source could not be found.</p>
              <Link href="/data-sources">
                <Button className="bg-muted hover:bg-muted">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/data-sources">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
                <div className="p-2 bg-muted/10 rounded-lg">
                  <Database className="h-6 w-6 text-foreground dark:text-foreground" />
                </div>
                {source.name}
              </h1>
              <p className="text-muted-foreground mt-1 capitalize">{source.type.replace(/_/g, " ")} Data Source</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(source.status)}
            <Button
              variant="outline"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testingConnection}
              className="border-gray-700 text-muted-foreground hover:bg-gray-800"
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
              className="bg-muted hover:bg-muted"
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
                  <p className="text-muted-foreground text-sm">Health Score</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-health">{source.healthScore || 0}%</p>
                </div>
                <div className="p-3 bg-muted/10 rounded-lg">
                  <Activity className="h-6 w-6 text-foreground dark:text-foreground" />
                </div>
              </div>
              <Progress value={source.healthScore || 0} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Last Sync</p>
                  <p className="text-lg font-medium text-foreground" data-testid="stat-last-sync">
                    {source.lastSyncAt
                      ? formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })
                      : "Never"}
                  </p>
                </div>
                <div className="p-3 bg-muted/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-foreground dark:text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Sync Frequency</p>
                  <p className="text-lg font-medium text-foreground capitalize" data-testid="stat-frequency">
                    {source.refreshSchedule || "Manual"}
                  </p>
                </div>
                <div className="p-3 bg-muted/10 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Linked KPIs</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-kpis">{linkedKpis.length}</p>
                </div>
                <div className="p-3 bg-muted/10 rounded-lg">
                  <Target className="h-6 w-6 text-foreground dark:text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-muted">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-muted">
              <History className="h-4 w-4 mr-2" />
              Sync History
            </TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-muted">
              <Target className="h-4 w-4 mr-2" />
              Linked KPIs
            </TabsTrigger>
            {source.type === "manual" && (
              <TabsTrigger value="entry" className="data-[state=active]:bg-muted">
                <Edit2 className="h-4 w-4 mr-2" />
                Data Entry
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="data-[state=active]:bg-muted">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-foreground dark:text-foreground" />
                    Source Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.description && (
                    <div>
                      <p className="text-muted-foreground text-sm">Description</p>
                      <p className="text-foreground">{source.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Type</p>
                      <p className="text-foreground capitalize">{source.type.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Category</p>
                      <p className="text-foreground">{source.category || "General"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Connection Type</p>
                      <p className="text-foreground capitalize">{source.connectionType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Auth Type</p>
                      <p className="text-foreground capitalize">{source.authType?.replace(/_/g, " ") || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Created</p>
                    <p className="text-foreground">{format(new Date(source.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-foreground" />
                    Last Sync Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.lastSyncAt ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {source.lastSyncStatus && getSyncStatusBadge(source.lastSyncStatus)}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Time</p>
                        <p className="text-foreground">{format(new Date(source.lastSyncAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      {source.lastSyncMessage && (
                        <div>
                          <p className="text-muted-foreground text-sm">Message</p>
                          <p className="text-foreground">{source.lastSyncMessage}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-muted-foreground">No sync has been performed yet</p>
                      <Button
                        onClick={() => syncMutation.mutate()}
                        disabled={syncing || source.status !== "active"}
                        className="mt-4 bg-muted hover:bg-muted"
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
                <CardTitle className="text-foreground flex items-center gap-2">
                  <History className="h-5 w-5 text-foreground dark:text-foreground" />
                  Sync History
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Recent synchronization attempts and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">No sync history available</p>
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
                            <span className="text-foreground">
                              {format(new Date(entry.startedAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          {entry.completedAt && (
                            <span className="text-muted-foreground text-sm">
                              Duration: {Math.round((new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)}s
                            </span>
                          )}
                        </div>
                        {(entry.recordsProcessed || entry.recordsCreated || entry.recordsUpdated) && (
                          <div className="mt-3 flex gap-6 text-sm">
                            <span className="text-muted-foreground">
                              Processed: <span className="text-foreground">{entry.recordsProcessed || 0}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Created: <span className="text-foreground">{entry.recordsCreated || 0}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Updated: <span className="text-foreground dark:text-foreground">{entry.recordsUpdated || 0}</span>
                            </span>
                          </div>
                        )}
                        {entry.errorMessage && (
                          <p className="mt-2 text-destructive text-sm">{entry.errorMessage}</p>
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
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-foreground dark:text-foreground" />
                  Linked KPI Templates
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  KPIs that collect data from this source
                </CardDescription>
              </CardHeader>
              <CardContent>
                {linkedKpis.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No KPIs are linked to this data source</p>
                    <Link href="/kpi-management">
                      <Button className="bg-muted hover:bg-muted">
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
                            <h4 className="text-foreground font-medium">{kpi.name}</h4>
                            <p className="text-muted-foreground text-sm">{kpi.description}</p>
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
                            <span className="text-muted-foreground">
                              Field: <span className="text-foreground font-mono">{kpi.sourceFieldMapping}</span>
                            </span>
                            {kpi.aggregationMethod && (
                              <span className="text-muted-foreground">
                                Aggregation: <span className="text-foreground capitalize">{kpi.aggregationMethod}</span>
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
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-foreground dark:text-foreground" />
                    Manual Data Entry
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter values for KPIs linked to this manual data source
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {linkedKpis.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No KPIs linked to this data source</p>
                      <p className="text-muted-foreground text-sm mb-4">
                        Create a KPI template and select this data source to enable manual data entry
                      </p>
                      <Link href="/kpi-management">
                        <Button className="bg-muted hover:bg-muted">
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
                                <Label className="text-foreground font-medium">{kpi.name}</Label>
                                <p className="text-muted-foreground text-sm mt-1">{kpi.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                                  <span className="text-muted-foreground">
                                    Type: <span className="text-muted-foreground capitalize">{kpi.measurementType || "Value"}</span>
                                  </span>
                                  {kpi.currentValue !== null && kpi.currentValue !== undefined && (
                                    <span className="text-muted-foreground">
                                      Current: <span className="text-foreground font-medium">{kpi.currentValue}</span>
                                    </span>
                                  )}
                                  {kpi.targetValue !== null && kpi.targetValue !== undefined && (
                                    <span className="text-muted-foreground">
                                      Target: <span className="text-foreground dark:text-foreground">{kpi.targetValue}</span>
                                    </span>
                                  )}
                                  {kpi.lastMeasuredAt && (
                                    <span className="text-muted-foreground">
                                      Last updated: <span className="text-muted-foreground">{new Date(kpi.lastMeasuredAt).toLocaleString()}</span>
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
                        <p className="text-muted-foreground text-sm">
                          {Object.values(manualValues).filter(v => v !== "").length} value(s) ready to save
                        </p>
                        <Button
                          onClick={handleSaveManualValues}
                          disabled={savingValues || Object.values(manualValues).filter(v => v !== "").length === 0}
                          className="bg-muted hover:bg-muted"
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
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Data source connection and sync settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Connection URL</p>
                    <p className="text-white font-mono text-sm bg-gray-800/50 p-2 rounded">
                      {source.connectionUrl || "Not configured"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Data Endpoint</p>
                    <p className="text-white font-mono text-sm bg-gray-800/50 p-2 rounded">
                      {source.dataEndpoint || "Not configured"}
                    </p>
                  </div>
                </div>

                {source.dataMapping ? (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Field Mapping</p>
                    <pre className="text-white text-sm bg-gray-800/50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(source.dataMapping, null, 2) as string}
                    </pre>
                  </div>
                ) : null}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
                  <Link href="/data-sources">
                    <Button variant="outline" className="border-gray-700 text-muted-foreground hover:bg-gray-800">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to List
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
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
