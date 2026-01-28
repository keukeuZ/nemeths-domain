# Nemeths Domain - Game Design Document

## Overview
- **Name**: Nemeths Domain
- **Platform**: Base Blockchain (Ethereum L2)
- **Genre**: Persistent Real-Time Strategy / Territory Control
- **Generation Length**: 50 days
- **Core Loop**: Train units/build → Expand territory → Attack/Defend → Dominate the center

---

## DESIGN PHILOSOPHY

### Simplicity First
- **6 races** with distinct playstyles
- **6 captain classes** with 2 skills each (choose ONE)
- **14 buildings** (no tiers, no upgrades)
- **3 units per race** (Defender, Attacker, Elite)
- **Clear roles**, easy to understand

### Accessible Entry
- **Free tier**: 2 plots at no cost
- **Premium**: 10 plots for $10 USDC
- **Rolling registration**: Join any time during generation

### Strategic Depth
- D20 for high-stakes decisions
- Rock-paper-scissors race counters
- Captain skills as strategic counters
- Alliance mechanics with consequences

---

## CORE SYSTEMS

### 1. The Map
- [x] 100×100 square grid (10,000 plots)
- [x] Heart at center (50,50) - highest value
- [x] 4 zones: Heart, Inner, Middle, Outer Ring
- [x] 7 terrain types + water (15% impassable)
- [x] Random placement in Outer Ring

### 2. Races
- [x] 6 races with distinct playstyles
- [x] Player chooses race at generation start
- [x] Food consumption spectrum (0% to 100%)
- [x] 3 unique units per race

### 3. Buildings
- [x] 14 building types (no tiers)
- [x] Build once, works forever
- [x] Simple prerequisites
- [x] Max 6 buildings per territory

### 4. Units
- [x] 3 units per race: Defender, Attacker, Elite
- [x] 3 siege weapons (universal)
- [x] Prisoner capture mechanic
- [x] Permanent death (burned on kill)

### 5. Combat System
- [x] Weighted D20 rolls for high-stakes
- [x] Defender advantage on home territory
- [x] Siege mechanics for walls/buildings
- [x] Morale system

### 6. Captains
- [x] 6 classes with distinct roles
- [x] 2 skills per class (A or B)
- [x] Choose ONE skill, locked for generation
- [x] Skills designed as counters

### 7. Resources & Economy
- [x] Gold, Stone, Wood, Food, Mana
- [x] Food consumption varies by race
- [x] Internal accounting (not token)

### 8. Generation Lifecycle
- [x] 50-day generations
- [x] 5-day planning phase (no PvP)
- [x] Rolling registration
- [x] 10-day late joiner protection
- [x] 24-48h intermission

### 9. Blockchain Integration
- [x] Hybrid architecture (game server + chain)
- [x] Ownership and results on-chain
- [x] Commit-reveal for attacks
- [x] Chainlink VRF for randomness

---

## CONFIRMED DECISIONS

### Entry & Economy
- **Free tier**: 2 plots at no cost
- **Premium**: $10 USDC for 10 plots
- **Max plots**: 10 per wallet
- **Board size**: 100×100 (10,000 plots)

### Generation Cycle
- **Duration**: 50 days (one Heartbeat)
- **Planning Phase**: Days 1-5 (no PvP combat)
- **Registration**: Rolling (join anytime)
- **Late Joiner Protection**: 10 days attack immunity + 25% bonus resources
- **Reset**: Everything except Titan's Witness

### Captain System
- **6 classes**: Warlord, Archmage, High Priest, Shadow Master, Merchant Prince, Beastlord
- **2 skills per class**: Choose A or B
- **1 choice per generation**: Locked after selection
- **Skills as counters**: Rock-paper-scissors design

### Building System
- **14 buildings total**: No tiers, no upgrades
- **Categories**: Resource (4), Military (4), Defense (3), Magic (2), Utility (1)
- **Simple prerequisites**: Clear dependency tree
- **Max 6 per territory**

### Unit System
- **3 units per race**: Defender, Attacker, Elite
- **21 total unit types**: 18 race + 3 siege
- **Prisoners**: 5% capture rate (10% Korrath), 60% effectiveness
- **Food consumption by race**: Ashborn 0%, Ironveld 50%, Breath-Born 70%, Sylvaeth 80%, Vaelthir/Korrath 100%

### Race Balance
- **Korrath Blood Frenzy**: +10% ATK for 24h after attacking (reward, not punishment)
- **Ashborn food-free**: Balanced by -15% resource production, no healing
- **Food spectrum**: Creates distinct economic profiles

