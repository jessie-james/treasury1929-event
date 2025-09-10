import { vi } from 'vitest';

// Simple mock SendGrid for tests
export const mockEmailService = {
  send: vi.fn().mockResolvedValue({ statusCode: 202, body: 'EMAIL_SENT' }),
  sendMultiple: vi.fn().mockResolvedValue({ statusCode: 202, body: 'EMAILS_SENT' }),
  setApiKey: vi.fn(),
};

// Reset mocks between tests
export function resetMocks() {
  vi.clearAllMocks();
}

// Basic test environment setup (simplified)
export function setupMocks() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_SUPPRESS_OUTBOUND = 'true';
  process.env.BACKUPS_ENABLED = 'false';
  process.env.PHX_TZ = 'America/Phoenix';
  
  // Only mock SendGrid for tests
  vi.doMock('@sendgrid/mail', () => ({
    default: mockEmailService,
    setApiKey: mockEmailService.setApiKey,
    send: mockEmailService.send,
  }));
  
  console.log('🧪 Simple test environment configured');
  console.log('  - EMAIL_SUPPRESS_OUTBOUND=true (no real emails)');
  console.log('  - Use test Stripe keys for payments');
}