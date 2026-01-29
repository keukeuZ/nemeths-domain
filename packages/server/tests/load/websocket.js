/**
 * Nemeths Domain - WebSocket/Socket.io Load Test
 *
 * Tests real-time connection handling under load.
 * k6 has experimental WebSocket support.
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 tests/load/websocket.js
 */

import { check, sleep } from 'k6';
import ws from 'k6/ws';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = BASE_URL.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket';

// Custom metrics
const wsConnections = new Counter('ws_connections');
const wsMessages = new Counter('ws_messages');
const wsErrors = new Rate('ws_errors');
const wsConnectTime = new Trend('ws_connect_time');

export const options = {
  scenarios: {
    websocket_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'ws_connect_time': ['p(95)<1000'],  // Connection under 1s
    'ws_errors': ['rate<0.1'],           // Less than 10% errors
  },
};

export default function () {
  const startTime = Date.now();

  const res = ws.connect(WS_URL, {}, function (socket) {
    const connectTime = Date.now() - startTime;
    wsConnectTime.add(connectTime);
    wsConnections.add(1);

    socket.on('open', () => {
      check(connectTime, {
        'connection established quickly': (t) => t < 2000,
      });

      // Socket.io handshake - send probe
      socket.send('2probe');
    });

    socket.on('message', (data) => {
      wsMessages.add(1);

      // Handle Socket.io protocol messages
      if (data === '3probe') {
        // Probe response, send upgrade
        socket.send('5');
      }

      // Simulate staying connected and receiving updates
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
      console.error('WebSocket error:', e);
    });

    socket.on('close', () => {
      // Connection closed
    });

    // Keep connection alive for a while to simulate real user
    socket.setTimeout(() => {
      // Send ping to keep alive
      socket.send('2');
    }, 5000);

    socket.setTimeout(() => {
      socket.close();
    }, 10000);
  });

  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    wsErrors.add(1);
  }

  sleep(1);
}

export function setup() {
  console.log(`Starting WebSocket load test against ${WS_URL}`);
  return {};
}

export function teardown() {
  console.log('WebSocket load test completed');
}
