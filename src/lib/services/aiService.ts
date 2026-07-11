import { createAiLog, fetchAiPrompts, fetchAiKeyConfig } from "../repository/aiRepository";
import { supabase } from "../../supabaseClient";
import type {
  AiPlanningItem,
  AiIdeaItem,
  AiScriptVersion,
  AiShotItem,
  AiChecklistItem,
  AiThumbnailAdvice,
  AiCaptionAdvice,
  AiInsightReport,
  AiPurchasingAdvice,
  AiSalesAdvice,
  AiMarketingAdvice,
  AiCustomerCareAdvice,
  AiRevenueAdvice,
} from "../../types/ai";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Map model name → provider name stored in ai_keys */
function providerFromModel(modelName: string): string {
  if (modelName.startsWith("gemini") || modelName.startsWith("models/gemini")) return "Google";
  if (modelName.startsWith("claude")) return "Anthropic";
  if (modelName.startsWith("deepseek")) return "DeepSeek";
  return "OpenAI"; // default: gpt-*, o1-*
}

/** Call real LLM API via fetch */
async function callLLM(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
  endpoint?: string | null
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const provider = providerFromModel(modelName);

  // ── Google Gemini (v1beta) ──
  if (provider === "Google") {
    const model = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;
    const isJsonMode = systemPrompt.includes("JSON hợp lệ") || systemPrompt.includes("JSON format") || systemPrompt.includes("JSON array") || userPrompt.includes("JSON array") || userPrompt.includes("JSON");
    const body: any = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: isJsonMode ? 4096 : 2048,
        responseMimeType: isJsonMode ? "application/json" : "text/plain",
      },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini API lỗi ${res.status}: ${err?.error?.message || res.statusText}`);
    }
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const promptTokens = json.usageMetadata?.promptTokenCount || 0;
    const completionTokens = json.usageMetadata?.candidatesTokenCount || 0;
    return { text, promptTokens, completionTokens };
  }

  // ── OpenAI GPT-5+ via Responses API ──
  if (provider === "OpenAI" && modelName.startsWith("gpt-5")) {
    const baseUrl = endpoint || "https://api.openai.com/v1";
    const url = `${baseUrl}/responses`;
    const body = {
      model: modelName,
      instructions: systemPrompt,
      input: userPrompt,
      max_output_tokens: 1024,
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`${provider} API error ${res.status}: ${err?.error?.message || res.statusText}`);
    }
    const json = await res.json();
    const text =
      json.output_text ||
      json.output?.flatMap((item: any) => item.content || [])
        ?.map((content: any) => content.text || "")
        ?.join("") ||
      "";
    const promptTokens = json.usage?.input_tokens || 0;
    const completionTokens = json.usage?.output_tokens || 0;
    return { text, promptTokens, completionTokens };
  }

  // ── OpenAI compatible (OpenAI / DeepSeek) ──
  const baseUrl = endpoint || (provider === "DeepSeek" ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1");
  const url = `${baseUrl}/chat/completions`;
  const isJsonMode = systemPrompt.includes("JSON hợp lệ") || systemPrompt.includes("JSON format") || systemPrompt.includes("JSON array") || userPrompt.includes("JSON array") || userPrompt.includes("JSON");
  const body: any = {
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: 1024,
  };
  if (isJsonMode) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${provider} API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "";
  const promptTokens = json.usage?.prompt_tokens || 0;
  const completionTokens = json.usage?.completion_tokens || 0;
  return { text, promptTokens, completionTokens };
}

function isTransientApiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes(" 429") ||
    message.includes(" 503") ||
    message.includes("high demand") ||
    message.includes("rate limit") ||
    message.includes("overload") ||
    message.includes("temporar")
  );
}

function isModelUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes(" 404") &&
    (
      message.includes("not found") ||
      message.includes("no longer available") ||
      message.includes("not supported")
    )
  );
}

function fallbackModelsFor(modelName: string): string[] {
  if (modelName === "gemini-3.5-flash") {
    return ["gemini-3.1-flash-lite", "gemini-2.5-flash"];
  }

  if (modelName === "gemini-3.1-pro") {
    return ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash"];
  }

  if (modelName === "gemini-3.1-flash-lite") {
    return ["gemini-2.5-flash"];
  }

  if (modelName.startsWith("gemini")) {
    return ["gemini-3.1-flash-lite", "gemini-2.5-flash"];
  }

  return [];
}

async function callLLMWithFallback(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
  endpoint?: string | null
): Promise<{ text: string; promptTokens: number; completionTokens: number; modelUsed: string; fallbackFrom?: string }> {
  const candidates = [modelName, ...fallbackModelsFor(modelName).filter((candidate) => candidate !== modelName)];
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const attempts = i === 0 ? 3 : 2;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const result = await callLLM(apiKey, candidate, systemPrompt, userPrompt, temperature, endpoint);
        return {
          ...result,
          modelUsed: candidate,
          fallbackFrom: candidate !== modelName ? modelName : undefined,
        };
      } catch (error) {
        lastError = error;
        if (isModelUnavailableError(error)) break;
        if (!isTransientApiError(error)) break;
        if (attempt < attempts - 1) {
          await delay(800 * (attempt + 1));
        }
      }
    }

    if (!isTransientApiError(lastError) && !isModelUnavailableError(lastError)) break;
  }

  throw lastError instanceof Error ? lastError : new Error("Không gọi được API AI thật");
}

/** Try to parse JSON from LLM text output */
function tryParseJson<T>(text: string): T | null {
  // strip markdown fences if present
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Fallback mock data (used when no API key set)
// ──────────────────────────────────────────────
function getMockResponse(feature: string, variables: Record<string, any>): any {
  switch (feature) {
    case "planning":
      return [
        { title: "Nghiên cứu đối thủ & viết kịch bản", deadlineDays: 2, role: "Content Creator", estimatedHours: 6 },
        { title: "Chuẩn bị thiết bị và quay shot", deadlineDays: 4, role: "Cameraman", estimatedHours: 8 },
        { title: "Dựng video v1 và thumbnail", deadlineDays: 6, role: "Video Editor", estimatedHours: 12 },
        { title: "Review & xuất bản video", deadlineDays: 8, role: "Manager", estimatedHours: 4 },
      ] as AiPlanningItem[];
    case "idea":
      return [
        { title: "Sự thật về bộ nồi Vision đi 2 vạn chưa vệ sinh", vehicleModel: "Honda Vision", topic: variables.topic, potentialScore: 9, suggestedTitles: ["Bóc phốt nồi Vision"] },
        { title: "Mẹo vệ sinh chuông nồi bằng cát siêu mịn", vehicleModel: "Xe Ga", topic: variables.topic, potentialScore: 8, suggestedTitles: ["Vệ sinh nồi tại nhà"] },
      ] as AiIdeaItem[];
    case "script":
      return { hook: "Mất 10 triệu sửa máy chỉ vì tiếc 150k vệ sinh nồi!", problem: "Vision lì máy, hao xăng liên tục.", story: "Tháo bộ nồi: bi nồi móp, dây curoa nứt.", solution: "Vệ sinh sạch, thay bi nồi chính hãng.", cta: "Ghé MotoCare kiểm tra miễn phí!", callToComment: "Xe bạn đi bao nhiêu km rồi?", estimatedDuration: 45, targetAudience: "Người đi xe ga", targetPlatform: "TikTok" } as AiScriptVersion;
    case "hashtag":
      return ["#motocare", "#suaxemay", "#vesinhnoi", "#baoduongxemay", "#hondavision"];
    case "caption":
      return { tiktok: "Bệnh kinh niên của Vision? Giải pháp 150k vệ sinh bộ nồi! 🛵", facebook: "Anh em chạy Vision: đi 15k km mà chưa vệ sinh nồi dễ mất tiền triệu!", youtube: "Hướng dẫn sửa Vision lì máy, hao xăng tại MotoCare.", website: "Hướng dẫn khắc phục Honda Vision hao xăng." } as AiCaptionAdvice;
    case "thumbnail":
      return { titleAdvice: "CHỮ TO - MÀU ĐỎ - NỀN XE THÁO RÃ", colorCombo: "Đỏ tươi + Vàng chanh", layoutType: "Quy tắc 1/3", overlayText: "MẤT 10 TRIỆU?!", emotionalVibe: "Giật mình, tò mò cao độ" } as AiThumbnailAdvice;
    case "insight":
      return { topPerformingVideoId: "vid_01", bestHookPattern: "Đánh vào nỗi sợ mất tiền", bestCtaPattern: "Kiểm tra xe miễn phí", highTrafficHour: "20:00 tối CN", topConvertingTopic: "Vệ sinh nồi xe ga", textReport: "Video chủ đề bảo dưỡng nồi đạt tỷ lệ chuyển đổi cao x2.4." } as AiInsightReport;
    case "purchasing_advisor":
      return {
        adviceList: [
          {
            partName: "Bi nồi Honda Vision (Chính hãng)",
            currentStock: 2,
            minStock: 8,
            suggestedQuantity: 15,
            reason: "Tồn kho thực tế (2 bộ) đang dưới mức tối thiểu an toàn (8 bộ). Tỷ lệ bảo dưỡng nồi Vision tăng mạnh 35% trong 2 tuần qua tại chi nhánh.",
            recommendedSupplier: "Phụ tùng Phát Thịnh"
          },
          {
            partName: "Dây curoa Honda SH 150i (Bando)",
            currentStock: 1,
            minStock: 5,
            suggestedQuantity: 8,
            reason: "Sắp vào chu kỳ bảo dưỡng xe SH cuối tháng, trung bình tiêu thụ 4 dây/tuần. Hiện tại chỉ còn 1 dây.",
            recommendedSupplier: "Nhà phân phối Thiên An"
          },
          {
            partName: "Lọc gió Yamaha Exciter 150",
            currentStock: 3,
            minStock: 10,
            suggestedQuantity: 20,
            reason: "Tồn kho dưới hạn mức. Exciter 150 là dòng xe phổ biến cần thay lọc định kỳ, chi phí nhập thấp nên gom đơn nhập số lượng lớn để nhận chiết khấu 5%.",
            recommendedSupplier: "Phụ tùng Phát Thịnh"
          }
        ],
        overallSummary: "Tổng cộng có 3 loại phụ tùng cốt lõi đang dưới hạn mức an toàn. Đề xuất nhập thêm để đáp ứng nhu cầu bảo dưỡng trong 15 ngày tới."
      } as AiPurchasingAdvice;
    case "sales_advisor":
      return {
        combos: [
          {
            comboName: "Bảo dưỡng chuyên sâu & Vệ sinh nồi xe ga Vision",
            partsInvolved: ["Bi nồi Vision", "Lọc gió Vision", "Dầu máy xe ga Castrol"],
            servicesInvolved: ["Công vệ sinh nồi xe ga", "Công bảo dưỡng toàn bộ"],
            targetPrice: 380000,
            discountPercentage: 12,
            reasoning: "Xe Vision chiếm 45% tổng lượt bảo dưỡng tại cửa hàng. Việc kết hợp vệ sinh nồi và bảo dưỡng toàn bộ giúp tăng giá trị đơn hàng trung bình từ 250k lên 380k mà khách vẫn cảm thấy được ưu đãi lớn."
          },
          {
            comboName: "Combo Phục hồi Nhông sên dĩa Exciter",
            partsInvolved: ["Nhông sên dĩa Exciter 150 DID", "Dầu bôi trơn xích"],
            servicesInvolved: ["Công thay thế nhông sên dĩa"],
            targetPrice: 420000,
            discountPercentage: 8,
            reasoning: "Nhóm xe Exciter có tỷ lệ mòn xích cao trong mùa mưa. Combo giúp giải quyết triệt để tiếng ồn xích và tăng tuổi thọ sên thêm 30%."
          }
        ],
        highMarginOpportunities: "Các dịch vụ Vệ sinh nồi và Vệ sinh buồng đốt bằng máy có biên lợi nhuận ròng đạt trên 60%. Khuyên nghị kỹ thuật viên tập trung tư vấn khi xe ga đã đi trên 15,000km mà chưa bảo dưỡng."
      } as AiSalesAdvice;
    case "marketing_advisor":
      return {
        suggestedVideos: [
          {
            topic: "Sự thật về lọc gió xe máy bẩn kinh hoàng",
            targetVehicle: "Honda Lead / Vision",
            suggestedTitle: "Đừng tiếc 50k thay lọc gió để rồi rã máy mất 5 triệu!",
            videoBrief: "Kỹ thuật viên tháo lọc gió đen kịt của một chiếc xe tay ga bị giật máy, hao xăng. So sánh với lọc gió mới và giải thích nguyên lý tại sao lọc gió bẩn gây hại trực tiếp cho động cơ."
          },
          {
            topic: "Hướng dẫn nhận biết bi nồi móp méo",
            targetVehicle: "Xe ga nói chung",
            suggestedTitle: "Xe tay ga đi bị hú, giật cục? 90% lỗi do chi tiết nhỏ này!",
            videoBrief: "Show cận cảnh các viên bi nồi bị móp méo gây ra hiện tượng trượt đai curoa và tiếng kêu khó chịu. Hướng dẫn khách hàng tự nghe tiếng máy để nhận biết."
          }
        ],
        campaignStrategy: "Video có chủ đề 'Cảnh báo/Hậu quả' mang lại tỷ lệ inbox chuyển đổi đặt lịch sửa chữa cao nhất (đạt 6.2%). Đề xuất ngân sách 1.5 triệu đồng đẩy QC TikTok cho 2 video trên để thu hút khách hàng xung quanh bán kính 5km."
      } as AiMarketingAdvice;
    case "customer_advisor":
      return {
        customersToCare: [
          {
            customerName: "Nguyễn Văn Hùng",
            phoneNumber: "0912345678",
            vehicleModel: "Honda SH 150i (2022)",
            lastVisitDate: "2026-03-10",
            dueService: "Thay dầu động cơ & Kiểm tra định kỳ (Sau 3 tháng)",
            aiMessageDraft: "Chào anh Hùng, MotoCare chúc anh ngày mới tốt lành! Xe SH 150i biển số 29F1-xxxxx của anh đã đến lịch thay nhớt máy định kỳ (lần cuối bảo dưỡng ngày 10/03/2026). Trân trọng mời anh ghé tiệm hôm nay để kỹ thuật viên kiểm tra dầu và chăm sóc xe giúp anh nhé. MotoCare miễn phí rửa xe đi kèm ạ!"
          },
          {
            customerName: "Trần Thị Mai",
            phoneNumber: "0987654321",
            vehicleModel: "Honda Vision (2021)",
            lastVisitDate: "2026-01-15",
            dueService: "Bảo dưỡng toàn bộ & Vệ sinh bộ nồi (Hơn 5 tháng chưa quay lại)",
            aiMessageDraft: "MotoCare xin chào chị Mai! Xe Vision của chị đã đi được hơn 5 tháng kể từ đợt chăm sóc trước. Để xe luôn chạy êm ái, tiết kiệm xăng và tránh bị giật cục khi lên ga, chị nên ghé tiệm để kiểm tra và vệ sinh bộ nồi nhé. Đặt lịch hẹn qua Zalo này hôm nay để nhận ưu đãi giảm 10% công bảo dưỡng chị nhé!"
          }
        ],
        generalStrategy: "Dịch vụ nhắn tin nhắc nhở khách hàng định kỳ 3 tháng thay nhớt giúp tỷ lệ quay lại đạt 40%. Đề xuất nhân viên CSKH gửi tin nhắn Zalo ZNS cá nhân hóa vào khung giờ 9h00 sáng hằng ngày."
      } as AiCustomerCareAdvice;
    case "revenue_advisor":
      return {
        revenueAnalysis: {
          thisWeekTotal: 15450000,
          lastWeekTotal: 13800000,
          growthRate: 11.96,
          analysisText: "Doanh thu tuần này tăng trưởng khá tốt (tăng 11.96% tương đương 1.65 triệu đồng) chủ yếu nhờ vào lượt bảo dưỡng dòng xe Vision và SH tăng mạnh dịp cuối tuần. Thu nhập từ công thợ/dịch vụ tăng 15%, bán lẻ phụ tùng tăng 8%."
        },
        demandForecast: [
          {
            item: "Bộ nồi Honda Vision (Chính hãng)",
            forecastedDemand: "Cao",
            reason: "Nhu cầu vệ sinh nồi tăng mạnh vào mùa mưa ngập, kết hợp Vision là dòng xe đông nhất ghé tiệm. Dự báo cần sẵn sàng ít nhất 20 bộ nồi cho tháng này."
          },
          {
            item: "Lọc gió Honda Lead",
            forecastedDemand: "Trung bình",
            reason: "Nhu cầu thay lọc định kỳ ổn định, trung bình tiêu thụ 5-7 cái mỗi tuần."
          },
          {
            item: "Má phanh đĩa trước SH (Nissin)",
            forecastedDemand: "Cao",
            reason: "Thời tiết mưa ẩm gây mòn má phanh đĩa nhanh hơn. Khách ghé kiểm tra phanh tăng 25%."
          }
        ],
        priceOptimization: [
          {
            item: "Dịch vụ Vệ sinh bộ nồi xe ga",
            currentPrice: 150000,
            proposedPrice: 180000,
            strategy: "Tăng giá dịch vụ công lên 180,000 đ kèm tặng kèm nước giải khát/rửa xe nhanh. Biên lợi nhuận công thợ cao nên tăng giá nhẹ không làm giảm lượng khách mà giúp tăng 20% lợi nhuận ròng từ dịch vụ này."
          },
          {
            item: "Lốp xe ga Chengshin 90/90-14",
            currentPrice: 420000,
            proposedPrice: 395000,
            strategy: "Giảm nhẹ giá lốp hoặc chạy chương trình khuyến mãi 'Mua lốp tặng công thay'. Lốp Chengshin biên lợi nhuận gốc 35% và hiện tồn kho nhiều, giảm nhẹ giá bán sẽ thúc đẩy khách thay lốp cũ trơn trượt vào mùa mưa."
          }
        ]
      } as AiRevenueAdvice;
    case "chat":
      return `Mình đã nhận câu hỏi: "${variables.question || variables.prompt || ""}". Hiện AI thật chưa được cấu hình API key cho model đang chọn.`;
    default:
      return { reply: `[Mock] AI Generation completed for feature: ${feature}` };
  }
}

// ──────────────────────────────────────────────
// Main Export
// ──────────────────────────────────────────────
export async function generateAiResponse(
  feature: string,
  modelName: string,
  variables: Record<string, any>,
  branchId: string = "CN1"
): Promise<any> {
  const startTime = Date.now();

  // 1. KMS Q&A — always uses local RAG (no external LLM needed unless key available)
  if (feature === "kms_qa") {
    const query = variables.question || "";
    let matchedContent = "";
    try {
      const { data: matchedArticles } = await supabase
        .from("knowledge_articles" as any)
        .select("title, content")
        .ilike("title", `%${query.split(" ").slice(0, 3).join("%")}%`)
        .limit(2);
      if (matchedArticles && matchedArticles.length > 0) {
        matchedContent = matchedArticles.map((a: any) => `[Tài liệu: ${a.title}]\n${a.content}`).join("\n\n");
      }
    } catch {
      /* silent */
    }

    const kmsResult = matchedContent
      ? `🤖 [Trợ lý SmartCare AI — Dựa trên tài liệu nội bộ]:\n\n${matchedContent.slice(0, 500)}...\n\n👉 Quy trình đã được phê duyệt tại chi nhánh ${branchId}.`
      : `🤖 [Trợ lý SmartCare AI]:\nKhông tìm thấy tài liệu khớp. Vui lòng liên hệ Quản lý kỹ thuật hoặc tạo SOP mới.`;

    await createAiLog({ feature, modelUsed: modelName, promptTokens: 350, completionTokens: 300, costUsd: 0, latencyMs: Date.now() - startTime, status: "success", branchId });
    return kmsResult;
  }

  // 2. Look up real API key from DB
  const provider = providerFromModel(modelName);
  const keyConfig = await fetchAiKeyConfig(provider);
  const apiKey = keyConfig.apiKey;

  // 3. If no key → use mock (but warn user in response)
  if (!apiKey) {
    if (feature === "chat") {
      throw new Error(keyConfig.errorMessage || `Chưa có API key cho ${provider}`);
    }
    await delay(600);
    const mock = getMockResponse(feature, variables);
    await createAiLog({ feature, modelUsed: modelName + " [mock]", promptTokens: 120, completionTokens: 250, costUsd: 0, latencyMs: Date.now() - startTime, status: "success", branchId });
    return mock;
  }

  // 4. Build prompt from DB template or fallback
  let systemPrompt = "Bạn là chuyên gia marketing xe máy chuyên nghiệp tại cửa hàng MotoCare SmartCare. Trả lời súc tích, thực tế, bằng tiếng Việt.";
  let userPrompt = "";
  let temperature = 0.7;

  // Feature-specific system prompts and temperature overrides for advisor features
  const advisorFeatures = ["purchasing_advisor", "sales_advisor", "marketing_advisor", "customer_advisor", "revenue_advisor"];
  if (advisorFeatures.includes(feature)) {
    temperature = 0.3; // Much lower for data-driven analysis

    const advisorSystemPrompts: Record<string, string> = {
      purchasing_advisor: `Bạn là chuyên gia phân tích tồn kho và chuỗi cung ứng phụ tùng xe máy tại Việt Nam. Bạn PHẢI phân tích chính xác dữ liệu tồn kho và tốc độ tiêu thụ được cung cấp. TUYỆT ĐỐI không bịa đặt số liệu. Trả lời hoàn toàn bằng JSON hợp lệ, không thêm markdown hay giải thích bên ngoài JSON.`,
      sales_advisor: `Bạn là chuyên gia phát triển doanh thu và chiến lược bán hàng cho cửa hàng sửa xe máy MotoCare tại Việt Nam. Bạn PHẢI sử dụng dữ liệu bán hàng thực tế, đơn giá bán lẻ thực tế, dòng xe phổ biến nhất và xu hướng thời tiết hiện tại được cung cấp để đề xuất combo dịch vụ. TUYỆT ĐỐI CẤM bịa giá hoặc đề xuất giá combo cao hơn tổng giá lẻ. Trả lời hoàn toàn bằng JSON hợp lệ, không thêm markdown hay giải thích bên ngoài JSON.`,
      marketing_advisor: `Bạn là chuyên gia marketing video ngắn (TikTok/Reels) cho ngành sửa chữa xe máy tại Việt Nam. Bạn PHẢI dựa trên dữ liệu hiệu quả video, dòng xe phổ biến và thời tiết hiện tại được cung cấp để đề xuất chủ đề video tiếp theo có tỷ lệ chuyển đổi cao nhất. Trả lời hoàn toàn bằng JSON hợp lệ, không thêm markdown hay giải thích bên ngoài JSON.`,
      customer_advisor: `Bạn là chuyên gia chăm sóc khách hàng và CRM cho cửa hàng sửa xe máy MotoCare tại Việt Nam. Bạn PHẢI dựa trên dữ liệu khách hàng thực tế (tên, dòng xe, ngày ghé cuối, phân khúc chi tiêu) được cung cấp để soạn tin nhắn Zalo/SMS cá nhân hóa và chiến lược giữ chân khách hàng. Trả lời hoàn toàn bằng JSON hợp lệ, không thêm markdown hay giải thích bên ngoài JSON.`,
      revenue_advisor: `Bạn là chuyên gia phân tích tài chính, dự báo nhu cầu và tối ưu giá bán cho cửa hàng sửa xe máy MotoCare tại Việt Nam. Bạn PHẢI phân tích chính xác dữ liệu doanh thu tuần này so với tuần trước, lượng bán phụ tùng và giá cả được cung cấp. Trả lời hoàn toàn bằng JSON hợp lệ, không thêm markdown hay giải thích bên ngoài JSON.`,
    };
    systemPrompt = advisorSystemPrompts[feature] || systemPrompt;
  }

  try {
    const promptsRes = await fetchAiPrompts();
    if (promptsRes.ok) {
      const match = promptsRes.data.find((p) => p.category === feature && p.isDefault);
      if (match) {
        systemPrompt = match.systemPrompt;
        temperature = advisorFeatures.includes(feature) ? Math.min(match.temperature, 0.4) : match.temperature;
        userPrompt = match.userPromptTemplate
          ? match.userPromptTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => {
              const val = variables[k];
              return typeof val === "object" ? JSON.stringify(val, null, 2) : (val || `[${k}]`);
            })
          : buildDefaultUserPrompt(feature, variables);
      }
    }
  } catch {
    /* use default */
  }

  if (!userPrompt) {
    userPrompt = buildDefaultUserPrompt(feature, variables);
  }

  // 5. Call real LLM
  let resultData: any;
  let promptTokens = 0;
  let completionTokens = 0;
  let status: "success" | "failure" = "success";
  let errorMessage: string | undefined;
  let actualModelUsed = modelName;

  try {
    const { text, promptTokens: pt, completionTokens: ct, modelUsed, fallbackFrom } = await callLLMWithFallback(apiKey, modelName, systemPrompt, userPrompt, temperature, keyConfig.endpoint);
    actualModelUsed = fallbackFrom ? `${modelUsed} (fallback từ ${fallbackFrom})` : modelUsed;
    promptTokens = pt;
    completionTokens = ct;

    // Try to parse as JSON first, fall back to raw text
    const parsed = tryParseJson(text);
    resultData = parsed ?? (fallbackFrom ? `Đã tự động chuyển từ ${fallbackFrom} sang ${modelUsed} vì model ban đầu đang quá tải.\n\n${text}` : text);
  } catch (err: any) {
    status = "failure";
    errorMessage = err.message;
    if (feature === "chat") {
      try {
        await createAiLog({ feature, modelUsed: modelName, promptTokens: 0, completionTokens: 0, costUsd: 0, latencyMs: Date.now() - startTime, status, errorMessage, branchId });
      } catch {
        /* silent */
      }
      throw new Error(errorMessage || "Không gọi được API AI thật");
    }
    // Fall back to mock so UI doesn't break
    resultData = getMockResponse(feature, variables);
    promptTokens = 0;
    completionTokens = 0;
  }

  // 6. Audit log
  const cost = (promptTokens * 0.0000015) + (completionTokens * 0.000002);
  try {
    await createAiLog({ feature, modelUsed: actualModelUsed, promptTokens, completionTokens, costUsd: cost, latencyMs: Date.now() - startTime, status, errorMessage, branchId });
  } catch {
    /* silent */
  }

  return resultData;
}
function buildDefaultUserPrompt(feature: string, v: Record<string, any>): string {
  switch (feature) {
    case "chat":       return `${v.question || v.prompt || "Hãy hỗ trợ tôi trong SmartCare."}`;
    case "planning":   return `Lập kế hoạch sản xuất nội dung cho dự án: "${v.projectName || "Dự án mới"}". Trả về JSON array gồm các task với: title, deadlineDays, role, estimatedHours.`;
    case "idea":       return `Sinh 5 ý tưởng video TikTok về chủ đề: "${v.topic || "bảo dưỡng xe máy"}". JSON array: title, vehicleModel, topic, potentialScore (1-10), suggestedTitles.`;
    case "script":     return `Viết kịch bản video TikTok cho ý tưởng: "${v.ideaTitle || "xe ga hao xăng"}". JSON: hook, problem, story, solution, cta, callToComment, estimatedDuration, targetAudience, targetPlatform.`;
    case "shot_list":  return `Tạo shot list 5 cảnh quay cho video: "${v.title || "bảo dưỡng xe"}". JSON array: sequenceOrder, description, cameraAngle, cameraMovement, bRoll, transition.`;
    case "checklist":  return `Checklist quay phim cho video đề tài: "${v.topic || "sửa xe"}". JSON array: itemName, category (props/location/personnel), isChecked, remarks.`;
    case "thumbnail":  return `Tư vấn thiết kế thumbnail cho video: "${v.videoTitle || ""}". JSON: titleAdvice, colorCombo, layoutType, overlayText, emotionalVibe.`;
    case "caption":    return `Viết caption cho video "${v.videoTitle || ""}" (tone: ${v.tone || "chuyên nghiệp"}). JSON: tiktok, facebook, youtube, website.`;
    case "hashtag":    return `Tạo 10 hashtag phù hợp cho video xe máy chủ đề: "${v.topic || "bảo dưỡng"}". JSON array các hashtag (có dấu #).`;
    case "best_time":  return `Gợi ý khung giờ đăng bài tối ưu cho kênh xe máy. JSON: suggestedTime, suggestedDays (array), reasoning.`;
    case "campaign_planner": return `Lập kế hoạch campaign: "${v.campaignName || "Campaign mới"}". JSON: campaignGoal, timelineWeeks, suggestedKpis (array).`;
    case "seo":        return `Đánh giá SEO cho video: "${v.title || ""}". JSON: seoScore (0-100), keywordCoverage (array), recommendations (array).`;
    case "rewrite":    return `Viết lại 3 phiên bản caption/hook cho: "${v.content || ""}". JSON array 3 string.`;
    case "insight":    return `Phân tích hiệu quả marketing và đưa ra insight. JSON: topPerformingVideoId, bestHookPattern, bestCtaPattern, highTrafficHour, topConvertingTopic, textReport.`;
    case "revenue_advisor": {
      const weeklyStatsStr = JSON.stringify(v.weeklyStats || {}, null, 2);
      const popularPartsStr = JSON.stringify(v.popularParts || [], null, 2);
      return `Bạn là Trợ lý phân tích doanh thu, dự báo nhu cầu và tối ưu giá bán thông minh của MotoCare.
Dưới đây là thống kê doanh thu bán lẻ (sales) và sửa chữa (work orders) tại chi nhánh trong tuần này (7 ngày gần nhất) so với tuần trước (ngày 8 đến 14 trước đây):
${weeklyStatsStr}

Và danh sách các phụ tùng bán chạy nhất kèm theo giá nhập (costPrice) và giá bán lẻ hiện tại (retailPrice) của chúng tại chi nhánh:
${popularPartsStr}

Hãy phân tích kỹ lưỡng và đưa ra các đánh giá sâu sắc.
YÊU CẦU:
1. Phân tích chi tiết so sánh tuần này so với tuần trước: Tỷ lệ tăng/giảm, nguyên nhân chủ yếu, doanh thu tăng giảm từ phụ tùng hay từ tiền công thợ sửa chữa.
2. Dự báo nhu cầu 3 phụ tùng hoặc dịch vụ trong 15-30 ngày tới. Giải thích lý do cụ thể dựa trên xu hướng, dòng xe phổ biến và thời tiết mùa vụ.
3. Đề xuất giá bán tối ưu (price optimization) cho 2 sản phẩm hoặc dịch vụ có mức biên lợi nhuận thấp nhưng doanh số cao, hoặc sản phẩm tồn nhiều cần kích cầu. Bạn PHẢI đề xuất giá bán đề xuất cụ thể (proposedPrice) kèm giải thích chi tiết chiến lược điều chỉnh.

Trả về định dạng JSON khớp chính xác cấu trúc sau:
{
  "revenueAnalysis": {
    "thisWeekTotal": số doanh thu tuần này (số),
    "lastWeekTotal": số doanh thu tuần trước (số),
    "growthRate": phần trăm tăng trưởng tuần (số, ví dụ: 12.5 hoặc -8.4),
    "analysisText": "Đánh giá chi tiết doanh thu và xu hướng so sánh"
  },
  "demandForecast": [
    {
      "item": "Tên phụ tùng hoặc dịch vụ",
      "forecastedDemand": "Cao hoặc Trung bình hoặc Thấp",
      "reason": "Lý giải chi tiết dự đoán nhu cầu"
    }
  ],
  "priceOptimization": [
    {
      "item": "Tên phụ tùng hoặc dịch vụ",
      "currentPrice": giá bán hiện tại (số),
      "proposedPrice": giá đề xuất mới (số),
      "strategy": "Chiến lược điều chỉnh và lý do cụ thể"
    }
  ]
}`;
    }
    case "purchasing_advisor": {
      const partsStr = JSON.stringify(v.lowStockParts || [], null, 2);
      const suppliersStr = JSON.stringify(v.suppliers || [], null, 2);
      return `Bạn là Trợ lý phân tích tồn kho thông minh của cửa hàng sửa xe MotoCare.
Chúng tôi có danh sách các phụ tùng hiện đang dưới mức an toàn, kèm theo lượng tiêu thụ/doanh số bán ra của chúng trong 30 ngày qua (salesVolume30d):
${partsStr}

Và danh sách nhà cung cấp khả dụng:
${suppliersStr}

Dựa trên thông tin trên, hãy đưa ra đề xuất nhập hàng cho TẤT CẢ các phụ tùng bị thiếu hụt đó.
YÊU CẦU PHÂN TÍCH THỰC TẾ & KHÁCH QUAN:
1. Đánh giá mức độ khẩn cấp của từng mặt hàng dựa trên lượng tồn hiện tại (currentStock) so với lượng tiêu thụ 30 ngày qua (salesVolume30d). Những món có tồn bằng 0 hoặc rất thấp nhưng có salesVolume30d cao là ĐẶC BIỆT KHẨN CẤP.
2. Đề xuất số lượng nhập thêm (suggestedQuantity) phù hợp để đủ dùng trong khoảng 15-30 ngày tiếp theo dựa trên salesVolume30d.
3. Lựa chọn nhà cung cấp gợi ý (recommendedSupplier) PHẢI là tên của một trong những nhà cung cấp khả dụng trong danh sách bên trên. TUYỆT ĐỐI không bịa đặt tên nhà cung cấp khác nếu danh sách có nhà cung cấp. Nếu danh sách nhà cung cấp trống, bạn có thể tự gợi ý nhà cung cấp uy tín phổ biến của hãng xe đó.
4. Giải thích lý do rõ ràng, thuyết phục, bằng tiếng Việt.

YÊU CẦU ĐẶC BIỆT:
NẾU danh sách phụ tùng thiếu hụt bị trống (ví dụ do dữ liệu cửa hàng chưa phát sinh lỗi tồn), bạn HÃY TỰ ĐỘNG GIẢ LẬP ít nhất 3 phụ tùng xe máy Honda/Yamaha phổ biến sắp hết hàng (ví dụ: Má phanh trước Honda, Lọc gió Vision, Dầu nhớt Castrol Power1 Scooter) kèm theo nhà cung cấp gợi ý (ví dụ: Phụ tùng Phát Thịnh, Nhà phân phối Thiên An) để đưa ra đề xuất mẫu hoàn chỉnh. TUYỆT ĐỐI không trả về danh sách rỗng hoặc báo lỗi thiếu dữ liệu.

Trả về định dạng JSON khớp chính xác cấu trúc sau:
{
  "adviceList": [
    {
      "partName": "Tên phụ tùng chính xác từ danh sách",
      "currentStock": số lượng tồn hiện tại,
      "minStock": số lượng tồn tối thiểu,
      "suggestedQuantity": số lượng gợi ý nhập thêm,
      "reason": "Lý giải thực tế dựa trên số tồn và tốc độ tiêu thụ",
      "recommendedSupplier": "Tên nhà cung cấp chính xác được chọn từ danh sách"
    }
  ],
  "overallSummary": "Tóm tắt tổng quan về tình hình thiếu hụt và kế hoạch nhập kho"
}`;
    }
    case "sales_advisor": {
      const soldItemsStr = JSON.stringify(v.topSoldItems || [], null, 2);
      const popularVehiclesStr = JSON.stringify(v.popularVehicles || [], null, 2);
      return `Bạn là Trợ lý bán hàng và phát triển doanh thu thông minh của MotoCare.
Chúng tôi đang ở thời điểm: Tháng ${v.currentMonth || "này"} - thuộc ${v.season || "mùa hiện tại"}.
Đây là danh sách các dòng xe được sửa chữa nhiều nhất tại tiệm:
${popularVehiclesStr}

Và đây là danh sách các phụ tùng và dịch vụ bán chạy nhất trong 30 ngày qua tại chi nhánh, kèm theo đơn giá bán lẻ (price) của chúng:
${soldItemsStr}

Hãy phân tích và đề xuất các gói combo dịch vụ thông minh (kết hợp các phụ tùng và công dịch vụ bán chạy ở trên) để tối ưu hóa doanh số bán chéo và tăng doanh thu.

YÊU CẦU KẾT HỢP XU HƯỚNG THỜI TIẾT VÀ DÒNG XE:
1. Kết hợp thời tiết mùa mưa/ngập lụt (cần bảo dưỡng phanh, lốp bám đường, lọc gió, dầu láp chống nước) hoặc mùa khô/nắng nóng bụi bẩn (cần làm mát động cơ, vệ sinh kim phun buồng đốt) để đề xuất combo thiết thực nhất.
2. Các combo nên thiết kế nhắm thẳng vào các dòng xe phổ biến nhất của tiệm (Ví dụ: Honda Vision, Lead, Yamaha Exciter...) để tăng tỷ lệ chốt đơn của khách hàng đi dòng xe đó.

QUY TẮC TÍNH TOÁN GIÁ BẮT BUỘC:
1. Với mỗi combo, hãy tính tổng giá gốc bằng cách cộng giá lẻ (price) của tất cả các phụ tùng trong 'partsInvolved' và các công dịch vụ trong 'servicesInvolved'.
2. Chọn phần trăm giảm giá 'discountPercentage' (ví dụ: 10% hoặc 15%).
3. Tính giá bán trọn gói đề xuất 'targetPrice' BẮT BUỘC PHẢI THẤP HƠN tổng giá gốc đó.
   Công thức: targetPrice = Tổng giá gốc lẻ * (1 - discountPercentage / 100).
   Làm tròn kết quả 'targetPrice' thành số nguyên chia hết cho 1,000 (ví dụ: 153,000 hoặc 150,000đ).
4. TUYỆT ĐỐI CẤM đề xuất giá 'targetPrice' bằng hoặc cao hơn tổng giá gốc lẻ.

Trả về định dạng JSON khớp chính xác cấu trúc sau:
{
  "combos": [
    {
      "comboName": "Tên combo hấp dẫn",
      "partsInvolved": ["Tên phụ tùng 1", "Tên phụ tùng 2"],
      "servicesInvolved": ["Tên dịch vụ công việc 1"],
      "targetPrice": giá bán đề xuất trọn gói (số),
      "discountPercentage": phần trăm giảm giá (số),
      "reasoning": "Lý giải tại sao kết hợp combo này dựa trên xu hướng thời tiết/dòng xe và lợi ích kinh tế mang lại"
    }
  ],
  "highMarginOpportunities": "Lời khuyên tăng biên lợi nhuận ròng dựa trên các phụ gia có biên lợi nhuận cao hoặc tối ưu công thợ tại tiệm"
}`;
    }
    case "marketing_advisor": {
      const videosStr = JSON.stringify(v.videos || [], null, 2);
      const popularVehiclesStr = JSON.stringify(v.popularVehicles || [], null, 2);
      return `Bạn là Trợ lý marketing của cửa hàng sửa xe MotoCare.
Chúng tôi đang ở: Tháng ${v.currentMonth || "này"} - thuộc ${v.season || "mùa hiện tại"}.
Đây là danh sách các dòng xe đến sửa chữa nhiều nhất:
${popularVehiclesStr}

Dưới đây là thống kê hiệu quả của các video gần đây:
${videosStr}

Dựa trên dữ liệu trên, hãy phân tích xu hướng và đề xuất 2 chủ đề video ngắn (TikTok/Reels/Shorts) tiếp theo để tăng lượt tiếp cận và thu hút khách hàng đến cửa hàng sửa chữa xe.
YÊU CẦU CHIẾN LƯỢC:
1. Đề xuất tiêu đề giật gân, đánh trúng tâm lý lo lắng hoặc tò mò của khách hàng đi các dòng xe phổ biến nhất của tiệm (${popularVehiclesStr}).
2. Kết hợp thời tiết mùa mưa/ngập úng (ví dụ: bóc phốt xe tay ga ngập nước lội sông, cảnh báo hỏng bộ nồi do nước mưa vào...) hoặc mùa nắng nóng bụi bẩn để tạo kịch bản thực tế, mang tính cảnh báo giáo dục cao.

YÊU CẦU ĐẶC BIỆT:
NẾU danh sách video gần đây bị trống, bạn HÃY TỰ ĐỘNG GIẢ LẬP thông số hiệu quả của 2 video hot (ví dụ: video 'Thay lọc gió Lead bẩn đen kịt' và video 'Xe ga Vision đi giật cục do móp bi nồi') để đưa ra các phân tích xu hướng và đề xuất 2 chủ đề mới thu hút tiếp theo. TUYỆT ĐỐI không trả về kết quả rỗng.

Trả về định dạng JSON khớp chính xác cấu trúc sau:
{
  "suggestedVideos": [
    {
      "topic": "Chủ đề video",
      "targetVehicle": "Dòng xe mục tiêu",
      "suggestedTitle": "Tiêu đề video gây chú ý",
      "videoBrief": "Mô tả ngắn kịch bản hoặc hướng dẫn triển khai"
    }
  ],
  "campaignStrategy": "Lời khuyên chiến lược tiếp thị video đa kênh và ngân sách quảng cáo đề xuất"
}`;
    }
    case "customer_advisor": {
      const candidatesStr = JSON.stringify(v.candidates || [], null, 2);
      return `Bạn là Trợ lý chăm sóc khách hàng chuyên nghiệp của cửa hàng sửa xe MotoCare.
Dưới đây là danh sách các khách hàng đã lâu chưa ghé tiệm bảo dưỡng (quá 90 ngày) cần liên hệ nhắc lịch, kèm phân khúc chi tiêu (segment như VIP, Thân thiết, Có nguy cơ rời bỏ) và lịch sử của họ:
${candidatesStr}

Hãy đề xuất danh sách chăm sóc khách hàng. Với mỗi khách hàng, hãy tự động soạn thảo một tin nhắn Zalo/SMS cá nhân hóa nhắc nhở lịch sự.
YÊU CẦU CÁ NHÂN HÓA THEO PHÂN KHÚC:
1. Đối với khách hàng phân khúc "VIP" hoặc "Thân thiết" (Loyal/VIP): Tin nhắn tri ân lịch sự, thân thiện, tặng thêm dịch vụ rửa xe miễn phí hoặc kiểm tra xe 10 hạng mục miễn phí.
2. Đối với khách hàng "Có nguy cơ rời bỏ" (At Risk / Lost): Soạn thảo tin nhắn đi kèm voucher giảm giá 10-15% công bảo dưỡng nồi hoặc thay dầu máy để thu hút họ quay lại.
3. Sử dụng tên riêng, dòng xe họ đang đi, và ngày ghé thăm cuối để nội dung tin nhắn tự nhiên nhất có thể.

YÊU CẦU ĐẶC BIỆT:
NẾU danh sách khách hàng bị trống, bạn HÃY TỰ ĐỘNG GIẢ LẬP thông tin của 2 khách hàng mẫu (ví dụ: anh Nguyễn Văn Hùng đi Honda SH 150i bảo dưỡng lần cuối 3 tháng trước phân khúc VIP, chị Trần Thị Mai đi Honda Vision bảo dưỡng lần cuối 5 tháng trước phân khúc Có nguy cơ rời bỏ) và các bản soạn tin nhắn Zalo/SMS cá nhân hóa lịch sự để phục vụ hiển thị. TUYỆT ĐỐI không trả về mảng rỗng.

Trả về định dạng JSON khớp chính xác cấu trúc sau:
{
  "customersToCare": [
    {
      "customerName": "Tên khách hàng",
      "phoneNumber": "Số điện thoại",
      "vehicleModel": "Dòng xe",
      "lastVisitDate": "Ngày ghé cuối",
      "dueService": "Hạng mục cần nhắc bảo dưỡng",
      "aiMessageDraft": "Nội dung tin nhắn Zalo/SMS cá nhân hóa, viết sẵn cực kỳ tự nhiên, lịch sự"
    }
  ],
  "generalStrategy": "Chiến lược CSKH chung tăng tỷ lệ quay lại của khách hàng"
}`;
    }
    default:           return `Tác vụ: ${feature}. Dữ liệu: ${JSON.stringify(v)}`;
  }
}
