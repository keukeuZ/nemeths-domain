# Nemeths Domain - Frontend Design

## OVERVIEW

The frontend is a **web-based strategy interface** optimized for both desktop and tablet. The design prioritizes clarity, quick actions, and real-time feedback while maintaining the dark fantasy aesthetic of Nemeth's Domain.

**Design Principles:**
- Information density without clutter
- One-click actions for common tasks
- Real-time updates without page refresh
- Mobile-friendly but desktop-optimized
- Dark theme with race-specific accent colors

---

## TECHNOLOGY STACK

| Layer | Technology | Reason |
|-------|------------|--------|
| Framework | React 18+ | Component-based, large ecosystem |
| State | Zustand | Lightweight, easy WebSocket integration |
| Styling | Tailwind CSS | Rapid iteration, dark theme |
| Maps | Canvas/WebGL (Pixi.js) | Performance for 100x100 grid |
| Real-time | Socket.io Client | Matches server |
| Wallet | wagmi + viem | Best Web3 React hooks |
| Build | Vite | Fast dev, optimized builds |
| Types | TypeScript | Type safety |

---

## LAYOUT STRUCTURE

### Main Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  TOP BAR (fixed)                                                   │
│  [Logo] [Resources] [Timers] [Alerts] [Settings] [Wallet]         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐  ┌──────────────────────────────────────────┐    │
│  │             │  │                                          │    │
│  │  SIDEBAR    │  │              MAP VIEW                    │    │
│  │  (collapsible)│  │           (main canvas)                │    │
│  │             │  │                                          │    │
│  │  - Overview │  │                                          │    │
│  │  - Armies   │  │                                          │    │
│  │  - Buildings│  │                                          │    │
│  │  - Spells   │  │                                          │    │
│  │  - Alliance │  │                                          │    │
│  │  - Rankings │  │                                          │    │
│  │             │  │                                          │    │
│  └─────────────┘  └──────────────────────────────────────────┘    │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  BOTTOM PANEL (contextual - shows details of selected item)       │
│  [Territory Details] [Army Details] [Combat Log] [Chat]           │
└────────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (1280px+) | Full layout with sidebar |
| Tablet (768-1279px) | Collapsible sidebar, smaller panels |
| Mobile (< 768px) | Bottom nav, full-screen views |

---

## COLOR SYSTEM

### Base Theme (Dark)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0f;      /* Near black */
  --bg-secondary: #12121a;    /* Panel backgrounds */
  --bg-tertiary: #1a1a24;     /* Cards, inputs */
  --bg-hover: #22222e;        /* Hover states */

  /* Text */
  --text-primary: #e4e4e7;    /* Main text */
  --text-secondary: #a1a1aa;  /* Secondary text */
  --text-muted: #52525b;      /* Disabled, hints */

  /* Borders */
  --border-default: #27272a;
  --border-focus: #3f3f46;

  /* Status */
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
  --info: #3b82f6;
}
```

### Race Accent Colors

| Race | Primary | Secondary | Use |
|------|---------|-----------|-----|
| **Ironveld** | #78716c (Stone) | #a8a29e | UI accents, borders |
| **Vaelthir** | #dc2626 (Crimson) | #f87171 | Blood magic theme |
| **Korrath** | #7c2d12 (Rust) | #ea580c | Aggressive, war |
| **Sylvaeth** | #4f46e5 (Violet) | #818cf8 | Mystical, dreams |
| **Ashborn** | #1f2937 (Ash) | #6b7280 | Muted, undead |
| **Breath-Born** | #0ea5e9 (Sky) | #7dd3fc | Wind, ethereal |

---

## CORE VIEWS

### 1. Map View (Primary)

The heart of the game - a zoomable, pannable 100x100 grid.

```typescript
interface MapViewProps {
  zoom: number;           // 0.5 to 3.0
  center: { x: number; y: number };
  selectedTile: Coord | null;
  visibleState: VisibleGameState;
  overlays: MapOverlay[];  // Routes, ranges, highlights
}

