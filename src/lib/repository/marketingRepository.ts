import { supabase } from "../../supabaseClient";
import { RepoResult, success, failure } from "./types";
import type {
  MarketingProject,
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
} from "../../types/marketing";

// Helpers
const cleanText = (v: any) => (typeof v === "string" && v.trim() === "" ? null : v);

// =============================================
// PROJECTS
// =============================================
export async function fetchProjects(): Promise<RepoResult<MarketingProject[]>> {
  try {
    const { data, error } = await supabase
      .from("marketing_projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách dự án", cause: error });
    }

    const projects: MarketingProject[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(projects);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải danh sách dự án", cause: e });
  }
}

export async function createProject(project: Omit<MarketingProject, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingProject>> {
  try {
    const { data, error } = await supabase
      .from("marketing_projects")
      .insert({
        name: project.name,
        description: cleanText(project.description),
        status: project.status,
        branch_id: project.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo dự án mới", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo dự án", cause: e });
  }
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<MarketingProject, "id" | "branchId" | "created_at" | "updated_at">>
): Promise<RepoResult<MarketingProject>> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = cleanText(updates.description);
    if (updates.status !== undefined) payload.status = updates.status;

    const { data, error } = await supabase
      .from("marketing_projects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật dự án", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật dự án", cause: e });
  }
}

export async function deleteProject(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("marketing_projects").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa dự án", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa dự án", cause: e });
  }
}

// =============================================
// IDEAS
// =============================================
export async function fetchIdeas(): Promise<RepoResult<MarketingIdea[]>> {
  try {
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách ý tưởng", cause: error });
    }

    const ideas: MarketingIdea[] = (data || []).map((item: any) => ({
      id: item.id,
      projectId: item.project_id,
      title: item.title,
      vehicleModel: item.vehicle_model,
      brand: item.brand,
      topic: item.topic,
      priority: item.priority,
      source: item.source,
      creatorId: item.creator_id,
      status: item.status,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(ideas);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải ý tưởng", cause: e });
  }
}

export async function createIdea(idea: Omit<MarketingIdea, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingIdea>> {
  try {
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        project_id: idea.projectId || null,
        title: idea.title,
        vehicle_model: cleanText(idea.vehicleModel),
        brand: cleanText(idea.brand),
        topic: cleanText(idea.topic),
        priority: idea.priority,
        source: cleanText(idea.source),
        creator_id: idea.creatorId || null,
        status: idea.status,
        branch_id: idea.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo ý tưởng mới", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      vehicleModel: data.vehicle_model,
      brand: data.brand,
      topic: data.topic,
      priority: data.priority,
      source: data.source,
      creatorId: data.creator_id,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo ý tưởng", cause: e });
  }
}

export async function updateIdea(id: string, updates: Partial<MarketingIdea>): Promise<RepoResult<MarketingIdea>> {
  try {
    const payload: any = {};
    if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.vehicleModel !== undefined) payload.vehicle_model = cleanText(updates.vehicleModel);
    if (updates.brand !== undefined) payload.brand = cleanText(updates.brand);
    if (updates.topic !== undefined) payload.topic = cleanText(updates.topic);
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.source !== undefined) payload.source = cleanText(updates.source);
    if (updates.creatorId !== undefined) payload.creator_id = updates.creatorId || null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.branchId !== undefined) payload.branch_id = updates.branchId;

    const { data, error } = await supabase
      .from("ideas")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật ý tưởng", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      vehicleModel: data.vehicle_model,
      brand: data.brand,
      topic: data.topic,
      priority: data.priority,
      source: data.source,
      creatorId: data.creator_id,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật ý tưởng", cause: e });
  }
}

export async function deleteIdea(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa ý tưởng", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa ý tưởng", cause: e });
  }
}

