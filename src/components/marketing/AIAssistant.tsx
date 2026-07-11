import React, { useState } from "react";
import {
  Cpu,
  Sparkles,
  Send,
  RefreshCw,
  Lightbulb,
  FileText,
  Tag,
  Copy,
} from "lucide-react";
import { showToast } from "../../utils/toast";

export const AIAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);

  const sampleResponses: Record<string, string> = {
    ideas: `💡 Ý TƯỞNG TRUYỀN THÔNG MỚI:
1. Tiêu đề: "Tại sao xe máy của bạn dạo này uống xăng như nước?"
   - Dòng xe: Honda Vision & SH Mode
   - Chủ đề: Bảo dưỡng xe định kỳ
   - Nội dung chính: Giải thích nguyên nhân do lọc gió bẩn và bugi mòn. Hướng dẫn kiểm tra nhanh.

2. Tiêu đề: "Mẹo nhỏ giúp tăng tuổi thọ ắc quy xe máy gấp đôi"
   - Dòng xe: Xe ga & Xe số chung
   - Chủ đề: Mẹo vặt tự bảo quản
   - Nội dung chính: Tránh bật khóa xe không nổ máy quá lâu, định kỳ sạc ắc quy.

3. Tiêu đề: "Phân biệt Pin Lithium và ắc quy chì trên xe điện máy"
   - Dòng xe: Xe điện VinFast & Yadea
   - Chủ đề: So sánh kỹ thuật
   - Nội dung chính: Nêu bật ưu thế sạc nhanh, nhẹ, bền của Pin Lithium.`,

    hook: `🎬 TOP HOOK THU HÚT TRIỆU VIEW:
1. "Đừng bao giờ dắt xe máy ra tiệm nếu chưa biết mẹo kiểm tra này!"
2. "90% người đi xe máy đang mắc sai lầm nghiêm trọng này khi đổ xăng..."
3. "Bạn nghĩ xe ga đi 20.000km chỉ cần thay nhớt? Hãy xem kỹ clip này!"
4. "Mất 10 triệu sửa cục máy chỉ vì bỏ qua bộ phận nhỏ giá 50k này."`,

    caption: `📝 CAPTION & HASHTAG GỢI Ý:

Caption:
"Xe tay ga đi lâu ngày bị lì máy, hao xăng và phát ra tiếng kêu lạ ở nồi? 🛵💨 
Thủ phạm rất có thể là do bộ nồi xe ga đã bị bám bẩn, mòn búa ba càng hoặc bi nồi!
Ghé ngay MotoCare hôm nay để được Kỹ thuật viên kiểm tra, vệ sinh nồi miễn phí nhé mọi người! 👇

#motocare #baoduongxemay #vesinhnoi #honda #vision #suaxemayuytin #mẹo_xe_máy"`,
  };

  const handleQuickAction = (key: string) => {
    setPrompt(
      key === "ideas"
        ? "Lên ý tưởng video marketing cho cửa hàng sửa xe ga trong tháng này"
        : key === "hook"
        ? "Viết 3 câu Hook thu hút người dùng cho video sửa xe SH bị kêu nồi"
        : "Tạo caption giới thiệu dịch vụ bảo dưỡng xe kèm hashtag Honda Vision"
    );
    generateMockOutput(key);
  };

  const generateMockOutput = (key: string) => {
    setGenerating(true);
    setOutput("");

    const responseText = sampleResponses[key] || `🤖 Đang chuẩn bị tích hợp API AI Assistant...
Dữ liệu gợi ý cho prompt: "${prompt || "Yêu cầu của bạn"}" sẽ được tạo ra tại đây.`;

    let i = 0;
    const timer = setInterval(() => {
      setOutput((prev) => prev + responseText.charAt(i));
      i++;
      if (i >= responseText.length) {
        clearInterval(timer);
        setGenerating(false);
        showToast.success("Đã hoàn thành tạo nội dung!");
      }
    }, 15); // fast typing speed
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Simple routing based on prompt keywords
    const lower = prompt.toLowerCase();
    let key = "unknown";
    if (lower.includes("ý tưởng") || lower.includes("ideas")) key = "ideas";
    else if (lower.includes("hook") || lower.includes("mở đầu")) key = "hook";
    else if (lower.includes("caption") || lower.includes("hashtag") || lower.includes("viết bài")) key = "caption";

    generateMockOutput(key);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    showToast.success("Đã sao chép nội dung gợi ý!");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/85 pb-3">
        <Cpu className="w-6 h-6 text-fuchsia-600 animate-pulse" />
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>AI Marketing Assistant</span>
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-750 rounded text-[9px] font-semibold text-slate-500 dark:text-slate-400">UI Preview</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tạo ý tưởng, hook kịch bản, caption, hashtag tự động bằng trí tuệ nhân tạo (Chuẩn bị tích hợp API).
          </p>
        </div>
      </div>

      {/* Main playground layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left column: input prompt */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">
              Yêu cầu AI hỗ trợ
            </h4>

            {/* Quick action buttons */}
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => handleQuickAction("ideas")}
                disabled={generating}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-fuchsia-500/40 rounded-xl text-left hover:shadow-sm transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Lên ý tưởng video</div>
                  <div className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">Tự động gợi ý dòng xe, chủ đề</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction("hook")}
                disabled={generating}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-fuchsia-500/40 rounded-xl text-left hover:shadow-sm transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Viết Hook kịch bản thu hút</div>
                  <div className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">Câu nói gây ấn tượng trong 3s đầu</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction("caption")}
                disabled={generating}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-fuchsia-500/40 rounded-xl text-left hover:shadow-sm transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Gợi ý Caption & Hashtags</div>
                  <div className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">Caption tối ưu theo SEO</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form input */}
          <form onSubmit={handleSend} className="space-y-2 mt-6">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Nhập yêu cầu tùy chọn của bạn tại đây..."
                disabled={generating}
                className="w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500 shadow-sm"
              />
              
              <button
                type="submit"
                disabled={generating || !prompt.trim()}
                className="absolute right-2 top-2 p-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Right column: output */}
        <div className="lg:col-span-7 bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between min-h-[360px] relative">
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold text-slate-300">Kết quả gợi ý từ AI</span>
              </div>
              
              {output && !generating && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-bold"
                >
                  <Copy className="w-3.5 h-3.5" /> Sao chép kết quả
                </button>
              )}
            </div>

            {generating && !output && (
              <div className="flex items-center gap-2 py-4">
                <RefreshCw className="w-4 h-4 text-fuchsia-500 animate-spin" />
                <span className="text-xs text-slate-400 font-mono">AI đang xử lý thông tin...</span>
              </div>
            )}

            {output && (
              <pre className="text-xs text-slate-200 font-mono whitespace-pre-line leading-relaxed select-text p-2">
                {output}
              </pre>
            )}

            {!output && !generating && (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-600">
                <Sparkles className="w-8 h-8 mb-2 text-slate-700" />
                <p className="text-xs font-mono">Nhập prompt hoặc chọn tác vụ nhanh bên trái để bắt đầu tạo nội dung.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
