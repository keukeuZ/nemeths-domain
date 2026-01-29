// Contract ABIs for Nemeths Domain

export const nemethsGenerationAbi = [
  // View functions
  {
    type: 'function',
    name: 'currentGenerationId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'generationPhase',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'generationStartTime',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'prizePool',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalPlayers',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'players',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [
      { type: 'address', name: 'wallet' },
      { type: 'uint8', name: 'race' },
      { type: 'uint8', name: 'captainClass' },
      { type: 'uint8', name: 'captainSkill' },
      { type: 'string', name: 'captainName' },
      { type: 'bool', name: 'isPremium' },
      { type: 'uint256', name: 'registeredAt' },
      { type: 'uint256', name: 'score' },
      { type: 'bool', name: 'eliminated' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isRegistered',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'registerFree',
    inputs: [
      { type: 'uint8', name: 'race' },
      { type: 'uint8', name: 'captainClass' },
      { type: 'uint8', name: 'captainSkill' },
      { type: 'string', name: 'captainName' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'registerPremium',
    inputs: [
      { type: 'uint8', name: 'race' },
      { type: 'uint8', name: 'captainClass' },
      { type: 'uint8', name: 'captainSkill' },
      { type: 'string', name: 'captainName' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'PlayerRegistered',
    inputs: [
      { type: 'address', indexed: true, name: 'player' },
      { type: 'uint8', name: 'race' },
      { type: 'uint8', name: 'captainClass' },
      { type: 'bool', name: 'isPremium' },
    ],
  },
  {
    type: 'event',
    name: 'GenerationStarted',
    inputs: [
      { type: 'uint256', indexed: true, name: 'generationId' },
      { type: 'uint256', name: 'startTime' },
    ],
  },
] as const;

export const plotsAbi = [
  // View functions
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'owner' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlot',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [
      { type: 'uint8', name: 'x' },
      { type: 'uint8', name: 'y' },
      { type: 'uint8', name: 'zone' },
      { type: 'uint8', name: 'terrain' },
      { type: 'uint256', name: 'generationId' },
      { type: 'bool', name: 'isForsaken' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokenIdByCoords',
    inputs: [
      { type: 'uint256', name: 'generationId' },
      { type: 'uint8', name: 'x' },
      { type: 'uint8', name: 'y' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isMinted',
    inputs: [
      { type: 'uint256', name: 'generationId' },
      { type: 'uint8', name: 'x' },
      { type: 'uint8', name: 'y' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerPlots',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerPlotCount',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'canUseInGameplay',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentGenerationId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // Events
  {
    type: 'event',
    name: 'PlotMinted',
    inputs: [
      { type: 'uint256', indexed: true, name: 'tokenId' },
      { type: 'address', indexed: true, name: 'owner' },
      { type: 'uint8', name: 'x' },
      { type: 'uint8', name: 'y' },
      { type: 'uint8', name: 'zone' },
      { type: 'uint8', name: 'terrain' },
      { type: 'uint256', name: 'generationId' },
    ],
  },
  {
    type: 'event',
    name: 'PlotConquered',
    inputs: [
      { type: 'uint256', indexed: true, name: 'tokenId' },
      { type: 'address', indexed: true, name: 'previousOwner' },
      { type: 'address', indexed: true, name: 'newOwner' },
    ],
  },
] as const;

export const combatSystemAbi = [
  // View functions
  {
    type: 'function',
    name: 'combatCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCombat',
    inputs: [{ type: 'uint256', name: 'combatId' }],
    outputs: [
      { type: 'uint256', name: 'id' },
      { type: 'address', name: 'attacker' },
      { type: 'address', name: 'defender' },
      { type: 'uint256', name: 'plotTokenId' },
      { type: 'uint256', name: 'attackerStrength' },
      { type: 'uint256', name: 'defenderStrength' },
      { type: 'bytes32', name: 'attackerCommit' },
      { type: 'bytes32', name: 'defenderCommit' },
      { type: 'uint256', name: 'attackerReveal' },
      { type: 'uint256', name: 'defenderReveal' },
      { type: 'uint8', name: 'phase' },
      { type: 'uint256', name: 'commitDeadline' },
      { type: 'uint256', name: 'revealDeadline' },
      { type: 'uint256', name: 'vrfRequestId' },
      { type: 'uint256', name: 'randomSeed' },
      { type: 'uint8', name: 'result' },
      { type: 'uint256', name: 'resolvedAt' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getActiveCombatForPlot',
    inputs: [{ type: 'uint256', name: 'plotTokenId' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerAttacks',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerDefenses',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCombatPhase',
    inputs: [{ type: 'uint256', name: 'combatId' }],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'initiateCombat',
    inputs: [
      { type: 'uint256', name: 'plotTokenId' },
      { type: 'uint256', name: 'attackerStrength' },
      { type: 'bytes32', name: 'commitHash' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'defenderCommit',
    inputs: [
      { type: 'uint256', name: 'combatId' },
      { type: 'bytes32', name: 'commitHash' },
      { type: 'uint256', name: 'defenderStrength' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'advanceToReveal',
    inputs: [{ type: 'uint256', name: 'combatId' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'attackerReveal',
    inputs: [
      { type: 'uint256', name: 'combatId' },
      { type: 'uint256', name: 'secret' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'defenderReveal',
    inputs: [
      { type: 'uint256', name: 'combatId' },
      { type: 'uint256', name: 'secret' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'expireCombat',
    inputs: [{ type: 'uint256', name: 'combatId' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'CombatInitiated',
    inputs: [
      { type: 'uint256', indexed: true, name: 'combatId' },
      { type: 'address', indexed: true, name: 'attacker' },
      { type: 'address', indexed: true, name: 'defender' },
      { type: 'uint256', name: 'plotTokenId' },
      { type: 'uint256', name: 'attackerStrength' },
      { type: 'uint256', name: 'commitDeadline' },
    ],
  },
  {
    type: 'event',
    name: 'CombatResolved',
    inputs: [
      { type: 'uint256', indexed: true, name: 'combatId' },
      { type: 'uint8', name: 'result' },
      { type: 'address', name: 'winner' },
      { type: 'uint256', name: 'attackerRoll' },
      { type: 'uint256', name: 'defenderRoll' },
    ],
  },
] as const;

export const titansWitnessAbi = [
  {
    type: 'function',
    name: 'getWinner',
    inputs: [{ type: 'uint256', name: 'generationId' }],
    outputs: [
      { type: 'address', name: 'winner' },
      { type: 'uint256', name: 'finalScore' },
      { type: 'uint256', name: 'endTime' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerStats',
    inputs: [{ type: 'address', name: 'player' }],
    outputs: [
      { type: 'uint256', name: 'generationsPlayed' },
      { type: 'uint256', name: 'generationsWon' },
      { type: 'uint256', name: 'totalScore' },
      { type: 'uint256', name: 'highestScore' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTopPlayers',
    inputs: [{ type: 'uint256', name: 'limit' }],
    outputs: [
      { type: 'address[]', name: 'players' },
      { type: 'uint256[]', name: 'wins' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'GenerationWinner',
    inputs: [
      { type: 'uint256', indexed: true, name: 'generationId' },
      { type: 'address', indexed: true, name: 'winner' },
      { type: 'uint256', name: 'finalScore' },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'spender' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;
