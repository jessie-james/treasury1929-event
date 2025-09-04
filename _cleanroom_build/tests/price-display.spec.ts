import { describe, it, expect } from 'vitest';
import { formatPriceDisplay, getEffectivePriceCents } from '../client/src/lib/price';
import type { Event } from '../shared/schema';

describe('Price Display Logic', () => {
  describe('formatPriceDisplay', () => {
    it('should display $130 with tax & gratuity for full events with basePrice 13000', () => {
      const fullEvent: Partial<Event> = {
        eventType: 'full',
        basePrice: 13000,
        ticketPrice: 5000 // This should be ignored
      };
      
      const result = formatPriceDisplay(fullEvent as Event);
      expect(result).toBe('$130 per guest — tax & gratuity included');
    });

    it('should use basePrice and ignore ticketPrice for full events', () => {
      const fullEvent: Partial<Event> = {
        eventType: 'full',
        basePrice: 15000, // $150
        ticketPrice: 5000 // Should be ignored
      };
      
      const result = formatPriceDisplay(fullEvent as Event);
      expect(result).toBe('$150 per guest — tax & gratuity included');
    });

    it('should display ticket price for ticket-only events', () => {
      const ticketEvent: Partial<Event> = {
        eventType: 'ticket-only',
        basePrice: 13000, // Should be ignored
        ticketPrice: 5000 // $50
      };
      
      const result = formatPriceDisplay(ticketEvent as Event);
      expect(result).toBe('$50 per ticket');
    });

    it('should default to $130 for full events without basePrice', () => {
      const fullEvent: Partial<Event> = {
        eventType: 'full',
        basePrice: null,
        ticketPrice: 5000
      };
      
      const result = formatPriceDisplay(fullEvent as Event);
      expect(result).toBe('$130 per guest — tax & gratuity included');
    });

    it('should never show $50 for full events even if basePrice is missing', () => {
      const fullEvent: Partial<Event> = {
        eventType: 'full',
        basePrice: null,
        ticketPrice: 5000
      };
      
      const result = formatPriceDisplay(fullEvent as Event);
      expect(result).not.toContain('$50');
      expect(result).toBe('$130 per guest — tax & gratuity included');
    });
  });

  describe('getEffectivePriceCents', () => {
    it('should return basePrice for full events', () => {
      const fullEvent: Partial<Event> = {
        eventType: 'full',
        basePrice: 13000,
        ticketPrice: 5000
      };
      
      const result = getEffectivePriceCents(fullEvent as Event);
      expect(result).toBe(13000);
    });

    it('should return ticketPrice for ticket-only events', () => {
      const ticketEvent: Partial<Event> = {
        eventType: 'ticket-only',
        basePrice: 13000,
        ticketPrice: 5000
      };
      
      const result = getEffectivePriceCents(ticketEvent as Event);
      expect(result).toBe(5000);
    });

    it('should default to 13000 cents for full events without basePrice', () => {
      const fullEvent: Partial<Event> = {
        eventType: 'full',
        basePrice: null,
        ticketPrice: 5000
      };
      
      const result = getEffectivePriceCents(fullEvent as Event);
      expect(result).toBe(13000);
    });
  });

  describe('September 2025 Events Pricing', () => {
    const septemberEvent: Partial<Event> = {
      eventType: 'full',
      basePrice: 13000,
      title: 'An Evening of Fine Dining & Music'
    };

    it('should display $130 per guest for September events', () => {
      const result = formatPriceDisplay(septemberEvent as Event);
      expect(result).toBe('$130 per guest — tax & gratuity included');
    });

    it('should never display $50 for September events', () => {
      const result = formatPriceDisplay(septemberEvent as Event);
      expect(result).not.toContain('$50');
    });
  });
});