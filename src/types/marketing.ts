export interface MarketingProject {
  id: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingIdea {
  id: string;
  projectId?: string;
  title: string;
  vehicleModel?: string;
  brand?: string;
  topic?: string;
  priority: "low" | "medium" | "high";
  source?: string;
  creatorId?: string;
  status: "draft" | "approved" | "writing" | "completed" | "cancelled";
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingScript {
  id: string;
  ideaId?: string;
  hook?: string;
  introduction?: string;
  content?: string;
  cta?: string;
  duration: number; // in seconds
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingVideo {
  id: string;
  scriptId?: string;
  title: string;
  localPath: string; // File path on the local OS
  thumbnail?: string; // Metadata or ncompressed base64 preview
  filmingDate?: string; // ISO string
  editingDate?: string; // ISO string
  postingDate?: string; // ISO string
  tiktokLink?: string;
  facebookLink?: string;
  youtubeLink?: string;
  
  // Performance metrics
  views: number;
  comments: number;
  shares: number;
  saves: number;
  inboxes: number;
  visitors: number; // conversion: customers who visit the shop
  revenue: number; // conversion: revenue generated from this video
  
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingThumbnail {
  id: string;
  videoId: string;
  title: string;
  previewData?: string; // base64 or thumbnail small URL
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCaption {
  id: string;
  title: string;
  content: string;
  category?: string;
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingHashtag {
  id: string;
  tag: string; // Starts with '#'
  category: "Honda" | "Yamaha" | "Vision" | "SH" | "Xe điện" | "Pin Lithium" | "General";
  created_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  targetMonth: string; // YYYY-MM
  targetVideos: number;
  targetViews: number; // BIGINT mapping to number in TS
  targetInboxes: number;
  description?: string;
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCalendarEvent {
  id: string;
  videoId: string;
  scheduledDate: string; // ISO string
  platforms: string[]; // ['TikTok', 'Facebook', 'YouTube']
  status: "scheduled" | "posted" | "missed";
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingAnalyticsSnapshot {
  id: string;
  recordDate: string; // YYYY-MM-DD
  platform: "TikTok" | "Facebook" | "YouTube" | "Website" | "Overall";
  views: number;
  comments: number;
  shares: number;
  saves: number;
  inboxes: number;
  visitors: number;
  revenue: number;
  branchId: string;
  created_at: string;
}

export interface ContentProjectExtension {
  projectId: string;
  workflowStatus:
    | "ideas"
    | "research"
    | "scripting"
    | "review"
    | "shooting"
    | "editing"
    | "thumbnail"
    | "caption"
    | "scheduling"
    | "posted"
    | "kpi_tracking"
    | "completed";
  lessonsLearned?: string;
  branchId: string;
  updated_at: string;
}

export interface ProjectResearch {
  id: string;
  projectId: string;
  title: string;
  content: string;
  links?: string[];
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface ShotListItem {
  id: string;
  projectId: string;
  description: string;
  duration: number; // in seconds
  sequenceOrder: number;
  status: "pending" | "completed";
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface ShootingChecklistItem {
  id: string;
  projectId: string;
  itemName: string;
  isChecked: boolean;
  category?: string; // 'equipment', 'props', 'location', 'personnel'
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface MediaVersion {
  id: string;
  videoId: string;
  versionNumber: number;
  filePath: string;
  notes?: string;
  branchId: string;
  created_at: string;
}

export type Idea = MarketingIdea;
export type Script = MarketingScript;
export type Video = MarketingVideo;
export type Campaign = MarketingCampaign;

