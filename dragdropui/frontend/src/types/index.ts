export interface DashboardWidget {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'activity' | 'quick-actions';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnalyticsData {
  total_posts: number;
  total_pages: number;
  total_users: number;
  total_comments: number;
  total_media: number;
  active_plugins: number;
}

export interface MediaItem {
  id: number;
  title: string;
  source_url: string;
  mime_type: string;
  date: string;
}

export interface Post {
  id: number;
  title: string;
  status: string;
  author: number;
  date: string;
}

export interface ActivityLogEntry {
  id: number;
  user_id: number;
  action: string;
  object_type: string;
  object_id: number;
  created_at: string;
}
