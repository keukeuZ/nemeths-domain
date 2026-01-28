# Nemeths Domain - Implementation Roadmap

## OVERVIEW

This roadmap breaks implementation into **6 phases**, from foundation to launch. Each phase builds on the previous, with clear milestones and deliverables.

**Approach:**
- Build core systems first, polish later
- Playable prototype before full features
- Test continuously, not just at the end
- Smart contracts last (hardest to change)

---

## PHASE SUMMARY

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Foundation                                                 │
│ Database, server skeleton, basic API                                │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Core Game Loop                                             │
│ Map, territories, movement, basic combat                            │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Full Game Systems                                          │
│ All races, captains, spells, alliances                              │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Blockchain Integration                                     │
│ Smart contracts, wallet auth, on-chain state                        │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Frontend & Polish                                          │
│ Full UI, animations, mobile, accessibility                          │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 6: Testing & Launch                                           │
│ Balance simulation, load testing, beta, launch                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: FOUNDATION

*Build the infrastructure everything else runs on.*

### 1.1 Development Environment

| Task | Description | Dependencies |
|------|-------------|--------------|
| Repository setup | Monorepo with packages for server, contracts, frontend | None |
| CI/CD pipeline | GitHub Actions for testing, building, deploying | Repo |
| Docker compose | Local dev environment with all services | Repo |
| Code standards | ESLint, Prettier, TypeScript config | Repo |

### 1.2 Database Layer

| Task | Description | Dependencies |
|------|-------------|--------------|
| PostgreSQL schema | Core tables: players, territories, armies, buildings | Docker |
| Redis setup | Session store, cache, pub/sub channels | Docker |
| TimescaleDB | Event logging hypertables | Docker |
| Migration system | Versioned schema migrations | PostgreSQL |
| Seed data | Test data for development | Migrations |

### 1.3 Server Skeleton

| Task | Description | Dependencies |
|------|-------------|--------------|
| Express app | Basic server with health checks | Node.js |
| API structure | Route organization, middleware | Express |
| WebSocket setup | Socket.io integration | Express |
| Auth stub | Placeholder auth (wallet auth comes later) | API |
| Logging | Structured JSON logging | Server |
| Error handling | Global error handler, error types | Server |

### 1.4 Basic API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Service health check |
| `GET /game/status` | Generation status |
| `POST /dev/reset` | Reset game state (dev only) |
| `GET /map/terrain` | Static map data |

### Phase 1 Milestone
✅ Server starts, connects to databases, responds to requests

---

## PHASE 2: CORE GAME LOOP

*Get a playable (ugly) prototype working.*

### 2.1 Map System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Coordinate system | 100x100 grid with zones | Database |
| Terrain generation | Procedural terrain with water/land | Coordinates |
| Zone calculation | Heart, Inner, Middle, Outer ring logic | Terrain |
| Territory model | Ownership, buildings, garrison | Database |
| Map API | Endpoints for map data | Server |

### 2.2 Player System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Player model | Address, race, captain, resources | Database |
| Registration flow | Join generation, pick race | Player model |
| Resource tracking | Gold, stone, wood, food, mana | Player model |
| Starting placement | Random Outer Ring assignment | Map, Player |

### 2.3 Basic Units & Armies

| Task | Description | Dependencies |
|------|-------------|--------------|
| Unit definitions | Stats for basic 14 units | Config |
| Army model | Composition, location, status | Database |
| Army creation | Create army from garrison | Army model |
| Army movement | Pathfinding, travel time | Map, Army |
| Movement API | Move army endpoint | Movement |

### 2.4 Basic Combat

| Task | Description | Dependencies |
|------|-------------|--------------|
| Combat engine | D20 rolls, damage calculation | Units |
| Battle resolution | 3 rounds, casualties, winner | Combat engine |
| Territory capture | Change ownership on victory | Combat |
| Combat API | Attack endpoint, results | Combat |
| Combat logging | Record battle results | TimescaleDB |

### 2.5 Basic Buildings

| Task | Description | Dependencies |
|------|-------------|--------------|
| Building definitions | Stats for core buildings | Config |
| Construction system | Start build, timer, complete | Buildings |
| Resource generation | Production from buildings | Buildings |
| Building API | Build, upgrade, demolish | Buildings |

### 2.6 Timer Service

| Task | Description | Dependencies |
|------|-------------|--------------|
| Timer queue | Priority queue for events | Server |
| Timer processing | Tick every second, process due | Timer queue |
| Build timers | Building completion | Construction |
| Travel timers | Army arrival | Movement |
| Daily tick | Resource generation, decay | All systems |

