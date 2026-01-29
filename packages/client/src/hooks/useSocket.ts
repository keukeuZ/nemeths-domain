import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useGameStore, useMapStore, useCombatStore } from '../stores';
import type { TileData } from '../stores/mapStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Event types from server
interface ServerEvents {
  // Connection
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'error': (error: string) => void;

  // Game state
  'generation:update': (data: { status: string; day: number; prizePool: number }) => void;
  'player:update': (data: { resources: Record<string, number>; score: number }) => void;

  // Map
  'territory:update': (data: TileData) => void;
  'territory:conquered': (data: { x: number; y: number; newOwner: string }) => void;

  // Combat
  'combat:initiated': (data: { combatId: number; attacker: string; defender: string; plotX: number; plotY: number }) => void;
  'combat:resolved': (data: { combatId: number; result: string; attackerRoll: number; defenderRoll: number }) => void;

  // Heartbeat
  'heartbeat': (data: { day: number; forsakenSpawns: Array<{ x: number; y: number }> }) => void;
}

// Events client can emit
interface ClientEvents {
  'authenticate': (token: string) => void;
  'subscribe:map': (region?: { minX: number; maxX: number; minY: number; maxY: number }) => void;
  'unsubscribe:map': () => void;
}

export function useSocket() {
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const { token, isAuthenticated } = useAuthStore();
  const { setGeneration, updateResources, updateScore } = useGameStore();
  const { setTiles, updateTile } = useMapStore();
  const { updateCombat, addCombat } = useCombatStore();

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Create socket connection
    const socket: Socket<ServerEvents, ClientEvents> = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('authenticate', token);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Game state events
    socket.on('generation:update', (data) => {
      setGeneration((prev) => prev ? { ...prev, ...data } : null);
    });

    socket.on('player:update', (data) => {
      if (data.resources) updateResources(data.resources);
      if (data.score !== undefined) updateScore(data.score);
    });

    // Map events
    socket.on('territory:update', (data) => {
      updateTile(data.x, data.y, data);
    });

    socket.on('territory:conquered', (data) => {
      updateTile(data.x, data.y, { ownerId: data.newOwner });
    });

    // Combat events
    socket.on('combat:initiated', (data) => {
      addCombat({
        id: data.combatId,
        attacker: data.attacker,
        defender: data.defender,
        plotX: data.plotX,
        plotY: data.plotY,
        plotTokenId: 0,
        attackerStrength: 0,
        defenderStrength: 0,
        phase: 'commit',
        commitDeadline: Date.now() + 3600000, // 1 hour
        revealDeadline: Date.now() + 5400000, // 1.5 hours
        result: 'none',
        isAttacker: false,
        hasCommitted: false,
        hasRevealed: false,
      });
    });

    socket.on('combat:resolved', (data) => {
      updateCombat(data.combatId, {
        phase: 'resolved',
        result: data.result as any,
        attackerRoll: data.attackerRoll,
        defenderRoll: data.defenderRoll,
      });
    });

    // Heartbeat events
    socket.on('heartbeat', (data) => {
      console.log('Heartbeat:', data);
      // Update forsaken spawns on map
      for (const spawn of data.forsakenSpawns) {
        updateTile(spawn.x, spawn.y, { isForsaken: true });
      }
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, setGeneration, updateResources, updateScore, updateTile, updateCombat, addCombat]);

  // Subscribe to map region
  const subscribeToMap = useCallback((region?: { minX: number; maxX: number; minY: number; maxY: number }) => {
    socketRef.current?.emit('subscribe:map', region);
  }, []);

  // Unsubscribe from map
  const unsubscribeFromMap = useCallback(() => {
    socketRef.current?.emit('unsubscribe:map');
  }, []);

  // Fetch all map tiles via REST API
  const fetchMapTiles = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/map/tiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error('Failed to fetch map tiles:', res.statusText);
        return;
      }

      const data = await res.json();
      if (data.success && data.data?.tiles) {
        setTiles(data.data.tiles as TileData[]);
        console.log(`Loaded ${data.data.tiles.length} map tiles`);
      }
    } catch (error) {
      console.error('Error fetching map tiles:', error);
    }
  }, [token, setTiles]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    subscribeToMap,
    unsubscribeFromMap,
    fetchMapTiles,
  };
}
