/**
 * Fetch Chinese translation for a single word via Baidu Translate API.
 * Returns the Chinese translation string, or null on failure.
 */
export async function fetchWordDefinition(word: string): Promise<string | null> {
  const key = word.toLowerCase().replace(/[,.!?;:()\[\]{}]/g, "").trim();
  if (!key) return null;

  try {
    const res = await fetch("/api/baidu-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: key, from: "en", to: "zh" }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error_code) return null;

    if (data.trans_result && data.trans_result.length > 0) {
      return data.trans_result.map((t: { dst: string }) => t.dst).join("");
    }

    return null;
  } catch {
    return null;
  }
}
