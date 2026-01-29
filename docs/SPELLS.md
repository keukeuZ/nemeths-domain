# Nemeths Domain - Spell System

## DESIGN PHILOSOPHY

Magic in Nemeth's Domain flows from the Titan's blood - unpredictable, powerful, and dangerous. Spells use **weighted D20 rolls** for effects, with median outcomes most common but spectacular successes (and catastrophic failures) possible.

**Core Principles:**
- Magic is a major gameplay pillar (equal to combat)
- Vaelthir specialize but all races can cast
- Mana is a limited resource - choose wisely
- Spells have cooldowns to prevent spam
- High risk/reward compared to mundane combat

---

## MANA SYSTEM

### Mana Generation

| Source | Mana/Day | Notes |
|--------|----------|-------|
| **Base** | 10 | All players |
| **Mage Tower** | +15 | Per tower |
| **Arcane Nexus** | +40 | Upgrade from Mage Tower |
| **Shrine** | +5 | Minor boost |
| **Titan-Touched Land** | +10 | Per territory |
| **Heart Territory** | +25 | Central region |
| **Vaelthir Racial** | +50% | Bonus to all generation |

### Mana Cap

| Structure Level | Max Mana |
|-----------------|----------|
| No Mage Tower | 50 |
| Mage Tower (×1) | 100 |
| Mage Tower (×2) | 150 |
| Arcane Nexus | 300 |
| Arcane Nexus + Shrine | 350 |

**Vaelthir Bonus:** +100 to max mana cap

### Mana Recovery

Mana regenerates at **midnight server time** (once per day). Unspent mana carries over up to your cap.

---

## SPELL SCHOOLS

### School of Destruction
*Raw damage dealing - Vaelthir specialty*

| Spell | Mana | Cooldown | Target | Effect |
|-------|------|----------|--------|--------|
| **Firebolt** | 10 | None | Single unit/structure | 50-150 damage (D20) |
| **Lightning Strike** | 25 | 4h | Army | 200-600 damage, hits 3 random units |
| **Fireball** | 40 | 8h | Army | 300-900 AOE damage |
| **Meteor Storm** | 100 | 24h | Territory | 1000-3000 damage to all enemies |
| **Titan's Wrath** | 200 | 72h | Territory | 2000-6000 damage + building damage |

### School of Protection
*Defensive magic - Ironveld affinity*

| Spell | Mana | Cooldown | Target | Effect |
|-------|------|----------|--------|--------|
| **Shield** | 15 | None | Army | +20% DEF for 1 battle |
| **Stone Skin** | 30 | 6h | Army | +40% DEF, -20% SPD for 12h |
| **Ward** | 25 | 4h | Building | Immune to next spell |
| **Fortress of Will** | 60 | 12h | Territory | All structures +500 DEF for 24h |
| **Titan's Aegis** | 150 | 48h | Territory | Immune to magic for 24h |

### School of Divination
*Intel and foresight - Sylvaeth specialty*

| Spell | Mana | Cooldown | Target | Effect |
|-------|------|----------|--------|--------|
| **Scry** | 10 | None | Territory | Reveal army size (±20% accuracy) |
| **True Sight** | 25 | 4h | Territory | Exact army composition revealed |
| **Foresight** | 40 | 8h | Self | Know incoming attacks 2h earlier |
| **Dream Walk** | 60 | 12h | Player | See all their territories for 1h |
| **Titan's Eye** | 120 | 48h | Map | Reveal 10 random enemy armies |

### School of Manipulation
*Control and disruption - Breath-Born affinity*

| Spell | Mana | Cooldown | Target | Effect |
|-------|------|----------|--------|--------|
| **Slow** | 15 | None | Army | -30% SPD for 6h |
| **Confusion** | 30 | 6h | Army | 10-30% chance attack wrong target |
| **Windshear** | 35 | 4h | Army | Delay arrival 1-4h (Breath-Born racial) |
| **Mass Panic** | 50 | 12h | Army | -25% morale, 5-15% desert |
| **Titan's Whisper** | 100 | 24h | Player | All their armies -20% ATK for 24h |

