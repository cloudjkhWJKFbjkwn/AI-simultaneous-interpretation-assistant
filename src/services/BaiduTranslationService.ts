import type { TranslationService } from "../types";

/**
 * 百度文本翻译 API 客户端
 * 通过 Vite 中间件代理调用 fanyi-api.baidu.com
 */
export class BaiduTranslationService implements TranslationService {
  translate(text: string): Promise<string> {
    const endpoint = "/api/baidu-translate";
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, from: "en", to: "zh" }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: any) => {
        if (data.error_code) {
          throw new Error(
            `百度翻译错误 [${data.error_code}]: ${data.error_msg || "未知错误"}`
          );
        }
        // 百度翻译返回 trans_result[].dst
        if (data.trans_result && data.trans_result.length > 0) {
          return data.trans_result.map((t: any) => t.dst).join("");
        }
        return text; // 降级返回原文
      })
      .catch((err) => {
        console.error("[百度翻译] 请求失败:", err.message);
        return text + " [翻译失败]";
      });
  }
}
