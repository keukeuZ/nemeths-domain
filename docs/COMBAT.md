# Nemeths Domain - Combat System

## DESIGN PHILOSOPHY

Combat in Nemeth's Domain uses **weighted D20 rolls** where median outcomes happen most often, but dramatic swings (critical success/failure) keep battles exciting. The system rewards tactical preparation while preserving meaningful randomness.

**Core Principles:**
- Median outcomes occur ~40-50% of the time
- Extreme outcomes (crits) occur ~10% of the time
- Preparation > luck, but luck can turn the tide
- Defender has slight advantage (home territory)
- Large armies are more "stable" (less variance)

---

## BATTLE PHASES

### Phase 1: Pre-Battle Setup
1. **Attacker declares target** (via commit-reveal)
2. **Attacker selects path** (route through territories)
3. **Travel time calculated** (based on SPD and distance)
4. **Defender receives warning** (based on scouting/intel)
5. **Both sides can reinforce** until battle begins

### Phase 2: Initiative
- Both armies roll D20 for initiative
- Winner chooses: **Strike First** or **Defend First**
- Ties: Defender wins (home advantage)

### Phase 3: Combat Rounds
- Battles resolve in **3 rounds**
- Each round: both armies deal simultaneous damage
- Casualties removed at end of each round
- Battle ends early if one side is eliminated

### Phase 4: Resolution
- Victor determined (army remaining)
- Loot calculated
- Territory changes hands (if applicable)
- Race abilities trigger (Reformation, Curse Spread, etc.)

---

## CORE COMBAT FORMULA

### Attack Roll (Per Round)

```
Base Damage = (Total ATK × Attack Roll Modifier) - (Total DEF × Defense Roll Modifier)
```

### The Attack Roll Table (Weighted D20)

| Roll | Modifier | Probability | Meaning |
|------|----------|-------------|---------|
| 1 | 0.50× | 5% | Critical Failure - Half damage |
| 2-4 | 0.70× | 15% | Poor Attack - 70% damage |
| 5-8 | 0.85× | 20% | Below Average - 85% damage |
| 9-12 | **1.00×** | **20%** | **Median - Full damage** |
| 13-16 | 1.10× | 20% | Above Average - 110% damage |
| 17-19 | 1.25× | 15% | Strong Attack - 125% damage |
| 20 | 1.50× | 5% | Critical Hit - 150% damage |

**Expected Modifier: 1.00×** (weighted average)

### The Defense Roll Table (Weighted D20)

| Roll | Modifier | Probability | Meaning |
|------|----------|-------------|---------|
| 1 | 0.50× | 5% | Critical Failure - Half defense |
| 2-4 | 0.75× | 15% | Walls Crumble - 75% defense |
| 5-8 | 0.90× | 20% | Shaky Defense - 90% defense |
| 9-12 | **1.00×** | **20%** | **Median - Full defense** |
| 13-16 | 1.10× | 20% | Solid Defense - 110% defense |
| 17-19 | 1.20× | 15% | Iron Wall - 120% defense |
| 20 | 1.40× | 5% | Perfect Defense - 140% defense |

**Expected Modifier: 1.00×** (weighted average)

---

## DAMAGE CALCULATION

### Step-by-Step Example

**Attacker Army:**
- 100 Footmen (ATK 8, HP 15) = 800 ATK
- 50 Archers (ATK 12, HP 10) = 600 ATK
- **Total ATK: 1,400**

**Defender Army:**
- 80 Footmen (DEF 6) = 480 DEF
- 40 Spearmen (DEF 10) = 400 DEF
- 20 Knights (DEF 12) = 240 DEF
- **Total DEF: 1,120**

**Round 1:**
- Attacker rolls 14 → 1.10× modifier
- Defender rolls 7 → 0.90× modifier

```
Effective ATK = 1,400 × 1.10 = 1,540
Effective DEF = 1,120 × 0.90 = 1,008
Net Damage = 1,540 - 1,008 = 532 damage to defender
```

### Distributing Casualties

Damage is distributed proportionally across unit types, with **frontline units taking more**:

**Damage Distribution (Defender):**
| Position | Unit Type | Weight | Damage Share |
|----------|-----------|--------|--------------|
| Frontline | Infantry, Cavalry | 50% | Takes 50% of damage |
| Midline | Ranged, Support | 35% | Takes 35% of damage |
| Backline | Siege, Casters | 15% | Takes 15% of damage |

**Casualty Calculation:**
```
Units Lost = Damage Received ÷ Unit HP (rounded down)
```

From our example (532 damage to defender):
- Frontline (Footmen, Knights): 266 damage → 266 ÷ 15 = 17 Footmen lost
- Midline: 186 damage → split among ranged
- Backline: 80 damage → siege equipment

---

