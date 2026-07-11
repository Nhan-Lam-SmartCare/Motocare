import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../contexts/AppContext";
import type {
  MarketingIdea,
  MarketingScript,
  MarketingVideo,
  MarketingThumbnail,
  MarketingCaption,
  MarketingHashtag,
  MarketingCampaign,
  MarketingCalendarEvent,
  MarketingAnalyticsSnapshot,
  ContentProjectExtension,
  ProjectResearch,
  ShotListItem,
  ShootingChecklistItem,
  MediaVersion,
  MarketingProject,
} from "../types/marketing";
import {
  fetchIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
  fetchScripts,
  createScript,
  updateScript,
  deleteScript,
  fetchVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  fetchThumbnails,
  createThumbnail,
  deleteThumbnail,
  fetchCaptions,
  createCaption,
  updateCaption,
  deleteCaption,
  fetchHashtags,
  createHashtag,
  deleteHashtag,
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchAnalyticsSnapshots,
  createAnalyticsSnapshot,
  fetchProjectExtensions,
  updateProjectExtension,
  fetchProjectResearches,
  createProjectResearch,
  updateProjectResearch,
  deleteProjectResearch,
  fetchShotLists,
  createShotList,
  updateShotList,
  deleteShotList,
  fetchShootingChecklists,
  createShootingChecklist,
  updateShootingChecklist,
  deleteShootingChecklist,
  fetchMediaVersions,
  createMediaVersion,
  deleteMediaVersion,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../lib/repository/marketingRepository";

// =============================================
// IDEAS HOOKS
// =============================================
export function useMarketingIdeas() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-ideas", currentBranchId],
    queryFn: async () => {
      const res = await fetchIdeas();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingIdea() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (idea: Omit<MarketingIdea, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createIdea({ ...idea, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas", currentBranchId] });
    },
  });
}

export function useUpdateMarketingIdea() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingIdea> }) => {
      const res = await updateIdea(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas", currentBranchId] });
    },
  });
}

export function useDeleteMarketingIdea() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteIdea(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas", currentBranchId] });
    },
  });
}

// =============================================
// SCRIPTS HOOKS
// =============================================
export function useMarketingScripts() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-scripts", currentBranchId],
    queryFn: async () => {
      const res = await fetchScripts();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingScript() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (script: Omit<MarketingScript, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createScript({ ...script, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-scripts", currentBranchId] });
    },
  });
}

export function useUpdateMarketingScript() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingScript> }) => {
      const res = await updateScript(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-scripts", currentBranchId] });
    },
  });
}

export function useDeleteMarketingScript() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteScript(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-scripts", currentBranchId] });
    },
  });
}

// =============================================
// VIDEOS HOOKS
// =============================================
export function useMarketingVideos() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-videos", currentBranchId],
    queryFn: async () => {
      const res = await fetchVideos();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingVideo() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (video: Omit<MarketingVideo, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createVideo({ ...video, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos", currentBranchId] });
    },
  });
}

export function useUpdateMarketingVideo() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingVideo> }) => {
      const res = await updateVideo(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos", currentBranchId] });
    },
  });
}

export function useDeleteMarketingVideo() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteVideo(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos", currentBranchId] });
    },
  });
}

// =============================================
// THUMBNAILS HOOKS
// =============================================
export function useMarketingThumbnails() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-thumbnails", currentBranchId],
    queryFn: async () => {
      const res = await fetchThumbnails();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingThumbnail() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (thumb: Omit<MarketingThumbnail, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createThumbnail({ ...thumb, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-thumbnails", currentBranchId] });
    },
  });
}

export function useDeleteMarketingThumbnail() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteThumbnail(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-thumbnails", currentBranchId] });
    },
  });
}

// =============================================
// CAPTIONS HOOKS
// =============================================
export function useMarketingCaptions() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-captions", currentBranchId],
    queryFn: async () => {
      const res = await fetchCaptions();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingCaption() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (caption: Omit<MarketingCaption, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createCaption({ ...caption, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-captions", currentBranchId] });
    },
  });
}

export function useUpdateMarketingCaption() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingCaption> }) => {
      const res = await updateCaption(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-captions", currentBranchId] });
    },
  });
}

export function useDeleteMarketingCaption() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteCaption(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-captions", currentBranchId] });
    },
  });
}

// =============================================
// HASHTAGS HOOKS
// =============================================
export function useMarketingHashtags() {
  return useQuery({
    queryKey: ["marketing-hashtags"],
    queryFn: async () => {
      const res = await fetchHashtags();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useCreateMarketingHashtag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: Omit<MarketingHashtag, "id" | "created_at">) => {
      const res = await createHashtag(tag);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-hashtags"] });
    },
  });
}

export function useDeleteMarketingHashtag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteHashtag(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-hashtags"] });
    },
  });
}

// =============================================
// CAMPAIGNS HOOKS
// =============================================
export function useMarketingCampaigns() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-campaigns", currentBranchId],
    queryFn: async () => {
      const res = await fetchCampaigns();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingCampaign() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (camp: Omit<MarketingCampaign, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createCampaign({ ...camp, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns", currentBranchId] });
    },
  });
}

