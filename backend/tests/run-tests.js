const assert = require('assert');

const BASE_URL = 'http://localhost:5013/api';

async function runTests() {
  console.log('=== Starting AI Study Companion Automated Test Suite ===\n');
  let testsPassed = 0;
  let testsTotal = 0;

  async function test(name, fn) {
    testsTotal++;
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error('   ', err.message);
    }
  }

  let userToken = '';
  let adminToken = '';
  let testProjectId = '';

  // Test 1: User Login
  await test('User Authentication (JWT Login)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bindu@gmail.com', password: 'password123', expectedRole: 'user' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, 'Login should succeed with 200');
    assert.ok(data.token, 'Should return JWT token');
    assert.strictEqual(data.role, 'user');
    userToken = data.token;
  });

  // Test 2: Admin Login
  await test('Admin Authentication (Admin Role Verification)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin123', expectedRole: 'admin' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.role, 'admin');
    adminToken = data.token;
  });

  // Test 3: List Spaces & Projects
  await test('Fetch Spaces and Projects for Authenticated User', async () => {
    const res = await fetch(`${BASE_URL}/spaces`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const spaces = await res.json();
    assert.ok(Array.isArray(spaces), 'Spaces should be an array');
    assert.ok(spaces.length >= 1, 'Should have at least 1 space');

    const projRes = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const projects = await projRes.json();
    assert.ok(projects.length >= 1, 'Should have at least 1 project');
    testProjectId = projects[0]._id;
  });

  // Test 4: Tutor Grounded Response with Citation
  await test('AI Tutor Grounded Query Returns Relevant Page Citations', async () => {
    const res = await fetch(`${BASE_URL}/tutor/message/${testProjectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ message: 'What is gradient descent and how does learning rate affect it?' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.message.content.length > 50, 'Tutor should provide in-depth response');
    assert.strictEqual(data.message.isUnsupported, false, 'Should be grounded in material');
    assert.ok(data.message.citations.length > 0, 'Should return supporting page citation');
    assert.ok(data.message.citations[0].pageNumber >= 1, 'Citation must have valid page number');
  });

  // Test 5: Unsupported Question Detection & Rejection
  await test('AI Tutor Unsupported Question Handling (No Fabrications)', async () => {
    const res = await fetch(`${BASE_URL}/tutor/message/${testProjectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ message: 'What is the recipe for baking sourdough bread with rye flour?' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.message.isUnsupported, true, 'Should detect lack of evidence in project materials');
    assert.ok(data.message.content.toLowerCase().includes('evidence') || data.message.content.toLowerCase().includes('materials'));
  });

  // Test 6: Adaptive Quiz Generation
  let generatedQuizId = '';
  await test('Adaptive Quiz Generation with MCQ and Open-Ended Questions', async () => {
    const res = await fetch(`${BASE_URL}/quizzes/generate/${testProjectId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const quiz = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(quiz.questions.length >= 2, 'Quiz should contain multiple questions');
    const hasMcq = quiz.questions.some(q => q.type === 'mcq');
    const hasOpen = quiz.questions.some(q => q.type === 'open_ended');
    assert.ok(hasMcq, 'Quiz must include MCQs');
    assert.ok(hasOpen, 'Quiz must include Open-ended questions');
    generatedQuizId = quiz._id;
  });

  // Test 7: Quiz Submission and Open-Ended Rubric AI Evaluation
  await test('Quiz Submission and AI Evaluation with Scoring Rubric', async () => {
    const res = await fetch(`${BASE_URL}/quizzes/submit/${testProjectId}/${generatedQuizId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        answers: [
          { questionIndex: 0, userAnswer: 0 },
          { questionIndex: 1, userAnswer: 'It minimizes the cost function by taking steps proportional to the negative gradient.' }
        ]
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(typeof data.overallScore === 'number', 'Should return numeric overall score');
    assert.ok(data.evaluatedAnswers.length >= 2, 'Should return detailed feedback per answer');
    const openEval = data.evaluatedAnswers.find(a => a.questionType === 'open_ended');
    assert.ok(openEval.aiEvaluation.understandingSummary, 'AI evaluation must provide understanding breakdown');
  });

  // Test 8: Mastery Updates and Targeted Recommendations
  await test('Concept Mastery Tracking and Actionable Recommendations', async () => {
    const res = await fetch(`${BASE_URL}/mastery/${testProjectId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.concepts), 'Concepts must be array');
    assert.ok(data.concepts.length >= 2, 'Should track multiple concepts');

    const recRes = await fetch(`${BASE_URL}/mastery/${testProjectId}/recommendations`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const recs = await recRes.json();
    assert.ok(recs.length >= 1, 'Should have generated targeted recommendations');
    assert.ok(recs[0].title && recs[0].reason, 'Recommendation must contain actionable title and rationale');
  });

  // Test 9: Admin Observability & Metrics Access Control
  await test('Admin Observability Dashboard & RBAC Guard', async () => {
    // Normal user should be rejected (403)
    const failRes = await fetch(`${BASE_URL}/admin/observability`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(failRes.status, 403, 'Regular user must be forbidden from admin metrics');

    // Admin user should succeed (200)
    const okRes = await fetch(`${BASE_URL}/admin/observability`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const stats = await okRes.json();
    assert.strictEqual(okRes.status, 200);
    assert.ok(stats.totalCalls >= 1, 'Should record AI invocations');
    assert.ok(typeof stats.totalCostUsd === 'number', 'Should track total AI cost');
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${testsPassed}/${testsTotal} Passed (${Math.round((testsPassed/testsTotal)*100)}%)`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
