# Nemeths Domain - Unit System

## DESIGN PHILOSOPHY

**Simple and Distinct:**
- Each race has exactly 3 units: Defender, Attacker, Elite
- 6 races × 3 units = 18 unit types
- Plus siege weapons and prisoners
- Clear roles, easy to understand

**Units are NOT NFTs** - They are contract state:
- Cheap to train/kill
- Burned on death or Heartbeat
- Simple quantity tracking

---

## UNIT STATS

| Stat | Description |
|------|-------------|
| **ATK** | Attack power |
| **DEF** | Defense power |
| **SPD** | Movement speed (tiles/hour) |
| **HP** | Health points |
| **COST** | Gold to train |
| **FOOD** | Food consumption/day |

---

## IRONVELD UNITS (Stone-Born)

*Slow, tough, defensive. 50% food consumption.*

### Stoneshield (Defender)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 8 | 25 | 1 | 60 | 30 gold | 1 |

**Special:** Cannot be knocked back. +10% DEF when defending walls.

### Hammerer (Attacker)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 20 | 12 | 1 | 45 | 45 gold | 1 |

**Special:** +25% damage vs buildings.

### Siege Anvil (Elite)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 15 | 35 | 0.5 | 100 | 100 gold | 2 |

**Special:** Immune to morale effects. Reduces siege weapon effectiveness against your walls by 30%.

---

## VAELTHIR UNITS (Blood-Kin)

*Fragile, magical, burst damage. 100% food consumption.*

### Blood Warden (Defender)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 10 | 18 | 2 | 35 | 40 gold | 1 |

**Special:** Absorbs 20% of damage meant for adjacent units. Heals 5% when enemies die nearby.

### Crimson Blade (Attacker)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 28 | 6 | 2 | 25 | 50 gold | 1 |

**Special:** Magic damage (ignores 50% physical DEF). Can sacrifice 10% HP for +20% ATK.

### Magister (Elite)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 40 | 5 | 2 | 30 | 120 gold + 50 mana | 2 |

**Special:** AOE attack hits all enemies in target area. Spell criticals do 2.5× damage.

---

## KORRATH UNITS (Nightmare-Spawn)

*Aggressive, fast, raid-focused. 100% food consumption.*

### Warshield (Defender)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 12 | 15 | 2 | 40 | 25 gold | 1 |

**Special:** +15% DEF when outnumbered. Gains Blood Frenzy bonus from Korrath racial.

### Rageborn (Attacker)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 25 | 5 | 3 | 35 | 35 gold | 2 |

**Special:** +10% ATK for each Rageborn that dies in battle. First strike in combat.

### Warchief (Elite)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 35 | 20 | 3 | 70 | 90 gold | 3 |

**Special:** All Korrath units in army get +10% ATK. Immune to morale penalties. Prisoners captured are +10% more effective.

---

## SYLVAETH UNITS (Dream-Woven)

*Intel, illusions, counter-attacks. 80% food consumption.*

### Veilguard (Defender)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 8 | 20 | 2 | 35 | 35 gold | 1 |

**Special:** 15% chance to evade attacks entirely. Counter-attacks deal +25% damage.

### Fade Striker (Attacker)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 22 | 8 | 4 | 30 | 45 gold | 1 |

**Special:** Undetectable until within 2 tiles. +30% ATK from ambush (first round).

### Dream Weaver (Elite)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 15 | 15 | 3 | 40 | 80 gold + 30 mana | 1 |

**Special:** Creates illusion copies (army appears 50% larger). Intel gathered is always 100% accurate.

---

## ASHBORN UNITS (Heartbeat Risen)

*Attrition, undying, curse spreading. 0% food consumption.*

### Cinder Guard (Defender)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 12 | 18 | 2 | 45 | 35 gold | 0 |

**Special:** 25% chance to reform after death (same battle). Immune to poison/disease.

### Ash Striker (Attacker)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 22 | 10 | 2 | 35 | 40 gold | 0 |

**Special:** Deals curse damage on hit (-5% enemy stats for 24h, stacks). Cannot be healed.

### Pyre Knight (Elite)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 30 | 15 | 2 | 50 | 85 gold | 0 |

**Special:** Explodes on death (2% damage to all nearby enemies). 5% of enemies killed rise as Ashborn prisoners.

---

## BREATH-BORN UNITS (Titan's Breath)

*Speed, disruption, evasion. 70% food consumption.*

### Gale Guard (Defender)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 10 | 16 | 3 | 30 | 30 gold | 1 |

**Special:** 20% evasion chance. Slows attackers by 15% when defending.