// =============================================
// SCRIPTS
// =============================================
export async function fetchScripts(): Promise<RepoResult<MarketingScript[]>> {
  try {
    const { data, error } = await supabase
      .from("scripts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách kịch bản", cause: error });
    }

    const scripts: MarketingScript[] = (data || []).map((item: any) => ({
      id: item.id,
      ideaId: item.idea_id,
      hook: item.hook,
      introduction: item.introduction,
      content: item.content,
      cta: item.cta,
      duration: item.duration,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(scripts);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải kịch bản", cause: e });
  }
}

export async function createScript(script: Omit<MarketingScript, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingScript>> {
  try {
    const { data, error } = await supabase
      .from("scripts")
      .insert({
        idea_id: script.ideaId || null,
        hook: cleanText(script.hook),
        introduction: cleanText(script.introduction),
        content: cleanText(script.content),
        cta: cleanText(script.cta),
        duration: script.duration,
        branch_id: script.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo kịch bản mới", cause: error });
    }

    return success({
      id: data.id,
      ideaId: data.idea_id,
      hook: data.hook,
      introduction: data.introduction,
      content: data.content,
      cta: data.cta,
      duration: data.duration,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo kịch bản", cause: e });
  }
}

export async function updateScript(id: string, updates: Partial<MarketingScript>): Promise<RepoResult<MarketingScript>> {
  try {
    const payload: any = {};
    if (updates.ideaId !== undefined) payload.idea_id = updates.ideaId || null;
    if (updates.hook !== undefined) payload.hook = cleanText(updates.hook);
    if (updates.introduction !== undefined) payload.introduction = cleanText(updates.introduction);
    if (updates.content !== undefined) payload.content = cleanText(updates.content);
    if (updates.cta !== undefined) payload.cta = cleanText(updates.cta);
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.branchId !== undefined) payload.branch_id = updates.branchId;

    const { data, error } = await supabase
      .from("scripts")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật kịch bản", cause: error });
    }

    return success({
      id: data.id,
      ideaId: data.idea_id,
      hook: data.hook,
      introduction: data.introduction,
      content: data.content,
      cta: data.cta,
      duration: data.duration,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật kịch bản", cause: e });
  }
}

export async function deleteScript(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa kịch bản", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa kịch bản", cause: e });
  }
}

// =============================================
// VIDEOS
// =============================================
export async function fetchVideos(): Promise<RepoResult<MarketingVideo[]>> {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách video", cause: error });
    }

    const videos: MarketingVideo[] = (data || []).map((item: any) => ({
      id: item.id,
      scriptId: item.script_id,
      title: item.title,
      localPath: item.local_path,
      thumbnail: item.thumbnail,
      filmingDate: item.filming_date,
      editingDate: item.editing_date,
      postingDate: item.posting_date,
      tiktokLink: item.tiktok_link,
      facebookLink: item.facebook_link,
      youtubeLink: item.youtube_link,
      views: item.views,
      comments: item.comments,
      shares: item.shares,
      saves: item.saves,
      inboxes: item.inboxes,
      visitors: item.visitors,
      revenue: parseFloat(item.revenue || 0),
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(videos);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải video", cause: e });
  }
}

export async function createVideo(video: Omit<MarketingVideo, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingVideo>> {
  try {
    const { data, error } = await supabase
      .from("videos")
      .insert({
        script_id: video.scriptId || null,
        title: video.title,
        local_path: video.localPath,
        thumbnail: cleanText(video.thumbnail),
        filming_date: video.filmingDate || null,
        editing_date: video.editingDate || null,
        posting_date: video.postingDate || null,
        tiktok_link: cleanText(video.tiktokLink),
        facebook_link: cleanText(video.facebookLink),
        youtube_link: cleanText(video.youtubeLink),
        views: video.views || 0,
        comments: video.comments || 0,
        shares: video.shares || 0,
        saves: video.saves || 0,
        inboxes: video.inboxes || 0,
        visitors: video.visitors || 0,
        revenue: video.revenue || 0,
        branch_id: video.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể lưu video mới", cause: error });
    }

    return success({
      id: data.id,
      scriptId: data.script_id,
      title: data.title,
      localPath: data.local_path,
      thumbnail: data.thumbnail,
      filmingDate: data.filming_date,
      editingDate: data.editing_date,
      postingDate: data.posting_date,
      tiktokLink: data.tiktok_link,
      facebookLink: data.facebook_link,
      youtubeLink: data.youtube_link,
      views: data.views,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      inboxes: data.inboxes,
      visitors: data.visitors,
      revenue: parseFloat(data.revenue || 0),
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi lưu video", cause: e });
  }
}

export async function updateVideo(id: string, updates: Partial<MarketingVideo>): Promise<RepoResult<MarketingVideo>> {
  try {
    const payload: any = {};
    if (updates.scriptId !== undefined) payload.script_id = updates.scriptId || null;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.localPath !== undefined) payload.local_path = updates.localPath;
    if (updates.thumbnail !== undefined) payload.thumbnail = cleanText(updates.thumbnail);
    if (updates.filmingDate !== undefined) payload.filming_date = updates.filmingDate || null;
    if (updates.editingDate !== undefined) payload.editing_date = updates.editingDate || null;
    if (updates.postingDate !== undefined) payload.posting_date = updates.postingDate || null;
    if (updates.tiktokLink !== undefined) payload.tiktok_link = cleanText(updates.tiktokLink);
    if (updates.facebookLink !== undefined) payload.facebook_link = cleanText(updates.facebookLink);
    if (updates.youtubeLink !== undefined) payload.youtube_link = cleanText(updates.youtubeLink);
    if (updates.views !== undefined) payload.views = updates.views;
    if (updates.comments !== undefined) payload.comments = updates.comments;
    if (updates.shares !== undefined) payload.shares = updates.shares;
    if (updates.saves !== undefined) payload.saves = updates.saves;
    if (updates.inboxes !== undefined) payload.inboxes = updates.inboxes;
    if (updates.visitors !== undefined) payload.visitors = updates.visitors;
    if (updates.revenue !== undefined) payload.revenue = updates.revenue;
    if (updates.branchId !== undefined) payload.branch_id = updates.branchId;

    const { data, error } = await supabase
      .from("videos")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật video", cause: error });
    }

    return success({
      id: data.id,
      scriptId: data.script_id,
      title: data.title,
      localPath: data.local_path,
      thumbnail: data.thumbnail,
      filmingDate: data.filming_date,
      editingDate: data.editing_date,
      postingDate: data.posting_date,
      tiktokLink: data.tiktok_link,
      facebookLink: data.facebook_link,
      youtubeLink: data.youtube_link,
      views: data.views,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      inboxes: data.inboxes,
      visitors: data.visitors,
      revenue: parseFloat(data.revenue || 0),
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật video", cause: e });
  }
}

export async function deleteVideo(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa video", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa video", cause: e });
  }
}

// =============================================
// THUMBNAILS
// =============================================
export async function fetchThumbnails(): Promise<RepoResult<MarketingThumbnail[]>> {
  try {
    const { data, error } = await supabase
      .from("thumbnails")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách thumbnail", cause: error });
    }

    const thumbs: MarketingThumbnail[] = (data || []).map((item: any) => ({
      id: item.id,
      videoId: item.video_id,
      title: item.title,
      previewData: item.preview_data,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(thumbs);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải thumbnail", cause: e });
  }
}

export async function createThumbnail(thumb: Omit<MarketingThumbnail, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingThumbnail>> {
  try {
    const { data, error } = await supabase
      .from("thumbnails")
      .insert({
        video_id: thumb.videoId,
        title: thumb.title,
        preview_data: cleanText(thumb.previewData),
        branch_id: thumb.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể thêm thumbnail mới", cause: error });
    }

    return success({
      id: data.id,
      videoId: data.video_id,
      title: data.title,
      previewData: data.preview_data,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi thêm thumbnail", cause: e });
  }
}

export async function deleteThumbnail(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("thumbnails").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa thumbnail", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa thumbnail", cause: e });
  }
}

// =============================================
// CAPTIONS
// =============================================
export async function fetchCaptions(): Promise<RepoResult<MarketingCaption[]>> {
  try {
    const { data, error } = await supabase
      .from("captions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách caption", cause: error });
    }

    const caps: MarketingCaption[] = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(caps);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải caption", cause: e });
  }
}

export async function createCaption(caption: Omit<MarketingCaption, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingCaption>> {
  try {
    const { data, error } = await supabase
      .from("captions")
      .insert({
        title: caption.title,
        content: caption.content,
        category: cleanText(caption.category),
        branch_id: caption.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo caption mới", cause: error });
    }

    return success({
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo caption", cause: e });
  }
}

export async function updateCaption(id: string, updates: Partial<MarketingCaption>): Promise<RepoResult<MarketingCaption>> {
  try {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.category !== undefined) payload.category = cleanText(updates.category);
    if (updates.branchId !== undefined) payload.branch_id = updates.branchId;

    const { data, error } = await supabase
      .from("captions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật caption", cause: error });
    }

    return success({
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật caption", cause: e });
  }
}

export async function deleteCaption(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("captions").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa caption", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa caption", cause: e });
  }
}

// =============================================
// HASHTAGS
// =============================================
export async function fetchHashtags(): Promise<RepoResult<MarketingHashtag[]>> {
  try {
    const { data, error } = await supabase
      .from("hashtags")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải thư viện hashtag", cause: error });
    }

    const tags: MarketingHashtag[] = (data || []).map((item: any) => ({
      id: item.id,
      tag: item.tag,
      category: item.category,
      created_at: item.created_at,
    }));

    return success(tags);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải hashtag", cause: e });
  }
}

export async function createHashtag(hashtag: Omit<MarketingHashtag, "id" | "created_at">): Promise<RepoResult<MarketingHashtag>> {
  try {
    const tagVal = hashtag.tag.startsWith("#") ? hashtag.tag : `#${hashtag.tag}`;

    // Check if it already exists to prevent unique key violation
    const { data: existing } = await supabase
      .from("hashtags")
      .select("*")
      .eq("tag", tagVal)
      .eq("category", hashtag.category)
      .maybeSingle();

    if (existing) {
      return success({
        id: existing.id,
        tag: existing.tag,
        category: existing.category,
        created_at: existing.created_at,
      });
    }

    const { data, error } = await supabase
      .from("hashtags")
      .insert({
        tag: tagVal,
        category: hashtag.category,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể thêm hashtag mới", cause: error });
    }

    return success({
      id: data.id,
      tag: data.tag,
      category: data.category,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi thêm hashtag", cause: e });
  }
}

export async function deleteHashtag(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("hashtags").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa hashtag", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa hashtag", cause: e });
  }
}

// =============================================
// CAMPAIGNS
// =============================================
export async function fetchCampaigns(): Promise<RepoResult<MarketingCampaign[]>> {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("target_month", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách chiến dịch", cause: error });
    }

    const camps: MarketingCampaign[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      targetMonth: item.target_month,
      targetVideos: item.target_videos,
      targetViews: parseInt(item.target_views || 0),
      targetInboxes: item.target_inboxes,
      description: item.description,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(camps);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải chiến dịch", cause: e });
  }
}

export async function createCampaign(camp: Omit<MarketingCampaign, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingCampaign>> {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: camp.name,
        target_month: camp.targetMonth,
        target_videos: camp.targetVideos,
        target_views: camp.targetViews,
        target_inboxes: camp.targetInboxes,
        description: cleanText(camp.description),
        branch_id: camp.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo chiến dịch mới", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      targetMonth: data.target_month,
      targetVideos: data.target_videos,
      targetViews: parseInt(data.target_views || 0),
      targetInboxes: data.target_inboxes,
      description: data.description,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo chiến dịch", cause: e });
  }
}

export async function updateCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<RepoResult<MarketingCampaign>> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.targetMonth !== undefined) payload.target_month = updates.targetMonth;
    if (updates.targetVideos !== undefined) payload.target_videos = updates.targetVideos;
    if (updates.targetViews !== undefined) payload.target_views = updates.targetViews;
    if (updates.targetInboxes !== undefined) payload.target_inboxes = updates.targetInboxes;
    if (updates.description !== undefined) payload.description = cleanText(updates.description);
    if (updates.branchId !== undefined) payload.branch_id = updates.branchId;

    const { data, error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật chiến dịch", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      targetMonth: data.target_month,
      targetVideos: data.target_videos,
      targetViews: parseInt(data.target_views || 0),
      targetInboxes: data.target_inboxes,
      description: data.description,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật chiến dịch", cause: e });
  }
}

export async function deleteCampaign(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa chiến dịch", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa chiến dịch", cause: e });
  }
}

