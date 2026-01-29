/**
 * Nemeths Domain - k6 Load Test Suite
 *
 * Run specific scenarios:
 *   k6 run --env SCENARIO=smoke tests/load/main.js
 *   k6 run --env SCENARIO=load tests/load/main.js
 *   k6 run --env SCENARIO=stress tests/load/main.js
 *   k6 run --env SCENARIO=spike tests/load/main.js
 *
 * Run with custom URL:
 *   k6 run --env BASE_URL=https://api.example.com tests/load/main.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { scenarios, thresholds, BASE_URL, randomWalletAddress, randomHex } from './config.js';

// Custom metrics
const authRequests = new Counter('auth_requests');
const gameRequests = new Counter('game_requests');
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const gameDuration = new Trend('game_duration');

// Select scenario based on environment variable
const selectedScenario = __ENV.SCENARIO || 'smoke';

export const options = {
  scenarios: {
    default: scenarios[selectedScenario] || scenarios.smoke,
  },
  thresholds,
};

// Shared headers
const headers = {
  'Content-Type': 'application/json',
};

export default function () {
  // Each VU simulates a player session
  const walletAddress = randomWalletAddress();

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { endpoint: 'health' },
    });

    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check has status ok': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok';
        } catch {
          return false;
        }
      },
    });

    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  group('Generation Info', () => {
    const res = http.get(`${BASE_URL}/api/generation/current`, {
      tags: { endpoint: 'generation' },
    });

    check(res, {
      'generation status is 200': (r) => r.status === 200,
      'generation has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
    });

    gameRequests.add(1);
    gameDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  group('Authentication Flow', () => {
    // Step 1: Request nonce
    const nonceRes = http.post(
      `${BASE_URL}/api/auth/nonce`,
      JSON.stringify({ walletAddress }),
      { headers, tags: { endpoint: 'auth' } }
    );

    const nonceSuccess = check(nonceRes, {
      'nonce request status is 200': (r) => r.status === 200,
      'nonce request has nonce': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data?.nonce;
        } catch {
          return false;
        }
      },
    });

    authRequests.add(1);
    authDuration.add(nonceRes.timings.duration);
    errorRate.add(nonceRes.status !== 200);

    if (!nonceSuccess) {
      return;
    }

    sleep(0.2);

    // Step 2: Verify signature (will fail without real signature, but tests endpoint)
    const fakeSignature = '0x' + randomHex(130);
    const nonce = JSON.parse(nonceRes.body).data.nonce;

    const verifyRes = http.post(
      `${BASE_URL}/api/auth/verify`,
      JSON.stringify({
        walletAddress,
        signature: fakeSignature,
        nonce,
      }),
      { headers, tags: { endpoint: 'auth' } }
    );

    // We expect this to fail (invalid signature), but it should respond quickly
    check(verifyRes, {
      'verify responds (even with invalid sig)': (r) => r.status === 401 || r.status === 400,
      'verify response time acceptable': (r) => r.timings.duration < 500,
    });

    authRequests.add(1);
    authDuration.add(verifyRes.timings.duration);
  });

  sleep(0.5);

  group('Rate Limit Test', () => {
    // Test rate limiting by making rapid requests
    const results = [];
    for (let i = 0; i < 3; i++) {
      const res = http.post(
        `${BASE_URL}/api/auth/nonce`,
        JSON.stringify({ walletAddress: randomWalletAddress() }),
        { headers, tags: { endpoint: 'auth' } }
      );
      results.push(res.status);
      sleep(0.1);
    }

    check(results, {
      'rate limit allows normal traffic': () => results.filter((s) => s === 200).length >= 2,
    });
  });

  sleep(1);
}

// Lifecycle hooks
export function setup() {
  console.log(`Starting ${selectedScenario} test against ${BASE_URL}`);

  // Verify server is reachable
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }

  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration.toFixed(2)}s`);
}
