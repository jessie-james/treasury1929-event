import { type Event } from "@shared/schema";

/**
 * Formats price display for events based on event type
 * For 'full' events: uses basePrice ($130 incl. tax & gratuity)
 * For 'ticket-only' events: uses ticketPrice ($50 per ticket)
 */
export function formatPriceDisplay(event: Event): string {
  // Use custom priceDisplay if provided
  if (event.priceDisplay && event.priceDisplay.trim()) {
    return event.priceDisplay;
  }
  
  if (event.eventType === 'full') {
    // For full dinner events, use basePrice and never fall back to ticketPrice
    const priceCents = event.basePrice || 13000; // Default to $130
    return `$${Math.round(priceCents / 100)} per guest — tax & gratuity included`;
  } else if (event.eventType === 'ticket-only') {
    // For ticket-only events, use ticketPrice
    const priceCents = event.ticketPrice || 5000; // Default to $50
    return `$${Math.round(priceCents / 100)} per ticket`;
  }
  
  // Default fallback for unknown event types
  return "$130 per guest — tax & gratuity included";
}

/**
 * Gets the effective price in cents based on event type
 * Used for calculations and API responses
 */
export function getEffectivePriceCents(event: Event): number {
  if (event.eventType === 'full') {
    return event.basePrice || 13000;
  } else if (event.eventType === 'ticket-only') {
    return event.ticketPrice || 5000;
  }
  return 13000; // Default to full event pricing
}

/**
 * Formats just the price amount without additional text
 * Useful for calculation displays
 */
export function formatPriceAmount(event: Event): string {
  const priceCents = getEffectivePriceCents(event);
  return `$${Math.round(priceCents / 100)}`;
}