type MapOverlay =
  | { type: 'army_path'; path: Coord[]; color: string }
  | { type: 'attack_range'; center: Coord; range: number }
  | { type: 'spell_target'; tiles: Coord[] }
  | { type: 'territory_highlight'; tiles: Coord[]; color: string };
```

**Map Tile Rendering:**

```
┌─────────────────┐
│ [Owner Flag]    │  <- Race banner or Forsaken skull
│                 │
│   [Terrain]     │  <- Background texture
│                 │
│ [B] [A]    [T]  │  <- Building icon, Army icon, Trust indicator
└─────────────────┘

Visual States:
- Owned: Full color, bright border
- Allied: Full color, dotted border
- Scouted: Slightly dimmed
- Fogged: Silhouettes only
- Unknown: Terrain texture only
```

**Map Controls:**

| Control | Action |
|---------|--------|
| Scroll wheel | Zoom in/out |
| Click + drag | Pan map |
| Click tile | Select (shows details) |
| Double-click | Center on tile |
| Right-click | Context menu (actions) |
| Keyboard arrows | Pan map |
| +/- keys | Zoom |
| Home | Center on your capital |
| Space | Toggle army paths |

**Map Layers:**

```typescript
enum MapLayer {
  TERRAIN = 0,      // Base terrain textures
  ZONES = 1,        // Zone borders (Heart, Inner, etc.)
  TERRITORIES = 2,  // Ownership colors
  BUILDINGS = 3,    // Building icons
  ARMIES = 4,       // Army tokens
  FOG = 5,          // Fog of war overlay
  UI = 6,           // Selection, paths, ranges
}
```

---

### 2. Territory Detail Panel

Shown when a territory is selected.

```
┌──────────────────────────────────────────────────────────────┐
│  TERRITORY (23, 45) - Middle Ring                            │
│  Terrain: Forest  |  Owner: 0x1234...abcd (Ironveld)        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  BUILDINGS                        GARRISON                   │
│  ┌────────────┐ ┌────────────┐   ┌─────────────────────┐    │
│  │ Farm Lv.3  │ │ Wall Lv.2  │   │ 150 Footmen         │    │
│  │ 36 food/hr │ │ +20% DEF   │   │ 50 Archers          │    │
│  └────────────┘ └────────────┘   │ 25 Knights          │    │
│  ┌────────────┐                  │ Total: 225 units    │    │
│  │ Barracks   │ [+ Build]        │ Morale: 95%         │    │
│  │ Lv.2       │                  └─────────────────────┘    │
│  └────────────┘                                              │
│                                                              │
│  RESOURCES           TRUST                                   │
│  Gold: 1,234        ████████░░ 82%                          │
│  Stone: 567         Last activity: 2h ago                    │
│  Food: 890                                                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [MOVE ARMY HERE]  [ATTACK]  [CAST SPELL]  [SCOUT]          │
└──────────────────────────────────────────────────────────────┘
```

**Ownership States:**

| State | Display | Actions Available |
|-------|---------|-------------------|
| Own territory | Full info | Build, train, manage |
| Allied territory | Most info | Move army, cast buff |
| Enemy (scouted) | Intel-based | Attack, cast spell |
| Enemy (fogged) | Estimates | Scout, attack blind |
| Forsaken | Type + garrison est. | Attack |
| Unclaimed | Terrain only | Scout, claim |

---

### 3. Army Management Panel

```
┌──────────────────────────────────────────────────────────────┐
│  ARMY: Northern Strike Force                                 │
│  Location: (23, 45) -> Moving to (28, 50)                   │
│  Status: In Transit | ETA: 2h 34m                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  COMPOSITION                      STATS                      │
│  ┌────────────────────────┐      ┌─────────────────────┐    │
│  │ 100 Footmen      ████  │      │ Total ATK: 2,450    │    │
│  │ 50 Archers       ██    │      │ Total DEF: 1,890    │    │
│  │ 30 Knights       █░    │      │ Speed: 0.85 tiles/h │    │
│  │ 10 Catapults     ░     │      │ Morale: 88%         │    │
│  └────────────────────────┘      │ Foreign Soil: Day 2 │    │
│                                  └─────────────────────┘    │
│  FOOD: 380/day (covered)                                    │
│  LODGING: 175 gold/day (ally hosting)                       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [SPLIT ARMY]  [MERGE]  [CHANGE DESTINATION]  [RECALL]      │
└──────────────────────────────────────────────────────────────┘
```

**Army Status Icons:**

| Icon | Status |
|------|--------|
| 🏠 | Idle at home |
| 🏃 | Moving |
| ⚔️ | In combat |
| 🏰 | Sieging |
| 🛡️ | Defending |
| ⚠️ | Low morale |
| 🍞 | Food shortage |
| 🏨 | Hosted by ally |

---

### 4. Combat View

Full-screen overlay during active battles.

```
┌──────────────────────────────────────────────────────────────┐
│                    ⚔️ BATTLE IN PROGRESS                     │
│                    Territory (45, 67)                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│      ATTACKER                      DEFENDER                  │
│   ┌─────────────┐              ┌─────────────┐              │
│   │  [Banner]   │              │  [Banner]   │              │
│   │  Korrath    │      VS      │  Ironveld   │              │
│   │  0x1234...  │              │  0x5678...  │              │
│   └─────────────┘              └─────────────┘              │
│                                                              │
│   ATK: 3,400        Round 2/3        DEF: 2,800             │
│   HP: ████████░░                     HP: ██████████         │
│   Morale: 75%                        Morale: 92%            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ROUND 2 RESULTS                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Attacker rolled 14 (Above Average) -> 1.10× ATK       │ │
│  │ Defender rolled 8 (Below Average) -> 0.90× DEF        │ │
│  │                                                        │ │
│  │ Damage dealt: 1,240                                   │ │
│  │ Casualties: 45 Footmen, 12 Archers                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  COMBAT LOG                                                  │
│  [Round 1] Attacker dealt 890 damage (roll: 11)            │
│  [Round 1] Defender dealt 1,100 damage (roll: 16)          │
│  [Round 2] Attacker dealt 1,240 damage (roll: 14)          │
│  [Round 2] Defender dealt 720 damage (roll: 8)             │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [CAST SPELL] (if in combat)           [CLOSE] (spectating) │
└──────────────────────────────────────────────────────────────┘
```

**Combat Animations:**
- D20 roll animation (dice spinning, landing on number)
- Damage numbers floating up
- Unit count ticking down
- Morale bar changing color (green → yellow → red)
- Critical hit: Screen flash + "CRITICAL!" text
- Critical fail: Red flash + "MISHAP!" text

---

### 5. Building Panel

```
┌──────────────────────────────────────────────────────────────┐
│  BUILD NEW STRUCTURE - Territory (23, 45)                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AVAILABLE BUILDINGS                                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ [Farm Icon] │  │ [Mine Icon] │  │ [Barracks]  │          │
│  │ Farm        │  │ Mine        │  │ Barracks    │          │
│  │ 100g 50s 50w│  │ 150g 25s 75w│  │ 200g 100s   │          │
│  │ 4h build    │  │ 6h build    │  │ 6h build    │          │
│  │ [BUILD]     │  │ [BUILD]     │  │ [BUILD]     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ [Wall Icon] │  │ [Tower]     │  │ [Mage Tower]│          │
│  │ Wall Lv.1   │  │ Watchtower  │  │ Mage Tower  │          │
│  │ 200g 300s   │  │ 150g 100s   │  │ 400g 200s   │          │
│  │ 8h build    │  │ 4h build    │  │ 10h build   │          │
│  │ [BUILD]     │  │ [BUILD]     │  │ [LOCKED]    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  LOCKED: Mage Tower requires Barracks Lv.2                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  YOUR RESOURCES: 2,340 Gold | 890 Stone | 1,200 Wood        │
└──────────────────────────────────────────────────────────────┘
```

**Building States:**

| State | Visual | Interaction |
|-------|--------|-------------|
| Available | Full color | Click to build |
| Locked (prereq) | Grayed + lock icon | Tooltip shows requirement |
| Locked (resources) | Grayed + red cost | Shows what's missing |
| Building | Progress bar | Cancel button |
| Upgrading | Progress bar + level | Cancel button |
| Max level | Gold border | No action |

---

### 6. Spell Casting Interface

```
┌──────────────────────────────────────────────────────────────┐
│  SPELLBOOK                               Mana: 85 / 150     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DESTRUCTION          PROTECTION          DIVINATION         │
│  ┌────────────┐       ┌────────────┐     ┌────────────┐     │
│  │ 🔥 Firebolt │       │ 🛡️ Shield  │     │ 👁️ Scry    │     │
│  │ 10 mana    │       │ 15 mana    │     │ 10 mana    │     │
│  │ Ready      │       │ Ready      │     │ Cooldown   │     │
│  └────────────┘       └────────────┘     │ 2h 15m     │     │
│  ┌────────────┐       ┌────────────┐     └────────────┘     │
│  │ ⚡ Lightning│       │ 🪨 Stone   │     ┌────────────┐     │
│  │ 25 mana    │       │   Skin     │     │ 🔮 True    │     │
│  │ Cooldown   │       │ 30 mana    │     │   Sight    │     │
│  │ 45m        │       │ Ready      │     │ 25 mana    │     │
│  └────────────┘       └────────────┘     │ Ready      │     │
│  ┌────────────┐                          └────────────┘     │
│  │ 🔥 Fireball │  [VAELTHIR BLOOD MAGIC]                    │
│  │ 40 mana    │  ┌─────────────────────────────────────┐   │
│  │ Ready      │  │ Sacrifice units for +5% to +20%     │   │
│  │ [CAST]     │  │ spell power                         │   │
│  └────────────┘  │ [ENABLE SACRIFICE MODE]             │   │
│                  └─────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Select a spell, then click target on map                   │
└──────────────────────────────────────────────────────────────┘
```

**Spell Casting Flow:**

1. Open Spellbook (hotkey: S)
2. Click spell to select
3. Valid targets highlight on map
4. Click target
5. Confirmation popup (shows effect preview, cost)
6. Cast (or cancel)
7. Animation plays, result shown

---

### 7. Alliance Panel

```
┌──────────────────────────────────────────────────────────────┐
│  ALLIANCE: The Iron Pact                                    │
│  Founded by: 0x1234... | Members: 12 | Territories: 156    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MEMBERS                          ALLIANCE SETTINGS          │
│  ┌─────────────────────────────┐  ┌───────────────────────┐ │
│  │ 👑 IronKing (Ironveld)      │  │ ☑ Allow troop hosting │ │
│  │    42 territories, Online   │  │ ☑ Share building use  │ │
│  │ ⚔️ BloodMage (Vaelthir)     │  │ ☑ Mutual defense pact │ │
│  │    38 territories, Online   │  │ Food share: 50%       │ │
│  │ 🛡️ StoneWall (Ironveld)     │  └───────────────────────┘ │
│  │    31 territories, Away 2h  │                            │
│  │ ...                         │  ALLIANCE RESOURCES        │
│  └─────────────────────────────┘  ┌───────────────────────┐ │
│                                   │ Shared Gold: 5,000    │ │
│  ALLIANCE CHAT                    │ Shared Food: 2,500    │ │
│  ┌─────────────────────────────┐  │ [CONTRIBUTE]          │ │
│  │ IronKing: Attack at dawn    │  └───────────────────────┘ │
│  │ BloodMage: I'll soften them │                            │
│  │ StoneWall: Defending north  │  [LEAVE ALLIANCE]          │
│  │ [Type message...]     [Send]│                            │
│  └─────────────────────────────┘                            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [VIEW ON MAP]  [INVITE PLAYER]  [ALLIANCE DIPLOMACY]       │
└──────────────────────────────────────────────────────────────┘
```

---

### 8. Rankings / Leaderboard

```
┌──────────────────────────────────────────────────────────────┐
│  DOMAIN RANKINGS - Generation 3                              │
│  Day 45 of 90 | Your Rank: #23                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  CURRENT STANDINGS                                           │
│  ┌────┬────────────────┬──────────┬────────┬───────────────┐│
│  │Rank│ Player         │ Race     │ Points │ Territories   ││
│  ├────┼────────────────┼──────────┼────────┼───────────────┤│
│  │ 1  │ 👑 WarMaster    │ Korrath  │ 45,230 │ 67 (2 Heart) ││
│  │ 2  │ ShadowQueen    │ Sylvaeth │ 42,100 │ 58           ││
│  │ 3  │ IronFist       │ Ironveld │ 39,800 │ 52           ││
│  │ 4  │ BloodLord      │ Vaelthir │ 38,500 │ 48           ││
│  │ 5  │ AshRisen       │ Ashborn  │ 35,200 │ 51           ││
│  │...│                │          │        │              ││
│  │ 23 │ ▶ YOU          │ Ironveld │ 18,400 │ 28           ││
│  └────┴────────────────┴──────────┴────────┴───────────────┘│
│                                                              │
│  [TOP 10] [TOP 50] [MY ALLIANCE] [SEARCH PLAYER]            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  TITAN'S WITNESS - Eternal Records                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Gen 1: LegendSlayer (Korrath) - 78,400 pts            │ │
│  │ Gen 2: EternalFlame (Vaelthir) - 82,100 pts           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## TOP BAR COMPONENTS

