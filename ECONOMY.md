# Nemeths Domain - Economic Balance

## OVERVIEW

This document defines the complete economic model for a **50-day generation**. All numbers are tuned for a moderately active player to feel competitive.

**Design Goals:**
- Day 1 player can do meaningful things immediately
- Active players pull ahead, but not insurmountably
- No single dominant strategy
- Resources feel valuable, not infinite
- Catch-up mechanics for late joiners

---

## RESOURCES

### Five Core Resources

| Resource | Primary Use | Generation | Storage |
|----------|-------------|------------|---------|
| **Gold** | Everything | Buildings, loot, trade | Unlimited |
| **Stone** | Buildings, walls | Mines | 5,000 base |
| **Wood** | Buildings, siege | Lumber Mills | 5,000 base |
| **Food** | Unit upkeep | Farms | 2,000 base |
| **Mana** | Spells | Mage structures | 50-200 |

### Starting Resources

| Entry Tier | Gold | Stone | Wood | Food |
|------------|------|-------|------|------|
| **Free (2 plots)** | 1,000 | 400 | 400 | 200 |
| **Premium (10 plots)** | 5,000 | 2,000 | 2,000 | 1,000 |
| **Late Joiner Bonus** | +25% | +25% | +25% | +25% |

---

## ENTRY ECONOMY

### Plot Pricing

| Option | Cost | Plots |
|--------|------|-------|
| **Free Tier** | $0 | 2 plots |
| **Premium** | $10 USDC | 10 plots |

### Entry Benefits by Tier

| Tier | Plots | Resources | Strategic Position |
|------|-------|-----------|-------------------|
| Free | 2 | Basic | Can compete, slower start |
| Premium | 10 | Full | Strong start, more options |

### Late Joiner Benefits

| Day Joined | Attack Protection | Bonus Resources |
|------------|-------------------|-----------------|
| Days 1-5 | 5 days (planning phase) | Standard |
| Days 6-20 | 10 days | +25% |
| Days 21-35 | 10 days | +25% |
| Days 36-50 | 10 days | +25% |

---

## RESOURCE GENERATION

### Base Production (Per Building Per Day)

| Building | Gold | Stone | Wood | Food |
|----------|------|-------|------|------|
| **Farm** | - | - | - | 50 |
| **Mine** | 40 | 40 | - | - |
| **Lumber Mill** | - | - | 40 | - |
| **Market** | 100 | - | - | - |

### Zone Multipliers

| Zone | Production Multiplier |
|------|----------------------|
| Outer Ring | 1.0× |
| Middle Ring | 1.5× |
| Inner Ring | 2.0× |
| Heart | 3.0× |

### Race Production Modifiers

| Race | Modifier | Notes |
|------|----------|-------|
| Ironveld | +15% mine | Building specialists |
| Vaelthir | +30% mana | Magic specialists |
| Korrath | +30% loot | Raiding specialists |
| Sylvaeth | +10% all | Trade bonuses |
| Ashborn | -15% all | Cursed land penalty |
| Breath-Born | Standard | No bonus or penalty |

---

## FOOD ECONOMY (UPDATED)

### Food Consumption by Race

| Race | Food Rate | Effect |
|------|-----------|--------|
| **Ashborn** | 0% | No food required |
| **Ironveld** | 50% | Half food consumption |
| **Breath-Born** | 70% | Reduced consumption |
| **Sylvaeth** | 80% | Slightly reduced |
| **Vaelthir** | 100% | Full consumption |
| **Korrath** | 100% | Full consumption |

### Food Consumption by Army Size (100% Rate)

| Army Size | Food/Day | Classification |
|-----------|----------|----------------|
| 1-50 | ~50 | Garrison |
| 51-150 | ~150 | Raiding party |
| 151-300 | ~300 | Army |
| 301-500 | ~500 | Legion |
| 500+ | 750+ | Horde |

### Food Sustainability Check

**Can Korrath (100% food) sustain 200 units?**
- 200 units = ~200 food/day
- 4 Farms in Middle Ring = 300 food/day
- **Surplus: 100 food/day**

**Can Ironveld (50% food) sustain 200 units?**
- 200 units × 50% = 100 food/day
- 2 Farms in Middle Ring = 150 food/day
- **Surplus: 50 food/day**

**Can Ashborn (0% food) sustain 200 units?**
- 200 units × 0% = 0 food/day
- **No farms needed**

**Conclusion:** Food consumption spectrum creates distinct economic profiles.

---

## BUILDING COSTS (14 BUILDINGS)

### Resource Buildings (4)

| Building | Gold | Stone | Wood | Build Time |
|----------|------|-------|------|------------|
| Farm | 100 | 50 | 50 | 4h |
| Mine | 150 | 75 | - | 6h |
| Lumber Mill | 150 | - | 75 | 6h |
| Market | 300 | 100 | - | 8h |

### Military Buildings (4)

