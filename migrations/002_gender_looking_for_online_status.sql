-- Migration: add gender, looking_for, last_active_at to profiles
-- Run once against the target database.

CREATE TYPE gender_option AS ENUM ('male', 'female', 'non_binary', 'diverse', 'not_specified');
CREATE TYPE looking_for_option AS ENUM ('friendship', 'relationship', 'exchange', 'all');

ALTER TABLE profiles
    ADD COLUMN gender       gender_option  NULL DEFAULT NULL,
    ADD COLUMN looking_for  looking_for_option NULL DEFAULT NULL,
    ADD COLUMN last_active_at TIMESTAMPTZ  NULL DEFAULT NULL;

-- Index for online-only filter
CREATE INDEX idx_profiles_last_active_at ON profiles (last_active_at);
