-- 249_01_fix_enums.sql
-- Run this file FIRST to update the enum type.
-- This must be committed before running the rest of the migration.

ALTER TYPE public.stock_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE public.stock_status ADD VALUE IF NOT EXISTS 'shipped';
