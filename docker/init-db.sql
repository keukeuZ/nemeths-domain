-- Initialize Nemeths Domain Database
-- This script runs automatically when the container is first created

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create custom types
DO $$
BEGIN
    -- Race enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'race') THEN
        CREATE TYPE race AS ENUM (
            'ironveld',
            'vaelthir',
            'korrath',
            'sylvaeth',
            'ashborn',
            'breathborn'
        );
    END IF;

    -- Captain class enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'captain_class') THEN
        CREATE TYPE captain_class AS ENUM (
            'warlord',
            'archmage',
            'highpriest',
            'shadowmaster',
            'merchantprince',
            'beastlord'
        );
    END IF;

    -- Captain skill enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'captain_skill') THEN
        CREATE TYPE captain_skill AS ENUM (
            'vanguard',
            'fortress',
            'destruction',
            'protection',
            'crusader',
            'oracle',
            'assassin',
            'saboteur',
            'profiteer',
            'artificer',
            'packalpha',
            'warden'
        );
    END IF;

    -- Zone enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone') THEN
        CREATE TYPE zone AS ENUM (
            'outer',
            'middle',
            'inner',
            'heart'
        );
    END IF;

    -- Terrain enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'terrain') THEN
        CREATE TYPE terrain AS ENUM (
            'plains',
            'forest',
            'mountain',
            'river',
            'ruins',
            'corruption'
        );
    END IF;

    -- Generation status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_status') THEN
        CREATE TYPE generation_status AS ENUM (
            'planning',
            'active',
            'endgame',
            'ended'
        );
    END IF;

    -- Combat status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'combat_status') THEN
        CREATE TYPE combat_status AS ENUM (
            'pending',
            'inprogress',
            'completed',
            'cancelled'
        );
    END IF;

    -- Combat result enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'combat_result') THEN
        CREATE TYPE combat_result AS ENUM (
            'attacker_victory',
            'defender_victory',
            'draw',
            'retreat'
        );
    END IF;
END$$;

-- Grant privileges (for future roles if needed)
GRANT ALL PRIVILEGES ON DATABASE nemeths_domain TO nemeths;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Nemeths Domain database initialized successfully!';
END$$;
