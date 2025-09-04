/**
 * NEW PRICING SYSTEM - $130 Per Person Model
 * 
 * This service implements the new flat-rate pricing structure:
 * - $130 per person covers: salad + entrée + dessert selection
 * - Wine selections are additional (priced separately)
 * - No individual food item pricing
 */

export class PricingService {
  private static readonly BASE_PRICE_PER_PERSON = 13000; // $130.00 in cents

  /**
   * Calculate total booking price under new $130 per person model
   * @param partySize Number of people in the party
   * @param wineSelections Array of wine selections with quantities
   * @returns Total price in cents
   */
  static calculateBookingPrice(partySize: number, wineSelections: any[] = []): number {
    // Base price: $130 per person
    const basePrice = this.BASE_PRICE_PER_PERSON * partySize;

    // Calculate wine prices
    const winePrice = wineSelections.reduce((total, wine) => {
      return total + (wine.price * wine.quantity);
    }, 0);

    return basePrice + winePrice;
  }

  /**
   * Get pricing breakdown for display
   * @param partySize Number of people
   * @param wineSelections Wine selections array
   * @returns Detailed pricing breakdown
   */
  static getPricingBreakdown(partySize: number, wineSelections: any[] = []) {
    const basePrice = this.BASE_PRICE_PER_PERSON * partySize;
    const winePrice = wineSelections.reduce((total, wine) => {
      return total + (wine.price * wine.quantity);
    }, 0);

    return {
      basePrice: basePrice,
      basePriceFormatted: `$${(basePrice / 100).toFixed(2)}`,
      baseDescription: `${partySize} person${partySize > 1 ? 's' : ''} × $130.00`,
      winePrice: winePrice,
      winePriceFormatted: `$${(winePrice / 100).toFixed(2)}`,
      wineItems: wineSelections.map(wine => ({
        name: wine.name,
        quantity: wine.quantity,
        unitPrice: `$${(wine.price / 100).toFixed(2)}`,
        lineTotal: `$${((wine.price * wine.quantity) / 100).toFixed(2)}`
      })),
      totalPrice: basePrice + winePrice,
      totalPriceFormatted: `$${((basePrice + winePrice) / 100).toFixed(2)}`
    };
  }

  /**
   * Validate maximum ticket limit for different event types
   * @param eventType Event type ('full' or 'ticket-only')
   * @param requestedQuantity Number of tickets requested
   * @returns Whether the quantity is valid
   */
  static validateTicketQuantity(eventType: string, requestedQuantity: number): boolean {
    if (eventType === 'ticket-only') {
      return requestedQuantity >= 1 && requestedQuantity <= 6;
    }
    // Full events (table-based) allow up to 8 people per table
    return requestedQuantity >= 1 && requestedQuantity <= 8;
  }

  /**
   * Check if food service should be included for this event
   * @param includeFoodService Event food service setting
   * @returns Whether food selection should be shown
   */
  static shouldIncludeFood(includeFoodService: boolean): boolean {
    return includeFoodService;
  }

  /**
   * Check if beverage service should be included for this event
   * @param includeBeverages Event beverage setting
   * @returns Whether beverage selection should be shown
   */
  static shouldIncludeBeverages(includeBeverages: boolean): boolean {
    return includeBeverages;
  }

  /**
   * Check if alcohol service should be included for this event
   * @param includeAlcohol Event alcohol setting
   * @returns Whether alcohol options should be shown
   */
  static shouldIncludeAlcohol(includeAlcohol: boolean): boolean {
    return includeAlcohol;
  }

  /**
   * Get age verification notice for alcohol purchases
   * @returns HTML-safe notice text
   */
  static getAlcoholNotice(): string {
    return "Must be 21+ to purchase alcohol. ID verification required at venue for alcoholic beverages.";
  }

  /**
   * Get mixed drinks notice
   * @returns HTML-safe notice text
   */
  static getMixedDrinksNotice(): string {
    return "Mixed drinks available at venue - arrive 10 minutes early to order.";
  }

  /**
   * Get water service notice
   * @returns HTML-safe notice text
   */
  static getWaterNotice(): string {
    return "Water provided with all meals.";
  }
}