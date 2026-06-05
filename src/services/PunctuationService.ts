/**
 * 规则标点引擎 — 纯前端，零 API 调用
 * 给百度 ASR 返回的纯文本补全标点符号和大小写
 */

const CONTRACTIONS: Record<string, string> = {
  dont: "don't", cant: "can't", wont: "won't",
  im: "I'm", youre: "you're", hes: "he's", shes: "she's",
  thats: "that's", theres: "there's", heres: "here's",
  isnt: "isn't", arent: "aren't", wasnt: "wasn't", werent: "weren't",
  hasnt: "hasn't", havent: "haven't", hadnt: "hadn't",
  doesnt: "doesn't", didnt: "didn't",
  couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't",
  ive: "I've", youve: "you've", weve: "we've", theyve: "they've",
  ill: "I'll", youll: "you'll", hell: "he'll", shell: "she'll", well: "we'll", theyll: "they'll",
  id: "I'd", youd: "you'd", hed: "he'd", shed: "she'd", wed: "we'd", theyd: "they'd",
};

const QUESTION_STARTERS = /^(what|how|why|when|where|who|which|whose|whom|can|could|would|should|will|shall|do|does|did|is|are|was|were|have|has|had|am)\b/i;

const CONTINUATION_ENDS = /\b(and|but|so|or|yet|nor|because|since|although|though|while|whereas|if|when|where|that|which|who|whom|whose|whether|unless|until|after|before|as|once|than|except|like|including|especially|particularly|namely|such as|for example|for instance)\s*$/i;

const DISCOURSE_STARTERS = /^(however|actually|basically|anyway|anyhow|therefore|furthermore|moreover|nevertheless|nonetheless|meanwhile|otherwise|instead|indeed|fortunately|unfortunately|obviously|clearly|interestingly|importantly|specifically|generally|honestly|frankly|seriously|literally|essentially|ultimately|finally|firstly|secondly|thirdly|in fact|in other words|on the other hand|as a result|for example|for instance|in addition|in conclusion|in summary|by the way|what's more|to be honest|to be fair|that said|having said that)\b/i;

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fixCapitalI(text: string): string {
  return text.replace(/\bi\b/g, 'I');
}

function fixContractions(text: string): string {
  return text.split(/\s+/).map(w => {
    const clean = w.toLowerCase().replace(/[^a-z']/g, '');
    if (CONTRACTIONS[clean]) {
      const punct = w.length > clean.length ? w.slice(-1) : '';
      if (w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) {
        return capitalizeFirst(CONTRACTIONS[clean]) + (/[.,!?]/.test(punct) ? punct : '');
      }
      return CONTRACTIONS[clean] + (/[.,!?]/.test(punct) ? punct : '');
    }
    return w;
  }).join(' ');
}

function addCommasBeforeConjunctions(text: string): string {
  return text.replace(/(\w{4,})\s+(but|and|so|or|yet)\s+(\w{2,})/gi,
    (_match: string, before: string, conj: string, after: string) => before + ', ' + conj + ' ' + after
  );
}

function looksIncomplete(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (/[.!?]$/.test(trimmed)) return false;
  if (CONTINUATION_ENDS.test(trimmed)) return true;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 3) return true;
  return false;
}

function addEndPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  if (looksIncomplete(trimmed)) return trimmed;
  if (QUESTION_STARTERS.test(trimmed)) return trimmed + '?';
  return trimmed + '.';
}

export class PunctuationService {
  static restore(raw: string): string {
    if (!raw || raw.trim().length === 0) return '';

    let text = raw.trim();
    text = text.toLowerCase();
    text = fixCapitalI(text);
    text = fixContractions(text);
    text = capitalizeFirst(text);
    text = addCommasBeforeConjunctions(text);
    text = addEndPunctuation(text);

    return text;
  }

  static isComplete(text: string): boolean {
    return !looksIncomplete(text);
  }

  static startsWithDiscourseMarker(text: string): boolean {
    return DISCOURSE_STARTERS.test(text.trim());
  }
}
