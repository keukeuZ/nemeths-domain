import { Router } from 'express';
import authRoutes from './auth.js';
import healthRoutes from './health.js';
import playerRoutes from './player.js';
import generationRoutes from './generation.js';
import buildingRoutes from './building.js';
import armyRoutes from './army.js';
import combatRoutes from './combat.js';
import spellRoutes from './spell.js';
import allianceRoutes from './alliance.js';
import mapRoutes from './map.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/player', playerRoutes);
router.use('/generation', generationRoutes);
router.use('/building', buildingRoutes);
router.use('/army', armyRoutes);
router.use('/combat', combatRoutes);
router.use('/spell', spellRoutes);
router.use('/alliance', allianceRoutes);
router.use('/map', mapRoutes);

// API info
router.get('/', (_req, res) => {
  res.json({
    name: 'Nemeths Domain API',
    version: '0.1.0',
    documentation: '/api/docs',
  });
});

export default router;
