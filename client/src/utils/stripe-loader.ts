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

    // Try multiple ways to get the Stripe key
    let stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    // Fallback: check if it's available in window object (for deployment scenarios)
    if (!stripeKey && typeof window !== 'undefined') {
      stripeKey = (window as any).__STRIPE_PUBLISHABLE_KEY__;
    }
    
    // Fallback: hardcoded for development (will be replaced by build process)
    if (!stripeKey && import.meta.env.DEV) {
      // This will only work in development mode
      stripeKey = 'pk_test_51QOaSfEHxqQFTPx3kR9d5Sf9FQIFbfvr9JK9zLZ7tVrm3Ygh8Q31HpT3DpD2IqPVbWc0FmzZwqYs6a2k8l5fDNmP006jFELrO5';
    }
    
    console.log('Environment check:', {
      hasKey: !!stripeKey,
      keyPrefix: stripeKey ? stripeKey.substring(0, 10) + '...' : 'undefined',
      envMode: import.meta.env.MODE,
      isDev: import.meta.env.DEV,
      envVars: Object.keys(import.meta.env).filter(key => key.includes('STRIPE'))
    });
    
    if (!stripeKey) {
      console.error('Stripe key missing. Available env vars:', Object.keys(import.meta.env));
      return { stripe: null, error: "Stripe publishable key is missing from environment variables", method: "validation" };
    }

    this.loadingPromise = this._attemptStripeLoad(stripeKey);
    const result = await this.loadingPromise;
    this.loadingPromise = null;

    return result;
  }

  private async _attemptStripeLoad(stripeKey: string): Promise<StripeLoadResult> {
    console.log(`Starting Stripe load with key prefix: ${stripeKey.substring(0, 10)}...`);
    
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
        console.log(`Strategy ${i + 1} result:`, { success: !!result.stripe, error: result.error, method: result.method });
        
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

    const finalError = `All loading strategies failed. Last error: ${this.lastError?.message || 'Unknown error'}`;
    console.error(finalError);
    return { 
      stripe: null, 
      error: finalError, 
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
        try {
          const stripe = (window as any).Stripe(stripeKey);
          resolve({ stripe, error: null, method: "global" });
          return;
        } catch (error) {
          console.error('Error initializing existing Stripe:', error);
        }
      }

      // Remove any existing Stripe scripts
      const existingScripts = document.querySelectorAll('script[src*="stripe.com"]');
      existingScripts.forEach(script => script.remove());

      // Load Stripe script manually with multiple CDN fallbacks
      const scriptUrls = [
        'https://js.stripe.com/v3/',
        'https://cdn.jsdelivr.net/npm/@stripe/stripe-js@latest/dist/stripe.umd.min.js'
      ];

      let scriptIndex = 0;

      const tryLoadScript = () => {
        if (scriptIndex >= scriptUrls.length) {
          resolve({ stripe: null, error: "All Stripe CDN sources failed", method: "script" });
          return;
        }

        const script = document.createElement('script');
        script.src = scriptUrls[scriptIndex];
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          console.log(`Stripe script loaded from: ${scriptUrls[scriptIndex]}`);
          
          // Wait a bit for Stripe to be available
          setTimeout(() => {
            if ((window as any).Stripe) {
              try {
                const stripe = (window as any).Stripe(stripeKey);
                resolve({ stripe, error: null, method: "script" });
              } catch (error) {
                console.error('Error initializing Stripe after script load:', error);
                resolve({ stripe: null, error: `Stripe initialization failed: ${error}`, method: "script" });
              }
            } else {
              console.error('Stripe script loaded but Stripe object not available');
              resolve({ stripe: null, error: "Stripe script loaded but Stripe not available", method: "script" });
            }
          }, 100);
        };

        script.onerror = () => {
          console.error(`Failed to load Stripe from: ${scriptUrls[scriptIndex]}`);
          scriptIndex++;
          tryLoadScript();
        };

        document.head.appendChild(script);
      };

      // Timeout after 15 seconds total
      setTimeout(() => {
        resolve({ stripe: null, error: "Stripe script load timeout", method: "script" });
      }, 15000);

      tryLoadScript();
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