### 2.7 Forsaken (NPCs)

| Task | Description | Dependencies |
|------|-------------|--------------|
| Forsaken generation | Populate empty territories | Map |
| Forsaken types | Hamlet, Village, Town, Stronghold | Config |
| Forsaken combat | AI defense behavior | Combat |
| Forsaken loot | Rewards on capture | Combat |

### 2.8 Dev UI (Temporary)

| Task | Description | Dependencies |
|------|-------------|--------------|
| Simple map view | Canvas grid showing territories | Frontend |
| Click to select | Show territory info | Map view |
| Action buttons | Move, attack, build | API integration |
| Resource display | Show player resources | Player data |

### Phase 2 Milestone
✅ Can register, capture Forsaken, build, fight other players

---

## PHASE 3: FULL GAME SYSTEMS

*Implement all game mechanics.*

### 3.1 All Races

| Task | Description | Dependencies |
|------|-------------|--------------|
| Race definitions | All 6 races with bonuses/penalties | Config |
| Ironveld mechanics | Building bonuses, no food | Race defs |
| Vaelthir mechanics | Mana bonus, blood sacrifice | Race defs |
| Korrath mechanics | Enslaver, blood thirst | Race defs, Combat |
| Sylvaeth mechanics | Intel accuracy, illusions | Race defs |
| Ashborn mechanics | Reformation, curse spread | Race defs, Combat |
| Breath-Born mechanics | Windshear, scatter | Race defs |
| Race-specific units | 18 unique units (3 per race) | Units |
| Race-specific buildings | 6 unique buildings | Buildings |

### 3.2 Captain System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Captain model | Class, path, skills, level | Database |
| Class definitions | 6 classes with base abilities | Config |
| Path definitions | 18 paths with skill trees | Config |
| Skill system | Point allocation, effects | Captain model |
| General skills | 10 universal skills | Skills |
| Captain bonuses | Apply to armies/territories | All systems |
| Death saves | D20 roll, modifiers, consequences | Combat |
| Captain API | Create, allocate points, respec | Captain model |

### 3.3 Spell System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Mana system | Generation, caps, spending | Resources |
| Spell definitions | All 36+ spells | Config |
| Spell casting | Target validation, effects | Spells |
| Spell cooldowns | Per-spell cooldown tracking | Timers |
| Combat spells | Integration with battle | Combat |
| D20 spell rolls | Effect variation | Combat engine |
| Spell API | Cast spell endpoint | Spells |

### 3.4 Alliance System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Alliance model | Name, members, settings | Database |
| Alliance creation | Found, join, leave | Alliance model |
| Alliance settings | Hosting, sharing, defense pacts | Alliance model |
| Troop hosting | Lodging cost, food cost | Alliances, Armies |
| Foreign soil penalty | Tracking, applying | Armies |
| Alliance chat | Real-time messaging | WebSocket |
| Alliance API | All alliance endpoints | Alliances |

### 3.5 Visibility System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Fog of war | What each player can see | Map, Armies |
| Visibility levels | Owned, allied, scouted, fogged, unknown | Visibility |
| Scouting | Scout action, accuracy rolls | Visibility |
| Intel decay | Scouted info expires | Timers |
| Visibility API | Get visible state | Visibility |

### 3.6 Advanced Combat

| Task | Description | Dependencies |
|------|-------------|--------------|
| Terrain modifiers | All terrain effects | Combat |
| Siege mechanics | Wall damage, siege weapons | Combat, Buildings |
| Morale system | Tracking, effects, desertion | Combat |
| Advantage/Disadvantage | D20 roll twice mechanic | Combat |
| Critical effects | Nat 20/1 bonus/penalty tables | Combat |
| Loot system | D20 loot rolls | Combat |
| Race combat abilities | Post-battle effects | Races, Combat |

### 3.7 Economy System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Full resource flow | All production/consumption | Economy |
| Building costs | All buildings with costs | Buildings |
| Unit costs | All units with costs/upkeep | Units |
| Zone multipliers | Production by zone | Map |
| Race modifiers | Production by race | Races |
| Food system | Consumption, exemptions | Armies |
| Market/trading | Resource exchange | Economy |

### 3.8 Generation Lifecycle