### Scoring (Domain Points)
- Territory: 1 point/plot/day
- Heart control: +10 points/plot/day (requires garrison)
- Inner Ring: +5 bonus/plot/day
- Middle Ring: +2 bonus/plot/day

### Randomness (D20)
- **High-stakes**: Full D20 variance (combat results, critical abilities)
- **Low-stakes**: Reduced variance (minor effects, resource rolls)
- **Philosophy**: Like D&D - dice make memorable moments

### Visibility & Scouting
- **Partial fog of war**: See "something" but not details
- **Scouting reveals truth**: Send scouts for accurate intel
- **Hybrid architecture**: Game server for state, blockchain for ownership

### Map & Placement
- **Placement**: Random in Outer Ring, clustered plots
- **Minimum separation**: 3 tiles between starting players
- **NPC villages**: The Forsaken (15-50% by zone, scales with day)
- **Forsaken scaling**: 60% strength early → 140% late game

### Inactive Players (Leadership Decay)
- **Trust system**: 0-100% per territory
- **Grace period**: 3 days no decay
- **Decay rate**: -5%/day → -10%/day → -15%/day
- **Revolt at 0%**: Territory becomes Forsaken

### Movement & Terrain
- **Diagonal movement**: Allowed (1.4× cost)
- **Water**: 15% of map, impassable
- **Bridges**: Buildable and destructible

### Alliance Mechanics
- **Lodging cost**: Universal gold payment
- **Food cost**: Race-dependent
- **Foreign Soil Penalty**: -5% to -35% over time
- **AOE risk**: More troops = more spell damage
- **Betrayal consequences**: Public traitor board + 25% recruitment penalty

### Anti-Bot Measures
- **1 wallet = 1 account** per generation
- **IP rate limiting**
- **Action throttling**
- **Behavioral flags** (pattern detection)
- **Player reporting**
- **Optional social link** for leaderboard verification

### Revenue Model
- **Early phase**: All fees to development
- **Growth phase**: Prize pools when player base grows
- **Long-term**: TBD based on sustainability

---

## SESSION PROGRESS (January 2026)

### Design Completed
- [x] Core lore: Nemeth the Sleeping Titan
- [x] World structure: The Shattered Continent
- [x] Generation cycle: 50-day Heartbeat
- [x] Eternal record: The Titan's Witness
- [x] All 6 races with D20 mechanics
- [x] Captain system (6 classes × 2 skills = 12 options)
- [x] Building system (14 buildings, no tiers)
- [x] Unit system (3 per race + siege + prisoners)
- [x] Combat system with weighted D20
- [x] Spell system (36+ spells)
- [x] Map design (100×100, 4 zones)
- [x] Forsaken NPC system (scales with day/zone)
- [x] Scoring system (Domain Points)
- [x] Bridge system
- [x] Alliance territory mechanics
- [x] Leadership decay
- [x] Smart contract architecture
- [x] Anti-bot measures

### Implementation Planning
- [x] 6-phase roadmap
- [x] MVP scope definition
- [x] Testing framework
- [x] Frontend design (React, Pixi.js)
- [x] Server architecture
- [x] Database schema
- [x] CI/CD pipeline

### Player Education
- [x] Tutorial system
- [x] FAQ (40+ questions)
- [x] Codex structure
- [x] Tooltip system
- [x] Onboarding flow

### To Do
- [ ] Final percentage tuning (simulation)
- [ ] Begin implementation (see ROADMAP.md)

---

## OPEN QUESTIONS

1. Alliance formal structure (guilds, federations)?
2. Naval units in future expansion?
3. Trade routes between allies?
4. Fiat payment integration for entry fee?

---

## DOCUMENT INDEX

| Document | Contents |
|----------|----------|
| **RACES.md** | 6 races, food consumption, bonuses/penalties |
| **CAPTAINS.md** | 6 classes, 12 skills, death saves |
| **BUILDINGS.md** | 14 buildings, costs, prerequisites |
| **UNITS.md** | 21 unit types, stats, specials |
| **MAP.md** | Zones, terrain, placement, Forsaken |
| **COMBAT.md** | D20 system, damage, morale |
| **SPELLS.md** | 6 schools, 36+ spells |
| **ECONOMY.md** | Resources, costs, balance |
| **LORE.md** | World background, Titan |
| **TUTORIAL.md** | Player education system |
| **ROADMAP.md** | Implementation phases |
| **CONTRACTS.md** | Smart contract architecture |
| **FRONTEND.md** | UI/UX design |
| **SERVER.md** | Backend architecture |
| **TESTING.md** | Test framework |

---

*Document Status: Design phase complete, ready for implementation*
*Last updated: January 2026 - Simplified captain/building/unit systems*