export function useUpdateMarketingCampaign() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingCampaign> }) => {
      const res = await updateCampaign(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns", currentBranchId] });
    },
  });
}

export function useDeleteMarketingCampaign() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteCampaign(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns", currentBranchId] });
    },
  });
}

// =============================================
// CALENDAR HOOKS
// =============================================
export function useMarketingCalendarEvents() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-calendar", currentBranchId],
    queryFn: async () => {
      const res = await fetchCalendarEvents();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingCalendarEvent() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (event: Omit<MarketingCalendarEvent, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createCalendarEvent({ ...event, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar", currentBranchId] });
    },
  });
}

export function useUpdateMarketingCalendarEvent() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingCalendarEvent> }) => {
      const res = await updateCalendarEvent(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar", currentBranchId] });
    },
  });
}

export function useDeleteMarketingCalendarEvent() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteCalendarEvent(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar", currentBranchId] });
    },
  });
}

// =============================================
// ANALYTICS HOOKS
// =============================================
export function useMarketingAnalyticsSnapshots() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-analytics", currentBranchId],
    queryFn: async () => {
      const res = await fetchAnalyticsSnapshots();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingAnalyticsSnapshot() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (snap: Omit<MarketingAnalyticsSnapshot, "id" | "created_at" | "branchId">) => {
      const res = await createAnalyticsSnapshot({ ...snap, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-analytics", currentBranchId] });
    },
  });
}

// =============================================
// CONTENT PROJECT EXTENSIONS HOOKS
// =============================================
export function useProjectExtensions() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["project-extensions", currentBranchId],
    queryFn: async () => {
      const res = await fetchProjectExtensions();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useUpdateProjectExtension() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string;
      updates: Partial<Omit<ContentProjectExtension, "projectId" | "branchId" | "updated_at">>;
    }) => {
      const res = await updateProjectExtension(projectId, { ...updates });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-extensions", currentBranchId] });
    },
  });
}

// =============================================
// PROJECT RESEARCHES HOOKS
// =============================================
export function useProjectResearches() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["project-researches", currentBranchId],
    queryFn: async () => {
      const res = await fetchProjectResearches();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_005,
  });
}

export function useCreateProjectResearch() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (research: Omit<ProjectResearch, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createProjectResearch({ ...research, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-researches", currentBranchId] });
    },
  });
}

export function useUpdateProjectResearch() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ProjectResearch, "id" | "projectId" | "branchId" | "created_at" | "updated_at">>;
    }) => {
      const res = await updateProjectResearch(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-researches", currentBranchId] });
    },
  });
}

export function useDeleteProjectResearch() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteProjectResearch(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-researches", currentBranchId] });
    },
  });
}

// =============================================
// SHOT LISTS HOOKS
// =============================================
export function useShotLists() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["shot-lists", currentBranchId],
    queryFn: async () => {
      const res = await fetchShotLists();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateShotList() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (shot: Omit<ShotListItem, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createShotList({ ...shot, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shot-lists", currentBranchId] });
    },
  });
}

export function useUpdateShotList() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ShotListItem, "id" | "projectId" | "branchId" | "created_at" | "updated_at">>
    }) => {
      const res = await updateShotList(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shot-lists", currentBranchId] });
    },
  });
}

export function useDeleteShotList() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteShotList(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shot-lists", currentBranchId] });
    },
  });
}

// =============================================
// SHOOTING CHECKLISTS HOOKS
// =============================================
export function useShootingChecklists() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["shooting-checklists", currentBranchId],
    queryFn: async () => {
      const res = await fetchShootingChecklists();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateShootingChecklist() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (item: Omit<ShootingChecklistItem, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createShootingChecklist({ ...item, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-checklists", currentBranchId] });
    },
  });
}

export function useUpdateShootingChecklist() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ShootingChecklistItem, "id" | "projectId" | "branchId" | "created_at" | "updated_at">>
    }) => {
      const res = await updateShootingChecklist(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-checklists", currentBranchId] });
    },
  });
}

export function useDeleteShootingChecklist() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteShootingChecklist(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-checklists", currentBranchId] });
    },
  });
}

// =============================================
// MEDIA VERSIONS HOOKS
// =============================================
export function useMediaVersions() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["media-versions", currentBranchId],
    queryFn: async () => {
      const res = await fetchMediaVersions();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMediaVersion() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (version: Omit<MediaVersion, "id" | "created_at" | "branchId">) => {
      const res = await createMediaVersion({ ...version, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-versions", currentBranchId] });
    },
  });
}

export function useDeleteMediaVersion() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteMediaVersion(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-versions", currentBranchId] });
    },
  });
}

// =============================================
// MARKETING PROJECTS HOOKS
// =============================================
export function useMarketingProjects() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["marketing-projects", currentBranchId],
    queryFn: async () => {
      const res = await fetchProjects();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingProject() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (project: Omit<MarketingProject, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createProject({ ...project, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-projects", currentBranchId] });
    },
  });
}

export function useUpdateMarketingProject() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<MarketingProject, "id" | "branchId" | "created_at" | "updated_at">>;
    }) => {
      const res = await updateProject(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-projects", currentBranchId] });
    },
  });
}

export function useDeleteMarketingProject() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteProject(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-projects", currentBranchId] });
    },
  });
}


