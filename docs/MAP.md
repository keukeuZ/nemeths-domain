# Nemeths Domain - Map Design

## MAP OVERVIEW

**Size:** 100 × 100 grid = 10,000 plots
**Shape:** Square with circular zones radiating from center
**Center:** Nemeth's Heart (coordinates 50,50)
**Theme:** Shattered Continent - islands connected by land bridges

---

## ZONE STRUCTURE

The map is divided into **4 concentric zones** based on distance from the Heart.

```
+--------------------------------------------------+
|                  OUTER RING                       |
|    (Safe start zone, basic resources)            |
|      +--------------------------------------+     |
|      |           MIDDLE RING               |     |
|      |    (Contested, better resources)    |     |
|      |    +----------------------------+   |     |
|      |    |       INNER RING          |   |     |
|      |    |   (Dangerous, rich)       |   |     |
|      |    |    +------------------+   |   |     |
|      |    |    |     HEART       |   |   |     |
|      |    |    |   (50,50)       |   |   |     |
|      |    |    +------------------+   |   |     |
|      |    +----------------------------+   |     |
|      +--------------------------------------+     |
+--------------------------------------------------+
```

### Zone Definitions

| Zone | Distance from Center | Plots | % of Map |
|------|---------------------|-------|----------|
| **Heart** | 0-5 tiles | ~78 | 0.8% |
| **Inner Ring** | 6-20 tiles | ~1,178 | 11.8% |
| **Middle Ring** | 21-35 tiles | ~2,748 | 27.5% |
| **Outer Ring** | 36-50 tiles | ~5,996 | 59.9% |

*Distance calculated as maximum of |x-50| and |y-50| (Chebyshev distance)*

---

## ZONE CHARACTERISTICS

### The Heart (0-5 tiles from center)

**Lore:** Where Nemeth's heart beats beneath the stone.

| Attribute | Value |
|-----------|-------|
| **Terrain** | Titan-Touched only |
| **Resources** | 3× base generation |
| **Mana** | +25 per territory |
| **Combat** | All rolls +2 |
| **Building** | No walls allowed (Titan rejects fortification) |
| **Control Bonus** | +10 Domain Points per day (requires active defense) |

**Special:** Controlling the Heart at generation end = guaranteed Top 10 placement on Titan's Witness.

**Active Defense Requirement:** To earn Heart bonus, must have garrison present. Empty Heart territories generate no bonus.

### Inner Ring (6-20 tiles)

**Lore:** Saturated with Titan-blood, reality bends here.

| Attribute | Value |
|-----------|-------|
| **Terrain** | Mix of Titan-Touched (40%), Mountains (30%), other (30%) |
| **Resources** | 2× base generation |
| **Mana** | +10 per territory |
| **Combat** | Magic +20% effectiveness |
| **Building** | All buildings allowed |
| **Danger** | Random Titan events (storms, tremors) |

### Middle Ring (21-35 tiles)

**Lore:** Where empires clash and fortunes are made.

| Attribute | Value |
|-----------|-------|
| **Terrain** | Balanced distribution |
| **Resources** | 1.5× base generation |
| **Mana** | +5 per territory |
| **Combat** | Standard rules |
| **Building** | All buildings allowed |
| **Strategic** | Main battleground for territory control |

### Outer Ring (36-50 tiles)

**Lore:** The edges of the Domain, furthest from Nemeth's influence.

| Attribute | Value |
|-----------|-------|
| **Terrain** | Plains (50%), Forest (25%), Hills (15%), other (10%) |
| **Resources** | 1× base generation |
| **Mana** | Base only |
| **Combat** | Standard rules |
| **Building** | All buildings allowed |
| **Purpose** | Safe starting zone, expansion base |

---

## TERRAIN DISTRIBUTION

### Overall Map Composition

| Terrain | % of Map | Primary Zone | Effect |
|---------|----------|--------------|--------|
| **Plains** | 30% | Outer | Standard (1.0× all) |
| **Forest** | 18% | Outer/Middle | DEF +15%, SPD -20%, no cavalry bonus |
| **Hills** | 13% | Middle | DEF +20%, +1 attack roll |
| **Mountains** | 8% | Inner | DEF +30%, SPD -40%, no cavalry |
| **Swamp** | 6% | Scattered | SPD -50%, 1% daily attrition |
| **Desert** | 6% | Scattered | DEF -10%, 2× water consumption |
| **Titan-Touched** | 4% | Inner/Heart | All stats +10%, magic +20% |
| **Ocean/Water** | 15% | Scattered | **IMPASSABLE** - Must go around |