### School of Necromancy
*Death magic - Ashborn specialty*

| Spell | Mana | Cooldown | Target | Effect |
|-------|------|----------|--------|--------|
| **Drain Life** | 20 | 2h | Army | Deal 100-300 damage, heal your units half |
| **Raise Dead** | 35 | 8h | Battlefield | Resurrect 5-15% of recent dead |
| **Curse** | 25 | 4h | Army | -15% to all stats for 24h |
| **Plague** | 60 | 12h | Territory | 1-3% army dies per day for 3 days |
| **Titan's Grasp** | 150 | 72h | Army | 20-40% instant death, no reformation |

### School of Enhancement
*Buffs and empowerment - General*

| Spell | Mana | Cooldown | Target | Effect |
|-------|------|----------|--------|--------|
| **Haste** | 20 | 2h | Army | +30% SPD for 12h |
| **Strength** | 25 | 4h | Army | +20% ATK for 1 battle |
| **Bloodlust** | 40 | 8h | Army | +40% ATK, -20% DEF for 1 battle |
| **War Cry** | 35 | 6h | Army | +30% morale, immune to fear |
| **Titan's Blessing** | 100 | 24h | Army | +25% all stats for 24h |

---

## SPELL EFFECT ROLLS (D20)

All spells with variable effects use weighted D20 rolls.

### Damage Spell Table

| Roll | Damage Modifier | Probability |
|------|-----------------|-------------|
| 1 | **Fizzle** - 0 damage, mana wasted | 5% |
| 2-4 | 0.50× - Weak cast | 15% |
| 5-8 | 0.75× - Below average | 20% |
| 9-12 | **1.00×** - Median | **20%** |
| 13-16 | 1.25× - Strong cast | 20% |
| 17-19 | 1.50× - Powerful | 15% |
| 20 | **2.00× + Bonus Effect** | 5% |

**Vaelthir Bonus:** +2 to all spell damage rolls

### Example: Fireball (40 mana, 300-900 base)

| Roll | Result |
|------|--------|
| 1 | Fizzle - 0 damage |
| 5 | 225 damage (300 × 0.75) |
| 10 | **450 damage** (median) |
| 15 | 562 damage (450 × 1.25) |
| 20 | 900 damage + targets catch fire (DOT) |

### Buff/Debuff Duration Table

| Roll | Duration Modifier | Probability |
|------|-------------------|-------------|
| 1 | 0.25× - Spell barely holds | 5% |
| 2-4 | 0.50× - Short duration | 15% |
| 5-8 | 0.75× - Below average | 20% |
| 9-12 | **1.00×** - Median | **20%** |
| 13-16 | 1.25× - Extended | 20% |
| 17-19 | 1.50× - Long lasting | 15% |
| 20 | **2.00× + Enhanced effect** | 5% |

### Divination Accuracy Table

| Roll | Accuracy | Probability |
|------|----------|-------------|
| 1 | **False Vision** - Information is wrong | 5% |
| 2-4 | 60% accurate | 15% |
| 5-8 | 75% accurate | 20% |
| 9-12 | **90% accurate** | **20%** |
| 13-16 | 95% accurate | 20% |
| 17-19 | 100% accurate | 15% |
| 20 | **100% + Bonus intel** (see captain, see defenses) | 5% |

**Sylvaeth Bonus:** Minimum 75% accuracy (reroll 1-4)

---

## CRITICAL SPELL EFFECTS

### Natural 20 - Empowered Cast

Each school has unique critical effects:

| School | Critical Bonus |
|--------|----------------|
| **Destruction** | Targets catch fire (100 damage/round for 3 rounds) |
| **Protection** | Shield reflects 25% damage back to attacker |
| **Divination** | See target's planned actions for next 24h |
| **Manipulation** | Effect spreads to adjacent army |
| **Necromancy** | Raised dead are permanent (until killed) |
| **Enhancement** | Buff is contagious - spreads to nearby allies |