| Building | Gold | Stone | Wood | Build Time |
|----------|------|-------|------|------------|
| Barracks | 200 | 100 | 100 | 6h |
| War Hall | 400 | 200 | - | 10h |
| Siege Workshop | 500 | - | 300 | 12h |
| Armory | 350 | 150 | - | 8h |

### Defense Buildings (3)

| Building | Gold | Stone | Wood | Build Time |
|----------|------|-------|------|------------|
| Wall | 400 | 500 | - | 12h |
| Watchtower | 150 | 100 | 100 | 4h |
| Gate | 250 | 200 | - | 6h |

### Magic Buildings (2)

| Building | Gold | Stone | Wood | Build Time |
|----------|------|-------|------|------------|
| Mage Tower | 400 | 200 | - | 10h |
| Shrine | 200 | 150 | - | 6h |

### Utility Buildings (1)

| Building | Gold | Stone | Wood | Build Time |
|----------|------|-------|------|------------|
| Warehouse | 250 | 150 | 150 | 6h |

---

## UNIT COSTS (21 UNIT TYPES)

### Ironveld (50% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Stoneshield (Defender) | 30 | 0.5 | 1h |
| Hammerer (Attacker) | 45 | 0.5 | 1.5h |
| Siege Anvil (Elite) | 100 | 1 | 3h |

### Vaelthir (100% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Blood Warden (Defender) | 40 | 1 | 1h |
| Crimson Blade (Attacker) | 50 | 1 | 1.5h |
| Magister (Elite) | 120 + 50 mana | 2 | 3h |

### Korrath (100% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Warshield (Defender) | 25 | 1 | 1h |
| Rageborn (Attacker) | 35 | 2 | 1.5h |
| Warchief (Elite) | 90 | 3 | 3h |

### Sylvaeth (80% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Veilguard (Defender) | 35 | 0.8 | 1h |
| Fade Striker (Attacker) | 45 | 0.8 | 1.5h |
| Dream Weaver (Elite) | 80 + 30 mana | 0.8 | 3h |

### Ashborn (0% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Cinder Guard (Defender) | 35 | 0 | 1h |
| Ash Striker (Attacker) | 40 | 0 | 1.5h |
| Pyre Knight (Elite) | 85 | 0 | 3h |

### Breath-Born (70% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Gale Guard (Defender) | 30 | 0.7 | 1h |
| Zephyr (Attacker) | 40 | 0.7 | 1.5h |
| Storm Herald (Elite) | 95 | 1.4 | 3h |

### Siege Weapons (Universal, 0% Food)

| Unit | Gold | Food/Day | Train Time |
|------|------|----------|------------|
| Battering Ram | 100 | 0 | 4h |
| Catapult | 200 | 0 | 6h |
| Trebuchet | 400 | 0 | 8h |

---

## MANA ECONOMY

### Mana Generation

| Source | Mana/Day |
|--------|----------|
| Base | 10 |
| Mage Tower | +20 |
| Shrine | +10 |
| Titan-Touched territory | +10 |
| Heart territory | +25 |
| Vaelthir bonus | +30% total |

### Mana Costs by Spell Tier

| Tier | Mana Cost | Example Spells |
|------|-----------|----------------|
| 1 | 10-20 | Firebolt, Shield, Scry |
| 2 | 25-40 | Lightning, Stone Skin |
| 3 | 50-80 | Fireball, Mass Panic |
| 4 | 100-150 | Titan's Wrath |

---

## PROGRESSION TIMELINE (50 DAYS)

### Planning Phase (Days 1-5)

| Goal | Achievable |
|------|------------|
| 2-3 buildings | Yes |
| 30-50 unit garrison | Yes |
| First Forsaken conquest | Day 3-4 |
| Basic resource income | Day 2 |

**Typical Day 5 Status:**
- 3-5 territories
- 50-100 units
- 200 gold/day income
- Ready for combat phase

### Early Generation (Days 6-20)

| Goal | Achievable |
|------|------------|
| 8-12 territories | Yes |
| 150-200 units | Yes |
| First player conflict | Day 6+ |
| Alliance formed | Day 8-12 |

**Typical Day 20 Status:**
- 10-15 territories
- 200-300 units
- 500+ gold/day income
- Walls on key territories

### Mid Generation (Days 21-35)

| Goal | Achievable |
|------|------------|
| Middle Ring control | Contested |
| 300+ units | Yes |
| Inner Ring foothold | Day 30+ |
| Major alliance war | Likely |

**Typical Day 35 Status:**
- 20-30 territories
- 400-600 units
- Multiple fronts active
- Pushing toward center

### Late Generation (Days 36-50)

| Goal | Achievable |
|------|------------|
| Inner Ring control | Top players |
| Heart territory | Top 5 players |
| 600+ units | Possible |
| Titan's Witness | Day 45+ positioning |