### Zephyr (Attacker)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 18 | 8 | 5 | 25 | 40 gold | 1 |

**Special:** Fastest unit in game. Can retreat after first round without penalty. +20% ATK when flanking.

### Storm Herald (Elite)
| ATK | DEF | SPD | HP | COST | FOOD |
|-----|-----|-----|-----|------|------|
| 25 | 18 | 4 | 45 | 95 gold | 2 |

**Special:** AOE slow - all enemies -25% SPD for battle. Delays enemy reinforcements by 1 hour.

---

## SIEGE WEAPONS

*Universal - all races can build (except Sylvaeth).*

| Unit | ATK | DEF | SPD | HP | COST | FOOD | Special |
|------|-----|-----|-----|-----|------|------|---------|
| **Battering Ram** | 5 | 25 | 1 | 80 | 100 gold | 0 | +400% vs gates/walls |
| **Catapult** | 10 | 10 | 1 | 50 | 200 gold | 0 | +250% vs buildings |
| **Trebuchet** | 15 | 5 | 0.5 | 40 | 400 gold | 0 | +400% vs buildings, range 2 tiles |

---

## PRISONERS

*Captured enemies become prisoners - mixed strength based on origin.*

### How Prisoners Work

1. **Capture Rate:** Base 5% of defeated enemies become prisoners
2. **Korrath Bonus:** +5% capture rate (total 10%)
3. **Ashborn:** Killed enemies rise as Ashborn prisoners (Pyre Knight ability)

### Prisoner Stats

Prisoners fight at **60% of their original stats**.

| Original Unit | As Prisoner |
|---------------|-------------|
| Defender | 60% ATK/DEF/HP |
| Attacker | 60% ATK/DEF/HP |
| Elite | 60% ATK/DEF/HP |

### Prisoner Rules

- Prisoners keep their race's special abilities (at reduced effect)
- Prisoners require food based on their original race
- Prisoners cannot be traded or transferred
- Prisoners die permanently (no reformation, no re-capture)
- Mix of prisoner types creates diverse army compositions

---

## UNIT COMPARISON

### Highest ATK
| Rank | Unit | ATK | Race |
|------|------|-----|------|
| 1 | Magister | 40 | Vaelthir |
| 2 | Warchief | 35 | Korrath |
| 3 | Pyre Knight | 30 | Ashborn |

### Highest DEF
| Rank | Unit | DEF | Race |
|------|------|-----|------|
| 1 | Siege Anvil | 35 | Ironveld |
| 2 | Stoneshield | 25 | Ironveld |
| 3 | Warchief | 20 | Korrath |

### Fastest (SPD)
| Rank | Unit | SPD | Race |
|------|------|-----|------|
| 1 | Zephyr | 5 | Breath-Born |
| 2 | Fade Striker | 4 | Sylvaeth |
| 3 | Storm Herald | 4 | Breath-Born |

### Cheapest
| Rank | Unit | Cost | Race |
|------|------|------|------|
| 1 | Warshield | 25 gold | Korrath |
| 2 | Stoneshield | 30 gold | Ironveld |
| 3 | Gale Guard | 30 gold | Breath-Born |

---

## UNIT COUNTERS

| Unit Type | Strong Against | Weak Against |
|-----------|---------------|--------------|
| **Defenders** | Attackers (absorb damage) | Siege, Magic |
| **Attackers** | Buildings, Elites | Defenders, Swarms |
| **Elites** | Everything (expensive) | Massed cheap units |
| **Siege** | Buildings, Walls | Cavalry, Fast units |

---

## TRAINING

| Building | Trains |
|----------|--------|
| **Barracks** | Defenders, Attackers |
| **War Hall** | Elites |
| **Siege Workshop** | Siege Weapons |

### Training Times

| Unit Type | Base Time |
|-----------|-----------|
| Defender | 1h |
| Attacker | 1.5h |
| Elite | 3h |
| Siege | 4h |

---

## FOOD CONSUMPTION SUMMARY

| Race | Food Rate | Units Need |
|------|-----------|------------|
| **Ashborn** | 0% | No food |
| **Ironveld** | 50% | Half food |
| **Breath-Born** | 70% | Reduced food |
| **Sylvaeth** | 80% | Slightly reduced |
| **Vaelthir** | 100% | Full food |
| **Korrath** | 100% | Full food |

---

## SUMMARY

| Category | Count |
|----------|-------|
| Race units | 18 (6 races × 3) |
| Siege weapons | 3 |
| Prisoner variants | Based on captured units |
| **TOTAL TYPES** | **21 base units** |

---

*Document Status: Unit system simplified*
*3 units per race, clear roles, prisoners add variety*
