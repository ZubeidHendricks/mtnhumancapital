import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Database, Users, BarChart3, Globe, FileSpreadsheet, Edit2,
  CheckCircle, Loader2, ChevronLeft
} from "lucide-react";
import { api } from "@/lib/api";
import type { DataSource } from "@shared/schema";

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
    ]
  },
  api: {
    fields: [
      { name: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.example.com", required: true },
      { name: "authType", label: "Authentication Type", type: "select", required: true },
      { name: "apiKey", label: "API Key / Token", type: "password" },
    ]
  },
  spreadsheet: {
    fields: [
      { name: "provider", label: "Spreadsheet Provider", type: "select", required: true },
      { name: "spreadsheetId", label: "Spreadsheet ID / URL", type: "text", required: true },
      { name: "sheetName", label: "Sheet Name", type: "text" },
    ]
  },
  manual: {
    fields: [
      { name: "inputFormat", label: "Input Format", type: "select", required: true },
    ]
  },
};

interface DataSourceFormProps {
  onSourceCreated: (sourceId: string) => void;
  onCancel?: () => void;
  existingSources?: { id: string; name: string; type: string }[];
  selectedSourceId?: string;
  onSelectSource?: (sourceId: string) => void;
  embedded?: boolean;
}

export function DataSourceForm({
  onSourceCreated,
  onCancel,
  existingSources = [],
  selectedSourceId,
  onSelectSource,
  embedded = false
}: DataSourceFormProps) {
  const [mode, setMode] = useState<"select" | "create">(existingSources.length > 0 ? "select" : "create");
  const [selectedType, setSelectedType] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [creating, setCreating] = useState(false);

  const queryClient = useQueryClient();
  const dataSourcesKey = useTenantQueryKey(["data-sources"]);
  const activeSourcesKey = useTenantQueryKey(["data-sources-active"]);

  const handleSubmit = async () => {
    if (!formData.name?.trim() || !selectedType) return;
    
    setCreating(true);
    try {
      const { name, description, refreshSchedule, connectionUrl, authType, ...authConfig } = formData;
      const response = await api.post("/data-sources", {
        name,
        description,
        type: selectedType,
        refreshSchedule: refreshSchedule || (selectedType === "manual" ? "manual" : "daily"),
        connectionUrl,
        authType,
        authConfig,
        status: "active"
      });
      const newSource = response.data;
      queryClient.invalidateQueries({ queryKey: dataSourcesKey });
      queryClient.invalidateQueries({ queryKey: activeSourcesKey });
      onSourceCreated(newSource.id);
    } catch (error) {
      console.error("Failed to create data source:", error);
    } finally {
      setCreating(false);
    }
  };

  const typeConfig = selectedType ? TYPE_CONFIGS[selectedType] : null;
  const canSubmit = formData.name?.trim() && selectedType;

  return (
    <div className="space-y-6">
      {existingSources.length > 0 && (
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "select" 
                ? "bg-muted text-white" 
                : "text-muted-foreground hover:text-white"
            }`}
            data-testid="tab-select-source"
          >
            Select Existing
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "create" 
                ? "bg-muted text-white" 
                : "text-muted-foreground hover:text-white"
            }`}
            data-testid="tab-create-source"
          >
            Create New
          </button>
        </div>
      )}

      {mode === "select" && existingSources.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select an existing data source to link to this KPI</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {existingSources.map((source) => {
              const TypeIcon = DATA_SOURCE_TYPES.find(t => t.value === source.type)?.icon || Database;
              const isSelected = selectedSourceId === source.id;
              return (
                <div
                  key={source.id}
                  onClick={() => onSelectSource?.(source.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? "border-border bg-muted/10" 
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  }`}
                  data-testid={`card-source-${source.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-700/50 rounded-lg">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{source.name}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{source.type}</Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedSourceId && (
            <Button 
              onClick={() => onSourceCreated(selectedSourceId)}
              className="w-full bg-muted hover:bg-muted"
              data-testid="button-use-selected"
            >
              Use Selected Source
            </Button>
          )}
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <Label className="text-muted-foreground">Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="E.g., Sales Team KPIs"
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-source-name"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-muted-foreground">Sync Frequency</Label>
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
            <Label className="text-muted-foreground">Description (Optional)</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what data this source provides..."
              className="bg-gray-800 border-gray-700 text-white resize-none"
              rows={2}
              data-testid="input-source-description"
            />
          </div>

          <div>
            <Label className="text-muted-foreground mb-3 block">Source Type *</Label>
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
                        ? "border-border bg-muted/10"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    }`}
                    data-testid={`card-type-${type.value}`}
                  >
                    <TypeIcon className={`h-6 w-6 mb-2 ${isSelected ? "text-foreground dark:text-foreground" : "text-muted-foreground"}`} />
                    <p className={`font-medium text-sm ${isSelected ? "text-foreground dark:text-foreground" : "text-white"}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {typeConfig && typeConfig.fields.length > 0 && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm font-medium text-muted-foreground">Configuration</p>
              <div className="grid grid-cols-2 gap-4">
                {typeConfig.fields.map((field) => (
                  <div key={field.name} className={field.type === "textarea" ? "col-span-2" : ""}>
                    <Label className="text-muted-foreground">
                      {field.label} {field.required && "*"}
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
                            </>
                          )}
                          {field.name === "provider" && selectedType === "hr" && (
                            <>
                              <SelectItem value="bamboohr">BambooHR</SelectItem>
                              <SelectItem value="workday">Workday</SelectItem>
                              <SelectItem value="sage">Sage People</SelectItem>
                            </>
                          )}
                          {field.name === "provider" && selectedType === "financial" && (
                            <>
                              <SelectItem value="xero">Xero</SelectItem>
                              <SelectItem value="quickbooks">QuickBooks</SelectItem>
                              <SelectItem value="sage">Sage</SelectItem>
                            </>
                          )}
                          {field.name === "dbType" && (
                            <>
                              <SelectItem value="postgresql">PostgreSQL</SelectItem>
                              <SelectItem value="mysql">MySQL</SelectItem>
                              <SelectItem value="mssql">SQL Server</SelectItem>
                            </>
                          )}
                          {field.name === "authType" && (
                            <>
                              <SelectItem value="api_key">API Key</SelectItem>
                              <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                              <SelectItem value="basic">Basic Auth</SelectItem>
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
            </div>
          )}

          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit || creating}
            className="w-full bg-muted hover:bg-muted"
            data-testid="button-create-source"
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Data Source
          </Button>
        </div>
      )}
    </div>
  );
}
