interface ScraperRunRecord {
  lastRunAt: Date | null;
  lastStatus: string;
  lastError: string | null;
  successCount: number;
  failureCount: number;
  totalCandidatesFound: number;
}

export interface ScraperHealthInfo extends ScraperRunRecord {
  status: "green" | "yellow" | "red";
}

export class ScraperHealthTracker {
  private records: Map<string, ScraperRunRecord> = new Map();

  recordRun(
    platform: string,
    status: "success" | "partial" | "failed",
    candidateCount: number,
    error?: string
  ): void {
    const existing = this.records.get(platform) ?? {
      lastRunAt: null,
      lastStatus: "",
      lastError: null,
      successCount: 0,
      failureCount: 0,
      totalCandidatesFound: 0,
    };

    existing.lastRunAt = new Date();
    existing.lastStatus = status;
    existing.lastError = error ?? null;
    existing.totalCandidatesFound += candidateCount;

    if (status === "failed") {
      existing.failureCount++;
    } else {
      existing.successCount++;
    }

    this.records.set(platform, existing);
  }

  getStatus(platform: string): "green" | "yellow" | "red" {
    const record = this.records.get(platform);
    if (!record || !record.lastRunAt) {
      return "red";
    }
    if (record.lastStatus === "failed") {
      return "red";
    }
    if (record.lastStatus === "partial") {
      return "yellow";
    }
    return "green";
  }

  getHealth(platform: string): ScraperHealthInfo {
    const record = this.records.get(platform);
    if (!record) {
      return {
        lastRunAt: null,
        lastStatus: "never_run",
        lastError: null,
        successCount: 0,
        failureCount: 0,
        totalCandidatesFound: 0,
        status: "red",
      };
    }
    return {
      ...record,
      status: this.getStatus(platform),
    };
  }

  getAllHealth(): Record<string, ScraperHealthInfo> {
    const result: Record<string, ScraperHealthInfo> = {};
    for (const platform of Array.from(this.records.keys())) {
      result[platform] = this.getHealth(platform);
    }
    return result;
  }
}

export function checkApiKeyStatus(): Record<string, boolean> {
  return {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    APIFY_TOKEN: !!process.env.APIFY_TOKEN,
    GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
    PNET_SESSION_COOKIES: !!process.env.PNET_SESSION_COOKIES,
  };
}

export const scraperHealth = new ScraperHealthTracker();
