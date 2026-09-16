const fs = require('fs');
const pdfParse = require('pdf-parse');
const Material = require('../models/Material');
const MaterialChunk = require('../models/MaterialChunk');
const Concept = require('../models/Concept');
const LearningEvent = require('../models/LearningEvent');
const aiService = require('./aiService');
const { chunkDocumentText } = require('../utils/chunker');

class DocumentService {
  /**
   * Processes an uploaded PDF material asynchronously
   */
  static async processPdfMaterial(materialId) {
    const material = await Material.findById(materialId);
    if (!material) throw new Error(`Material with ID ${materialId} not found`);

    try {
      // 1. Update status to 'processing'
      material.status = 'processing';
      material.progress = 20;
      await material.save();

      // 2. Read file buffer and parse PDF
      let dataBuffer;
      try {
        dataBuffer = fs.readFileSync(material.filePath);
      } catch (readErr) {
        throw new Error(`File read error: ${readErr.message}`);
      }

      let parsedPdf;
      let rawText = '';
      let numPages = 1;
      const pageMap = [];

      try {
        const parseOptions = {
          pagerender: function (pageData) {
            return pageData.getTextContent().then((textContent) => {
              let lastY, pageText = '';
              for (const item of textContent.items) {
                if (lastY === item.transform[5] || !lastY) {
                  pageText += item.str;
                } else {
                  pageText += '\n' + item.str;
                }
                lastY = item.transform[5];
              }
              const pageNumber = pageData.pageIndex + 1;
              pageMap.push({ pageNumber, text: pageText.trim() });
              return pageText;
            });
          }
        };

        parsedPdf = await pdfParse(dataBuffer, parseOptions);
        numPages = parsedPdf.numpages || pageMap.length || 1;
        rawText = pageMap.map((p) => p.text).join('\n\n').trim();
      } catch (parseErr) {
        console.warn(`[DocumentService] pdf-parse fallback for ${material.originalName}:`, parseErr.message);
        rawText = '';
        numPages = 1;
        if (parseErr.message && (parseErr.message.toLowerCase().includes('password') || parseErr.message.includes('Password'))) {
          throw new Error('This PDF is password-protected or encrypted. Please upload an unprotected PDF.');
        }
      }

      // Safeguard: Check if extracted text contains raw PDF binary or stream keywords
      if (rawText.startsWith('%PDF-') || (rawText.includes('/Filter') && rawText.includes('/Length') && rawText.includes('stream'))) {
        console.warn(`[DocumentService] Raw PDF stream binary detected in text for ${material.originalName}, clearing.`);
        rawText = '';
        pageMap.length = 0;
      }

      // Helper to detect if a document is scanned, handwritten, or image-only
      const isScannedOrHandwritten = (pMap, text) => {
        if (!text || text.trim().length === 0) return true;
        const cleaned = text
          .replace(/Scanned (?:by|with) [a-zA-Z0-9_-]+/gi, '')
          .replace(/CamScanner|Adobe Scan|DocScanner|ClearScanner|Tiny Scanner|Fast Scanner|vFlat/gi, '')
          .replace(/\s+/g, '')
          .replace(/\d+/g, '');
        if (cleaned.length < 60) return true;
        if (pMap && pMap.length > 1) {
          const avgChars = cleaned.length / pMap.length;
          if (avgChars < 45) return true;
        }
        return false;
      };

      // OCR Pipeline: For scanned PDFs, handwritten notes, and sparse image documents
      if (isScannedOrHandwritten(pageMap, rawText)) {
        console.log(`[DocumentService] Scanned/handwritten document detected for ${material.originalName} (${numPages} pages). Performing Vision OCR...`);
        try {
          // 1. Full multi-page Vision OCR via Gemini Files API
          const ocrPages = await aiService.transcribeDocumentWithVision(
            material.filePath,
            material.fileType || 'application/pdf',
            numPages,
            material.originalName
          );

          if (ocrPages && ocrPages.length > 0) {
            pageMap.length = 0;
            pageMap.push(...ocrPages);
            numPages = Math.max(numPages, pageMap.length);
            rawText = pageMap.map(p => p.text).join('\n\n').trim();
            console.log(`[DocumentService] Vision OCR successfully transcribed ${rawText.length} characters across ${pageMap.length} pages.`);
          } else if (dataBuffer.length < 15 * 1024 * 1024) {
            // 2. Buffer fallback for small files
            const singleOcr = await aiService.callGeminiMultimodal(
              dataBuffer,
              material.fileType || 'application/pdf',
              'You are an expert OCR engine for handwritten notes. Transcribe all text, handwritten notes, formulas, diagrams text, headings, and SQL commands verbatim.'
            );
            if (singleOcr && singleOcr.trim().length > 30) {
              rawText = singleOcr.trim();
              pageMap.length = 0;
              pageMap.push({ pageNumber: 1, text: rawText });
              console.log(`[DocumentService] Single-buffer OCR extracted ${rawText.length} characters.`);
            }
          }
        } catch (ocrErr) {
          console.warn(`[DocumentService] Vision OCR failed: ${ocrErr.message}`);
          if (!rawText.trim()) {
            if (ocrErr.message && (ocrErr.message.includes('no pages') || ocrErr.message.includes('400'))) {
              throw new Error('Unable to extract content: This document appears to be encrypted, password-protected, or corrupted. Please upload an unencrypted PDF or plain text notes.');
            }
          }
        }
      }

      if (!rawText.trim()) {
        throw new Error('No readable text or content could be extracted from this document. If it is password protected, please remove the password and re-upload.');
      }

      material.pagesCount = numPages;
      material.progress = 50;
      await material.save();

      // 3. Chunk document (supports page-aware chunking for documents up to 200+ pages)
      const chunksToInsert = chunkDocumentText(rawText, {
        numPages,
        materialId: material._id,
        projectId: material.projectId,
        userId: material.userId,
        originalName: material.originalName,
        pages: pageMap.length > 0 ? pageMap : null
      });

      // Save chunks to database in batch (batches of 400 to handle 100 to 500+ pages safely)
      if (chunksToInsert.length > 0) {
        const batchSize = 400;
        for (let i = 0; i < chunksToInsert.length; i += batchSize) {
          const chunkBatch = chunksToInsert.slice(i, i + batchSize);
          await MaterialChunk.insertMany(chunkBatch, { ordered: false });
        }
      }
      material.chunksCount = chunksToInsert.length;
      material.progress = 80;
      await material.save();

      // 4. Extract Concepts: For large 200-page documents, construct a representative multi-page sample
      const conceptSampleText = DocumentService.createSmartSampleForLargeDocument(pageMap, rawText);
      const extracted = await aiService.extractConceptsFromText({
        text: conceptSampleText,
        fileName: material.originalName,
        userId: material.userId,
        projectId: material.projectId
      });

      const extractedNames = [];
      for (const c of extracted) {
        extractedNames.push(c.name);
        const existing = await Concept.findOne({ projectId: material.projectId, name: c.name });
        if (!existing) {
          await Concept.create({
            projectId: material.projectId,
            name: c.name,
            description: c.description,
            estimatedMastery: c.estimatedMastery,
            status: c.estimatedMastery < 50 ? 'requiring_attention' : 'stable',
            history: [{ score: c.estimatedMastery, source: 'initial_assessment', delta: 0 }]
          });
        }
      }

      material.extractedConcepts = extractedNames;
      material.summary = `Processed ${material.originalName} (${numPages} pages, ${chunksToInsert.length} semantic chunks, ${extractedNames.length} concepts discovered).`;
      material.status = 'ready';
      material.progress = 100;
      material.processedAt = new Date();
      await material.save();

      // Record Learning Event
      await LearningEvent.create({
        userId: material.userId,
        projectId: material.projectId,
        eventType: 'material_processed',
        title: `Material Processed: ${material.originalName}`,
        description: `Extracted ${chunksToInsert.length} searchable chunks and ${extractedNames.length} key concepts.`,
        metadata: {
          materialId: material._id,
          pages: numPages,
          chunks: chunksToInsert.length,
          concepts: extractedNames
        }
      });

      console.log(`[DocumentService] Successfully processed material ${material.originalName}`);
      return material;
    } catch (err) {
      console.error(`[DocumentService Error] Failed processing material ${materialId}:`, err);
      material.status = 'failed';
      material.errorMessage = err.message;
      material.progress = 0;
      await material.save();

      await LearningEvent.create({
        userId: material.userId,
        projectId: material.projectId,
        eventType: 'material_failed',
        title: `Processing Failed: ${material.originalName}`,
        description: err.message,
        metadata: { materialId: material._id, error: err.message }
      });

      throw err;
    }
  }

