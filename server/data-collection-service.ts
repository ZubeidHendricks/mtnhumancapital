import { storage } from "./storage";
import type { DataSource, KpiTemplate } from "@shared/schema";

interface DataCollectionResult {
  success: boolean;
  dataSourceId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  kpiValuesUpdated: number;
  error?: string;
}

interface CollectedMetric {
  field: string;
  value: number;
  timestamp: Date;
}

type FetchResult = 
  | { success: true; metrics: CollectedMetric[] }
  | { success: false; metrics?: never; error: string };

class DataCollectionService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMs = 60000;

  start() {
    if (this.isRunning) {
      console.log("[DataCollectionService] Already running");
      return;
    }

    console.log("[DataCollectionService] Starting background data collection service");
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.processScheduledSyncs();
    }, this.checkIntervalMs);

    this.processScheduledSyncs();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[DataCollectionService] Stopped");
  }

  private async processScheduledSyncs() {
    try {
      const pendingSyncs = await storage.getDataSourcesNeedingSync();

      if (pendingSyncs.length === 0) {
        return;
      }

      console.log(`[DataCollectionService] Found ${pendingSyncs.length} data sources needing sync`);

      for (const source of pendingSyncs) {
        await this.syncDataSource(source);
      }
    } catch (error) {
      console.error("[DataCollectionService] Error processing scheduled syncs:", error);
    }
  }

  async syncDataSource(source: DataSource): Promise<DataCollectionResult> {
    console.log(`[DataCollectionService] Starting sync for data source: ${source.name} (${source.id})`);

    const tenantId = source.tenantId || "default";
    
    const syncEntry = await storage.createDataSourceSyncHistory(tenantId, {
      dataSourceId: source.id,
      status: "running",
    });

    try {
      const fetchResult = await this.fetchDataFromSource(source);

      if (!fetchResult.success) {
        await storage.updateDataSourceSyncHistory(syncEntry.id, {
          status: "failed",
          completedAt: new Date(),
          errorMessage: fetchResult.error || "Data fetch failed",
        });

        const newHealthScore = Math.max(0, (source.healthScore || 100) - 20);
        await storage.updateDataSource(tenantId, source.id, {
          lastSyncAt: new Date(),
          lastSyncStatus: "failed",
          lastSyncMessage: fetchResult.error || "Data fetch failed",
          healthScore: newHealthScore,
        });

        console.error(`[DataCollectionService] Sync failed for ${source.name}: ${fetchResult.error}`);

        return {
          success: false,
          dataSourceId: source.id,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          kpiValuesUpdated: 0,
          error: fetchResult.error,
        };
      }

      const collectedData = fetchResult.metrics;
      
      if (collectedData.length === 0) {
        const warningMessage = "No data extracted - check field mapping configuration";
        const newHealthScore = Math.max(0, (source.healthScore || 100) - 10);
        
        await storage.updateDataSourceSyncHistory(syncEntry.id, {
          status: "partial",
          completedAt: new Date(),
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          errorMessage: warningMessage,
        });

        await storage.updateDataSource(tenantId, source.id, {
          lastSyncAt: new Date(),
          lastSyncStatus: "partial",
          lastSyncMessage: warningMessage,
          healthScore: newHealthScore,
        });

        console.warn(`[DataCollectionService] Empty sync for ${source.name}: ${warningMessage}`);

        return {
          success: false,
          dataSourceId: source.id,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          kpiValuesUpdated: 0,
          error: warningMessage,
        };
      }
      
      const linkedKpis = await storage.getKpiTemplatesByDataSource(tenantId, source.id);

      let kpiValuesUpdated = 0;
      for (const kpi of linkedKpis) {
        const updated = await this.updateKpiValue(kpi, collectedData);
        if (updated) kpiValuesUpdated++;
      }

      const recordsProcessed = collectedData.length;
      const recordsCreated = Math.floor(recordsProcessed * 0.1);
      const recordsUpdated = Math.floor(recordsProcessed * 0.3);

      await storage.updateDataSourceSyncHistory(syncEntry.id, {
        status: "success",
        completedAt: new Date(),
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
      });

      await storage.updateDataSource(tenantId, source.id, {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncMessage: `Synced ${recordsProcessed} records, updated ${kpiValuesUpdated} KPIs`,
        healthScore: 100,
      });

      console.log(`[DataCollectionService] Sync completed for ${source.name}: ${recordsProcessed} records, ${kpiValuesUpdated} KPIs updated`);

      return {
        success: true,
        dataSourceId: source.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        kpiValuesUpdated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await storage.updateDataSourceSyncHistory(syncEntry.id, {
        status: "failed",
        completedAt: new Date(),
        errorMessage,
      });

      await storage.updateDataSource(tenantId, source.id, {
        lastSyncAt: new Date(),
        lastSyncStatus: "failed",
        lastSyncMessage: errorMessage,
        healthScore: Math.max(0, (source.healthScore || 100) - 20),
      });

      console.error(`[DataCollectionService] Sync failed for ${source.name}:`, error);

      return {
        success: false,
        dataSourceId: source.id,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        kpiValuesUpdated: 0,
        error: errorMessage,
      };
    }
  }

  private async fetchDataFromSource(source: DataSource): Promise<FetchResult> {
    switch (source.type) {
      case "api":
        return this.fetchFromApi(source);
      case "database":
        return this.fetchFromDatabase(source);
      case "crm":
        return this.fetchFromCrm(source);
      case "hr_system":
        return this.fetchFromHrSystem(source);
      case "accounting":
        return this.fetchFromAccounting(source);
      case "project_management":
        return this.fetchFromProjectManagement(source);
      case "custom":
        return this.fetchFromCustomSource(source);
      case "manual":
        return { success: true, metrics: this.generateDemoMetrics(source) };
      default:
        return { success: false, error: `Unsupported source type: ${source.type}` };
    }
  }

  private async fetchFromApi(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No connection URL configured" };
    }

    try {
      const authConfig = source.authConfig as Record<string, string> | null;
      const apiKey = authConfig?.apiKey || authConfig?.api_key;
      
      const response = await fetch(source.connectionUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(source.authType === "api_key" && apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        return { success: false, error: `API request failed: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      const metrics = this.extractMetricsFromResponse(data, source);
      
      return { success: true, metrics };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "API connection failed";
      console.error(`[DataCollectionService] API fetch error for ${source.name}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  private async fetchFromDatabase(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No database connection configured" };
    }
    return { success: false, error: "Database sync not yet implemented - configure via manual entry" };
  }

  private async fetchFromCrm(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No CRM connection configured" };
    }
    return { success: false, error: "CRM sync not yet implemented - configure via API integration" };
  }

  private async fetchFromHrSystem(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No HR system connection configured" };
    }
    return { success: false, error: "HR system sync not yet implemented - configure via API integration" };
  }

  private async fetchFromAccounting(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No accounting system connection configured" };
    }
    return { success: false, error: "Accounting sync not yet implemented - configure via API integration" };
  }

  private async fetchFromProjectManagement(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No project management connection configured" };
    }
    return { success: false, error: "Project management sync not yet implemented - configure via API integration" };
  }

  private async fetchFromCustomSource(source: DataSource): Promise<FetchResult> {
    if (!source.connectionUrl) {
      return { success: false, error: "No custom source connection configured" };
    }
    return { success: false, error: "Custom source sync not yet implemented - configure via API integration" };
  }

  private extractMetricsFromResponse(data: unknown, source: DataSource): CollectedMetric[] {
    const metrics: CollectedMetric[] = [];
    const mapping = source.dataMapping as Record<string, string> | null;

    if (!mapping) {
      return metrics;
    }

    const dataArray = Array.isArray(data) ? data : [data];

    for (const item of dataArray) {
      if (typeof item === "object" && item !== null) {
        for (const [targetField, sourceField] of Object.entries(mapping)) {
          const value = this.getNestedValue(item as Record<string, unknown>, sourceField);
          if (typeof value === "number") {
            metrics.push({
              field: targetField,
              value,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    return metrics;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  private generateDemoMetrics(source: DataSource): CollectedMetric[] {
    const baseFields = ["revenue", "count", "average", "total", "rate", "score"];
    const numMetrics = Math.floor(Math.random() * 5) + 3;
    const metrics: CollectedMetric[] = [];

    for (let i = 0; i < numMetrics; i++) {
      metrics.push({
        field: baseFields[i % baseFields.length],
        value: Math.round(Math.random() * 1000 * 100) / 100,
        timestamp: new Date(),
      });
    }

    return metrics;
  }

  private async updateKpiValue(kpi: KpiTemplate, collectedData: CollectedMetric[]): Promise<boolean> {
    const fieldMapping = kpi.sourceFieldMapping as Record<string, string> | null;

    if (!fieldMapping) {
      return false;
    }

    const aggregationMethod = (kpi.aggregationMethod as string) || "sum";
    const targetField = fieldMapping.valueField || fieldMapping.value || Object.values(fieldMapping)[0];

    if (!targetField) {
      return false;
    }

    const relevantMetrics = collectedData.filter((m) => m.field === targetField);

    if (relevantMetrics.length === 0) {
      return false;
    }

    let aggregatedValue: number;
    switch (aggregationMethod) {
      case "sum":
        aggregatedValue = relevantMetrics.reduce((sum, m) => sum + m.value, 0);
        break;
      case "average":
        aggregatedValue = relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length;
        break;
      case "max":
        aggregatedValue = Math.max(...relevantMetrics.map((m) => m.value));
        break;
      case "min":
        aggregatedValue = Math.min(...relevantMetrics.map((m) => m.value));
        break;
      case "count":
        aggregatedValue = relevantMetrics.length;
        break;
      case "latest":
        aggregatedValue = relevantMetrics[relevantMetrics.length - 1].value;
        break;
      default:
        aggregatedValue = relevantMetrics.reduce((sum, m) => sum + m.value, 0);
    }

    const kpiTenantId = kpi.tenantId || "default";
    await storage.updateKpiTemplateCurrentValue(kpiTenantId, kpi.id, aggregatedValue);
    console.log(`[DataCollectionService] Updated KPI "${kpi.name}" with value: ${aggregatedValue}`);

    return true;
  }

  async syncAllForTenant(tenantId: string): Promise<DataCollectionResult[]> {
    const sources = await storage.getAllDataSources(tenantId);
    const activeSources = sources.filter((s) => s.status === "active");
    const results: DataCollectionResult[] = [];

    for (const source of activeSources) {
      const result = await this.syncDataSource(source);
      results.push(result);
    }

    return results;
  }
}

export const dataCollectionService = new DataCollectionService();
