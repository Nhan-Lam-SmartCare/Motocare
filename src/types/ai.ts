export interface AiModel {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  isActive: boolean;
  created_at: string;
}

export interface AiPrompt {
  id: string;
  category:
    | "planning"
    | "idea"
    | "script"
    | "shot_list"
    | "checklist"
    | "video_analyzer"
    | "thumbnail"
    | "caption"
    | "hashtag"
    | "best_time"
    | "campaign_planner"
    | "seo"
    | "rewrite"
    | "insight"
    | "kms_qa"
    | "purchasing_advisor"
    | "sales_advisor"
    | "marketing_advisor"
    | "customer_advisor"
    | "revenue_advisor";
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  isDefault: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiKeySetting {
  id: string;
  provider: string;
  apiKeyMasked: string;
  apiEndpoint?: string;
  updated_at: string;
}

export interface AiLog {
  id: string;
  userId?: string;
  feature: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "failure";
  errorMessage?: string;
  branchId: string;
  created_at: string;
}

// =============================================
// AI STRUCTURED ACTIONS PAYLOADS
// =============================================

export interface AiPlanningItem {
  title: string;
  deadlineDays: number;
  role: string;
  estimatedHours: number;
}

export interface AiIdeaItem {
  title: string;
  vehicleModel: string;
  topic: string;
  potentialScore: number; // 1-10
  suggestedTitles: string[];
}

export interface AiScriptVersion {
  hook: string;
  problem: string;
  story: string;
  solution: string;
  cta: string;
  callToComment: string;
  estimatedDuration: number;
  targetAudience: string;
  targetPlatform: string;
}

export interface AiShotItem {
  sequenceOrder: number;
  description: string;
  cameraAngle: "Close Up" | "Medium Shot" | "Wide Shot" | "Extreme Close Up" | "Low Angle" | "Over the Shoulder";
  cameraMovement: "Static" | "Pan" | "Tilt" | "Zoom" | "Dolly" | "Tracking";
  bRoll: string;
  transition: string;
}

export interface AiChecklistItem {
  itemName: string;
  category: "equipment" | "props" | "location" | "personnel";
  isChecked: boolean;
  remarks: string;
}

export interface AiThumbnailAdvice {
  titleAdvice: string;
  colorCombo: string;
  layoutType: string;
  overlayText: string;
  emotionalVibe: string;
}

export interface AiCaptionAdvice {
  tiktok: string;
  facebook: string;
  youtube: string;
  website: string;
}

export interface AiInsightReport {
  topPerformingVideoId?: string;
  bestHookPattern: string;
  bestCtaPattern: string;
  highTrafficHour: string;
  topConvertingTopic: string;
  textReport: string;
}

export interface AiPurchasingItemAdvice {
  partName: string;
  currentStock: number;
  minStock: number;
  suggestedQuantity: number;
  reason: string;
  recommendedSupplier: string;
}

export interface AiPurchasingAdvice {
  adviceList: AiPurchasingItemAdvice[];
  overallSummary: string;
}

export interface AiSalesItemAdvice {
  comboName: string;
  partsInvolved: string[];
  servicesInvolved: string[];
  targetPrice: number;
  discountPercentage: number;
  reasoning: string;
}

export interface AiSalesAdvice {
  combos: AiSalesItemAdvice[];
  highMarginOpportunities: string;
}

export interface AiMarketingAdviceItem {
  topic: string;
  targetVehicle: string;
  suggestedTitle: string;
  videoBrief: string;
}

export interface AiMarketingAdvice {
  suggestedVideos: AiMarketingAdviceItem[];
  campaignStrategy: string;
}

export interface AiCustomerCareItemAdvice {
  customerName: string;
  phoneNumber: string;
  vehicleModel: string;
  lastVisitDate: string;
  dueService: string;
  aiMessageDraft: string;
}

export interface AiCustomerCareAdvice {
  customersToCare: AiCustomerCareItemAdvice[];
  generalStrategy: string;
}

export interface AiRevenueAnalysis {
  thisWeekTotal: number;
  lastWeekTotal: number;
  growthRate: number;
  analysisText: string;
}

export interface AiDemandForecastItem {
  item: string;
  forecastedDemand: "Cao" | "Trung bình" | "Thấp";
  reason: string;
}

export interface AiPriceOptimizationItem {
  item: string;
  currentPrice: number;
  proposedPrice: number;
  strategy: string;
}

export interface AiRevenueAdvice {
  revenueAnalysis: AiRevenueAnalysis;
  demandForecast: AiDemandForecastItem[];
  priceOptimization: AiPriceOptimizationItem[];
}
