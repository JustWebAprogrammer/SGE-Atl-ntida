-- Add emitido_por column to PagamentoPropina table
-- This migration handles the addition of the emitido_por field safely,
-- even when there are existing NULL values in the database

-- Step 1: Add the column as nullable initially
ALTER TABLE "PagamentoPropina" 
ADD COLUMN "emitido_por" TEXT;

-- Step 2: Update all existing NULL values to 'sistema' (the default)
UPDATE "PagamentoPropina" 
SET "emitido_por" = 'sistema' 
WHERE "emitido_por" IS NULL;

-- Step 3: Make the column required with a default value
ALTER TABLE "PagamentoPropina" 
ALTER COLUMN "emitido_por" SET NOT NULL,
ALTER COLUMN "emitido_por" SET DEFAULT 'sistema';