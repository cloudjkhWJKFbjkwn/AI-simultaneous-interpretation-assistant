export async function fetchWordDefinition(word: string): Promise<string | null> {
  const key = word.toLowerCase().replace(/[^a-z']/gi, "").trim();
  if (!key) return null;

  try {
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(key) + "&langpair=en|zh";
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  } catch {
    return null;
  }
}
