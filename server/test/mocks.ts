import { vi } from 'vitest';

// Mock SendGrid email service
export const mockEmailService = {
  send: vi.fn().mockResolvedValue({ statusCode: 202, body: 'MOCKED' }),
  sendMultiple: vi.fn().mockResolvedValue({ statusCode: 202, body: 'MOCKED' }),
  setApiKey: vi.fn(),
};

// Mock Stripe service
export const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: 'cs_test_mock_session_id',
        url: 'https://checkout.stripe.com/c/pay/mock-session-url',
        payment_status: 'unpaid',
        metadata: {}
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'cs_test_mock_session_id',
        payment_status: 'paid',
        metadata: {
          eventId: '1',
          tableId: '1',
          partySize: '2',
          selectedVenue: '1'
        }
      })
    }
  },
  webhooks: {
    constructEvent: vi.fn().mockReturnValue({
      id: 'evt_mock_webhook_id',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock_session_id',
          payment_status: 'paid'
        }
      }
    })
  },
  paymentIntents: {
    create: vi.fn().mockResolvedValue({
      id: 'pi_mock_payment_intent',
      client_secret: 'pi_mock_secret',
      status: 'requires_payment_method'
    })
  }
};

// Set up all mocks
export function setupMocks() {
  // Mock environment variables for test mode
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_SUPPRESS_OUTBOUND = 'true';
  process.env.BACKUPS_ENABLED = 'false';
  process.env.STRIPE_MOCK_MODE = 'true';
  process.env.PROTECT_EVENT_IDS = '*,*';
  process.env.PHX_TZ = 'America/Phoenix';
  
  // Mock SendGrid module
  vi.doMock('@sendgrid/mail', () => ({
    default: mockEmailService,
    setApiKey: mockEmailService.setApiKey,
    send: mockEmailService.send,
  }));
  
  // Mock Stripe module
  vi.doMock('stripe', () => ({
    default: vi.fn(() => mockStripe)
  }));
  
  console.log('🎭 Test mocks configured');
  console.log('  - EMAIL_SUPPRESS_OUTBOUND=true');
  console.log('  - STRIPE_MOCK_MODE=true');
  console.log('  - SendGrid mocked');
  console.log('  - Stripe mocked');
}

export function resetMocks() {
  vi.clearAllMocks();
}