### Natural 1 - Spell Mishap

| Roll (D6) | Mishap Effect |
|-----------|---------------|
| 1 | **Backlash** - Caster takes 25% of spell damage |
| 2 | **Mana Drain** - Lose additional 50% mana |
| 3 | **Exhaustion** - All spells on 2× cooldown for 24h |
| 4 | **Misfire** - Spell hits random target (could be ally) |
| 5 | **Corruption** - Captain takes 10% HP damage |
| 6 | **Titan's Notice** - Random negative event (storms, earthquakes) |

---

## VAELTHIR BLOOD MAGIC

Vaelthir can **sacrifice units** to boost spell power - their unique racial mechanic. The boost is moderate but consistent, rewarding commitment without breaking balance.

### Blood Sacrifice Requirements

| Sacrifice Tier | Units Required | Enables Roll |
|----------------|----------------|--------------|
| **Minor** | 5-14 units | D20 roll allowed |
| **Moderate** | 15-29 units | +2 to roll |
| **Major** | 30-49 units | +4 to roll |
| **Supreme** | 50+ units | +6 to roll |

### Blood Sacrifice Effect (D20)

| Roll | Spell Boost | Probability (no modifier) |
|------|-------------|---------------------------|
| 1-5 | +5% | 25% |
| 6-10 | +8% | 25% |
| 11-15 | **+12%** | **25%** |
| 16-19 | +15% | 20% |
| 20+ | **+20%** (max) | 5% |

**Example:** Sacrifice 35 units (Major) for Fireball
- Roll D20 + 4 (Major bonus)
- Roll 14 + 4 = 18 → +15% spell power
- Fireball deals 517 damage instead of 450 (median)

**To achieve +20% boost:**
- Need roll of 20+ (natural 20, or 14+ with Supreme sacrifice)
- Supreme sacrifice (50+ units) gives best odds: ~35% chance of +20%

### Blood Sacrifice Restrictions
- Only Vaelthir units can be sacrificed
- Must be in same territory as caster
- Sacrificed units are permanently lost (no Reformation)
- Maximum one sacrifice per spell
- Cannot sacrifice on free daily spell

---

## FREE DAILY SPELL (VAELTHIR)

Vaelthir receive one free spell per day (no mana cost):

| Captain Level | Free Spell Tier |
|---------------|-----------------|
| 1-5 | Tier 1 (10-20 mana spells) |
| 6-10 | Tier 2 (21-40 mana spells) |
| 11-15 | Tier 3 (41-60 mana spells) |
| 16-20 | Tier 4 (61-100 mana spells) |

---

## RACE-SPECIFIC SPELLS

### Ironveld - Earth Magic

| Spell | Mana | Cooldown | Effect |
|-------|------|----------|--------|
| **Stone Wall** | 30 | 8h | Create temporary wall (500 HP, 24h duration) |
| **Earthquake** | 80 | 24h | All enemies in territory knocked down, -50% DEF round 1 |
| **Crystal Prison** | 50 | 12h | Trap single unit for 12h (cannot act or be attacked) |

### Vaelthir - Blood Magic

| Spell | Mana | Cooldown | Effect |
|-------|------|----------|--------|
| **Crimson Bolt** | 15 | None | 100-300 damage, heal caster 25% of damage |
| **Blood Pact** | 40 | 8h | Link two armies - damage shared between them |
| **Exsanguinate** | 100 | 24h | Target loses 30% HP, Vaelthir gains as temp units |

### Korrath - War Magic

| Spell | Mana | Cooldown | Effect |
|-------|------|----------|--------|
| **Battle Rage** | 25 | 4h | +50% ATK, army attacks nearest enemy automatically |
| **War Drums** | 20 | 6h | All enemies in range know attack coming, -15% morale |
| **Blood Frenzy** | 60 | 12h | Army gains +10% ATK per kill for duration of battle |

