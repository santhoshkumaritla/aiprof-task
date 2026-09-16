/**
 * 500-Page Scalable RAG Pipeline & Large File Size Benchmark
 */
require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const { chunkDocumentText } = require('../src/utils/chunker');
const { scoreChunks, detectPageIntent } = require('../src/utils/retrievalScoring');
const DocumentService = require('../src/services/documentService');

async function run500PageRAGTest() {
  console.log('=== Starting 500-Page Scalable RAG & Large File Benchmark ===\n');

  // 1. Generate 500 pages of simulated dense textbook documentation (~1,000,000 characters)
  console.log('1. Generating 500 pages of technical textbook content...');
  const t0 = Date.now();
  const pages = [];

  for (let i = 1; i <= 500; i++) {
    let topicText = '';
    if (i === 1) {
      topicText = 'Book Title & Introduction: Complete Handbook of Distributed Systems, Autonomous AI, and Database Engineering (500 Pages Comprehensive Edition).';
    } else if (i === 2) {
      topicText = 'Table of Contents: Part I Distributed Consensus (Pages 3-100), Part II Storage Engines (Pages 101-250), Part III Neural Architecture (Pages 251-400), Part IV Production Operations (Pages 401-500).';
    } else if (i === 75) {
      topicText = 'Chapter 4: Raft Consensus Algorithm and Leader Election. Log replication guarantees state machine consistency across distributed cluster nodes.';
    } else if (i === 255) {
      topicText = 'Chapter 14: Deep Transformer Attention Mechanics. Multi-head self-attention computes scaled dot-product attention over key, query, and value matrix projections.';
    } else if (i === 412) {
      topicText = 'Chapter 22: Kubernetes Operator Lifecycle and Zero-Downtime Migration. Rolling updates with readiness probes prevent request drops during live deployments.';
    } else if (i === 500) {
      topicText = 'Bibliography & Master Index: Reference catalog across all 500 pages, academic citations, RFC specifications, and concluding author notes.';
    } else {
      topicText = `Chapter ${Math.ceil(i / 20)}, Section ${i}: Detailed operational paradigms, algorithms, and benchmark metrics for textbook page ${i}.`;
    }

    const filler = Array(12).fill(`Engineering guidelines, memory boundaries, and runtime characteristics on page ${i}. `).join('');
    pages.push({
      pageNumber: i,
      text: `${topicText}\n\n${filler}`
    });
  }

  const genTime = Date.now() - t0;
  console.log(`✅ Generated 500 pages in ${genTime}ms (Total chars: ${pages.reduce((acc, p) => acc + p.text.length, 0).toLocaleString()})`);

  // 2. Chunking Benchmark for 500 Pages
  console.log('\n2. Benchmarking Page-Aware Chunking for 500 Pages...');
  const tChunkStart = Date.now();
  const chunks = chunkDocumentText(null, {
    pages,
    numPages: 500,
    materialId: new mongoose.Types.ObjectId(),
    projectId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    originalName: 'Complete_Distributed_Systems_500_Pages.pdf'
  });
  const chunkTime = Date.now() - tChunkStart;

  console.log(`✅ Chunked 500 pages in ${chunkTime}ms`);
  console.log(`   Total chunks created: ${chunks.length}`);
  assert.ok(chunks.length >= 500, `Expected at least 500 chunks, got ${chunks.length}`);
  assert.strictEqual(chunks[0].pageNumber, 1);
  assert.strictEqual(chunks[chunks.length - 1].pageNumber, 500);

  // 3. Smart Multi-Page Sampling for 500 Pages
  console.log('\n3. Verifying Smart Multi-Page Sampling for 500 Pages...');
  const sample = DocumentService.createSmartSampleForLargeDocument(pages, '');
  console.log(`   Sample text length: ${sample.length} characters`);
  assert.ok(sample.length > 5000 && sample.length <= 30000, `Sample length ${sample.length} outside expected range`);
  assert.ok(sample.includes('--- Page 1 ---'), 'Sample must include Page 1');
  assert.ok(sample.includes('--- Page 500 ---') || sample.includes('--- Page 499 ---'), 'Sample must include ending pages');
  console.log('✅ 500-page sampling spans entire book without exceeding LLM context budget');

  // 4. In-Memory Retrieval Ranking Benchmark across all 500 pages
  console.log('\n4. Benchmarking Semantic Evidence Retrieval across 500-page Chunks...');

  // Test Query A: Chapter 14 (Page 255)
  const tRetStart = Date.now();
  const hitsPage255 = scoreChunks(chunks, 'Explain how multi-head self-attention computes scaled dot-product attention', {
    materialMap: { [chunks[0].materialId]: 'Complete_Distributed_Systems_500_Pages.pdf' },
    topK: 3
  });
  const retTimeA = Date.now() - tRetStart;

  console.log(`✅ Query A retrieved in ${retTimeA}ms:`);
  hitsPage255.forEach((h, idx) => console.log(`   Rank #${idx + 1}: Page ${h.pageNumber} (Score: ${h.score}) -> "${h.content.slice(0, 80)}..."`));
  assert.strictEqual(hitsPage255[0].pageNumber, 255, `Expected top result on Page 255, got Page ${hitsPage255[0].pageNumber}`);

  // Test Query B: Specific Page Intent (Page 412)
  const hitsPage412 = scoreChunks(chunks, 'What is on page 412?', {
    materialMap: { [chunks[0].materialId]: 'Complete_Distributed_Systems_500_Pages.pdf' },
    topK: 3
  });
  console.log(`✅ Query B (Page 412 Intent) retrieved top result on Page ${hitsPage412[0]?.pageNumber} (Score: ${hitsPage412[0]?.score})`);
  assert.strictEqual(hitsPage412[0].pageNumber, 412, `Expected Page 412, got Page ${hitsPage412[0].pageNumber}`);

  // Test Query C: Page Range Intent ("pages 70 to 80")
  const rangeIntent = detectPageIntent('summarize the pages from 70 to 80');
  assert.deepStrictEqual(rangeIntent, { start: 70, end: 80 });
  const hitsRange = scoreChunks(chunks, 'summarize the pages from 70 to 80', {
    materialMap: { [chunks[0].materialId]: 'Complete_Distributed_Systems_500_Pages.pdf' },
    topK: 5
  });
  console.log(`✅ Query C (Page Range 70 to 80) retrieved ${hitsRange.length} chunks strictly within range:`);
  hitsRange.forEach(h => {
    assert.ok(h.pageNumber >= 70 && h.pageNumber <= 80, `Chunk page ${h.pageNumber} outside range 70-80`);
    console.log(`   • Page ${h.pageNumber} (Score: ${h.score})`);
  });

  // Test Query D: Last Page Intent ("what is in the last page")
  const hitsLastPage = scoreChunks(chunks, 'what is in the last page', {
    materialMap: { [chunks[0].materialId]: 'Complete_Distributed_Systems_500_Pages.pdf' },
    topK: 3
  });
  console.log(`✅ Query D (Last Page Intent) retrieved Page ${hitsLastPage[0]?.pageNumber} (Score: ${hitsLastPage[0]?.score})`);
  assert.strictEqual(hitsLastPage[0].pageNumber, 500, `Expected Page 500, got Page ${hitsLastPage[0].pageNumber}`);

  console.log('\n========================================');
  console.log('500-Page Scalable RAG Pipeline: ALL TESTS PASSED (100%)');
  console.log('========================================');
}

run500PageRAGTest().then(() => process.exit(0)).catch((err) => {
  console.error('500-page test failed:', err);
  process.exit(1);
});
