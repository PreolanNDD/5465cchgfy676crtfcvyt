/*
  # Rename data_type column to type in trackable_items table

  1. Schema Changes
    - Rename column `data_type` to `type` in trackable_items table
    - This aligns the database schema with the TypeScript interface

  2. Notes
    - This migration fixes the mismatch between database column name and TypeScript interface
    - All existing data will be preserved during the rename operation
*/

-- Rename the data_type column to type
ALTER TABLE trackable_items RENAME COLUMN data_type TO type;