### Resource Display

```
┌──────────────────────────────────────────────────────────────┐
│ 💰 12,340 (+450/h) | 🪨 5,670 (+120/h) | 🪵 4,890 (+95/h)    │
│ 🍞 2,340 (+180/h)  | 🔮 85/150 (+30/day)                     │
└──────────────────────────────────────────────────────────────┘
```

Clicking any resource opens detailed breakdown.

### Active Timers

```
┌──────────────────────────────────────────────────────────────┐
│ ⏱️ Barracks (23,45): 2h 15m | Wall (30,50): 5h 30m          │
│ 🏃 Army arriving: 45m | ⚔️ Combat in: 1h 20m                │
└──────────────────────────────────────────────────────────────┘
```

Clicking a timer centers map on relevant location.

### Alert System

```
┌──────────────────────────────────────────────────────────────┐
│ 🔔 3 alerts                                                  │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ⚔️ INCOMING ATTACK on (45, 67) - ETA 2h 30m             ││
│ │ ⚠️ Low trust in territory (12, 34) - 45%                ││
│ │ ✅ Barracks construction complete at (23, 45)            ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## MODALS & POPUPS

### Confirmation Modal

```
┌──────────────────────────────────────────────────────────────┐
│                    CONFIRM ATTACK                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Target: Territory (45, 67)                                 │
│  Owner: ShadowQueen (Sylvaeth)                              │
│  Intel: Scouted 4h ago (85% accuracy)                       │
│                                                              │
│  YOUR ARMY              ESTIMATED ENEMY                      │
│  200 Footmen            ~150 defenders                       │
│  50 Archers             Wall Lv.2                           │
│  30 Knights             Unknown garrison                     │
│                                                              │
│  Travel time: 3h 45m                                        │
│  Battle ETA: ~4h from now                                   │
│                                                              │
│  ⚠️ This will commit an attack on-chain (small gas fee)     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│              [CANCEL]              [CONFIRM ATTACK]          │
└──────────────────────────────────────────────────────────────┘
```

### Transaction Modal

```
┌──────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN TRANSACTION                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Action: Commit Attack                                      │
│  Contract: CombatSystem                                     │
│  Estimated Gas: 0.0001 ETH (~$0.01)                        │
│                                                              │
│  Status: ⏳ Waiting for wallet...                           │
│                                                              │
│  [Wallet popup should appear. Please confirm transaction]   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                        [CANCEL]                              │
└──────────────────────────────────────────────────────────────┘
```

### Notification Toast

```
┌────────────────────────────────────────┐
│ ✅ Army arrived at (45, 67)           │  <- Auto-dismiss 5s
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⚔️ Battle started! Click to view      │  <- Click to open
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ❌ Spell failed - insufficient mana   │  <- Error, 8s dismiss
└────────────────────────────────────────┘
```

---

## STATE MANAGEMENT

### Zustand Store Structure

```typescript
interface GameStore {
  // Connection
  connected: boolean;
  wallet: Address | null;