### Ocean & Water Tiles

Water tiles represent the shattered sea between continental fragments. They are **completely impassable** - no units can cross them.

**Strategic Purpose:**
- Creates natural chokepoints and borders
- Forces armies through predictable paths
- Protects flanks when positioned well
- Creates "island" regions within the continent

**Water Distribution:**
- Forms channels and straits between land masses
- Clusters into small seas (10-30 connected tiles)
- Never completely isolates any land region (always a path exists)
- More common toward map edges (continental fragmentation)

**Water Rules:**
- Cannot build on water
- Cannot move through water
- Cannot cast targeted spells across water (blocks line of sight)
- Divination spells CAN see across water
- No Forsaken spawn on water

```
Example: Water creating a chokepoint

[~][~][~][~][~][~][~]     ~ = Water
[P][P][P][.][~][~][~]     P = Player territory
[P][P][.][.][.][~][~]     . = Land (passage)
[P][.][.][.][.][.][~]
[~][~][.][.][.][E][E]     E = Enemy territory
[~][~][~][.][E][E][E]
[~][~][~][~][~][~][~]

Only path between P and E is through the narrow land bridge.
```

### Terrain Clusters

Terrain is **clustered**, not randomly distributed. This creates:
- Mountain ranges (natural borders)
- Forest regions (ambush zones)
- Desert expanses (resource-poor barriers)
- Fertile plains (population centers)

---

## PLAYER PLACEMENT

### Entry System

**Method:** Random placement within Outer Ring

**Pricing:**
| Option | Cost | Plots |
|--------|------|-------|
| **Free Tier** | $0 | 2 plots |
| **Premium** | $10 USDC | 10 plots |

**Process:**
1. Player claims plots (free or paid)
2. System assigns starting plot randomly in Outer Ring
3. Additional plots placed **adjacent** to first plot
4. Minimum 3 tiles between any two players' starting positions

### Placement Rules

| Rule | Description |
|------|-------------|
| **Outer Ring Only** | New players always start in Outer Ring |
| **Cluster Start** | All purchased plots are contiguous |
| **Separation** | Minimum 3 empty tiles between players at start |
| **No Reservations** | Cannot choose specific coordinates |
| **Edge Buffer** | No spawns within 2 tiles of map edge |

### Starting Plot Quality

All starting plots are guaranteed:
- Plains or Forest terrain (no harsh starts)
- No adjacent Forsaken villages (safe buffer)
- Buildable (no water/impassable)

### Example: 5-Plot Start

```
Player buys 5 plots. System assigns:

    [P][P]
    [P][P][P]

All connected, random position in Outer Ring.
```

---

## THE FORSAKEN (NPC VILLAGES)

### Concept

Empty plots aren't truly empty - they're occupied by **The Forsaken**: leaderless settlements that fell when their captains abandoned them. They provide:
- Targets for early expansion
- Resource income when conquered
- Buffer between players
- World feels alive, not empty

### Forsaken Density (Scales by Zone AND Day)

Base density varies by zone:

| Zone | Base Coverage | Day 1 | Day 25 | Day 50 |
|------|---------------|-------|--------|--------|
| **Outer Ring** | 15% | 0.6× | 1.0× | 1.4× |
| **Middle Ring** | 25% | 0.6× | 1.0× | 1.4× |
| **Inner Ring** | 35% | 0.6× | 1.0× | 1.4× |
| **Heart** | 50% | 0.6× | 1.0× | 1.4× |

**Scaling Logic:**
- Early game: Weaker Forsaken (60% strength) - helps new players expand
- Mid game: Standard strength (100%)
- Late game: Stronger Forsaken (140%) - world becomes more dangerous

### Forsaken Village Types

| Type | Frequency | Garrison | Resources |
|------|-----------|----------|-----------|
| **Hamlet** | 50% | 20-50 militia | Low |
| **Village** | 30% | 50-150 mixed | Medium |
| **Town** | 15% | 150-400 defenders | High |
| **Stronghold** | 5% | 400-1000 + walls | Very High |

### Forsaken Garrison (D20 Roll)

When attacking Forsaken, roll D20 for exact strength:

| Roll | Garrison Modifier |
|------|-------------------|
| 1-5 | 0.7× (weak) |
| 6-10 | 0.85× |
| 11-15 | **1.0×** (median) |
| 16-18 | 1.15× |
| 19-20 | 1.3× (strong) |

### Forsaken Loot (D20 Roll)

| Roll | Loot Modifier |
|------|---------------|
| 1-3 | 0.5× (picked clean) |
| 4-8 | 0.75× |
| 9-13 | **1.0×** (median) |
| 14-17 | 1.25× |
| 18-19 | 1.5× |
| 20 | 2.0× (hidden cache!) |

### Forsaken Respawn

- Forsaken do **NOT** respawn during a generation
- Once conquered, territory is yours (until another player takes it from you)
- Creates natural progression: early = easy Forsaken targets, late = player vs player conflict

---

## LEADERSHIP DECAY (INACTIVE PLAYERS)

### The Problem

Players who abandon the game leave dead territories that clutter the map and can't be meaningfully interacted with. Solution: **Leadership Decay**.

### Trust System

Every player-owned territory has a **Trust** value (0-100%). Trust represents the population's faith in their captain's leadership.

| Trust Level | Status | Effect |
|-------------|--------|--------|
| 100% | Loyal | Normal operation |
| 75-99% | Content | Normal operation |
| 50-74% | Uneasy | -10% resource production |
| 25-49% | Restless | -25% production, -15% garrison morale |
| 1-24% | Rebellious | -50% production, garrison may desert |
| 0% | **Revolt** | Territory becomes Forsaken |

### Trust Decay Rate

Trust decays when a player takes **no actions** in their territory.

| Inactivity Period | Trust Loss |
|-------------------|------------|
| Days 1-3 | 0 (grace period) |
| Days 4-7 | -5% per day |
| Days 8-14 | -10% per day |
| Days 15+ | -15% per day |

**Actions that reset inactivity timer:**
- Moving troops
- Building/upgrading
- Casting spells
- Attacking (anywhere)
- Collecting resources (manual claim)
- Any transaction from wallet

### Trust Recovery

Active players can recover Trust:

| Action | Trust Gained |
|--------|--------------|
| Garrison reinforcement | +5% |
| Building construction | +10% |
| Successful defense | +15% |
| Captain visits territory | +20% |
| Victory in any battle | +5% to all territories |

**Maximum recovery:** +25% per day (no instant fix for long absence)

### The Revolt (Trust = 0%)

When Trust hits 0%, the territory **revolts**:

1. All buildings remain (damaged to 50% HP)
2. Garrison converts to Forsaken militia
3. Territory becomes attackable NPC
4. Former owner loses all claim
5. Resources stockpiled are lost

**Revolt Garrison Strength:**
- Base: 50% of original garrison
- Bonus: +10% per building
- Type: Forsaken Village (if small) or Town (if developed)

### Cascade Prevention

To prevent chain collapses:
- Trust decay is calculated **per territory**, not globally
- Active territories don't decay even if others do
- Captain's "home" territory (most developed) decays 50% slower

### Warning System

Players receive warnings (if notification system exists):
- Day 3: "Your people grow restless in [Territory]"
- Day 7: "Trust is falling in [Territory] (XX%)"
- Day 10: "Revolt imminent in [Territory]!"
- Day 14+: Daily warnings until action or revolt

---

## GENERATION LIFECYCLE (50 DAYS)

### Phase 1: Planning Phase (Days 1-5)

**"The Preparation"**

| Mechanic | Status |
|----------|--------|
| Registration | **Open (Rolling)** |
| PvP Combat | **DISABLED** |
| Forsaken Attacks | Enabled |
| Building | Enabled |
| Scouting | Enabled |
| Alliances | Can form |

**Purpose:** Let players establish economy and plan strategy without immediate combat pressure.

### Phase 2: Early Generation (Days 6-20)

**"The Expansion"**

| Mechanic | Status |
|----------|--------|
| Registration | **Open (Rolling)** |
| PvP Combat | **ENABLED** |
| Forsaken | 60% strength (easier) |
| New Player Protection | 10 days attack immunity |