## ARMY SIZE STABILITY

Larger armies have more **predictable outcomes** (law of large numbers).

### Variance Modifier

| Army Size | Variance |
|-----------|----------|
| 1-50 units | High (±30% swing possible) |
| 51-200 units | Medium (±20% swing) |
| 201-500 units | Low (±10% swing) |
| 500+ units | Very Low (±5% swing) |

**Implementation:** Small armies roll more dice, larger armies use averaged rolls.

---

## ADVANTAGE & DISADVANTAGE

Borrowed from D&D 5e - when you have **Advantage**, roll twice and take the better result. **Disadvantage** means roll twice, take worse.

### Sources of Advantage (Attack)

| Source | Condition |
|--------|-----------|
| **Surprise Attack** | Defender had no warning |
| **High Ground** | Attacking from elevated terrain |
| **Flanking** | Allied army attacks same target |
| **Captain Ability** | Battle Tactician's "Tactical Mastery" |
| **Intel Accuracy** | Sylvaeth 95%+ intel on target |
| **War Drums** | Korrath morale effect |
| **Prophet's Gambit** | Oracle correctly predicted attack |

### Sources of Advantage (Defense)

| Source | Condition |
|--------|-----------|
| **Fortified** | Defending in territory with Walls |
| **Home Territory** | Defending your own land |
| **Prepared Defense** | 4+ hours warning |
| **Captain Ability** | Shield Marshal's abilities |
| **Ambush** | Sylvaeth counter-ambush ability |

### Sources of Disadvantage

| Source | Condition |
|--------|-----------|
| **Exhausted** | Attacked immediately after long march |
| **Flanked** | Enemy attacks from multiple sides |
| **Low Morale** | Below 50% army strength |
| **Curse Spread** | Ashborn curse active on army |
| **Windshear** | Breath-Born delay effect active |
| **Night Attack** | Without night-vision units |
| **Enemy Territory** | Attacking through hostile land |

---

## CRITICAL HITS & FAILURES

### Natural 20 - Critical Hit

When attack roll is natural 20:
- **Damage: 1.50×** (as shown in table)
- **Bonus Effect:** One of the following (D6):
  1. **Morale Break:** Enemy loses additional 10% troops (desertion)
  2. **Commander Wounded:** Enemy captain must make death save
  3. **Banner Captured:** +25% loot from battle
  4. **Rout:** Surviving enemies cannot counterattack this round
  5. **Breakthrough:** Ignore 50% of wall defense bonus
  6. **Inspiration:** Your army gains Advantage next round

### Natural 1 - Critical Failure

When attack roll is natural 1:
- **Damage: 0.50×** (as shown in table)
- **Penalty Effect:** One of the following (D6):
  1. **Friendly Fire:** Deal 10% damage to own troops
  2. **Commander Exposed:** Your captain must make death save
  3. **Supply Loss:** Lose 20% of potential loot
  4. **Disarray:** Enemy gains Advantage next round
  5. **Broken Siege:** Siege weapons deal no damage this round
  6. **Panic:** 5% of your army flees

---

## TERRAIN MODIFIERS

### Terrain Types

| Terrain | ATK Modifier | DEF Modifier | SPD Modifier | Special |
|---------|--------------|--------------|--------------|---------|
| **Plains** | 1.00× | 1.00× | 1.00× | Standard |
| **Forest** | 0.90× | 1.15× | 0.80× | Cavalry -20% ATK |
| **Hills** | 0.95× | 1.20× | 0.85× | High ground: +1 to attack roll |
| **Mountains** | 0.80× | 1.30× | 0.60× | No cavalry |
| **Swamp** | 0.85× | 1.00× | 0.50× | Disease: 1% daily losses |
| **Desert** | 1.00× | 0.90× | 0.90× | Water consumption 2× |
| **Titan-Touched** | 1.10× | 1.10× | 1.00× | Magic +20% |
| **Heart Territory** | 1.25× | 1.25× | 1.00× | All rolls +2 |

### Building Defense Bonuses

| Structure | DEF Bonus | Special |
|-----------|-----------|---------|
| **Wall (Tier 1)** | +200 flat | Requires siege to damage |
| **Wall (Tier 2)** | +500 flat | Siege damage -20% |
| **Fortress (Tier 3)** | +1000 flat | Siege damage -40%, garrison heals |
| **Watchtower** | +0 | Early warning (+2h), vision range |
| **Gate** | +100 | Allows controlled access |

---

## SIEGE MECHANICS

### Attacking Fortified Positions

Walls and Fortresses require **siege weapons** to damage efficiently.

**Without Siege:**
- Infantry/Cavalry deal **10%** damage to walls
- Magic deals **50%** damage to walls
- Siege is effectively impossible