### Sylvaeth - Dream Magic

| Spell | Mana | Cooldown | Effect |
|-------|------|----------|--------|
| **Illusion Army** | 35 | 8h | Create fake army (fools scrying for 24h) |
| **Nightmare** | 45 | 12h | Target army cannot rest, no healing for 48h |
| **Dream Walk** | 60 | 24h | See through target's eyes for 1h |

### Ashborn - Death Magic

| Spell | Mana | Cooldown | Effect |
|-------|------|----------|--------|
| **Ash Cloud** | 30 | 6h | Territory shrouded, -50% vision for 12h |
| **Pyre Burst** | 50 | 12h | All Ashborn units deal death damage (1-2% of their HP) |
| **Mass Reformation** | 80 | 24h | All Ashborn dead in last 24h get +5% to reformation roll |

### Breath-Born - Wind Magic

| Spell | Mana | Cooldown | Effect |
|-------|------|----------|--------|
| **Gust** | 15 | 2h | Push enemy army back 1 territory |
| **Windshear** | 35 | 4h | Delay enemy arrival 1-4h |
| **Storm Call** | 70 | 24h | Territory becomes stormy: -30% SPD all, ranged -50% ATK |

---

## ARCHMAGE CAPTAIN SPELLS

Archmage captains unlock exclusive spells through their paths.

### Elementalist Path

| Tier | Spell | Mana | Effect |
|------|-------|------|--------|
| 1 | **Elemental Bolt** | 15 | Choose element: Fire (DOT), Ice (slow), Lightning (chain) |
| 2 | **Elemental Shield** | 30 | Absorb 500 damage of chosen element |
| 3 | **Elemental Mastery** | 80 | Cast any destruction spell at -50% mana cost |

### Enchanter Path

| Tier | Spell | Mana | Effect |
|------|-------|------|--------|
| 1 | **Enchant Weapon** | 20 | Single unit gains +50% ATK for 24h |
| 2 | **Mass Enchant** | 50 | All units in army gain +20% ATK for 12h |
| 3 | **Legendary Enchant** | 100 | Create enchanted item (permanent +10% stat to holder) |

### Nethermancer Path

| Tier | Spell | Mana | Effect |
|------|-------|------|--------|
| 1 | **Soul Tap** | 25 | Steal 20 mana from target player |
| 2 | **Void Rift** | 60 | 10% of target army vanishes (no loot, no reformation) |
| 3 | **Nether Gate** | 120 | Teleport army to any owned territory instantly |

---

## SPELL COMBAT INTERACTION

### Casting During Battle

Spells can be cast **before** or **during** battle:

| Timing | Allowed Spells | Notes |
|--------|---------------|-------|
| **Pre-Battle** (while marching) | Buffs, debuffs, divination | Cast on your army or scout enemy |
| **Battle Round 1** | Quick spells (≤25 mana) | One spell per round |
| **Battle Round 2** | Quick spells | One spell per round |
| **Battle Round 3** | Quick spells | One spell per round |
| **Post-Battle** | Necromancy, reformation | After casualties calculated |

### Spell vs Spell

When opposing spells interact:

| Scenario | Resolution |
|----------|------------|
| **Buff vs Debuff** | Higher mana cost wins, difference applies |
| **Shield vs Damage** | Shield absorbs up to its value |
| **Ward vs Any** | Ward blocks one spell completely |
| **Counter-Spell** | Roll-off: D20 + mana spent, higher wins |

### Anti-Magic

| Source | Effect |
|--------|--------|
| **Titan's Aegis** | Territory immune to magic 24h |
| **Mage Tower destroyed** | -50% spell power in territory |
| **Silence (spell)** | Target cannot cast for 4h |
| **Ironveld Stone Skin** | +50% magic resistance |

---

## MANA ECONOMY BY RACE

### Daily Mana Generation (Example Setup)