| Task | Description | Dependencies |
|------|-------------|--------------|
| Generation states | Registration, active, ended | Server |
| Phase transitions | Early (PvP off), mid, late | Generation |
| Registration system | Join within window | Generation |
| Domain points | Scoring calculation | All systems |
| Heartbeat (reset) | End generation, wipe state | Generation |
| Titan's Witness | Record top players | Generation |

### 3.9 Leadership Decay

| Task | Description | Dependencies |
|------|-------------|--------------|
| Trust tracking | Per-territory trust value | Territories |
| Inactivity detection | Track player actions | Players |
| Trust decay | Apply daily decay | Timers |
| Revolt mechanic | Convert to Forsaken at 0% | Trust, Forsaken |
| Trust recovery | Actions restore trust | Trust |

### 3.10 Bridges

| Task | Description | Dependencies |
|------|-------------|--------------|
| Bridge model | Connects water tiles | Database |
| Bridge construction | Build across 1-2 gaps | Buildings |
| Bridge usage | Movement across | Movement |
| Bridge destruction | Damage, destroy | Combat |
| Bridge repair | Fix damaged bridges | Buildings |

### Phase 3 Milestone
✅ All game mechanics working, full playable game (no blockchain)

---

## PHASE 4: BLOCKCHAIN INTEGRATION

*Connect to Base L2, deploy contracts.*

### 4.1 Smart Contract Development

| Task | Description | Dependencies |
|------|-------------|--------------|
| Development environment | Foundry setup, local node | None |
| GenerationManager.sol | Registration, fees, lifecycle | Foundry |
| Plots.sol | Territory ownership | GenerationManager |
| CombatSystem.sol | Commit-reveal attacks | Plots |
| Alliances.sol | On-chain agreements | GenerationManager |
| TitansWitness.sol | Eternal leaderboard | GenerationManager |
| Rewards.sol | Prize distribution | GenerationManager |
| Contract tests | 100% coverage | All contracts |

### 4.2 Contract Security

| Task | Description | Dependencies |
|------|-------------|--------------|
| Access control | Role-based permissions | Contracts |
| Reentrancy guards | All external calls | Contracts |
| Input validation | All parameters checked | Contracts |
| Gas optimization | Packed storage, batching | Contracts |
| Internal audit | Review all code | Contracts |
| External audit | Professional security audit | Internal audit |

### 4.3 Blockchain Bridge (Server)

| Task | Description | Dependencies |
|------|-------------|--------------|
| Provider setup | Connect to Base RPC | Server |
| Event listeners | Listen for contract events | Provider |
| Transaction submission | Send results to chain | Provider |
| Retry logic | Handle failed transactions | Transactions |
| Gas estimation | Predict costs | Transactions |
| Nonce management | Prevent stuck transactions | Transactions |

### 4.4 Wallet Authentication

| Task | Description | Dependencies |
|------|-------------|--------------|
| Challenge generation | Create sign message | Server |
| Signature verification | Verify wallet signature | Challenge |
| JWT issuance | Issue auth token | Verification |
| Session management | Token refresh, expiry | JWT |
| Frontend integration | Wallet connect flow | Frontend |

### 4.5 Commit-Reveal System

| Task | Description | Dependencies |
|------|-------------|--------------|
| Commit generation | Create attack hash | Server |
| Commit submission | Send to contract | Blockchain bridge |
| Reveal timing | Enforce reveal window | Timers |
| Reveal processing | Match hash, process attack | Combat |
| Dispute system | Handle reveal failures | Commit-reveal |

### 4.6 Chainlink VRF

| Task | Description | Dependencies |
|------|-------------|--------------|
| VRF subscription | Set up Chainlink account | Chainlink |
| VRF consumer | Contract integration | Contracts |
| Random placement | Use VRF for starting positions | VRF consumer |
| Callback handling | Process randomness | VRF consumer |

### 4.7 Testnet Deployment

| Task | Description | Dependencies |
|------|-------------|--------------|
| Base Sepolia deploy | Deploy all contracts | All contracts |
| Contract verification | Verify on Basescan | Deployment |
| Integration testing | Full flow on testnet | Deployment |
| Faucet integration | Get test ETH | Testnet |

### Phase 4 Milestone
✅ Full blockchain integration working on testnet

---

## PHASE 5: FRONTEND & POLISH

*Build the real UI, make it beautiful.*

### 5.1 Frontend Foundation

| Task | Description | Dependencies |
|------|-------------|--------------|
| React app setup | Vite, TypeScript, Tailwind | None |
| State management | Zustand stores | React app |
| API client | REST + WebSocket | React app |
| Routing | React Router setup | React app |
| Component library | Base UI components | React app |

