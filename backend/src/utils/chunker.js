function splitTextIntoBlocks(text, maxBlockLength = 1000, overlap = 150) {
  if (!text || text.length <= maxBlockLength) {
    return [text.trim()];
  }

  const blocks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxBlockLength;
    if (end >= text.length) {
      blocks.push(text.slice(start).trim());
      break;
    }

    let breakIndex = -1;
    const searchSlice = text.slice(start + Math.floor(maxBlockLength * 0.6), end);

    const paraBreak = searchSlice.lastIndexOf('\n\n');
    if (paraBreak !== -1) {
      breakIndex = start + Math.floor(maxBlockLength * 0.6) + paraBreak + 2;
    } else {
      const lineBreak = searchSlice.lastIndexOf('\n');
      if (lineBreak !== -1) {
        breakIndex = start + Math.floor(maxBlockLength * 0.6) + lineBreak + 1;
      } else {
        const sentenceBreak = searchSlice.search(/[.!?]\s+(?=[A-Z0-9])/);
        if (sentenceBreak !== -1) {
          breakIndex = start + Math.floor(maxBlockLength * 0.6) + sentenceBreak + 2;
        }
      }
    }

    if (breakIndex === -1 || breakIndex <= start) {
      breakIndex = end;
    }

    const chunkSlice = text.slice(start, breakIndex).trim();
    if (chunkSlice.length > 0) {
      blocks.push(chunkSlice);
    }

    start = Math.max(start + 1, breakIndex - overlap);
  }

  return blocks.filter((b) => b.length > 0);
}

function extractKeywords(content) {
  if (!content) return [];
  const words = content.toLowerCase().match(/\b[a-z0-9_-]{4,20}\b/g) || [];
  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'were', 'which', 'their', 'there',
    'about', 'these', 'those', 'would', 'could', 'should', 'other', 'being',
    'after', 'before', 'where', 'while', 'under', 'between'
  ]);
  const counts = new Map();
  for (const w of words) {
    if (!stopWords.has(w) && !/^\d+$/.test(w)) {
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

function chunkDocumentText(rawText, options = {}) {
  const {
    numPages = 1,
    materialId = null,
    projectId = null,
    userId = null,
    originalName = 'Document',
    pages = null
  } = options;

  const chunksToInsert = [];
  let chunkIndex = 0;

  // Case 1: Structured per-page input (exact page numbers for 1 to 200+ pages)
  if (Array.isArray(pages) && pages.length > 0) {
    for (const pageItem of pages) {
      const pageNumber = pageItem.pageNumber || 1;
      const pageText = String(pageItem.text || '').trim();
      if (!pageText) continue;

      const blocks = splitTextIntoBlocks(pageText, 1000, 150);
      for (const block of blocks) {
        if (!block) continue;
        chunksToInsert.push({
          materialId,
          projectId,
          userId,
          pageNumber,
          chunkIndex,
          content: block,
          tokenCount: Math.ceil(block.length / 4),
          keywords: extractKeywords(block)
        });
        chunkIndex += 1;
      }
    }

    if (chunksToInsert.length > 0) {
      return chunksToInsert;
    }
  }

  // Case 2: Raw text fallback with estimated page interpolation
  const text = String(rawText || '').trim() || `Reference material: ${originalName}`;
  const charsPerPage = Math.max(600, Math.floor(text.length / Math.max(1, numPages)));
  let cumulativeLength = 0;

  const pushChunk = (content) => {
    const estimatedPage = Math.min(
      numPages,
      Math.max(1, Math.ceil((cumulativeLength || 1) / charsPerPage))
    );
    chunksToInsert.push({
      materialId,
      projectId,
      userId,
      pageNumber: estimatedPage,
      chunkIndex,
      content: content.trim(),
      tokenCount: Math.ceil(content.length / 4),
      keywords: extractKeywords(content)
    });
    chunkIndex += 1;
    cumulativeLength += content.length;
  };

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let currentChunkText = '';

  for (const para of paragraphs) {
    if (para.length > 1400) {
      if (currentChunkText.trim()) {
        pushChunk(currentChunkText);
        currentChunkText = '';
      }
      const subBlocks = splitTextIntoBlocks(para, 1000, 150);
      for (const sb of subBlocks) {
        pushChunk(sb);
      }
    } else if ((currentChunkText + ' ' + para).length > 1200 && currentChunkText.length > 0) {
      pushChunk(currentChunkText);
      currentChunkText = para;
    } else {
      currentChunkText += (currentChunkText ? '\n\n' : '') + para;
    }
  }

  if (currentChunkText.trim()) {
    pushChunk(currentChunkText);
  }

  if (chunksToInsert.length === 0) {
    pushChunk(text);
  }

  return chunksToInsert;
}

module.exports = { chunkDocumentText, splitTextIntoBlocks };
