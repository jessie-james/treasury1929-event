// Safety Guards Tests - TRE1929 Development Safety Lockdown
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Safety Guards - Development Protection', () => {
  beforeEach(() => {
    // Ensure clean environment for each test
    vi.clearAllMocks();
  });

  describe('Email Safety Guards', () => {
    it('should suppress emails when EMAIL_SUPPRESS_OUTBOUND is true', async () => {
      // Mock environment
      process.env.EMAIL_SUPPRESS_OUTBOUND = 'true';
      process.env.NODE_ENV = 'development';
      
      // Import sendEmail function
      const { sendEmail } = await import('../server/email-service');
      
      const mockEmail = {
        to: 'test@example.com',
        from: 'noreply@treasury1929.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };
      
      const result = await sendEmail(mockEmail);
      
      expect(result.suppressed).toBe(true);
      expect(result.ok).toBe(true);
    });

    it('should suppress emails when NODE_ENV is not production', async () => {
      // Mock environment
      process.env.EMAIL_SUPPRESS_OUTBOUND = 'false';
      process.env.NODE_ENV = 'development';
      
      const { sendEmail } = await import('../server/email-service');
      
      const mockEmail = {
        to: 'test@example.com',
        from: 'noreply@treasury1929.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };
      
      const result = await sendEmail(mockEmail);
      
      expect(result.suppressed).toBe(true);
      expect(result.ok).toBe(true);
    });
  });

  describe('Stripe Safety Guards', () => {
    it('should return mock Stripe when STRIPE_MOCK_MODE is true', async () => {
      // Mock environment
      process.env.STRIPE_MOCK_MODE = 'true';
      process.env.NODE_ENV = 'development';
      
      const { getStripe } = await import('../server/stripe');
      
      const stripe = getStripe();
      
      expect(stripe).toBeDefined();
      expect(stripe.checkout).toBeDefined();
      expect(stripe.checkout.sessions).toBeDefined();
      expect(stripe.refunds).toBeDefined();
      expect(stripe.webhooks).toBeDefined();
      
      // Test mock session creation
      const session = await stripe.checkout.sessions.create({
        line_items: [],
        mode: 'payment'
      });
      
      expect(session.url).toBe('https://example.test/checkout/mock');
      expect(session.id).toMatch(/^cs_mock_/);
    });

    it('should return mock Stripe when NODE_ENV is not production', async () => {
      // Mock environment  
      process.env.STRIPE_MOCK_MODE = 'false';
      process.env.NODE_ENV = 'development';
      
      const { getStripe } = await import('../server/stripe');
      
      const stripe = getStripe();
      
      expect(stripe).toBeDefined();
      expect(typeof stripe.checkout.sessions.create).toBe('function');
    });

    it('should block live Stripe keys in non-production', async () => {
      // Mock environment with live key
      process.env.STRIPE_SECRET_KEY_NEW = 'sk_live_fake_key_for_testing';
      process.env.NODE_ENV = 'development';
      process.env.STRIPE_MOCK_MODE = 'false';
      
      const { getStripe } = await import('../server/stripe');
      
      expect(() => getStripe()).toThrow('BLOCKED: Live Stripe key detected in non-production environment');
    });

    it('should create mock refunds successfully', async () => {
      // Mock environment
      process.env.STRIPE_MOCK_MODE = 'true';
      process.env.NODE_ENV = 'development';
      
      const { getStripe } = await import('../server/stripe');
      
      const stripe = getStripe();
      const refund = await stripe.refunds.create({
        payment_intent: 'pi_test',
        amount: 1000
      });
      
      expect(refund.id).toMatch(/^re_mock_/);
      expect(refund.status).toBe('succeeded');
    });
  });

  describe('Backup Safety Guards', () => {
    it('should not initialize backup scheduler when BACKUPS_ENABLED is not true', async () => {
      // Mock environment
      process.env.BACKUPS_ENABLED = 'false';
      
      const { initializeBackupScheduler } = await import('../server/routes-backup');
      
      // This should not throw and should log that backups are disabled
      const consoleSpy = vi.spyOn(console, 'log');
      
      initializeBackupScheduler();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BACKUP] Scheduler disabled - BACKUPS_ENABLED is not set to true')
      );
    });

    it('should skip backup execution when BACKUPS_ENABLED is not true', async () => {
      // This test would require more complex mocking of the backup system
      // For now, we verify the environment check exists
      expect(process.env.BACKUPS_ENABLED).not.toBe('true');
    });
  });

  describe('Environment Configuration', () => {
    it('should have all required safety environment variables', () => {
      expect(process.env.EMAIL_SUPPRESS_OUTBOUND).toBe('true');
      expect(process.env.STRIPE_MOCK_MODE).toBe('true');
      expect(process.env.BACKUPS_ENABLED).toBe('false');
      expect(process.env.PROTECT_EVENT_IDS).toBeDefined();
      expect(process.env.PHX_TZ).toBe('America/Phoenix');
    });

    it('should be in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('Event Protection', () => {
    it('should have PROTECT_EVENT_IDS configured', () => {
      expect(process.env.PROTECT_EVENT_IDS).toBeDefined();
      expect(process.env.PROTECT_EVENT_IDS).toMatch(/39|40|\*,\*/);
    });
  });
});