### 5.2 Wallet Integration

| Task | Description | Dependencies |
|------|-------------|--------------|
| wagmi setup | Wallet connection | Frontend |
| Connect flow | Wallet modal, auth | wagmi |
| Transaction UI | Confirmation, pending, success | wagmi |
| Network switching | Ensure Base network | wagmi |

### 5.3 Map View

| Task | Description | Dependencies |
|------|-------------|--------------|
| Pixi.js setup | WebGL canvas | Frontend |
| Tile rendering | Terrain textures | Pixi.js |
| Zoom/pan | Mouse and keyboard controls | Pixi.js |
| Territory display | Ownership colors, icons | Tile rendering |
| Fog of war | Visibility overlay | Visibility API |
| Army tokens | Moving army display | Pixi.js |
| Selection | Click to select tile | Pixi.js |
| Overlays | Paths, ranges, highlights | Pixi.js |

### 5.4 UI Panels

| Task | Description | Dependencies |
|------|-------------|--------------|
| Layout shell | Top bar, sidebar, bottom panel | Frontend |
| Resource bar | Gold, stone, wood, food, mana | Layout |
| Timer display | Active timers | Layout |
| Territory panel | Details, actions | Selection |
| Army panel | Composition, movement | Selection |
| Building panel | Construction UI | Territory panel |
| Spell panel | Spellbook UI | Frontend |
| Alliance panel | Members, chat, settings | Frontend |
| Rankings | Leaderboard UI | Frontend |

### 5.5 Combat UI

| Task | Description | Dependencies |
|------|-------------|--------------|
| Combat view | Full-screen battle display | Frontend |
| D20 animation | Dice roll visual | Combat view |
| Round display | Damage, casualties | Combat view |
| Combat log | Text history | Combat view |
| Victory/defeat | Result screen | Combat view |

### 5.6 Notifications

| Task | Description | Dependencies |
|------|-------------|--------------|
| Toast system | Popup notifications | Frontend |
| Alert panel | Alert list | Frontend |
| Sound effects | Optional audio | Frontend |
| Push notifications | Browser notifications | Frontend |

### 5.7 Mobile Adaptation

| Task | Description | Dependencies |
|------|-------------|--------------|
| Responsive layout | Mobile breakpoints | All UI |
| Touch controls | Tap, pinch, swipe | Map view |
| Bottom navigation | Mobile nav bar | Layout |
| Bottom sheets | Slide-up panels | Panels |

### 5.8 Polish & UX

| Task | Description | Dependencies |
|------|-------------|--------------|
| Loading states | Spinners, skeletons | All UI |
| Error states | Error messages, retry | All UI |
| Empty states | No data messaging | All UI |
| Tooltips | Contextual help | All UI |
| Keyboard shortcuts | Hotkeys | All UI |
| Accessibility | ARIA, focus management | All UI |
| Dark theme | Color refinement | All UI |
| Animations | Transitions, effects | All UI |

### 5.9 Onboarding & Player Education

*See TUTORIAL.md for full design*

| Task | Description | Dependencies |
|------|-------------|--------------|
| Welcome flow | First-time user experience | Frontend |
| Race selection | Visual race picker with previews | Welcome |
| Class selection | Class/path picker | Welcome |
| Entry fee UI | Plot selection, cost breakdown | Wallet |
| Placement animation | Watch territory spawn on map | Map view |

### 5.10 Interactive Tutorial

| Task | Description | Dependencies |
|------|-------------|--------------|
| Tutorial script | Dialogue and action sequence | - |
| Tutorial overlay | Guided first steps, highlighting | All UI |
| First building quest | Build structure, reward gold | Tutorial |
| First unit quest | Train unit, learn upkeep | Tutorial |
| Movement tutorial | Teach terrain, fog of war | Tutorial |
| Skip/replay option | Tutorial accessible from menu | Tutorial |

### 5.11 First-Week Quests

| Task | Description | Dependencies |
|------|-------------|--------------|
| Quest system | Track objectives, grant rewards | Game server |
| Builder quests | Farm, Barracks, Watchtower | Quest system |
| Explorer quests | Move units, reveal fog | Quest system |
| Combat milestone | First Forsaken conquest | Quest system |
| Captain milestone | Recruit first captain | Quest system |
| Alliance milestone | Join or form alliance | Quest system |

### 5.12 Help & Documentation