**Base Setup:** 1 Mage Tower, 1 Shrine, 2 regular territories

| Race | Calculation | Total/Day |
|------|-------------|-----------|
| **Ironveld** | 10 + 15 + 5 + 0 = 30 | 30 |
| **Vaelthir** | (10 + 15 + 5) × 1.5 = 45 | 45 |
| **Korrath** | 10 + 15 + 5 = 30 | 30 |
| **Sylvaeth** | 10 + 15 + 5 = 30 | 30 |
| **Ashborn** | 10 + 15 + 5 = 30 | 30 |
| **Breath-Born** | 10 + 15 + 5 = 30 | 30 |

**Advanced Setup:** Arcane Nexus, 2 Shrines, 3 Titan-Touched, 1 Heart

| Race | Calculation | Total/Day |
|------|-------------|-----------|
| **Vaelthir** | (10 + 40 + 10 + 30 + 25) × 1.5 = **172** | 172 |
| **Others** | 10 + 40 + 10 + 30 + 25 = **115** | 115 |

---

## SPELL RESEARCH (OPTIONAL SYSTEM)

Players can invest resources to improve spells.

### Research Costs

| Improvement | Gold | Time | Effect |
|-------------|------|------|--------|
| **Efficiency I** | 500 | 24h | -10% mana cost for spell school |
| **Efficiency II** | 1500 | 48h | -20% mana cost |
| **Power I** | 1000 | 24h | +10% spell effect |
| **Power II** | 3000 | 48h | +20% spell effect |
| **Quicken I** | 750 | 24h | -25% cooldown |
| **Quicken II** | 2000 | 48h | -50% cooldown |

### Research Requirements
- Requires Mage Tower (Tier 1 research)
- Requires Arcane Nexus (Tier 2 research)
- Research lost at Heartbeat reset

---

## SPELL BALANCE NOTES

### Power Budget by Mana Cost

| Mana Range | Expected Impact |
|------------|-----------------|
| 10-25 | Single unit/minor buff |
| 26-50 | Squad-level/moderate buff |
| 51-100 | Army-level/major effect |
| 101-200 | Territory-level/game-changing |

### Cooldown Guidelines

| Cooldown | Spell Type |
|----------|------------|
| None | Weak, spammable (but mana-limited) |
| 2-4h | Tactical, frequent use |
| 6-12h | Strategic, plan around |
| 24h+ | Once per day max |
| 48-72h | Generation-defining |

### Counter-Play

Every spell school has counters:

| School | Hard Counter | Soft Counter |
|--------|--------------|--------------|
| **Destruction** | Protection (Ward, Shield) | Spread formation |
| **Protection** | Necromancy (Curse, Plague) | Wait out duration |
| **Divination** | Illusions, false information | Move unpredictably |
| **Manipulation** | Enhancement (War Cry) | High morale armies |
| **Necromancy** | Protection (Aegis) | Kill Ashborn fast |
| **Enhancement** | Manipulation (Slow, Panic) | Debuff before battle |

---

## SUMMARY: MAGIC IDENTITY BY RACE

| Race | Magic Role | Signature Spell |
|------|------------|-----------------|
| **Ironveld** | Defensive, territorial | Stone Wall, Earthquake |
| **Vaelthir** | Offensive powerhouse | Blood sacrifice + any |
| **Korrath** | Combat buffs only | Battle Rage, War Drums |
| **Sylvaeth** | Intel and illusion | Dream Walk, Illusion Army |
| **Ashborn** | Death and attrition | Plague, Mass Reformation |
| **Breath-Born** | Control and disruption | Windshear, Storm Call |

---

## OPEN QUESTIONS

1. Should there be magic-immune units?
2. Spell scrolls (one-time use items)?
3. Ritual magic (multiple casters combine)?
4. Ley lines on map (bonus mana zones)?
5. Anti-magic terrain types?

---

*Document Status: Spell system drafted*
*Next: Map design, Scoring system*
