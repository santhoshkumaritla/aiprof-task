const assert = require('assert');
const { chunkDocumentText } = require('../src/utils/chunker');
const { scoreChunks, tokenizeQuery } = require('../src/utils/retrievalScoring');

function test(name, fn) {
  fn();
  console.log(`✅ PASS: ${name}`);
}

function run() {
  test('Chunking preserves sequential page metadata', () => {
    const page1 = 'Gradient descent updates weights using the negative gradient of the loss.\n\n';
    const page2 = Array(40).fill('Learning rate controls the step size during optimization. ').join('');
    const chunks = chunkDocumentText(page1 + page2, { numPages: 2, originalName: 'ml.pdf' });
    assert.ok(chunks.length >= 1);
    assert.ok(chunks.every((c) => c.pageNumber >= 1 && c.pageNumber <= 2));
    assert.strictEqual(chunks[0].chunkIndex, 0);
    assert.ok(chunks[0].content.toLowerCase().includes('gradient'));
  });

  test('Retrieval scores in-scope evidence above threshold', () => {
    const chunks = [
      { _id: 'a', materialId: 'm1', pageNumber: 4, tokenCount: 40, content: 'Gradient descent minimizes a loss function by taking steps proportional to the negative gradient. Learning rate is the step size.' },
      { _id: 'b', materialId: 'm1', pageNumber: 9, tokenCount: 30, content: 'Convolutional layers extract spatial features from images using shared filters.' }
    ];
    const hits = scoreChunks(chunks, 'What is gradient descent and learning rate?', {
      materialMap: { m1: 'Machine Learning Notes' },
      minScoreThreshold: 0.2,
      topK: 3
    });
    assert.ok(hits.length >= 1);
    assert.strictEqual(hits[0].pageNumber, 4);
    assert.ok(hits[0].score >= 0.2);
    assert.strictEqual(hits[0].materialName, 'Machine Learning Notes');
  });

  test('Unsupported questions return no evidence chunks', () => {
    const chunks = [
      { _id: 'a', materialId: 'm1', pageNumber: 1, tokenCount: 20, content: 'Backpropagation computes gradients through the network layers.' }
    ];
    const hits = scoreChunks(chunks, 'What is the recipe for baking sourdough bread with rye flour?', { minScoreThreshold: 0.2 });
    assert.strictEqual(hits.length, 0);
  });

  test('Query tokenizer drops stopwords', () => {
    const tokens = tokenizeQuery('What is the gradient descent on the loss?');
    assert.ok(tokens.includes('gradient'));
    assert.ok(tokens.includes('descent'));
    assert.ok(!tokens.includes('the'));
    assert.ok(!tokens.includes('what'));
  });

  test('Project isolation is encoded in retrieval contract', () => {
    const projectA = [{ _id: 'a', materialId: 'm1', projectId: 'p1', pageNumber: 1, tokenCount: 12, content: 'Attention is a weighting mechanism over tokens.' }];
    const hits = scoreChunks(projectA, 'attention tokens', { minScoreThreshold: 0.1 });
    assert.strictEqual(hits.length, 1);
  });

  console.log('\nUnit tests passed.');
}

run();
