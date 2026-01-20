import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Database, RefreshCw, Settings, Trash2, Edit2,
  CheckCircle, Clock, AlertCircle, XCircle, Activity, Link,
  Server, FileSpreadsheet, Globe, Users, Loader2, Play,
  ChevronRight, BarChart3, Zap, Cloud, Table
} from "lucide-react";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import type { DataSource, DataSourceSyncHistory } from "@shared/schema";
import { Link as RouterLink } from "wouter";

const DATA_SOURCE_TYPES = [
  { value: "crm", label: "CRM System", icon: Users, description: "Salesforce, HubSpot, Zoho" },
  { value: "hr", label: "HR System", icon: Users, description: "BambooHR, Workday, SAP" },
  { value: "financial", label: "Financial System", icon: BarChart3, description: "Xero, QuickBooks, SAP" },
  { value: "database", label: "Direct Database", icon: Database, description: "PostgreSQL, MySQL, MongoDB" },
  { value: "api", label: "REST API", icon: Globe, description: "Custom API endpoints" },
  { value: "spreadsheet", label: "Spreadsheet", icon: FileSpreadsheet, description: "Google Sheets, Excel" },
  { value: "manual", label: "Manual Entry", icon: Edit2, description: "User-entered data" },
];

const TYPE_CONFIGS: Record<string, { fields: { name: string; label: string; type: string; placeholder?: string; required?: boolean }[] }> = {
  crm: {
    fields: [
      { name: "provider", label: "CRM Provider", type: "select", required: true },
      { name: "apiKey", label: "API Key", type: "password", required: true },
      { name: "instanceUrl", label: "Instance URL", type: "text", placeholder: "https://your-instance.salesforce.com" },
      { name: "sandboxMode", label: "Sandbox Mode", type: "checkbox" },
    ]
  },
  hr: {
    fields: [
      { name: "provider", label: "HR Provider", type: "select", required: true },
      { name: "apiKey", label: "API Key", type: "password", required: true },
      { name: "companyId", label: "Company ID", type: "text" },
    ]
  },
  financial: {
    fields: [
      { name: "provider", label: "Financial System", type: "select", required: true },
      { name: "clientId", label: "Client ID", type: "text", required: true },
      { name: "clientSecret", label: "Client Secret", type: "password", required: true },
      { name: "tenantId", label: "Tenant ID", type: "text" },
    ]
  },
  database: {
    fields: [
      { name: "dbType", label: "Database Type", type: "select", required: true },
      { name: "host", label: "Host", type: "text", placeholder: "localhost", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "5432", required: true },
      { name: "database", label: "Database Name", type: "text", required: true },
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "ssl", label: "Use SSL", type: "checkbox" },
    ]
  },
  api: {
    fields: [
      { name: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.example.com", required: true },
      { name: "authType", label: "Authentication Type", type: "select", required: true },
      { name: "apiKey", label: "API Key / Token", type: "password" },
      { name: "headers", label: "Custom Headers (JSON)", type: "textarea" },
    ]
  },
  spreadsheet: {
    fields: [
      { name: "provider", label: "Spreadsheet Provider", type: "select", required: true },
      { name: "spreadsheetId", label: "Spreadsheet ID / URL", type: "text", required: true },
      { name: "sheetName", label: "Sheet Name", type: "text" },
      { name: "headerRow", label: "Header Row", type: "number", placeholder: "1" },
    ]
  },
  manual: {
    fields: [
      { name: "inputFormat", label: "Input Format", type: "select", required: true },
      { name: "validationRules", label: "Validation Rules (JSON)", type: "textarea" },
    ]
  },
};