**Typical Day 50 Status (Competitive):**
- 30-50 territories
- 500-800 units
- Fighting for Heart
- Final push for points

---

## RACE ECONOMIC PROFILES

### Ironveld (Turtle Economy)

| Aspect | Value |
|--------|-------|
| Food cost | 50% (major advantage) |
| Building bonus | +15% mine output |
| Unit upkeep | Very low |
| Weakness | -25% movement speed |

**Strategy:** Build up, fortify, sustain larger armies cheaply.

### Vaelthir (Burst Economy)

| Aspect | Value |
|--------|-------|
| Food cost | 100% |
| Mana bonus | +30% |
| Unit cost | +15% gold |
| Weakness | -20% DEF |

**Strategy:** Invest in magic, fewer but stronger units, decisive strikes.

### Korrath (Raid Economy)

| Aspect | Value |
|--------|-------|
| Food cost | 100% |
| Loot bonus | +30% |
| Blood Frenzy | +10% ATK after attacking |
| Weakness | -10% DEF when stationary |

**Strategy:** Constant raiding, loot funds expansion, aggressive playstyle.

### Sylvaeth (Intel Economy)

| Aspect | Value |
|--------|-------|
| Food cost | 80% |
| Intel | Always accurate |
| Production | +10% |
| Weakness | -30% ATK, no siege |

**Strategy:** Trade intel, play kingmaker, support allies.

### Ashborn (Attrition Economy)

| Aspect | Value |
|--------|-------|
| Food cost | 0% (major advantage) |
| Production | -15% |
| Reformation | 25% units return |
| Weakness | No healing |

**Strategy:** Survive early game, win through attrition, grow via combat.

### Breath-Born (Mobility Economy)

| Aspect | Value |
|--------|-------|
| Food cost | 70% |
| Speed | +15% movement |
| Evasion | 20% chance |
| Weakness | 1% building decay/day |

**Strategy:** Mobile raiders, hit-and-run, don't overextend.

---

## CATCH-UP MECHANICS

### For Late Joiners

| Mechanic | Effect |
|----------|--------|
| 10-day protection | Can't be attacked by players |
| +25% resources | Catch-up boost |
| Forsaken available | Weaker targets still exist |
| Alliance value | Established players want allies |

### For Losing Players

| Mechanic | Effect |
|----------|--------|
| Inner Ring Forsaken | Valuable late-game targets |
| Raiding profitable | Steal from winners |
| Guerrilla warfare | Disrupt without holding |
| Kingmaker role | Decide who wins |

### Anti-Snowball Mechanics

| Mechanic | Effect |
|----------|--------|
| Overextension | Large empires hard to defend |
| AOE spell scaling | Massed troops = bigger target |
| Leadership decay | Inactive territories revolt |
| Food drain | Large armies expensive |
| Forsaken scaling | 140% strength late game |

---

## ALLIANCE HOSTING ECONOMY

### Lodging Cost (Gold) - UNIVERSAL

| Visiting Army Size | Gold/Day |
|--------------------|----------|
| 1-50 | 25 |
| 51-150 | 75 |
| 151-300 | 175 |
| 301-500 | 350 |
| 500+ | 500+ |

### Food Cost - RACE DEPENDENT

Scaled by visitor's food rate:
- Ashborn visitors: 0 food
- Ironveld visitors: 50% of base food
- Breath-Born visitors: 70% of base food
- Sylvaeth visitors: 80% of base food
- Vaelthir/Korrath visitors: 100% of base food

### Food-Free Host Penalty

When a food-free host (Ashborn) hosts food-requiring troops, pay **2× lodging** as substitute.

### Foreign Soil Penalty

| Days Away | Penalty |
|-----------|---------|
| 1-3 | None |
| 4-7 | -5% ATK/DEF |
| 8-14 | -15% ATK/DEF |
| 15-21 | -25% ATK/DEF |
| 22+ | -35% ATK/DEF, desertion |

---

## ECONOMIC CONSTANTS

### Entry

| Constant | Value |
|----------|-------|
| Free plots | 2 |
| Premium price | $10 USDC |
| Premium plots | 10 |
| Late joiner bonus | +25% resources |

### Production

| Constant | Value |
|----------|-------|
| Farm output | 50 food/day |
| Mine output | 40 gold + 40 stone/day |
| Lumber Mill | 40 wood/day |
| Market | 100 gold/day |

### Unit Costs (Average)

| Constant | Value |
|----------|-------|
| Defender | ~30 gold, 1h |
| Attacker | ~45 gold, 1.5h |
| Elite | ~90 gold, 3h |
| Siege | 100-400 gold, 4-8h |

### Mana

| Constant | Value |
|----------|-------|
| Base regen | 10/day |
| Base cap | 50 |
| Max cap | 200 |

---

*Document Status: Updated for 50-day generation*
*Food consumption spectrum implemented*
*Simplified to 14 buildings, 21 unit types*