  // Generation
  generation: GenerationState;

  // Player
  player: PlayerState | null;
  resources: ResourceState;
  territories: Map<string, TerritoryState>;
  armies: Map<string, ArmyState>;

  // Visibility
  visibleState: VisibleGameState;
  fogOfWar: Set<string>;  // Coord keys

  // UI State
  selectedTile: Coord | null;
  selectedArmy: string | null;
  activePanel: PanelType;
  mapCenter: Coord;
  mapZoom: number;

  // Modals
  activeModal: ModalType | null;
  modalData: any;

  // Real-time
  pendingTimers: Timer[];
  alerts: Alert[];
  chatMessages: ChatMessage[];

  // Actions
  selectTile: (coord: Coord) => void;
  moveArmy: (armyId: string, dest: Coord) => Promise<void>;
  buildStructure: (coord: Coord, type: BuildingType) => Promise<void>;
  castSpell: (spell: SpellType, target: any) => Promise<void>;
  // ... more actions
}
```

### WebSocket Integration

```typescript
// Socket event handlers
socket.on('state_update', (update) => {
  store.applyStateUpdate(update);
});

socket.on('combat_round', (round) => {
  store.updateCombat(round);
  showCombatAnimation(round);
});

socket.on('territory_captured', (data) => {
  store.updateTerritory(data);
  showNotification(`Territory (${data.x}, ${data.y}) captured!`);
  playSound('territory_captured');
});

