# Nemeths Domain - Race Comparison

## THE SIX RACES AT A GLANCE

| Race | Origin | Playstyle | Food Rate | One-Line Fantasy |
|------|--------|-----------|-----------|------------------|
| **Ironveld** | Titan's Bones | Turtle/Builder | 50% | "We were here before you. We'll be here after." |
| **Vaelthir** | Titan's Blood | Burst Magic | 100% | "Power is meant to be spent." |
| **Korrath** | Titan's Nightmares | Aggressive Raider | 100% | "Blood for the sleeper!" |
| **Sylvaeth** | Titan's Dreams | Intel/Diplomacy | 80% | "Knowledge is the only currency that matters." |
| **Ashborn** | Heartbeat Survivors | Attrition/Undying | 0% | "We have already died. You cannot threaten us." |
| **Breath-Born** | Titan's Breath | Control/Disruption | 70% | "Plans are whispers. We are the wind." |

---

## FOOD CONSUMPTION

Units require food based on their race. This creates distinct economic profiles.

| Race | Food Rate | Effect |
|------|-----------|--------|
| **Ashborn** | 0% | No food required - undead don't eat |
| **Ironveld** | 50% | Stone-born need minimal sustenance |
| **Breath-Born** | 70% | Wind spirits require less food |
| **Sylvaeth** | 80% | Dream-woven sustain on less |
| **Vaelthir** | 100% | Full food consumption |
| **Korrath** | 100% | Full food consumption |

**Balance Note:** Food-free Ashborn are balanced by -15% resource production and no healing effects.

---

## DETAILED COMPARISON

### BONUSES

| Race | Bonus 1 | Bonus 2 | Bonus 3 |
|------|---------|---------|---------|
| **Ironveld** | Building Durability +25% | Construction Speed | Mine +15% output |
| **Vaelthir** | Magic Power +30% | Mana Regeneration | Free Daily Spell |
| **Korrath** | Blood Frenzy (+35% ATK) | Battle Loot (+30%) | Prisoner Capture +5% |
| **Sylvaeth** | Scout Range (+50%) | Intel Always Accurate | Reputation Gain (+25%) |
| **Ashborn** | Reformation (25% reform) | Curse Damage | Captain Death Saves +2 |
| **Breath-Born** | Movement Speed +15% | Windshear (delay) | Evasion 20% |

---

### PENALTIES

| Race | Penalty 1 | Penalty 2 |
|------|-----------|-----------|
| **Ironveld** | Army Movement Speed -25% | Slowest units (SPD 0.5-1) |
| **Vaelthir** | Physical Defense -20% | Unit Cost +15% |
| **Korrath** | Alliance trust harder to build | Must attack regularly (morale decay if idle) |
| **Sylvaeth** | Attack Power -30% | Cannot build Siege Workshop |
| **Ashborn** | Resource Production -15% | No Healing Effects |
| **Breath-Born** | Structure Decay (1%/day) | Defense When Stationary -15% |

---

### UNIQUE MECHANICS

| Race | Signature Mechanic | How It Works |
|------|-------------------|--------------|
| **Ironveld** | Immovable | Cannot be knocked back. +10% DEF on walls |
| **Ironveld** | Siege Resistance | Reduces siege weapon effectiveness by 30% |
| **Vaelthir** | Blood Sacrifice | Sacrifice 10% HP for +20% ATK |
| **Vaelthir** | Magic Damage | Ignores 50% physical DEF |
| **Korrath** | Blood Frenzy | +10% ATK for 24h after attacking |
| **Korrath** | Prisoner Capture | 10% capture rate (vs 5% standard) |
| **Korrath** | War Drums | Enemies know attack coming, suffer morale penalty |
| **Sylvaeth** | Dream Reading | Intel is always 100% accurate |
| **Sylvaeth** | Illusions | Army appears 50% larger (Dream Weaver) |
| **Sylvaeth** | Stealth | Undetectable until within 2 tiles |
| **Ashborn** | Reformation | 25% chance to reform after death (same battle) |
| **Ashborn** | Curse Spread | -5% enemy stats for 24h (stacks) |
| **Ashborn** | Death Explosion | Pyre Knight explodes for 2% damage on death |
| **Breath-Born** | Windshear | Delay enemy reinforcements by 1 hour |
| **Breath-Born** | Evasion | 20% chance to evade attacks |
| **Breath-Born** | Scatter | AOE slow - all enemies -25% SPD |

---

## RACE UNIT ROSTER

Each race has exactly 3 units: Defender, Attacker, Elite.

| Race | Defender | Attacker | Elite |
|------|----------|----------|-------|
| **Ironveld** | Stoneshield | Hammerer | Siege Anvil |
| **Vaelthir** | Blood Warden | Crimson Blade | Magister |
| **Korrath** | Warshield | Rageborn | Warchief |
| **Sylvaeth** | Veilguard | Fade Striker | Dream Weaver |
| **Ashborn** | Cinder Guard | Ash Striker | Pyre Knight |
| **Breath-Born** | Gale Guard | Zephyr | Storm Herald |

*See UNITS.md for detailed stats and abilities.*

---

## PLAYSTYLE MATRIX

### Offensive Power
```
Most Aggressive                              Most Defensive
    |                                              |
 KORRATH → VAELTHIR → BREATH-BORN → ASHBORN → SYLVAETH → IRONVELD
```

