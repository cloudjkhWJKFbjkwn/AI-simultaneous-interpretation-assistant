/**
 * Fetch word definition from the free Dictionary API.
 * Returns a formatted Chinese-friendly definition string, or null on failure.
 */
export async function fetchWordDefinition(word: string): Promise<string | null> {
  const key = word.toLowerCase().replace(/[,.!?;:()\[\]{}]/g, "").trim();
  if (!key) return null;

  try {
    const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(key));
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const parts: string[] = [];

    // Phonetic
    if (entry.phonetic) {
      parts.push(entry.phonetic);
    } else if (entry.phonetics?.length > 0) {
      const p = entry.phonetics.find((ph: { text?: string }) => ph.text);
      if (p) parts.push(p.text);
    }

    // First meaning's definition
    for (const meaning of entry.meanings || []) {
      const pos = meaning.partOfSpeech;
      for (const def of meaning.definitions || []) {
        let line = def.definition;
        if (pos) line = "[" + pos + "] " + line;
        if (def.example) line += "  e.g. \"" + def.example + "\"";
        parts.push(line);
        break; // Take only the first definition
      }
      if (parts.length > 1) break; // One phonetic + one definition is enough
    }

    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}