  /**
   * Constructs a representative sample across large documents (up to 200+ pages)
   * for concept discovery without blowing model context limits.
   */
  static createSmartSampleForLargeDocument(pageMap = [], rawText = '') {
    if (!Array.isArray(pageMap) || pageMap.length <= 10) {
      return String(rawText || '').slice(0, 20000);
    }

    const totalPages = pageMap.length;
    const sampledPages = [];

    // 1. Initial 4 pages (Title, Abstract, Table of Contents, Introduction)
    for (let i = 0; i < Math.min(4, totalPages); i++) {
      sampledPages.push(pageMap[i]);
    }

    // 2. Sample evenly distributed pages across the body (up to 16 samples for 100-500+ pages)
    const middleCount = Math.min(16, Math.max(8, Math.floor(totalPages / 25)));
    const step = Math.max(1, Math.floor((totalPages - 6) / middleCount));
    for (let i = 4; i < totalPages - 2 && sampledPages.length < 24; i += step) {
      sampledPages.push(pageMap[i]);
    }

    // 3. Final 2 pages (Summary, Conclusions, Next Steps)
    for (let i = Math.max(4, totalPages - 2); i < totalPages; i++) {
      if (!sampledPages.includes(pageMap[i])) {
        sampledPages.push(pageMap[i]);
      }
    }

    return sampledPages
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text.slice(0, 1500)}`)
      .join('\n\n')
      .slice(0, 25000);
  }
}

module.exports = DocumentService;