socket.on('alert', (alert) => {
  store.addAlert(alert);
  if (alert.priority === 'high') {
    showUrgentNotification(alert);
  }
});
```

---

## ANIMATIONS & FEEDBACK

### Map Animations

| Event | Animation |
|-------|-----------|
| Army moving | Token slides along path |
| Combat starting | Crossed swords icon pulse |
| Territory captured | Color transition + flag change |
| Building complete | Pop-up effect + sparkle |
| Spell cast | Particle effect from source to target |
| Critical hit | Screen shake + flash |

### Sound Effects (Optional)

| Event | Sound |
|-------|-------|
| Click | Soft click |
| Build start | Hammer |
| Build complete | Fanfare |
| Army move | March |
| Combat start | War horn |
| Combat round | Clash |
| Victory | Triumphant |
| Defeat | Somber |
| Alert | Bell |
| Spell cast | Magic woosh |

---

## MOBILE ADAPTATIONS

### Mobile Layout

```
┌─────────────────────────┐
│ [Resources] [Alerts] 🔔 │  <- Compact top bar
├─────────────────────────┤
│                         │
│                         │
│      MAP VIEW           │  <- Full screen map
│    (touch to pan/zoom)  │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ [🗺️] [⚔️] [🏰] [📜] [👥] │  <- Bottom navigation
│ Map Army Build Spell Ally│
└─────────────────────────┘
```

### Touch Controls

| Gesture | Action |
|---------|--------|
| Tap | Select tile |
| Long press | Context menu |
| Pinch | Zoom |
| Two-finger drag | Pan |
| Swipe up on tile | Quick actions |
| Swipe down | Close panel |

### Mobile-Specific Features

- Bottom sheet for details (slides up)
- Simplified combat view
- Larger touch targets
- Haptic feedback for actions
- Push notifications for alerts

---

## PERFORMANCE OPTIMIZATIONS

### Map Rendering

```typescript
// Only render visible tiles
const visibleTiles = getVisibleTiles(mapCenter, zoom, viewport);

