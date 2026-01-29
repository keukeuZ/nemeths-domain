// k6 Load Test Configuration
// Run with: k6 run tests/load/main.js

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios
export const scenarios = {
  // Smoke test - verify basic functionality
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  // Load test - normal expected load
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },   // Ramp up to 100 users
      { duration: '5m', target: 100 },   // Stay at 100 for 5 minutes
      { duration: '2m', target: 200 },   // Ramp up to 200
      { duration: '5m', target: 200 },   // Stay at 200
      { duration: '2m', target: 0 },     // Ramp down
    ],
  },

  // Stress test - find breaking point
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 500 },
      { duration: '5m', target: 500 },
      { duration: '2m', target: 1000 },
      { duration: '5m', target: 1000 },
      { duration: '2m', target: 2000 },
      { duration: '5m', target: 2000 },
      { duration: '5m', target: 5000 },  // Target: 5000 concurrent
      { duration: '5m', target: 5000 },
      { duration: '5m', target: 0 },
    ],
  },

  // Spike test - sudden traffic spikes
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '10s', target: 1000 },  // Spike!
      { duration: '3m', target: 1000 },
      { duration: '10s', target: 100 },
      { duration: '3m', target: 100 },
      { duration: '10s', target: 0 },
    ],
  },
};

// Thresholds - test fails if these are exceeded
export const thresholds = {
  // HTTP request duration
  http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s

  // HTTP request failure rate
  http_req_failed: ['rate<0.01'],  // Less than 1% failures

  // Custom metrics
  'http_req_duration{endpoint:health}': ['p(95)<100'],
  'http_req_duration{endpoint:generation}': ['p(95)<200'],
  'http_req_duration{endpoint:auth}': ['p(95)<300'],
};

// Test data generators
export function randomWalletAddress() {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

export function randomHex(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
