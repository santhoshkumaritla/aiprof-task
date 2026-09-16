const http = require('http');

async function testObservability() {
  const loginPayload = JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' });
  const loginReq = http.request({
    hostname: 'localhost',
    port: 5013,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const auth = JSON.parse(body);
      const overviewReq = http.request({
        hostname: 'localhost',
        port: 5013,
        path: '/api/admin/overview',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + auth.token }
      }, (oRes) => {
        let oBody = '';
        oRes.on('data', chunk => oBody += chunk);
        oRes.on('end', () => {
          const overview = JSON.parse(oBody);
          const ai = overview.aiObservability;
          console.log('--- Real-Time AI Observability from MongoDB ---');
          console.log('Total Calls:', ai.totalCalls);
          console.log('Total Tokens:', ai.totalTokens);
          console.log('Total Cost (USD):', '$' + ai.totalCostUsd);
          console.log('Success Rate:', (100 - ai.errorRate) + '%');
          console.log('Avg Latency:', ai.avgLatencyMs + 'ms');
          console.log('Features:', JSON.stringify(ai.featureBreakdown));
          console.log('Freshest Call in MongoDB:');
          const freshest = ai.recentLogs[0];
          console.log(freshest.createdAt, freshest.feature, freshest.model, freshest.totalTokens + ' tokens', freshest.latencyMs + 'ms', '$' + freshest.estimatedCostUsd);
        });
      });
      overviewReq.end();
    });
  });
  loginReq.write(loginPayload);
  loginReq.end();
}

testObservability();
