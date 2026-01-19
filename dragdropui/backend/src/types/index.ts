export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  capabilities: string[];
}

export interface AnalyticsStats {
  overview?: AnalyticsOverview;
  pages?: PageStats[];
  referrers?: ReferrerStats[];
  devices?: DeviceStats[];
  geo?: GeoStats[];
  events?: EventStats[];
}

export interface AnalyticsOverview {
  totalPageViews: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  bounceRate: number;
}

export interface PageStats {
  url: string;
  pageViews: number;
  uniqueVisitors: number;
  averageDuration: number;
}

export interface ReferrerStats {
  referrer: string;
  visits: number;
}

export interface DeviceStats {
  deviceType: string;
  count: number;
}

export interface GeoStats {
  country: string;
  visits: number;
}

export interface EventStats {
  eventName: string;
  count: number;
}

export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  objectType: string;
  objectId: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ServerHealth {
  phpVersion: string;
  memoryLimit: string;
  maxExecutionTime: number;
  diskSpace: {
    total: number;
    free: number;
    used: number;
  };
  database: {
    version: string;
    size: number;
  };
}

export interface Role {
  name: string;
  displayName: string;
  capabilities: string[];
}

export interface MediaItem {
  id: number;
  title: string;
  url: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  tags?: string[];
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  active: boolean;
}

export interface GlobalOptions {
  licenseKey?: string;
  instanceId?: string;
  analyticsEnabled?: boolean;
  activityLogEnabled?: boolean;
  [key: string]: any;
}

export interface RestResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
