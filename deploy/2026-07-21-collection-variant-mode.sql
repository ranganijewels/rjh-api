-- Deploy SQL for the collection-variant feature (e.g. an "Initials" collection
-- where every member product is a variant of every other, switchable on the PDP).
-- Live DB runs with synchronize:false, so new columns ship as explicit DDL.
-- Run as postgres:  sudo -u postgres psql -d rjhouse_db -f <this file>

ALTER TABLE jeos_collections
  ADD COLUMN IF NOT EXISTS variant_mode boolean NOT NULL DEFAULT false;
