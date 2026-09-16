const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'what', 'for', 'with', 'and', 'or', 'to', 'in', 'a', 'an', 'as',
  'by', 'of', 'how', 'does', 'do', 'can', 'are', 'about', 'from', 'this', 'that', 'these', 'those', 'my', 'me',
  'i', 'think', 'want', 'content', 'give', 'given', 'show', 'tell', 'tells', 'presented', 'present', 'presents',
  'know', 'see', 'said', 'says', 'page', 'pages', 'would', 'could', 'should', 'there', 'here', 'please', 'extract',
  'summarize', 'summary'
]);

function stem(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/(?:ing|tions?|ers?|es|ed|s)$/i, '');
}

function tokenizeQuery(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

const OVERVIEW_PATTERNS = [
  /what(?:'?s|\s+is)\s+(?:in|inside|about|there)/i,
  /what(?:'?s|\s+is)\s+my\s+project/i,
  /summar/i,
  /overview/i,
  /\bcore\s+concepts\b/i,
  /\bkey\s+concepts\b/i,
  /\bmain\s+concepts\b/i,
  /\ball\s+pages\b/i,
  /\bentire\s+(?:pdf|doc|document|material|notes)\b/i,
  /\bexplain\s+(?:the\s+)?(?:core\s+|key\s+)?concepts\b/i,
  /\bfrom\s+my\s+uploaded\s+material\b/i,
  /\buploaded\s+material\b/i,
  /content/i,
  /document/i,
  /pdf/i,
  /material/i,
  /extract/i,
  /tell me about/i,
  /who is/i,
  /show me/i,
  /all concepts/i,
  /what do (?:i|we|you) have/i,
  /resume/i,
  /skills?/i,
  /experience/i,
  /projects?/i,
  /\bwhat\s+(?:are\s+)?content/i,
  /\bwhat\s+(?:is|are)\s+presented\b/i,
  /\bwhat\s+is\s+in\s+this\b/i,
  /\bwhat\s+does\s+this\s+(?:have|contain)\b/i,
  /\btable\s+of\s+contents\b/i,
  /\btopics?\s+covered\b/i,
  /\bproject\s+materials?\b/i
];

function detectPageIntent(query) {
  const q = String(query || '').toLowerCase().trim();
  if (/\b(?:last|final|ending|conclud(?:ing|e)|end)\s+page\b/i.test(q)) {
    return 'last';
  }
  if (/\b(?:first|initial|cover|starting|start|title)\s+page\b/i.test(q)) {
    return 'first';
  }

  // Range pattern 1: "pages? (from )?X to Y" or "page X to page Y" or "pages? X-Y"
  const range1 = q.match(/\bpages?\s+(?:from\s+)?(\d+)\s*(?:to|-)\s*(?:page\s+)?(\d+)\b/i);
  if (range1) {
    const s = parseInt(range1[1], 10), e = parseInt(range1[2], 10);
    return { start: Math.min(s, e), end: Math.max(s, e) };
  }

  // Range pattern 2: "(from )?X to Y pages?" or "between X and Y pages?" (e.g. "from 10 to 20 page")
  const range2 = q.match(/\b(?:from\s+|between\s+)?(\d+)\s*(?:to|-|and)\s*(\d+)\s*pages?\b/i);
  if (range2) {
    const s = parseInt(range2[1], 10), e = parseInt(range2[2], 10);
    return { start: Math.min(s, e), end: Math.max(s, e) };
  }

  // Range pattern 3: "from page X to (page )?Y"
  const range3 = q.match(/\bfrom\s+page\s+(\d+)\s+to\s+(?:page\s+)?(\d+)\b/i);
  if (range3) {
    const s = parseInt(range3[1], 10), e = parseInt(range3[2], 10);
    return { start: Math.min(s, e), end: Math.max(s, e) };
  }

  // Single page patterns: "page X" or "Xth page"
  const single1 = q.match(/\bpage\s+(\d+)\b/i);
  if (single1) {
    return parseInt(single1[1], 10);
  }
  const single2 = q.match(/\b(\d+)(?:st|nd|rd|th)\s+page\b/i);
  if (single2) {
    return parseInt(single2[1], 10);
  }

  return null;
}

function isOverviewQuery(query) {
  // If user is asking for a specific page or range, it is not a generic overview query
  if (detectPageIntent(query) !== null) {
    return false;
  }
  return OVERVIEW_PATTERNS.some((p) => p.test(String(query || '')));
}

function scoreChunks(chunks, query, { minScoreThreshold = 0.15, materialMap = {}, topK = 3 } = {}) {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];

  const pageIntent = detectPageIntent(query);
  const isOverview = isOverviewQuery(query);
  const tokens = tokenizeQuery(query);
  const stemmedTokens = tokens.map(stem).filter((t) => t.length > 2);

  // Material Name Matching: Detect if user explicitly named a specific document (e.g. "machine learning")
  let targetMaterialId = null;
  const qLower = String(query || '').toLowerCase();
  for (const [mId, mName] of Object.entries(materialMap)) {
    const cleanName = String(mName || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, ' ').trim();
    const nameWords = cleanName.split(/\s+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    const matchedWords = nameWords.filter((tok) => qLower.includes(tok));
    if (nameWords.length > 0 && matchedWords.length >= Math.min(2, nameWords.length)) {
      targetMaterialId = mId;
      break;
    }
  }

  // Full-Spectrum Overview / Summarization: Covers the ENTIRE document from Page 1 to the final page
  if (isOverview) {
    const eligibleChunks = targetMaterialId
      ? chunks.filter((c) => String(c.materialId || '') === String(targetMaterialId))
      : chunks;

    if (!eligibleChunks || eligibleChunks.length === 0) return [];

    const sorted = eligibleChunks.slice().sort((a, b) => {
      const pDiff = (a.pageNumber || 1) - (b.pageNumber || 1);
      if (pDiff !== 0) return pDiff;
      return (a.chunkIndex || 0) - (b.chunkIndex || 0);
    });

    // If total chunks fits within topK (e.g. 40 chunks <= 45), return ALL chunks across ALL pages!
    if (sorted.length <= topK) {
      return sorted.map((chunk) => ({
        chunkId: chunk._id,
        materialId: chunk.materialId,
        materialName: materialMap[chunk.materialId?.toString?.() || chunk.materialId] || chunk.materialName || 'Uploaded Material',
        pageNumber: chunk.pageNumber || 1,
        content: chunk.content,
        score: 0.95
      }));
    }

    // Stratified uniform sampling across [minPage, maxPage] so every section is represented
    const minP = sorted[0].pageNumber || 1;
    const maxP = sorted[sorted.length - 1].pageNumber || minP;

    const selected = [];
    const usedIndices = new Set();

    for (let i = 0; i < topK; i++) {
      const targetPage = minP + Math.round((i * (maxP - minP)) / (topK - 1));
      let bestIdx = -1;
      let minDiff = Infinity;
      for (let j = 0; j < sorted.length; j++) {
        if (usedIndices.has(j)) continue;
        const diff = Math.abs((sorted[j].pageNumber || 1) - targetPage);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = j;
        }
      }
      if (bestIdx !== -1) {
        usedIndices.add(bestIdx);
        selected.push(sorted[bestIdx]);
      }
    }

    selected.sort((a, b) => (a.pageNumber || 1) - (b.pageNumber || 1) || (a.chunkIndex || 0) - (b.chunkIndex || 0));

    return selected.map((chunk) => ({
      chunkId: chunk._id,
      materialId: chunk.materialId,
      materialName: materialMap[chunk.materialId?.toString?.() || chunk.materialId] || chunk.materialName || 'Uploaded Material',
      pageNumber: chunk.pageNumber || 1,
      content: chunk.content,
      score: 0.95
    }));
  }

  // Determine min and max page numbers across document chunks (filtered to target material if present)
  let minPage = Infinity;
  let maxPage = 1;
  for (const c of chunks) {
    if (targetMaterialId && String(c.materialId || '') !== String(targetMaterialId)) continue;
    const p = c.pageNumber || 1;
    if (p < minPage) minPage = p;
    if (p > maxPage) maxPage = p;
  }
  if (minPage === Infinity) minPage = 1;

  // If a specific page number is requested, check if any chunks exist on that page
  const hasTargetPageChunks = typeof pageIntent === 'number' && chunks.some((c) => c.pageNumber === pageIntent && (!targetMaterialId || String(c.materialId || '') === String(targetMaterialId)));

  const scoredChunks = [];

  for (const chunk of chunks) {
    const mIdStr = String(chunk.materialId || '');
    // If a specific material was named, exclude chunks from other materials
    if (targetMaterialId !== null && mIdStr !== String(targetMaterialId)) {
      continue;
    }

    const contentLower = String(chunk.content || '').toLowerCase();
    const pNum = chunk.pageNumber || 1;
    let matchCount = 0;
    let matchedUniqueTokens = 0;

    for (let i = 0; i < tokens.length; i++) {
      const raw = tokens[i];
      const s = stemmedTokens[i] || raw;

      const exactRegex = new RegExp(`\\b${raw}\\w*\\b`, 'gi');
      const stemRegex = new RegExp(`\\b${s}\\w*\\b`, 'gi');

      const matches = contentLower.match(exactRegex) || contentLower.match(stemRegex);
      if (matches) {
        matchCount += matches.length;
        matchedUniqueTokens += 1;
      }
    }

    let finalScore = 0;
    if (tokens.length > 0) {
      const coverageRatio = matchedUniqueTokens / tokens.length;
      const density = Math.min(1, matchCount / (chunk.tokenCount || 50));
      finalScore = (coverageRatio * 0.75) + (density * 0.25);
    }

    // Heading / Section Title Match Boost (e.g. "9. Bibliography" matching "bibliography")
    if (tokens.length > 0) {
      for (const tok of tokens) {
        if (tok.length >= 4) {
          const headingRegex = new RegExp(`(?:^|\\n)\\s*(?:\\d{1,2}\\.?\\s+)?([A-Za-z0-9\\s,&–—/-]*${tok}[A-Za-z0-9\\s,&–—/-]*)(?=\\n|$)`, 'i');
          if (headingRegex.test(chunk.content)) {
            finalScore += 0.65;
            break;
          }
        }
      }
    }

    // 1. Strict Page Intent Handling
    if (pageIntent !== null) {
      if (pageIntent === 'last') {
        if (pNum === maxPage) {
          finalScore = Math.max(2.0, finalScore + 2.0);
        } else {
          finalScore = 0.01;
        }
      } else if (pageIntent === 'first') {
        if (pNum === minPage) {
          finalScore = Math.max(2.0, finalScore + 2.0);
        } else {
          finalScore = 0.01;
        }
      } else if (typeof pageIntent === 'object' && pageIntent !== null && pageIntent.start !== undefined && pageIntent.end !== undefined) {
        if (pNum >= pageIntent.start && pNum <= pageIntent.end) {
          finalScore = Math.max(2.0, finalScore + 2.0);
        } else {
          finalScore = 0.01;
        }
      } else if (typeof pageIntent === 'number') {
        if (hasTargetPageChunks) {
          // Strictly isolate to the requested page
          if (pNum === pageIntent) {
            finalScore = Math.max(2.0, finalScore + 2.0);
          } else {
            finalScore = 0.01;
          }
        } else {
          // If the exact page is not found, fallback gracefully
          if (Math.abs(pNum - pageIntent) <= 1) {
            finalScore = Math.max(0.70, finalScore + 0.50);
          } else {
            finalScore = 0.05;
          }
        }
      }
    }

    const threshold = pageIntent !== null ? 0.50 : minScoreThreshold;
    if (finalScore >= threshold) {
      scoredChunks.push({
        chunkId: chunk._id,
        materialId: chunk.materialId,
        materialName: materialMap[chunk.materialId?.toString?.() || chunk.materialId] || chunk.materialName || 'Uploaded Material',
        pageNumber: pNum,
        content: chunk.content,
        score: Number(finalScore.toFixed(3))
      });
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK);
}

module.exports = { tokenizeQuery, scoreChunks, isOverviewQuery, detectPageIntent };
