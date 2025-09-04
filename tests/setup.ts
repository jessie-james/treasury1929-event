import '@testing-library/jest-dom';
import { beforeAll } from 'vitest';

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_SUPPRESS_OUTBOUND = 'true';
  process.env.BACKUPS_ENABLED = 'false';
  process.env.STRIPE_MOCK_MODE = 'true';
  process.env.PROTECT_EVENT_IDS = '*,*';
  process.env.PHX_TZ = 'America/Phoenix';
});