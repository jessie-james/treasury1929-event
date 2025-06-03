// Enhanced Stripe loader with multiple fallback strategies
import { loadStripe } from "@stripe/stripe-js";

export interface StripeLoadResult {
  stripe: any | null;
  error: string | null;
  method: string;
}

class StripeLoaderService {
  private static instance: StripeLoaderService;
  private stripeInstance: any | null = null;
  private loadingPromise: Promise<StripeLoadResult> | null = null;
  private lastError: Error | null = null;

  static getInstance(): StripeLoaderService {
    if (!StripeLoaderService.instance) {
      StripeLoaderService.instance = new StripeLoaderService();
    }
    return StripeLoaderService.instance;
  }

  async loadStripeWithFallbacks(): Promise<StripeLoadResult> {
    // Return cached instance if available
    if (this.stripeInstance) {
      return { stripe: this.stripeInstance, error: null, method: "cached" };
    }

    // Return existing loading promise if in progress
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      return { stripe: null, error: "Stripe publishable key is missing", method: "validation" };
    }

    this.loadingPromise = this._attemptStripeLoad(stripeKey);
    const result = await this.loadingPromise;
    this.loadingPromise = null;

    return result;
  }

  private async _attemptStripeLoad(stripeKey: string): Promise<StripeLoadResult> {
    const strategies = [
      () => this._loadStripeStandard(stripeKey),
      () => this._loadStripeWithScript(stripeKey),
      () => this._loadStripeWithTimeout(stripeKey),
      () => this._loadStripeMinimal(stripeKey)
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Attempting Stripe load strategy ${i + 1}/${strategies.length}`);
        const result = await strategies[i]();
        if (result.stripe) {
          this.stripeInstance = result.stripe;
          console.log(`Stripe loaded successfully using strategy ${i + 1}: ${result.method}`);
          return result;
        }
      } catch (error) {
        console.error(`Strategy ${i + 1} failed:`, error);
        this.lastError = error as Error;
      }
    }

    return { 
      stripe: null, 
      error: `All loading strategies failed. Last error: ${this.lastError?.message || 'Unknown error'}`, 
      method: "failed" 
    };
  }

  private async _loadStripeStandard(stripeKey: string): Promise<StripeLoadResult> {
    const stripe = await loadStripe(stripeKey, {
      locale: 'en'
    });
    return { stripe, error: stripe ? null : "Standard load returned null", method: "standard" };
  }

  private async _loadStripeWithScript(stripeKey: string): Promise<StripeLoadResult> {
    return new Promise((resolve) => {
      // Check if Stripe is already loaded globally
      if ((window as any).Stripe) {
        const stripe = (window as any).Stripe(stripeKey);
        resolve({ stripe, error: null, method: "global" });
        return;
      }

      // Load Stripe script manually
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      
      script.onload = () => {
        if ((window as any).Stripe) {
          const stripe = (window as any).Stripe(stripeKey);
          resolve({ stripe, error: null, method: "script" });
        } else {
          resolve({ stripe: null, error: "Stripe script loaded but Stripe not available", method: "script" });
        }
      };

      script.onerror = () => {
        resolve({ stripe: null, error: "Failed to load Stripe script", method: "script" });
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        resolve({ stripe: null, error: "Stripe script load timeout", method: "script" });
      }, 10000);

      document.head.appendChild(script);
    });
  }

  private async _loadStripeWithTimeout(stripeKey: string): Promise<StripeLoadResult> {
    return new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve({ stripe: null, error: "Stripe load timeout (5s)", method: "timeout" });
      }, 5000);

      try {
        const stripe = await loadStripe(stripeKey, {
          locale: 'en',
          apiVersion: '2023-10-16'
        });
        clearTimeout(timeout);
        resolve({ stripe, error: stripe ? null : "Timeout load returned null", method: "timeout" });
      } catch (error) {
        clearTimeout(timeout);
        resolve({ stripe: null, error: `Timeout load failed: ${error}`, method: "timeout" });
      }
    });
  }

  private async _loadStripeMinimal(stripeKey: string): Promise<StripeLoadResult> {
    try {
      const stripe = await loadStripe(stripeKey);
      return { stripe, error: stripe ? null : "Minimal load returned null", method: "minimal" };
    } catch (error) {
      return { stripe: null, error: `Minimal load failed: ${error}`, method: "minimal" };
    }
  }

  reset(): void {
    this.stripeInstance = null;
    this.loadingPromise = null;
    this.lastError = null;
  }

  isLoaded(): boolean {
    return !!this.stripeInstance;
  }

  getLastError(): Error | null {
    return this.lastError;
  }
}

export const stripeLoader = StripeLoaderService.getInstance();