export default function DataSourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState("all");
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const dataSourcesKey = useTenantQueryKey(["data-sources"]);

  const { data: dataSources = [], isLoading } = useQuery<DataSource[]>({
    queryKey: dataSourcesKey,
    queryFn: async () => {
      const response = await api.get("/data-sources");
      return response.data;
    },
  });

  const createSourceMutation = useMutation({
    mutationFn: async (data: Partial<DataSource>) => {
      if (editingSource) {
        return api.patch(`/data-sources/${editingSource.id}`, data);
      }
      return api.post("/data-sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataSourcesKey });
      handleCloseDialog();
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/data-sources/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dataSourcesKey })
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingConnection(id);
      const response = await api.post(`/data-sources/${id}/test-connection`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataSourcesKey });
      setTestingConnection(null);
    },
    onError: () => {
      setTestingConnection(null);
    }
  });

  const syncSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      setSyncingSource(id);
      const response = await api.post(`/data-sources/${id}/sync`);
      return response.data;
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: dataSourcesKey });
        setSyncingSource(null);
      }, 2500);
    },
    onError: () => {
      setSyncingSource(null);
    }
  });

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingSource(null);
    setSelectedType("");
    setFormData({});
  };

  const handleOpenAddDialog = () => {
    setEditingSource(null);
    setSelectedType("");
    setFormData({});
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (source: DataSource) => {
    setEditingSource(source);
    setSelectedType(source.type);
    setFormData({
      name: source.name,
      description: source.description || "",
      refreshSchedule: source.refreshSchedule || "daily",
      connectionUrl: source.connectionUrl || "",
      authType: source.authType || "",
      ...((source.authConfig as Record<string, any>) || {}),
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    const { name, description, refreshSchedule, connectionUrl, authType, ...authConfig } = formData;
    createSourceMutation.mutate({
      name,
      description,
      type: selectedType,
      refreshSchedule,
      connectionUrl,
      authType,
      authConfig,
    });
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

  const getTypeIcon = (type: string) => {
    const typeConfig = DATA_SOURCE_TYPES.find(t => t.value === type);
    return typeConfig?.icon || Database;
  };

  const filteredSources = dataSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || source.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: dataSources.length,
    active: dataSources.filter(s => s.status === "active").length,
    pending: dataSources.filter(s => s.status === "pending").length,
    error: dataSources.filter(s => s.status === "error").length,
    avgHealth: dataSources.length > 0
      ? Math.round(dataSources.reduce((sum, s) => sum + (s.healthScore || 0), 0) / dataSources.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2" data-testid="page-title">
              <Database className="h-7 w-7 text-blue-500" />
              Data Sources Hub
            </h1>
            <p className="text-gray-400 mt-1">
              Connect and manage external data sources for automatic KPI tracking
            </p>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-add-source"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Data Source
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Sources</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-total">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Database className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active</p>
                  <p className="text-2xl font-bold text-green-400" data-testid="stat-active">{stats.active}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending Setup</p>
                  <p className="text-2xl font-bold text-yellow-400" data-testid="stat-pending">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Health</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-health">{stats.avgHealth}%</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <Progress value={stats.avgHealth} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="bg-gray-900/50 border border-gray-800">
              <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
                All Sources
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-blue-600">
                Active
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600">
                Pending
              </TabsTrigger>
              <TabsTrigger value="error" className="data-[state=active]:bg-blue-600">
                Errors
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search data sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-800 text-white"
                data-testid="input-search"
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredSources.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No data sources found</h3>
                  <p className="text-gray-400 mb-4">
                    {searchQuery ? "Try adjusting your search" : "Get started by adding your first data source"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={handleOpenAddDialog} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Data Source
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSources.map((source) => {
                  const TypeIcon = getTypeIcon(source.type);
                  return (
                    <Card
                      key={source.id}
                      className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors"
                      data-testid={`card-source-${source.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <TypeIcon className="h-5 w-5 text-blue-400" />
                            </div>
                            <RouterLink href={`/data-sources/${source.id}`}>
                              <div className="cursor-pointer hover:opacity-80">
                                <CardTitle className="text-white text-lg">{source.name}</CardTitle>
                                <CardDescription className="text-gray-500 capitalize">
                                  {source.type.replace(/_/g, " ")}
                                </CardDescription>
                              </div>
                            </RouterLink>
                          </div>
                          {getStatusBadge(source.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {source.description && (
                          <p className="text-gray-400 text-sm line-clamp-2">{source.description}</p>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Health Score</span>
                          <span className="text-white font-medium">{source.healthScore || 0}%</span>
                        </div>
                        <Progress value={source.healthScore || 0} className="h-1" />

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Last Sync</span>
                            <p className="text-white">
                              {source.lastSyncAt
                                ? formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })
                                : "Never"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Frequency</span>
                            <p className="text-white capitalize">{source.refreshSchedule || "Manual"}</p>
                          </div>
                        </div>

                        {source.lastSyncStatus && (
                          <div className="flex items-center gap-2 text-sm">
                            {source.lastSyncStatus === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : source.lastSyncStatus === "failed" ? (
                              <XCircle className="h-4 w-4 text-red-400" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-400" />
                            )}
                            <span className={
                              source.lastSyncStatus === "success" ? "text-green-400" :
                              source.lastSyncStatus === "failed" ? "text-red-400" : "text-yellow-400"
                            }>
                              {source.lastSyncMessage || source.lastSyncStatus}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testConnectionMutation.mutate(source.id)}
                            disabled={testingConnection === source.id}
                            className="flex-1 text-gray-400 hover:text-white hover:bg-gray-800"
                            data-testid={`button-test-${source.id}`}
                          >
                            {testingConnection === source.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                            <span className="ml-1">Test</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => syncSourceMutation.mutate(source.id)}
                            disabled={syncingSource === source.id || source.status !== "active"}
                            className="flex-1 text-gray-400 hover:text-white hover:bg-gray-800"
                            data-testid={`button-sync-${source.id}`}
                          >
                            {syncingSource === source.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-1">Sync</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(source)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                            data-testid={`button-edit-${source.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSourceMutation.mutate(source.id)}
                            className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                            data-testid={`button-delete-${source.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                {editingSource ? "Edit Data Source" : "Add Data Source"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Connect an external data source to automatically collect KPI data
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-300">Name</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="E.g., Salesforce CRM"
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-name"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-300">Sync Frequency</Label>
                  <Select
                    value={formData.refreshSchedule || "daily"}
                    onValueChange={(v) => setFormData({ ...formData, refreshSchedule: v })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Description (Optional)</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what data this source provides..."
                  className="bg-gray-800 border-gray-700 text-white resize-none"
                  rows={2}
                  data-testid="input-description"
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Source Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DATA_SOURCE_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = selectedType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSelectedType(type.value)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                        }`}
                        data-testid={`button-type-${type.value}`}
                      >
                        <TypeIcon className={`h-5 w-5 mb-2 ${isSelected ? "text-blue-400" : "text-gray-400"}`} />
                        <p className={`font-medium ${isSelected ? "text-blue-400" : "text-white"}`}>
                          {type.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedType && TYPE_CONFIGS[selectedType] && (
                <div className="space-y-4 pt-4 border-t border-gray-800">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-400" />
                    Connection Settings
                  </h4>

                  {TYPE_CONFIGS[selectedType].fields.map((field) => (
                    <div key={field.name}>
                      <Label className="text-gray-300">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </Label>
                      {field.type === "select" ? (
                        <Select
                          value={formData[field.name] || ""}
                          onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {field.name === "provider" && selectedType === "crm" && (
                              <>
                                <SelectItem value="salesforce">Salesforce</SelectItem>
                                <SelectItem value="hubspot">HubSpot</SelectItem>
                                <SelectItem value="zoho">Zoho CRM</SelectItem>
                                <SelectItem value="pipedrive">Pipedrive</SelectItem>
                              </>
                            )}
                            {field.name === "provider" && selectedType === "hr" && (
                              <>
                                <SelectItem value="bamboohr">BambooHR</SelectItem>
                                <SelectItem value="workday">Workday</SelectItem>
                                <SelectItem value="sap_successfactors">SAP SuccessFactors</SelectItem>
                                <SelectItem value="adp">ADP</SelectItem>
                              </>
                            )}
                            {field.name === "provider" && selectedType === "financial" && (
                              <>
                                <SelectItem value="xero">Xero</SelectItem>
                                <SelectItem value="quickbooks">QuickBooks</SelectItem>
                                <SelectItem value="sap">SAP</SelectItem>
                                <SelectItem value="sage">Sage</SelectItem>
                              </>
                            )}
                            {field.name === "dbType" && (
                              <>
                                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                                <SelectItem value="mysql">MySQL</SelectItem>
                                <SelectItem value="mongodb">MongoDB</SelectItem>
                                <SelectItem value="sqlserver">SQL Server</SelectItem>
                              </>
                            )}
                            {field.name === "authType" && (
                              <>
                                <SelectItem value="api_key">API Key</SelectItem>
                                <SelectItem value="bearer_token">Bearer Token</SelectItem>
                                <SelectItem value="basic_auth">Basic Auth</SelectItem>
                                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                              </>
                            )}
                            {field.name === "provider" && selectedType === "spreadsheet" && (
                              <>
                                <SelectItem value="google_sheets">Google Sheets</SelectItem>
                                <SelectItem value="excel_online">Excel Online</SelectItem>
                                <SelectItem value="airtable">Airtable</SelectItem>
                              </>
                            )}
                            {field.name === "inputFormat" && (
                              <>
                                <SelectItem value="form">Form Input</SelectItem>
                                <SelectItem value="csv_upload">CSV Upload</SelectItem>
                                <SelectItem value="json_upload">JSON Upload</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      ) : field.type === "textarea" ? (
                        <Textarea
                          value={formData[field.name] || ""}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                          className="bg-gray-800 border-gray-700 text-white resize-none"
                          rows={3}
                        />
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={formData[field.name] || false}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                            className="rounded bg-gray-800 border-gray-700"
                          />
                          <span className="text-gray-400 text-sm">Enable {field.label.toLowerCase()}</span>
                        </div>
                      ) : (
                        <Input
                          type={field.type}
                          value={formData[field.name] || ""}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !selectedType || createSourceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-save"
              >
                {createSourceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingSource ? "Save Changes" : "Add Data Source"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
