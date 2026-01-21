-- Migration: Remove unused refreshmentType and processType fields
-- Date: 2026-01-20
-- Description: Removes redundant fields that are no longer used in the application

-- Step 1: Remove refreshment_type_id column from certification_rules table
ALTER TABLE certification_rules DROP COLUMN IF EXISTS refreshment_type_id;

-- Step 2: Remove process_type column from employee_certifications table
ALTER TABLE employee_certifications DROP COLUMN IF EXISTS process_type;

-- Step 3: Remove refreshment_type_name column from certification_rule_histories table (snapshot data)
ALTER TABLE certification_rule_histories DROP COLUMN IF EXISTS refreshment_type_name;

-- Step 4: Remove process_type column from employee_certification_histories table (snapshot data)
ALTER TABLE employee_certification_histories DROP COLUMN IF EXISTS process_type;

-- Step 5: Drop the refreshment_types table (no longer needed)
DROP TABLE IF EXISTS refreshment_types;