// Use sprite batching for similar tiles
const terrainBatch = new PIXI.ParticleContainer();
visibleTiles.forEach(tile => {
  const sprite = getTerrainSprite(tile.terrain);
  terrainBatch.addChild(sprite);
});

// Culling for off-screen elements
renderer.cullArea = viewport;

// Level of detail based on zoom
if (zoom < 0.5) {
  // Show only territory colors, no icons
} else if (zoom < 1.0) {
  // Show icons, no labels
} else {
  // Full detail
}
```

### State Updates

```typescript
// Batch state updates
const pendingUpdates: StateUpdate[] = [];

socket.on('state_update', (update) => {
  pendingUpdates.push(update);
});

// Apply batched updates every 100ms
setInterval(() => {
  if (pendingUpdates.length > 0) {
    store.batchApply(pendingUpdates);
    pendingUpdates.length = 0;
  }
}, 100);

// Debounce map re-renders
const debouncedRender = debounce(renderMap, 16); // ~60fps max
```

### Asset Loading

```typescript
// Preload critical assets
await PIXI.Assets.load([
  'terrain-atlas.png',
  'building-icons.png',
  'unit-icons.png',
  'race-banners.png'
]);

// Lazy load non-critical
PIXI.Assets.backgroundLoad([
  'spell-effects.png',
  'combat-animations.png'
]);
```

---

## ACCESSIBILITY

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Cycle through panels |
| Enter | Confirm selection |
| Escape | Close modal/cancel |
| Arrow keys | Navigate map |
| 1-9 | Quick select own territories |
| A | Open armies panel |
| B | Open build menu |
| S | Open spellbook |
| M | Toggle minimap |
| ? | Help overlay |

### Screen Reader Support

```typescript
// ARIA labels for important elements
<button
  aria-label="Build Farm, costs 100 gold 50 stone 50 wood, 4 hour build time"
  onClick={buildFarm}
