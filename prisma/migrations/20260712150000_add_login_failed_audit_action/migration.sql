-- Add LOGIN_FAILED to audit trail for failed credential login attempts
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILED' AFTER 'LOGIN';