**With Siege:**
- Catapults deal **100%** damage to walls
- Trebuchets deal **150%** damage to walls
- Battering Rams deal **200%** damage to gates specifically

### Siege Attack Roll Table

| Roll | Result | Probability |
|------|--------|-------------|
| 1-3 | Miss - 0 damage | 15% |
| 4-7 | Glancing - 50% damage | 20% |
| 8-13 | **Solid Hit - 100%** | **30%** |
| 14-17 | Strong Hit - 125% | 20% |
| 18-19 | Breach - 150% + wall section falls | 10% |
| 20 | Catastrophic - 200% + garrison takes splash | 5% |

### Wall HP System

| Structure | HP | Rebuild Time |
|-----------|-----|--------------|
| Wall (Tier 1) | 1,000 | 24 hours |
| Wall (Tier 2) | 3,000 | 48 hours |
| Fortress (Tier 3) | 8,000 | 72 hours |
| Gate | 500 | 12 hours |

---

## RACE COMBAT MODIFIERS

### Racial Bonuses Applied

| Race | Combat Bonus | Combat Penalty |
|------|--------------|----------------|
| **Ironveld** | Structures +50% HP | Army SPD -15% |
| **Vaelthir** | Magic damage +25% | Physical DEF -20% |
| **Korrath** | ATK +35% (Blood Frenzy) | None (aggression is their defense) |
| **Sylvaeth** | Counter-ambush (auto-Advantage if scouted) | ATK -30% |
| **Ashborn** | Reformation/Curse after battle | Cannot be healed |
| **Breath-Born** | Evasion (10% attacks miss) | DEF -25% when stationary |

### Post-Battle Race Abilities

**Ashborn - Reformation (D20)**
| Roll | Troops Returned |
|------|-----------------|
| 1-3 | 10% |
| 4-7 | 12% |
| 8-13 | **15%** |
| 14-17 | 17% |
| 18-20 | 20% |

*Ashborn +2 bonus: Treat roll as +2 higher*

**Ashborn - Curse Spread (D20)**
| Roll | Enemy Dead Converted |
|------|---------------------|
| 1-3 | 3% |
| 4-7 | 5% |
| 8-13 | **7%** |
| 14-17 | 9% |
| 18-20 | 12% |

*Ashborn +2 bonus: Treat roll as +2 higher*

**Korrath - Enslaver (D20)**
| Roll | Prisoners Enslaved |
|------|-------------------|
| 1-3 | 5% |
| 4-7 | 7% |
| 8-13 | **10%** |
| 14-17 | 12% |
| 18-20 | 15% |

*Slaves operate at 80% effectiveness*

---

## CAPTAIN COMBAT INFLUENCE

### Captain Death Saves

When a captain's army is defeated (or critical hit triggers), they must make a **death save**:

| Roll | Result |
|------|--------|
| 1-9 | **Death** - Captain lost for this generation |
| 10-20 | **Survival** - Captain escapes, wounded (24h recovery) |

**Modifiers:**
- Ashborn: +2 to roll
- Warlord class: +2 to roll
- Tier 3 skill "Last Stand": +3 to roll
- Fortress defender: +2 to roll

### Captain Combat Abilities (Examples)

**Warlord - Conqueror Path:**
- Vanguard Strike: First round ATK +20%
- Intimidating Presence: Enemy morale -10%

**Warlord - Shield Marshal Path:**
- Hold the Line: DEF +25% first round
- Unbreakable: Immune to morale break

**Archmage - Elementalist Path:**
- Firestorm: AOE damage, ignores 50% DEF
- Chain Lightning: Hits 3 units, diminishing damage

**Shadow Master - Assassin Path:**
- Target Commander: 15% chance to force enemy captain death save
- Poison Blades: Damage over time (3 rounds)

---

## MORALE SYSTEM

### Army Morale

Armies have a **Morale** value that affects combat effectiveness:

| Morale | Effect |
|--------|--------|
| 100% (Fresh) | No modifier |
| 75-99% | No modifier |
| 50-74% | -10% ATK/DEF |
| 25-49% | -25% ATK/DEF, 5% desert per round |
| 1-24% | -50% ATK/DEF, 15% desert per round |
| 0% | **Rout** - Army flees, battle ends |

### Morale Triggers

| Event | Morale Change |
|-------|---------------|
| Win round decisively (2:1 casualties) | +10% |
| Lose round decisively | -15% |
| Captain killed | -30% |
| Critical hit received | -10% |
| Critical hit dealt | +10% |
| Reinforcements arrive | +20% |
| Ally army joins battle | +15% |
| Surrounded/flanked | -20% |
| Korrath War Drums | Enemy -15% (before battle) |

---

## BATTLE DURATION & RESOLUTION

### Round Timing

- **Each round = 1 hour** of in-game time
- **Maximum 3 rounds** per battle
- If no victor after 3 rounds: **Stalemate**