| Task | Description | Dependencies |
|------|-------------|--------------|
| Tooltip system | 3-tier tooltips (hover, click, right-click) | All UI |
| Context help | "?" button behavior | Tooltips |
| Codex structure | Lore, Races, Units, etc. | Frontend |
| Codex entries | Write all documentation | Codex structure |
| "What happened?" | Combat/event breakdown button | Combat UI |
| Smart suggestions | Detect struggles, offer help | Game state |
| FAQ page | 40+ common questions | Frontend |

### 5.13 Community Setup

| Task | Description | Dependencies |
|------|-------------|--------------|
| Discord server | Channels, roles, moderation | - |
| Wiki framework | MediaWiki or similar setup | - |
| Strategy guide templates | Community contribution format | Wiki |
| Video tutorial scripts | Outline beginner videos | Tutorial |

### Phase 5 Milestone
✅ Polished, responsive frontend ready for users

---

## PHASE 6: TESTING & LAUNCH

*Verify everything works, then go live.*

### 6.1 Balance Simulation

| Task | Description | Dependencies |
|------|-------------|--------------|
| Simulation framework | Headless game engine | Game systems |
| AI strategies | 5+ different playstyles | Simulation |
| Batch runner | Run 1000+ generations | Simulation |
| Data collection | Metrics, statistics | Simulation |
| Balance reports | Win rates, issues | Data collection |
| Tuning | Adjust percentages | Balance reports |

### 6.2 Load Testing

| Task | Description | Dependencies |
|------|-------------|--------------|
| k6 scripts | Load test scenarios | Server |
| Performance targets | Define thresholds | k6 scripts |
| Load execution | Run tests | k6 scripts |
| Bottleneck identification | Find slow points | Load execution |
| Optimization | Fix performance issues | Bottlenecks |
| Re-test | Verify improvements | Optimization |

### 6.3 Security Testing

| Task | Description | Dependencies |
|------|-------------|--------------|
| Penetration testing | Attempt exploits | All systems |
| Input fuzzing | Invalid input testing | API |
| Auth testing | Session hijacking attempts | Auth |
| Contract audit | External security review | Contracts |
| Fix vulnerabilities | Address findings | All testing |

### 6.4 Mainnet Deployment

| Task | Description | Dependencies |
|------|-------------|--------------|
| Contract deployment | Deploy to Base mainnet | All testing |
| Contract verification | Verify on Basescan | Deployment |
| Server deployment | Production infrastructure | Deployment |
| DNS/SSL | Domain, certificates | Server deployment |
| Monitoring setup | Prometheus, Grafana | Server deployment |
| Alerting | PagerDuty/Discord alerts | Monitoring |

### 6.5 Closed Beta

| Task | Description | Dependencies |
|------|-------------|--------------|
| Beta invites | Select initial players | Mainnet |
| Reduced scope | Maybe 50x50 map, 30-day gen | Mainnet |
| Feedback collection | Discord, forms | Beta |
| Bug fixing | Address reported issues | Feedback |
| Balance adjustments | Tune based on real play | Feedback |

### 6.6 Open Beta

| Task | Description | Dependencies |
|------|-------------|--------------|
| Public access | Open registration | Closed beta |
| Increased capacity | Scale infrastructure | Public access |
| Marketing soft launch | Limited promotion | Public access |
| Continued monitoring | Watch for issues | Public access |
| Final polish | Last improvements | Monitoring |

### 6.7 Full Launch

| Task | Description | Dependencies |
|------|-------------|--------------|
| Marketing push | Full announcement | Open beta |
| Generation 1 start | First real generation | Marketing |
| 24/7 monitoring | Active ops team | Launch |
| Community management | Discord, support | Launch |
| Post-launch patches | Quick fixes | Monitoring |

### Phase 6 Milestone
✅ Game live with real players

---

## DEPENDENCY GRAPH

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core Loop) ──────────────────┐
    │                                  │
    ▼                                  │
Phase 3 (Full Systems)                 │
    │                                  │
    ├──────────────────────────────────┤
    │                                  │
    ▼                                  ▼
Phase 4 (Blockchain)            Phase 5 (Frontend)
    │                                  │
    └──────────────┬───────────────────┘
                   │
                   ▼
            Phase 6 (Launch)