**Late Joiner Benefits:**
- 10-day attack immunity (can't be attacked by other players)
- Can attack Forsaken during protection
- +25% starting resources (catch-up mechanic)
- Protection ends early if player attacks another player

### Phase 3: Mid Generation (Days 21-35)

**"The Conflict"**

| Mechanic | Status |
|----------|--------|
| Registration | **Open (Rolling)** |
| All Combat | Enabled |
| Heart Control | Counts for scoring |
| Forsaken | 100% strength |
| Alliance Wars | Common |

**Purpose:** Main gameplay phase, territorial warfare.

### Phase 4: Late Generation (Days 36-50)

**"The Reckoning"**

| Mechanic | Status |
|----------|--------|
| Registration | **Open (Rolling)** |
| All Combat | Enabled |
| Heart Bonus | 2× Domain Points |
| Forsaken | 140% strength (harder) |
| Day 50 | **Heartbeat** |

**Purpose:** Final scramble for Heart control and leaderboard position.

### Phase 5: The Heartbeat (Day 50)

**"The Reset"**

| Event | Timing |
|-------|--------|
| Combat Freeze | All battles pause |
| Scoring Calculated | Final positions recorded |
| Titan's Witness Updated | Top players etched |
| Map Wipe | Everything destroyed |
| 24-hour Intermission | Server maintenance, celebration |

---

## BETWEEN GENERATIONS

### The Intermission (24-48 hours)

**What Happens:**
1. Final scores displayed
2. Titan's Witness ceremony (names added)
3. Rewards distributed (if any)
4. Map regenerated with new terrain seed
5. Registration for next generation opens

### What Carries Over

| Carries Over | Does NOT Carry Over |
|--------------|---------------------|
| Titan's Witness record | Territory |
| Account/wallet | Buildings |
| Historical stats | Units/armies |
| Achievements (if implemented) | Resources |
| | Captain (new each gen) |
| | Alliances |

### Returning Players

- No priority placement for veterans
- Same random assignment as new players
- Can choose different race each generation
- Fresh start, equal footing

---

## SCORING SYSTEM (DOMAIN POINTS)

### Point Sources

| Action | Points |
|--------|--------|
| **Territory Control** | 1 per plot per day |
| **Heart Control** | +10 per plot per day (with garrison) |
| **Inner Ring** | +5 per plot per day |
| **Middle Ring** | +2 per plot per day |
| **Forsaken Conquered** | 10-100 (by type) |
| **Player Territory Taken** | 25 + victim's accumulated points × 5% |
| **Battles Won** | 5-50 (by army size) |
| **Buildings Constructed** | 1-10 (by type) |

### Titan's Witness Qualification

| Rank | Requirement | Recognition |
|------|-------------|-------------|
| **Champion** | #1 Domain Points | Name in gold, permanent |
| **Conqueror** | Top 3 | Name in silver, permanent |
| **Warlord** | Top 10 | Name in bronze, permanent |
| **Notable** | Top 50 | Name listed, permanent |
| **Participant** | Top 100 | Mentioned in records |

### Tiebreakers

1. Most Heart control time
2. Most territory at generation end
3. Most battles won
4. Most Forsaken conquered
5. Earlier registration time

---

## MAP EVENTS (RANDOM)

### Titan Stirring

The Titan's dreams create random events throughout the generation.

| Event | Frequency | Effect | Zone |
|-------|-----------|--------|------|
| **Tremor** | Weekly | Buildings take 10% damage in area | Inner |
| **Blood Rain** | Bi-weekly | +50% mana generation for 24h | Random |
| **Nightmare Spawn** | Weekly | Forsaken reinforcements appear | Middle |
| **Dream Rift** | Monthly | Teleport portal between two points (24h) | Random |
| **Titan's Gaze** | Monthly | One territory revealed to all players | Heart |

### Event Roll (D20)

Each week, roll D20 for event intensity:

| Roll | Intensity |
|------|-----------|
| 1-10 | Minor event |
| 11-17 | Standard event |
| 18-19 | Major event |
| 20 | **Titan Stirs** - Multiple events cascade |

---

## SPECIAL LOCATIONS

### Fixed Locations (Same Every Generation)

| Location | Position | Effect |
|----------|----------|--------|
| **Nemeth's Heart** | (50,50) | Center of everything |
| **The Witness** | (50,45) | Monument, cannot be built on |
| **Four Pillars** | Corners of Heart zone | +25% to racial abilities |

### Generated Locations (Random Each Gen)

| Location | Count | Effect |
|----------|-------|--------|
| **Ley Lines** | 4-6 | Paths of +50% mana |
| **Titan Bones** | 8-12 | Ironveld building bonus |
| **Blood Pools** | 8-12 | Vaelthir spell bonus |
| **Nightmare Caves** | 6-10 | Korrath unit bonus |
| **Dream Groves** | 6-10 | Sylvaeth intel bonus |
| **Ash Fields** | 6-10 | Ashborn reformation bonus |
| **Wind Spires** | 6-10 | Breath-Born speed bonus |

---

## TECHNICAL IMPLEMENTATION

### Coordinate System

```
(0,0) -------- X --------> (99,0)
  |
  |
  Y
  |
  |
  v
(0,99)                    (99,99)
```

### Plot Data Structure

```
Plot {
  x: uint8 (0-99)
  y: uint8 (0-99)
  terrain: enum (7 types)
  zone: enum (4 zones)
  owner: address (0x0 = Forsaken/unclaimed)
  building: BuildingID (0 = none)
  garrison: uint32 (troop count)
  lastUpdate: timestamp
}
```

### Distance Calculation

```
// Chebyshev distance (for zone calculation)
zoneDistance = max(abs(x - 50), abs(y - 50))

// Manhattan distance (for movement)
moveDistance = abs(x1 - x2) + abs(y1 - y2)

// Travel time
hours = moveDistance × baseSpeed × terrainModifier
```

### Adjacency & Movement

Plots support **8-directional movement** (including diagonals):

```
[NW] [N] [NE]
[W]  [X]  [E]
[SW] [S] [SE]
```

| Direction | Movement Cost |
|-----------|---------------|
| Cardinal (N/S/E/W) | 1.0× |
| Diagonal (NE/NW/SE/SW) | 1.4× (√2 approximation) |

Diagonal movement allows faster traversal but costs slightly more travel time.

---

## BRIDGES

### Buildable Crossings

Bridges can be constructed across **1-2 tile water gaps** to create new passages.

### Bridge Construction

| Attribute | Value |
|-----------|-------|
| **Max Span** | 2 water tiles |
| **Build Cost** | 500 gold + 200 stone per tile |
| **Build Time** | 24h per tile |
| **HP** | 500 per tile (1,000 total for 2-tile) |
| **Requires** | Land on both ends you control |

### Bridge Rules

- Must connect two land tiles you own
- Only one bridge per water gap (no parallel bridges)
- Enemies CAN use your bridge (unless destroyed)
- Allies can use freely

### Bridge Destruction

**Bridges can be destroyed** - this is key to their strategic value.

| Method | Damage | Notes |
|--------|--------|-------|
| **Melee attack** | 50/unit/round | Must be adjacent |
| **Siege weapons** | 200/unit/round | Can target from 2 tiles |
| **Destruction spells** | Spell damage × 0.5 | Magic is less effective on stone |
| **Saboteur (Shadow Master)** | Instant destroy | Costs 50 mana, 24h cooldown |

### Bridge Repair

| Damage Level | Repair Cost | Repair Time |
|--------------|-------------|-------------|
| 75-99% HP | 100 gold | 4h |
| 50-74% HP | 200 gold | 8h |
| 25-49% HP | 350 gold | 16h |
| 1-24% HP | 450 gold | 20h |
| Destroyed | Full rebuild | 24h per tile |

### Strategic Implications

- **Offense:** Build a bridge to open a new attack route
- **Defense:** Destroy bridges to protect your flank
- **Siege:** Trap enemies on an island by destroying their only bridge
- **Alliance:** Share bridge access with allies (they can't destroy allied bridges)

---

## ALLIANCE TERRITORY MECHANICS

### The Hosting Problem

Troops stationed in **allied territory** require support from the host. This prevents indefinite parking of armies in friendly villages. Two universal costs apply to ALL races:

1. **Lodging Cost (Gold)** - Paid by host, universal
2. **Food Cost** - Paid by host, only for food-requiring races
3. **Foreign Soil Penalty** - Affects visiting troops over time

---

### Lodging Cost (Gold) - UNIVERSAL

**All visiting troops require lodging, regardless of race.** The host pays gold to house them.

| Visiting Army Size | Gold Cost/Day | Host Burden |
|--------------------|---------------|-------------|
| 1-50 troops | 25 gold | Light |
| 51-150 troops | 75 gold | Moderate |
| 151-300 troops | 175 gold | Heavy |
| 301-500 troops | 350 gold | Severe |
| 500+ troops | 500+ gold | Crushing |

**If host can't pay lodging:**
- Visiting troops forced to leave within 24h
- If not moved: troops take 5% attrition per day
- Host reputation with alliance decreases

**Note:** This applies even when food-free races host each other. Ironveld hosting Ashborn still pays gold.

---

### Food Cost - RACE DEPENDENT

**Only applies when hosting troops from food-requiring races.**

Food rates by race (see RACES.md):
- Ashborn: 0% (no food needed)
- Ironveld: 50%
- Breath-Born: 70%
- Sylvaeth: 80%
- Vaelthir: 100%
- Korrath: 100%

| Visiting Army Size | Food Cost/Day (100% rate) |
|--------------------|---------------------------|
| 1-50 troops | 10 food |
| 51-150 troops | 35 food |
| 151-300 troops | 80 food |
| 301-500 troops | 150 food |
| 500+ troops | 250+ food |

**Food-Free Hosts (hosting food-requiring troops):**
- Must pay 2× gold lodging cost instead
- The food-free economy doesn't produce food, so they compensate with gold
- Example: Ashborn hosting 100 Korrath troops = 75 gold (lodging) + 75 gold (food substitute) = 150 gold/day

---

### Foreign Soil Penalty - UNIVERSAL

**Troops stationed outside their owner's territory slowly lose effectiveness.** This prevents indefinite parking even with full payment.

| Days on Foreign Soil | Penalty |
|---------------------|---------|
| 1-3 days | None (grace period) |
| 4-7 days | -5% ATK/DEF |
| 8-14 days | -15% ATK/DEF |
| 15-21 days | -25% ATK/DEF, -5% morale/day |
| 22+ days | -35% ATK/DEF, -10% morale/day, 2% desertion/day |

**Resetting the Timer:**
- Return troops to ANY territory you own = timer resets
- Troops only need to touch home soil briefly
- Engaging in combat does NOT reset timer

**Race Exception - Sylvaeth:**
- Foreign Soil Penalty kicks in 7 days later (diplomats)
- Grace period: 10 days instead of 3

---

### Alliance Betrayal

**Public consequences for breaking alliances:**

| Consequence | Effect |
|-------------|--------|
| **Traitor Board** | Name displayed publicly for entire generation |
| **Recruitment Penalty** | +25% cost to train new troops |
| **Trust Penalty** | -50% alliance trust with all other players |
| **Evacuation** | Visiting troops have 24h to leave |

**Narrative:** Word spreads that you cannot be trusted. Soldiers are reluctant to serve under a traitor's banner.

---

### The AOE Risk

**More troops = bigger target for spells.**

| Troops in Territory | AOE Spell Bonus |
|--------------------|-----------------|
| 1-100 | Standard damage |
| 101-250 | +15% spell damage |
| 251-500 | +30% spell damage |
| 501-1000 | +50% spell damage |
| 1000+ | +75% spell damage |

### Food Stockpiling

Villages can **stockpile food** in advance of major battles:

| Storage | Capacity | Build Cost | Build Time |
|---------|----------|------------|------------|
| **Base** | 100 food | Free | - |
| **Granary** | +300 food | 200 gold | 12h |
| **Warehouse** | +200 food | (in buildings) | - |
| **War Stockpile** | +500 food | 400 gold | 24h |

**Max Stockpile:** 1,100 food (with all storage buildings)

---

## SUMMARY

| Aspect | Decision |
|--------|----------|
| **Size** | 100×100 (10,000 plots) |
| **Placement** | Random in Outer Ring |
| **NPC Villages** | 15-50% of empty plots (scales with day/zone) |
| **Entry Fee** | Free (2 plots) or $10 USDC (10 plots) |
| **Generation** | 50 days |
| **Planning Phase** | Days 1-5 (no PvP) |
| **Rolling Registration** | Join anytime |
| **Late Joiner Protection** | 10 days attack immunity |
| **Heart Bonus** | 10× (requires active defense) |
| **Intermission** | 24-48 hours |
| **Scoring** | Domain Points → Titan's Witness |

---

## OPEN QUESTIONS

1. Naval units in future expansion?
2. Alliance formal structure (guilds, federations)?
3. Trade routes between allies?

---

*Document Status: Updated for 50-day generation with rolling registration*
*Late joiner protection and Forsaken scaling added*
