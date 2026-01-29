# Load Testing Suite

Load tests for Nemeths Domain using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows (chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### Start the server first

```bash
cd packages/server
pnpm dev
```

### Run tests

```bash
# Smoke test (quick sanity check)
k6 run tests/load/main.js

# Load test (normal expected traffic)
k6 run --env SCENARIO=load tests/load/main.js

# Stress test (find breaking point - targets 5000 concurrent)
k6 run --env SCENARIO=stress tests/load/main.js

# Spike test (sudden traffic spikes)
k6 run --env SCENARIO=spike tests/load/main.js

# Combat-specific tests
k6 run tests/load/combat.js

# WebSocket tests
k6 run tests/load/websocket.js
```

### Custom server URL

```bash
k6 run --env BASE_URL=https://api.nemethsdomain.com tests/load/main.js
```

## Test Scenarios

| Scenario | Duration | Peak VUs | Purpose |
|----------|----------|----------|---------|
| smoke | 30s | 1 | Quick sanity check |
| load | ~16m | 200 | Normal expected load |
| stress | ~37m | 5000 | Find breaking point |
| spike | ~8m | 1000 | Handle sudden spikes |

## Metrics & Thresholds

The tests will fail if these thresholds are exceeded:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| `http_req_duration` | p(95) < 500ms | 95th percentile response time |
| `http_req_duration` | p(99) < 1000ms | 99th percentile response time |
| `http_req_failed` | rate < 1% | HTTP failure rate |
| `health` endpoint | p(95) < 100ms | Health check response |
| `generation` endpoint | p(95) < 200ms | Game state response |
| `auth` endpoint | p(95) < 300ms | Auth endpoints |

## Output

k6 provides detailed output including:

- Request rate (req/s)
- Response time percentiles
- Error rates
- Custom metrics

### Export results

```bash
# JSON output
k6 run --out json=results.json tests/load/main.js

# InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/main.js
```

## Interpreting Results

### Good results
```
http_req_duration..............: avg=45ms    p(95)=120ms
http_req_failed................: 0.05%
```

### Concerning results
```
http_req_duration..............: avg=500ms   p(95)=2000ms
http_req_failed................: 5%
```

## Load Test Strategy

1. **Smoke** - Run first to verify tests work
2. **Load** - Establish baseline performance
3. **Stress** - Find the breaking point
4. **Fix issues** - Optimize bottlenecks found
5. **Re-test** - Verify improvements

## Common Issues

### High latency on DB queries
- Add database indexes
- Optimize N+1 queries
- Add connection pooling

### WebSocket connection failures
- Increase server file descriptor limits
- Use sticky sessions with load balancer
- Tune keepalive settings

### Memory issues under load
- Check for memory leaks
- Implement request queuing
- Add rate limiting
