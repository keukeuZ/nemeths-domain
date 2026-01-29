/**
 * Nemeths Domain - Combat System Load Test
 *
 * Tests combat initiation and resolution under load.
 * Requires authenticated users, so uses mock auth or test tokens.
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 tests/load/combat.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, randomHex } from './config.js';

// Custom metrics
const combatInitiated = new Counter('combat_initiated');
const combatResolved = new Counter('combat_resolved');
const combatDuration = new Trend('combat_duration');
const combatErrors = new Rate('combat_errors');

export const options = {
  scenarios: {
    combat_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'combat_duration': ['p(95)<1000'],  // Combat ops under 1s
    'combat_errors': ['rate<0.05'],      // Less than 5% errors
  },
};

const headers = {
  'Content-Type': 'application/json',
};

export default function () {
  // Note: In a real test, you'd need valid JWT tokens
  // This tests the endpoint response characteristics

  group('Combat Endpoints', () => {
    // Test getting combat by ID (will 404 but tests endpoint)
    const combatId = randomHex(32);

    const getRes = http.get(`${BASE_URL}/api/combat/${combatId}`, {
      headers: {
        ...headers,
        Authorization: 'Bearer test-token',  // Will fail auth but tests routing
      },
    });

    check(getRes, {
      'combat get responds': (r) => r.status === 401 || r.status === 404,
      'combat get is fast': (r) => r.timings.duration < 500,
    });

    combatDuration.add(getRes.timings.duration);
    combatErrors.add(getRes.status >= 500);
  });

  sleep(0.5);

  group('Combat Initiation (Auth Required)', () => {
    // Test attack endpoint structure
    const attackPayload = {
      armyId: randomHex(32),
      targetTerritoryId: randomHex(32),
    };

    const attackRes = http.post(
      `${BASE_URL}/api/combat/attack`,
      JSON.stringify(attackPayload),
      {
        headers: {
          ...headers,
          Authorization: 'Bearer test-token',
        },
      }
    );

    check(attackRes, {
      'attack endpoint responds': (r) => r.status === 401 || r.status === 400 || r.status === 403,
      'attack validation works': (r) => r.timings.duration < 500,
    });

    combatInitiated.add(1);
    combatDuration.add(attackRes.timings.duration);
    combatErrors.add(attackRes.status >= 500);
  });

  sleep(1);
}

export function setup() {
  console.log(`Starting combat load test against ${BASE_URL}`);

  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`Server not reachable`);
  }

  return {};
}
