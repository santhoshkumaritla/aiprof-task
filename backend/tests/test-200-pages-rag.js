/**
 * 200-Page Scalable RAG Pipeline Benchmark & Verification
 */
require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const { chunkDocumentText } = require('../src/utils/chunker');
const { scoreChunks } = require('../src/utils/retrievalScoring');
const DocumentService = require('../src/services/documentService');

async function run200PageRAGTest() {
  console.log('=== Starting 200-Page Scalable RAG Pipeline Benchmark ===\n');

  // 1. Generate 200 pages of technical documentation (~100,000 words, ~600,000 characters)
  console.log('1. Generating 200 pages of technical documentation...');
  const t0 = Date.now();
  const pages = [];

  for (let i = 1; i <= 200; i++) {
    let topicText = '';
    if (i === 1) {
      topicText = 'Executive Summary: Large-scale RAG architecture, vector search benchmarks, and semantic retrieval for 200+ page technical manuals.';
    } else if (i === 2) {
      topicText = 'Table of Contents: Chapter 1 Foundations, Chapter 3 Distributed Vector Indexing, Chapter 7 Residual Networks, Chapter 12 High-Throughput Batch Processing, Appendix.';
    } else if (i === 25) {
      topicText = 'Chapter 3: Distributed State Management and Vector Indexing. Sharding index partitions across nodes ensures sub-10ms lookup latency.';
    } else if (i === 80) {
      topicText = 'Chapter 7: Deep Residual Learning with Skip Connections. Skip connections allow gradients to flow directly through identity shortcuts, mitigating vanishing gradients in very deep neural networks.';
    } else if (i === 145) {
      topicText = 'Chapter 12: High-Throughput Batch Processing and Latency Benchmarks. Batch insertion of 600 chunks completes in 35ms using unordered MongoDB operations.';
    } else if (i === 200) {
      topicText = 'Appendix & Conclusions: Summary of findings across all 200 pages, operational constraints, and verification procedures for AI study platforms.';
    } else {
      topicText = `Section ${i}: Standard technical documentation detailing component behavior, data structures, invariants, and implementation patterns for page ${i}.`;
    }

    const filler = Array(15).fill(`Elaborating technical parameters on page ${i} with verified mathematical formulations and engineering guidelines. `).join('');
    pages.push({
      pageNumber: i,
      text: `${topicText}\n\n${filler}`
    });
  }

  const genTime = Date.now() - t0;
  console.log(`✅ Generated 200 pages in ${genTime}ms (Total chars: ${pages.reduce((acc, p) => acc + p.text.length, 0).toLocaleString()})`);

  // 2. Chunking Benchmark
  console.log('\n2. Benchmarking Page-Aware Chunking for 200 Pages...');
  const tChunkStart = Date.now();
  const chunks = chunkDocumentText(null, {
    pages,
    numPages: 200,
    materialId: new mongoose.Types.ObjectId(),
    projectId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    originalName: 'Large_Scale_Manual_200_Pages.pdf'
  });
  const chunkTime = Date.now() - tChunkStart;

  console.log(`✅ Chunked 200 pages in ${chunkTime}ms`);
  console.log(`   Total chunks created: ${chunks.length}`);
  assert.ok(chunks.length >= 200, `Expected at least 200 chunks, got ${chunks.length}`);
  assert.strictEqual(chunks[0].chunkIndex, 0);
  assert.strictEqual(chunks[0].pageNumber, 1);
  assert.strictEqual(chunks[chunks.length - 1].pageNumber, 200);

  // 3. Smart Multi-Page Sampling for 200 Pages
  console.log('\n3. Verifying Smart Multi-Page Sampling for Concept Discovery...');
  const sample = DocumentService.createSmartSampleForLargeDocument(pages, '');
  console.log(`   Sample text length: ${sample.length} characters`);
  assert.ok(sample.length > 5000 && sample.length <= 25000, `Sample length ${sample.length} outside expected range`);
  assert.ok(sample.includes('--- Page 1 ---'), 'Sample must include Page 1');
  assert.ok(sample.includes('--- Page 200 ---') || sample.includes('--- Page 199 ---'), 'Sample must include concluding pages');
  console.log('✅ Multi-page sampling accurately covers start, middle, and end without token overflow');

  // 4. In-Memory Retrieval Ranking Benchmark across all 200 pages
  console.log('\n4. Benchmarking Semantic Evidence Retrieval across 200-page Chunks...');

  // Test Query A: Chapter 7 (Page 80)
  const tRetStart = Date.now();
  const hitsPage80 = scoreChunks(chunks, 'How do skip connections allow gradients to flow in deep residual learning?', {
    materialMap: { [chunks[0].materialId]: 'Large_Scale_Manual_200_Pages.pdf' },
    topK: 3
  });
  const retTimeA = Date.now() - tRetStart;

  console.log(`✅ Query A retrieved in ${retTimeA}ms:`);
  hitsPage80.forEach((h, idx) => console.log(`   Rank #${idx + 1}: Page ${h.pageNumber} (Score: ${h.score}) -> "${h.content.slice(0, 80)}..."`));
  assert.ok(hitsPage80.length >= 1, 'Should find evidence for residual learning');
  assert.strictEqual(hitsPage80[0].pageNumber, 80, `Expected top result on Page 80, got Page ${hitsPage80[0].pageNumber}`);

  // Test Query B: Chapter 12 (Page 145)
  const hitsPage145 = scoreChunks(chunks, 'What are the latency benchmarks for high-throughput batch processing?', {
    materialMap: { [chunks[0].materialId]: 'Large_Scale_Manual_200_Pages.pdf' },
    topK: 3
  });
  console.log(`✅ Query B retrieved top result on Page ${hitsPage145[0]?.pageNumber} (Score: ${hitsPage145[0]?.score})`);
  assert.strictEqual(hitsPage145[0].pageNumber, 145, `Expected top result on Page 145, got Page ${hitsPage145[0].pageNumber}`);

  // Test Query C: Overview / Full System Architecture
  const hitsOverview = scoreChunks(chunks, 'Explain the core concepts and overview from my uploaded material', {
    materialMap: { [chunks[0].materialId]: 'Large_Scale_Manual_200_Pages.pdf' },
    topK: 3
  });
  console.log(`✅ Query C (Overview) retrieved top result on Page ${hitsOverview[0]?.pageNumber} (Score: ${hitsOverview[0]?.score})`);
  assert.ok(hitsOverview[0].pageNumber <= 3, `Expected overview query to prioritize early pages (<=3), got Page ${hitsOverview[0].pageNumber}`);

  console.log('\n========================================');
  console.log('200-Page Scalable RAG Pipeline: ALL TESTS PASSED (100%)');
  console.log('========================================');
}

run200PageRAGTest().then(() => process.exit(0)).catch((err) => {
  console.error('200-page test failed:', err);
  process.exit(1);
});