>
  Farm
</button>

// Live regions for updates
<div aria-live="polite" aria-atomic="true">
  {latestNotification}
</div>
```

### Color Blind Modes

- Patterns in addition to colors for territory ownership
- High contrast option
- Configurable team colors

---

## FILE STRUCTURE

```
src/
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── BottomPanel.tsx
│   ├── map/
│   │   ├── MapCanvas.tsx
│   │   ├── MapControls.tsx
│   │   ├── TileRenderer.tsx
│   │   └── Overlays.tsx
│   ├── panels/
│   │   ├── TerritoryPanel.tsx
│   │   ├── ArmyPanel.tsx
│   │   ├── BuildPanel.tsx
│   │   ├── SpellPanel.tsx
│   │   ├── AlliancePanel.tsx
│   │   └── RankingsPanel.tsx
│   ├── combat/
│   │   ├── CombatView.tsx
│   │   ├── CombatLog.tsx
│   │   └── DiceRoll.tsx
│   ├── modals/
│   │   ├── ConfirmModal.tsx
│   │   ├── TransactionModal.tsx
│   │   └── AlertModal.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Timer.tsx
│       └── ResourceBar.tsx
├── hooks/
│   ├── useGameState.ts
│   ├── useWebSocket.ts
│   ├── useWallet.ts
│   └── useMap.ts
├── stores/
│   ├── gameStore.ts
│   ├── uiStore.ts
│   └── chatStore.ts
├── services/
│   ├── api.ts
│   ├── socket.ts
│   └── blockchain.ts
├── utils/
│   ├── coordinates.ts
│   ├── formatting.ts
│   └── calculations.ts
├── types/
│   └── index.ts
└── assets/
    ├── sprites/
    ├── sounds/
    └── fonts/
```

---

## SUMMARY

| Aspect | Decision |
|--------|----------|
| Framework | React 18 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS (dark theme) |
| Map Rendering | Pixi.js (WebGL) |
| Real-time | Socket.io |
| Wallet | wagmi + viem |
| Primary View | Zoomable 100x100 map |
| Responsive | Desktop-first, mobile-friendly |

---

*Document Status: Frontend design complete*
*Next: Testing/simulation framework*