// =============================================
// CALENDAR
// =============================================
export async function fetchCalendarEvents(): Promise<RepoResult<MarketingCalendarEvent[]>> {
  try {
    const { data, error } = await supabase
      .from("calendar")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải lịch đăng bài", cause: error });
    }

    const events: MarketingCalendarEvent[] = (data || []).map((item: any) => ({
      id: item.id,
      videoId: item.video_id,
      scheduledDate: item.scheduled_date,
      platforms: item.platforms,
      status: item.status,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(events);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải lịch đăng bài", cause: e });
  }
}

export async function createCalendarEvent(event: Omit<MarketingCalendarEvent, "id" | "created_at" | "updated_at">): Promise<RepoResult<MarketingCalendarEvent>> {
  try {
    const { data, error } = await supabase
      .from("calendar")
      .insert({
        video_id: event.videoId,
        scheduled_date: event.scheduledDate,
        platforms: event.platforms,
        status: event.status,
        branch_id: event.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể thêm lịch đăng mới", cause: error });
    }

    return success({
      id: data.id,
      videoId: data.video_id,
      scheduledDate: data.scheduled_date,
      platforms: data.platforms,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi lưu lịch đăng bài", cause: e });
  }
}

export async function updateCalendarEvent(id: string, updates: Partial<MarketingCalendarEvent>): Promise<RepoResult<MarketingCalendarEvent>> {
  try {
    const payload: any = {};
    if (updates.videoId !== undefined) payload.video_id = updates.videoId;
    if (updates.scheduledDate !== undefined) payload.scheduled_date = updates.scheduledDate;
    if (updates.platforms !== undefined) payload.platforms = updates.platforms;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.branchId !== undefined) payload.branch_id = updates.branchId;

    const { data, error } = await supabase
      .from("calendar")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật lịch đăng bài", cause: error });
    }

    return success({
      id: data.id,
      videoId: data.video_id,
      scheduledDate: data.scheduled_date,
      platforms: data.platforms,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật lịch đăng", cause: e });
  }
}

export async function deleteCalendarEvent(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("calendar").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa lịch đăng bài", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa lịch đăng bài", cause: e });
  }
}

// =============================================
// ANALYTICS SNAPSHOTS
// =============================================
export async function fetchAnalyticsSnapshots(): Promise<RepoResult<MarketingAnalyticsSnapshot[]>> {
  try {
    const { data, error } = await supabase
      .from("analytics")
      .select("*")
      .order("record_date", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải thống kê nền tảng", cause: error });
    }

    const snaps: MarketingAnalyticsSnapshot[] = (data || []).map((item: any) => ({
      id: item.id,
      recordDate: item.record_date,
      platform: item.platform,
      views: parseInt(item.views || 0),
      comments: item.comments,
      shares: item.shares,
      saves: item.saves,
      inboxes: item.inboxes,
      visitors: item.visitors,
      revenue: parseFloat(item.revenue || 0),
      branchId: item.branch_id,
      created_at: item.created_at,
    }));

    return success(snaps);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải thống kê nền tảng", cause: e });
  }
}

export async function createAnalyticsSnapshot(snap: Omit<MarketingAnalyticsSnapshot, "id" | "created_at">): Promise<RepoResult<MarketingAnalyticsSnapshot>> {
  try {
    const { data, error } = await supabase
      .from("analytics")
      .insert({
        record_date: snap.recordDate,
        platform: snap.platform,
        views: snap.views,
        comments: snap.comments,
        shares: snap.shares,
        saves: snap.saves,
        inboxes: snap.inboxes,
        visitors: snap.visitors,
        revenue: snap.revenue,
        branch_id: snap.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể lưu thống kê nền tảng", cause: error });
    }

    return success({
      id: data.id,
      recordDate: data.record_date,
      platform: data.platform,
      views: parseInt(data.views || 0),
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      inboxes: data.inboxes,
      visitors: data.visitors,
      revenue: parseFloat(data.revenue || 0),
      branchId: data.branch_id,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi lưu thống kê nền tảng", cause: e });
  }
}

// =============================================
// CONTENT PROJECT EXTENSIONS
// =============================================
export async function fetchProjectExtensions(): Promise<RepoResult<ContentProjectExtension[]>> {
  try {
    const { data, error } = await supabase
      .from("content_project_extensions")
      .select("*");

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách trạng thái dự án", cause: error });
    }

    const extensions: ContentProjectExtension[] = (data || []).map((item: any) => ({
      projectId: item.project_id,
      workflowStatus: item.workflow_status,
      lessonsLearned: item.lessons_learned,
      branchId: item.branch_id,
      updated_at: item.updated_at,
    }));

    return success(extensions);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải trạng thái dự án", cause: e });
  }
}

export async function updateProjectExtension(
  projectId: string,
  updates: Partial<Omit<ContentProjectExtension, "projectId" | "branchId" | "updated_at">>
): Promise<RepoResult<ContentProjectExtension>> {
  try {
    const payload: any = {};
    if (updates.workflowStatus !== undefined) payload.workflow_status = updates.workflowStatus;
    if (updates.lessonsLearned !== undefined) payload.lessons_learned = cleanText(updates.lessonsLearned);

    // Use upsert to automatically create the record if it doesn't exist yet
    const { data, error } = await supabase
      .from("content_project_extensions")
      .upsert({
        project_id: projectId,
        ...payload,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật trạng thái dự án", cause: error });
    }

    return success({
      projectId: data.project_id,
      workflowStatus: data.workflow_status,
      lessonsLearned: data.lessons_learned,
      branchId: data.branch_id,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật trạng thái dự án", cause: e });
  }
}

// =============================================
// PROJECT RESEARCHES
// =============================================
export async function fetchProjectResearches(): Promise<RepoResult<ProjectResearch[]>> {
  try {
    const { data, error } = await supabase
      .from("project_researches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải nghiên cứu dự án", cause: error });
    }

    const researches: ProjectResearch[] = (data || []).map((item: any) => ({
      id: item.id,
      projectId: item.project_id,
      title: item.title,
      content: item.content,
      links: item.links || [],
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(researches);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải nghiên cứu", cause: e });
  }
}

export async function createProjectResearch(
  research: Omit<ProjectResearch, "id" | "created_at" | "updated_at">
): Promise<RepoResult<ProjectResearch>> {
  try {
    const { data, error } = await supabase
      .from("project_researches")
      .insert({
        project_id: research.projectId,
        title: research.title,
        content: research.content,
        links: research.links || [],
        branch_id: research.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo nghiên cứu mới", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      content: data.content,
      links: data.links || [],
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo nghiên cứu", cause: e });
  }
}

export async function updateProjectResearch(
  id: string,
  updates: Partial<Omit<ProjectResearch, "id" | "projectId" | "branchId" | "created_at" | "updated_at">>
): Promise<RepoResult<ProjectResearch>> {
  try {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.links !== undefined) payload.links = updates.links;

    const { data, error } = await supabase
      .from("project_researches")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật nghiên cứu", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      content: data.content,
      links: data.links || [],
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật nghiên cứu", cause: e });
  }
}

export async function deleteProjectResearch(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("project_researches").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa nghiên cứu", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa nghiên cứu", cause: e });
  }
}

// =============================================
// SHOT LISTS
// =============================================
export async function fetchShotLists(): Promise<RepoResult<ShotListItem[]>> {
  try {
    const { data, error } = await supabase
      .from("shot_lists")
      .select("*")
      .order("sequence_order", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải Shot List", cause: error });
    }

    const shotLists: ShotListItem[] = (data || []).map((item: any) => ({
      id: item.id,
      projectId: item.project_id,
      description: item.description,
      duration: item.duration,
      sequenceOrder: item.sequence_order,
      status: item.status,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(shotLists);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải Shot List", cause: e });
  }
}

export async function createShotList(
  shot: Omit<ShotListItem, "id" | "created_at" | "updated_at">
): Promise<RepoResult<ShotListItem>> {
  try {
    const { data, error } = await supabase
      .from("shot_lists")
      .insert({
        project_id: shot.projectId,
        description: shot.description,
        duration: shot.duration,
        sequence_order: shot.sequenceOrder,
        status: shot.status,
        branch_id: shot.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo Shot mới", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      description: data.description,
      duration: data.duration,
      sequenceOrder: data.sequence_order,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo Shot", cause: e });
  }
}

export async function updateShotList(
  id: string,
  updates: Partial<Omit<ShotListItem, "id" | "projectId" | "branchId" | "created_at" | "updated_at">>
): Promise<RepoResult<ShotListItem>> {
  try {
    const payload: any = {};
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.sequenceOrder !== undefined) payload.sequence_order = updates.sequenceOrder;
    if (updates.status !== undefined) payload.status = updates.status;

    const { data, error } = await supabase
      .from("shot_lists")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật Shot", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      description: data.description,
      duration: data.duration,
      sequenceOrder: data.sequence_order,
      status: data.status,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật Shot", cause: e });
  }
}

export async function deleteShotList(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("shot_lists").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa Shot", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa Shot", cause: e });
  }
}

// =============================================
// SHOOTING CHECKLISTS
// =============================================
export async function fetchShootingChecklists(): Promise<RepoResult<ShootingChecklistItem[]>> {
  try {
    const { data, error } = await supabase
      .from("shooting_checklists")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải checklist quay", cause: error });
    }

    const checklists: ShootingChecklistItem[] = (data || []).map((item: any) => ({
      id: item.id,
      projectId: item.project_id,
      itemName: item.item_name,
      isChecked: item.is_checked,
      category: item.category || "general",
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(checklists);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải checklist", cause: e });
  }
}

export async function createShootingChecklist(
  item: Omit<ShootingChecklistItem, "id" | "created_at" | "updated_at">
): Promise<RepoResult<ShootingChecklistItem>> {
  try {
    const { data, error } = await supabase
      .from("shooting_checklists")
      .insert({
        project_id: item.projectId,
        item_name: item.itemName,
        is_checked: item.isChecked,
        category: item.category || "general",
        branch_id: item.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo checklist mới", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      itemName: data.item_name,
      isChecked: data.is_checked,
      category: data.category,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo checklist", cause: e });
  }
}

export async function updateShootingChecklist(
  id: string,
  updates: Partial<Omit<ShootingChecklistItem, "id" | "projectId" | "branchId" | "created_at" | "updated_at">>
): Promise<RepoResult<ShootingChecklistItem>> {
  try {
    const payload: any = {};
    if (updates.itemName !== undefined) payload.item_name = updates.itemName;
    if (updates.isChecked !== undefined) payload.is_checked = updates.isChecked;
    if (updates.category !== undefined) payload.category = updates.category;

    const { data, error } = await supabase
      .from("shooting_checklists")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật checklist", cause: error });
    }

    return success({
      id: data.id,
      projectId: data.project_id,
      itemName: data.item_name,
      isChecked: data.is_checked,
      category: data.category,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật checklist", cause: e });
  }
}

export async function deleteShootingChecklist(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("shooting_checklists").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa checklist", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa checklist", cause: e });
  }
}

// =============================================
// MEDIA VERSIONS
// =============================================
export async function fetchMediaVersions(): Promise<RepoResult<MediaVersion[]>> {
  try {
    const { data, error } = await supabase
      .from("media_versions")
      .select("*")
      .order("version_number", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải phiên bản media", cause: error });
    }

    const versions: MediaVersion[] = (data || []).map((item: any) => ({
      id: item.id,
      videoId: item.video_id,
      versionNumber: item.version_number,
      filePath: item.file_path,
      notes: item.notes,
      branchId: item.branch_id,
      created_at: item.created_at,
    }));

    return success(versions);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải phiên bản media", cause: e });
  }
}

export async function createMediaVersion(
  version: Omit<MediaVersion, "id" | "created_at">
): Promise<RepoResult<MediaVersion>> {
  try {
    const { data, error } = await supabase
      .from("media_versions")
      .insert({
        video_id: version.videoId,
        version_number: version.versionNumber,
        file_path: version.filePath,
        notes: cleanText(version.notes),
        branch_id: version.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo phiên bản media mới", cause: error });
    }

    return success({
      id: data.id,
      videoId: data.video_id,
      versionNumber: data.version_number,
      filePath: data.file_path,
      notes: data.notes,
      branchId: data.branch_id,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo phiên bản media", cause: e });
  }
}

export async function deleteMediaVersion(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("media_versions").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa phiên bản media", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa phiên bản media", cause: e });
  }
}

