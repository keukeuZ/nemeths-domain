# Nemeths Domain - Building System

## DESIGN PHILOSOPHY

**Simple and Flat:**
- 14 buildings total (no tiers, no upgrades)
- Build once, works forever
- Clear purpose for each building
- No decision paralysis

**Buildings are NOT NFTs** - They are contract state:
- Cheap gas for construction/destruction
- Burned when razed or Heartbeat hits
- Simple uint mappings in smart contract

---

## BUILDING LIST

### RESOURCE BUILDINGS (4)

| Building | Cost | Build Time | Effect |
|----------|------|------------|--------|
| **Farm** | 100 gold, 50 wood | 4h | +50 food/day |
| **Mine** | 150 gold, 75 stone | 6h | +40 gold/day |
| **Lumber Mill** | 150 gold, 75 wood | 6h | +40 wood/day |
| **Market** | 300 gold, 100 stone | 8h | +100 gold/day, enables trading |

---

### MILITARY BUILDINGS (4)

| Building | Cost | Build Time | Effect |
|----------|------|------------|--------|
| **Barracks** | 200 gold, 100 wood | 6h | Train Defender and Attacker units |
| **War Hall** | 400 gold, 200 stone | 10h | Train Elite units, +10% ATK to garrison |
| **Siege Workshop** | 500 gold, 300 wood | 12h | Train siege weapons |
| **Armory** | 350 gold, 150 stone | 8h | +15% ATK/DEF to all trained troops |

---

### DEFENSE BUILDINGS (3)

| Building | Cost | Build Time | Effect |
|----------|------|------------|--------|
| **Wall** | 400 gold, 500 stone | 12h | +30% DEF, requires siege to breach |
| **Watchtower** | 150 gold, 100 wood | 4h | See incoming attacks 2h earlier |
| **Gate** | 250 gold, 200 stone | 6h | Control ally passage, +10% DEF |

---

### MAGIC BUILDINGS (2)

| Building | Cost | Build Time | Effect |
|----------|------|------------|--------|
| **Mage Tower** | 400 gold, 200 stone | 10h | +20 mana/day, enables spellcasting |
| **Shrine** | 200 gold, 150 stone | 6h | +10 mana/day, +10% spell effectiveness |

---

### UTILITY BUILDINGS (1)

| Building | Cost | Build Time | Effect |
|----------|------|------------|--------|
| **Warehouse** | 250 gold, 150 wood | 6h | +2000 resource storage, protect 30% from raids |

---

## BUILDING LIMITS

| Rule | Limit |
|------|-------|
| **Per Territory** | Max 6 buildings |
| **Resource buildings** | Max 2 of each type |
| **Military buildings** | Max 1 of each type |
| **Defense buildings** | Max 1 Wall, 2 Watchtowers, 1 Gate |
| **Magic buildings** | Max 1 of each type |
| **Utility buildings** | Max 1 of each type |

---

## CONSTRUCTION RULES

| Rule | Detail |
|------|--------|
| **Concurrent builds** | 2 buildings at a time |
| **Destruction** | Instant when razed, refund 25% cost |
| **Heartbeat reset** | ALL buildings destroyed |
| **Repair** | 50% of build cost to repair damaged building |

---

## RACE BUILDING MODIFIERS

| Race | Bonus | Penalty |
|------|-------|---------|
| **Ironveld** | Walls +25% HP, Mine +15% output | - |
| **Vaelthir** | Mage Tower +30% mana | All buildings cost +15% |
| **Korrath** | Armory bonuses +20% stronger | - |
| **Sylvaeth** | Watchtower intel always accurate | Cannot build Siege Workshop |
| **Ashborn** | - | Farm -20% output |
| **Breath-Born** | - | All buildings decay 1% HP/day |

---

## STRATEGIC BUILDING PATHS

### The Turtle
```
Wall → Watchtower → Farm → Mine → Barracks
Focus: Defense first, economy second
```

### The Economy Engine
```
Mine → Market → Farm → Warehouse → Lumber Mill
Focus: Resources, then military
```

### The War Machine
```
Barracks → Armory → War Hall → Siege Workshop
Focus: Military immediately
```

### The Magic Dominance
```
Mage Tower → Shrine → Farm → Mine
Focus: Mana generation, spells win battles
```

---

## BUILDING PREREQUISITES

```
BASIC (No requirements)
├── Farm
├── Mine
├── Lumber Mill
├── Barracks
├── Wall
├── Watchtower
└── Mage Tower

REQUIRES BARRACKS
├── War Hall
├── Armory
└── Siege Workshop

REQUIRES MINE
├── Market
└── Warehouse

REQUIRES WALL
└── Gate

REQUIRES MAGE TOWER
└── Shrine
```

---

## SUMMARY

| Category | Count |
|----------|-------|
| Resource | 4 |
| Military | 4 |
| Defense | 3 |
| Magic | 2 |
| Utility | 1 |
| **TOTAL** | **14 buildings** |

---

*Document Status: Building system simplified*
*14 buildings, no tiers, clear purposes*