### Stalemate Resolution

When neither side is eliminated after 3 rounds:
1. Army with more remaining HP% wins
2. Winner takes territory (if attacking)
3. Loser retreats to nearest friendly territory
4. No loot for either side

### Retreat Mechanics

An army can **retreat** at any time:
- Costs 1 round of movement (enemy gets free attack)
- Retreating army takes 25% casualties
- Cannot retreat if surrounded

---

## LOOT & REWARDS

### Victory Loot Table (D20)

| Roll | Loot Multiplier | Probability |
|------|-----------------|-------------|
| 1-3 | 0.50× | 15% |
| 4-7 | 0.75× | 20% |
| 8-13 | **1.00×** | **30%** |
| 14-17 | 1.25× | 20% |
| 18-19 | 1.50× | 10% |
| 20 | 2.00× (Jackpot) | 5% |

**Base Loot:**
- Gold: 10% of enemy army's total cost
- Resources: Based on territory type
- Equipment: 5% chance per 100 enemy units

**Korrath Bonus:** +25% to all loot

### Razing Rewards (Destroying Buildings)

| Building Tier | Gold Return | Resource Return |
|---------------|-------------|-----------------|
| Tier 1 | 25% of build cost | 15% of materials |
| Tier 2 | 20% of build cost | 10% of materials |
| Tier 3 | 15% of build cost | 5% of materials |

**Korrath Bonus:** +50% razing rewards

---

## COMBAT EXAMPLE: FULL BATTLE

### Setup

**Attacker: Korrath Warband**
- 200 Footmen (ATK 8, HP 15)
- 100 Rageborn (ATK 18, HP 12) - Race special
- 50 Archers (ATK 12, HP 10)
- Captain: Warlord (Conqueror)
- **Total ATK: 3,800** (×1.15 Korrath bonus = 4,370)

**Defender: Ironveld Garrison**
- 150 Footmen (ATK 8, DEF 6, HP 15)
- 100 Spearmen (ATK 6, DEF 10, HP 12)
- 50 Stoneguard (ATK 6, DEF 18, HP 20) - Race special
- Wall (Tier 2): +500 DEF
- Captain: Warlord (Shield Marshal)
- **Total DEF: 2,800 + 500 = 3,300**

### Round 1

**Initiative:**
- Korrath rolls 15, Ironveld rolls 8
- Korrath chooses: Strike First

**Attack Roll:** Korrath rolls 11 → 1.00× modifier
**Defense Roll:** Ironveld rolls 16 → 1.10× modifier (Shield Marshal: +1)

```
Effective ATK: 4,370 × 1.00 = 4,370
Effective DEF: 3,300 × 1.10 = 3,630
Net Damage: 4,370 - 3,630 = 740 damage to Ironveld
```

**Ironveld Casualties:**
- Frontline (370 damage): 24 Footmen, 5 Spearmen
- Midline (259 damage): 17 Spearmen
- Backline (111 damage): Wall takes 111 damage (now 2,889 HP)

**Ironveld Counter:**
- Total ATK: 150×8 + 100×6 + 50×6 = 2,100
- Roll 9 → 1.00×

**Korrath DEF Roll:** 5 → 0.90× (no Korrath defense penalty - they're attacking)
- Base DEF: ~1,500
- Effective: 1,350
- Net Damage: 2,100 - 1,350 = 750 damage to Korrath

**Korrath Casualties:** ~50 units lost

### Round 2

*Similar calculations...*

### Round 3 / Resolution

After 3 rounds:
- **Korrath:** 180 units remaining (45%)
- **Ironveld:** 220 units remaining (73%)
- **Wall:** 1,500 HP remaining

**Result: Ironveld Victory (Defensive)**

**Post-Battle:**
- Korrath retreats
- Korrath Enslaver triggers: Roll 14 → 12% of Ironveld casualties (80 dead × 0.12 = 9 slaves)
- No territory changes hands

---

## SUMMARY: DESIGN GOALS MET

1. **D20 Weighted Rolls** - Median outcomes most common (~40%)
2. **Meaningful Randomness** - Crits can swing battles but skill matters more
3. **Defender Advantage** - Walls, terrain, and tie-breakers favor defense
4. **Race Identity** - Each race fights differently
5. **Captain Impact** - Abilities and death saves matter
6. **Scalable Complexity** - Simple core, deep options

---

## OPEN QUESTIONS

1. Should siege weapons be separate from army or embedded?
2. Naval combat? (Shattered Continent = islands)
3. Magic-only attacks (Vaelthir specialty)?
4. Time-of-day modifiers (night attacks)?
5. Weather effects?

---

*Document Status: Combat system drafted*
*Next: Spell system, Map design, Scoring system*