### Economic Power
```
Best Economy                                 Worst Economy
    |                                              |
 IRONVELD → SYLVAETH → VAELTHIR → BREATH-BORN → KORRATH → ASHBORN
```

### Survivability
```
Hardest to Kill                              Easiest to Kill
    |                                              |
 ASHBORN → IRONVELD → BREATH-BORN → KORRATH → SYLVAETH → VAELTHIR
```

### Intel/Scouting
```
Best Intel                                   Worst Intel
    |                                              |
 SYLVAETH → BREATH-BORN → VAELTHIR → IRONVELD → ASHBORN → KORRATH
```

### Army Sustainability (Food)
```
Most Sustainable                             Most Food Dependent
    |                                              |
 ASHBORN → IRONVELD → BREATH-BORN → SYLVAETH → VAELTHIR → KORRATH
```

---

## RACE INTERACTIONS (Rock-Paper-Scissors)

### Who Beats Who?

| Attacker | Strong Against | Weak Against |
|----------|---------------|--------------|
| **Ironveld** | Korrath (outlast raids), Breath-Born (ignore disruption) | Vaelthir (magic bypasses walls), Ashborn (attrition) |
| **Vaelthir** | Ironveld (burst through defense), Korrath (kill before snowball) | Ashborn (can't burst undying), Sylvaeth (see attacks coming) |
| **Korrath** | Sylvaeth (no defense), Vaelthir (fragile) | Ironveld (can't break walls), Ashborn (troops keep returning) |
| **Sylvaeth** | Everyone via manipulation | Korrath (direct assault), anyone who ignores intel |
| **Ashborn** | Vaelthir (survive burst), Korrath (war of attrition) | Ironveld (can't break walls), Breath-Born (disrupted) |
| **Breath-Born** | Ashborn (disrupt attrition), Korrath (delay raids) | Ironveld (don't care about delays), Vaelthir (burst through) |

### Natural Alliances

| Pairing | Synergy |
|---------|---------|
| **Sylvaeth + Ironveld** | Perfect intel + unbreakable defense |
| **Sylvaeth + Korrath** | Guided missiles - know exactly where to strike |
| **Sylvaeth + Vaelthir** | Scry + nuke combo |
| **Ironveld + Ashborn** | Ultimate turtle - walls + undying garrison |
| **Korrath + Vaelthir** | Glass cannon alliance - kill fast or die |
| **Breath-Born + Anyone** | Disruption support, good mobility |

### Natural Enemies

| Pairing | Conflict |
|---------|----------|
| **Korrath vs Sylvaeth** | Brute force vs no defenses |
| **Vaelthir vs Ashborn** | Burst vs undying - frustrating for Vaelthir |
| **Korrath vs Ironveld** | Unstoppable force vs immovable object |
| **Breath-Born vs Korrath** | Chaos vs chaos - unpredictable |

---

## BUILDING MODIFIERS BY RACE

| Race | Bonus | Penalty |
|------|-------|---------|
| **Ironveld** | Walls +25% HP, Mine +15% output | - |
| **Vaelthir** | Mage Tower +30% mana | All buildings cost +15% |
| **Korrath** | Armory bonuses +20% stronger | - |
| **Sylvaeth** | Watchtower intel always accurate | Cannot build Siege Workshop |
| **Ashborn** | - | Farm -20% output |
| **Breath-Born** | - | All buildings decay 1% HP/day |

---

## BALANCE NOTES

### By Design
- **Ashborn** food-free is balanced by resource penalties and no healing
- **Korrath** aggression is rewarded, not punished (Blood Frenzy bonus)
- **Sylvaeth** weakness in combat is offset by intel dominance
- **Vaelthir** fragility is offset by devastating burst damage
- **Ironveld** slowness is offset by defensive superiority
- **Breath-Born** decay is offset by mobility and disruption

### To Monitor
| Mechanic | Question |
|----------|----------|
| Ashborn food-free | Does 0% food create unfair sustain? |
| Korrath Blood Frenzy | Does 24h bonus encourage optimal aggression? |
| Sylvaeth intel | Is perfect accuracy too strong? |
| Breath-Born decay | Is 1%/day too punishing long-term? |
| Vaelthir magic damage | Does 50% DEF ignore break combat? |

---

## CAPTAIN DEATH SAVE MODIFIERS

| Race | Modifier | Notes |
|------|----------|-------|
| **Standard** | D20, 10+ survives | 50% base survival |
| **Ashborn** | +2 to roll | 60% survival |
| **Others** | Standard | No modifier |

---

## SUMMARY: WHAT MAKES EACH RACE FUN?

| Race | The Fantasy | The Fun |
|------|-------------|---------|
| **Ironveld** | Immovable fortress | "Break yourself against my walls" |
| **Vaelthir** | Devastating power | "Watch this" *massive explosion* |
| **Korrath** | Endless horde | "Your dead are mine now" |
| **Sylvaeth** | Puppet master | "I knew you'd do that" |
| **Ashborn** | Unkillable nightmare | "I'll just come back" |
| **Breath-Born** | Chaos agent | "Good luck with your 'plans'" |

---

*Document Status: Updated with food consumption spectrum and Blood Frenzy mechanic*
*Simplified unit roster - see UNITS.md for details*