```

**Notes:**
- Phase 4 and 5 can run in parallel after Phase 3
- Phase 6 requires both Phase 4 and 5 complete
- Frontend can use mock data during Phase 2-3

---

## TEAM STRUCTURE

### Recommended Roles

| Role | Focus | Phase Active |
|------|-------|--------------|
| **Backend Lead** | Server, game logic | All phases |
| **Smart Contract Dev** | Solidity, security | Phase 4, 6 |
| **Frontend Lead** | React, UI/UX | Phase 2, 5, 6 |
| **Game Designer** | Balance, tuning | Phase 3, 6 |
| **DevOps** | Infrastructure, CI/CD | Phase 1, 4, 6 |
| **QA** | Testing, simulation | Phase 3, 6 |

### Minimum Viable Team

| Size | Composition |
|------|-------------|
| 1 person | Full-stack (slow but possible) |
| 2 people | Backend + Frontend |
| 3 people | Backend + Frontend + Contracts |
| 5 people | Optimal for parallel work |

---

## RISK MITIGATION

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Smart contract bugs | External audit, testnet time |
| Scalability issues | Load test early, design for scale |
| Balance problems | Extensive simulation |
| Blockchain congestion | Lazy resolution, batching |

### Product Risks

| Risk | Mitigation |
|------|------------|
| Not fun | Playtest from Phase 2 |
| Too complex | Onboarding, tutorials |
| Pay-to-win perception | Careful economic design |
| Low retention | Engaging progression |

### Operational Risks

| Risk | Mitigation |
|------|------------|
| Server downtime | Redundancy, monitoring |
| Exploit discovered | Pause mechanisms, bug bounty |
| Team burnout | Realistic scope, phases |
| Funding runs out | MVP first, revenue early |

---

## MVP SCOPE (Minimum Viable Product)

If resources are limited, launch with reduced scope:

### MVP Includes

| Feature | Status |
|---------|--------|
| 2-3 races (not 6) | Reduced |
| 2 classes (not 6) | Reduced |
| 50×50 map (not 100×100) | Reduced |
| 30-day generation (not 90) | Reduced |
| Core combat | Full |
| Basic spells | Reduced |
| No alliances | Cut |
| Basic UI | Reduced |

### MVP Excludes (Add Later)

- Full 6 races
- Full 6 classes with all paths
- Alliance system
- Advanced spells
- Mobile optimization
- Achievements
- Trading

---

## POST-LAUNCH ROADMAP

### Version 1.1 (First Update)

| Feature | Description |
|---------|-------------|
| Balance patch | Based on Gen 1 data |
| QoL improvements | Based on feedback |
| Bug fixes | Address launch issues |

### Version 1.2

| Feature | Description |
|---------|-------------|
| Alliance improvements | More features |
| New spells | Additional magic |
| Events | Limited-time events |

### Version 2.0 (Major Update)

| Feature | Description |
|---------|-------------|
| New race | 7th race |
| New class | 7th class |
| Naval units | Ships, sea combat |
| 200×200 map option | Larger world |

### Long-term Vision

| Feature | Description |
|---------|-------------|
| Multiple realms | Parallel worlds |
| Cross-realm warfare | Realm vs realm |
| Mobile app | Native iOS/Android |
| Spectator mode | Watch battles |
| Tournaments | Competitive seasons |

---

## CHECKLIST

### Pre-Development
- [ ] Finalize game design documents
- [ ] Set up repository and CI/CD
- [ ] Set up development environment
- [ ] Create project board/tracking

### Phase 1 Complete
- [ ] Database schema implemented
- [ ] Server skeleton running
- [ ] Basic API responding
- [ ] Dev environment documented

### Phase 2 Complete
- [ ] Map generation working
- [ ] Players can register
- [ ] Armies can move
- [ ] Basic combat resolves
- [ ] Buildings construct
- [ ] Forsaken can be captured

### Phase 3 Complete
- [ ] All 6 races implemented
- [ ] All 6 captain classes working
- [ ] All spells castable
- [ ] Alliances functional
- [ ] Full combat with all modifiers
- [ ] Generation lifecycle complete

### Phase 4 Complete
- [ ] All contracts deployed to testnet
- [ ] Wallet authentication working
- [ ] Commit-reveal attacks functional
- [ ] Titan's Witness recording
- [ ] Contract audit complete

### Phase 5 Complete
- [ ] Map view polished
- [ ] All UI panels complete
- [ ] Mobile responsive
- [ ] Onboarding flow done
- [ ] All animations in place

### Phase 6 Complete
- [ ] 1000+ simulations run
- [ ] Load testing passed
- [ ] Security testing passed
- [ ] Mainnet deployment done
- [ ] Beta feedback incorporated
- [ ] Launch!

---

*Document Status: Implementation roadmap complete*
*Ready to begin development*
