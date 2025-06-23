import { QueryClient, QueryFunction, QueryClientConfig, QueryCache, MutationCache } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      // Try to parse the response as JSON first
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.clone().json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // Fallback to text if not JSON
        errorMessage = await res.text();
      }
    } catch (e) {
      console.error("Error parsing error response:", e);
      // If JSON parsing fails, try to get text
      try {
        errorMessage = await res.text();
      } catch (textError) {
        errorMessage = "Unknown error occurred";
      }
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

// Helper to get the absolute base URL in the current environment
function getBaseUrl(): string {
  // Check if we're in a deployed environment by looking at the hostname
  const hostname = window.location.hostname;
  const isDeployed = hostname.includes('.replit.app') || hostname.includes('.repl.co');
  
  if (isDeployed) {
    // Use the current location's origin for deployed environments
    return window.location.origin;
  } else {
    // Use relative paths for development/preview
    return '';
  }
}

export async function apiRequest(
  urlOrOptions: string | { method: string; url?: string; data?: unknown },
  urlOrData?: string | unknown,
  data?: unknown
): Promise<Response> {
  // Handle overloaded function parameters
  let method: string;
  let url: string;
  let bodyData: unknown | undefined;
  
  if (typeof urlOrOptions === 'string') {
    // First form: apiRequest('GET', '/api/data') or apiRequest('POST', '/api/data', { name: 'test' })
    method = urlOrOptions;
    url = urlOrData as string;
    bodyData = data;
  } else {
    // Second form: apiRequest({ method: 'POST', url: '/api/data', data: { name: 'test' } })
    method = urlOrOptions.method;
    url = urlOrOptions.url || urlOrData as string;
    bodyData = urlOrOptions.data;
  }
  
  try {
    // Set a timeout of 15 seconds for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    // If the URL starts with a slash and we're in a deployed environment,
    // prepend the origin to make it absolute
    if (url.startsWith('/')) {
      const baseUrl = getBaseUrl();
      url = `${baseUrl}${url}`;
    }
    
    // Log the full URL to help with debugging
    console.log(`API Request: ${method} ${url}`);
    
    // For deployment environment compatibility, add more headers
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest", // Helps with CORS detection
    };
    
    if (bodyData) {
      headers["Content-Type"] = "application/json";
    }
    
    // Add Origin header to help with CORS in deployment
    const origin = window.location.origin;
    headers["Origin"] = origin;
    
    // Detect if this is a payment request and add the payment token if available
    if (url.includes('/api/create-payment-intent') || url.includes('/api/bookings')) {
      const paymentToken = localStorage.getItem('payment_token');
      if (paymentToken && bodyData && typeof bodyData === 'object') {
        // Add token to request body
        bodyData = { ...bodyData, paymentToken };
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body: bodyData ? JSON.stringify(bodyData) : undefined,
      credentials: "include", // Send cookies with cross-origin requests
      mode: "cors", // Enable CORS for cross-origin requests
      cache: "no-cache", // Don't cache authentication-related requests
      signal: controller.signal
    });
    
    // Clear the timeout since the request has completed
    clearTimeout(timeoutId);

    // Check if this is a Stripe-related request
    const isStripeRequest = url.includes('/api/create-payment-intent') || 
                           url.includes('/api/stripe');
    
    // Special handling for payment-related endpoints
    if (isStripeRequest && !res.ok) {
      console.error(`Payment service error (${res.status}): ${url}`);
      
      try {
        // Try to parse the error response
        const errorData = await res.json();
        
        // Create a new response with payment-specific metadata
        const paymentErrorResponse = new Response(
          JSON.stringify({ 
            error: errorData.error || "Payment service unavailable",
            code: errorData.code || "PAYMENT_ERROR",
            detail: errorData.detail || "There was an issue processing your payment."
          }),
          { 
            status: res.status,
            headers: { "Content-Type": "application/json" }
          }
        );
        
        // Add special property for payment errors
        Object.defineProperty(paymentErrorResponse, 'isPaymentError', {
          value: true,
          writable: false
        });
        
        return paymentErrorResponse;
      } catch (parseError) {
        // If we can't parse the response, fall through to normal error handling
        console.error("Failed to parse payment error response:", parseError);
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Handle network errors (like failed connection attempts)
    console.error(`Network error with ${method} request to ${url}:`, error);
    
    // Check if this is a timeout error
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    
    // Check if this is a payment-related endpoint
    const isStripeRequest = url.includes('/api/create-payment-intent') || 
                           url.includes('/api/stripe');
    
    // Create a custom response with relevant error details
    const errorResponse = new Response(
      JSON.stringify({ 
        error: isTimeout ? "Request timed out" : "Network error",
        message: error instanceof Error 
          ? error.message 
          : "Failed to connect to server",
        isPaymentRequest: isStripeRequest,
        isTimeout: isTimeout
      }),
      { 
        status: isTimeout ? 408 : 503, // 408 Request Timeout or 503 Service Unavailable
        headers: { "Content-Type": "application/json" }
      }
    );
    
    // Set custom properties so we can detect specific error types
    Object.defineProperty(errorResponse, 'isNetworkError', {
      value: true,
      writable: false
    });
    
    if (isTimeout) {
      Object.defineProperty(errorResponse, 'isTimeoutError', {
        value: true,
        writable: false
      });
    }
    
    if (isStripeRequest) {
      Object.defineProperty(errorResponse, 'isPaymentError', {
        value: true,
        writable: false
      });
    }
    
    return errorResponse;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Get URL from query key
      let url = queryKey[0] as string;
      
      // If the URL starts with a slash and we're in a deployed environment,
      // prepend the origin to make it absolute
      if (url.startsWith('/')) {
        const baseUrl = getBaseUrl();
        url = `${baseUrl}${url}`;
      }
      
      // Log the full URL to help with debugging
      console.log(`Query Request: GET ${url}`);
      
      // Add Origin header to help with CORS in deployment
      const origin = window.location.origin;
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin
      };
      
      // Use the same cross-domain compatible options as the apiRequest function
      const res = await fetch(url, {
        method: 'GET',
        headers,
        credentials: "include",
        mode: "cors",
        cache: "no-cache"
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Auth query returned 401 for ${url}, returning null as expected`);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Enhanced error handling for auth queries
      if (unauthorizedBehavior === "returnNull") {
        // For auth queries, always return null on any error to prevent unhandled rejections
        if (error instanceof Error && error.message.includes('401')) {
          console.log(`Auth query failed with 401 for ${queryKey[0]}, returning null as expected`);
        } else {
          console.log(`Auth query failed for ${queryKey[0]}, returning null to prevent rejection`);
        }
        return null;
      }
      
      // Log detailed error information to help with debugging
      console.error(`Network error in query to ${queryKey[0]}:`, error);
      
      // Rethrow so the query state will be set to error
      throw new Error(
        error instanceof Error 
          ? `Network error: ${error.message}` 
          : "Failed to connect to server. Please check your internet connection."
      );
    }
  };

// Create a global error handler for the query client
const queryErrorHandler = (error: unknown) => {
  // Log all query errors for debugging
  console.error('Query error:', error);
  
  // Don't add UI handling here, let component-level error states handle the UI
  // This handler ensures errors are always logged but don't cause unhandled rejections
};

// Create a logger function for errors
const logError = (error: unknown) => {
  console.error('Query/mutation error:', error);
};

// Create the client with better error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry auth errors or client errors
        if (error instanceof Error && (error.message.includes('401') || error.message.startsWith('4'))) {
          return false;
        }
        return failureCount < 1; // Only retry once for network errors
      },
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error: unknown, query) => {
      // Log but don't throw to prevent unhandled rejections
      if (error instanceof Error && !error.message.includes('401')) {
        console.warn(`Query error for ${query.queryKey}:`, error.message);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: unknown, variables, context, mutation) => {
      // Log but don't throw to prevent unhandled rejections
      console.warn(`Mutation error:`, error);
    },
  }),
});

// Enhanced global error handler for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  
  const error = event.reason;
  
  // Filter out expected auth and query errors
  if (error?.message?.includes('401') || 
      error?.message?.includes('Not authenticated') ||
      error?.message?.includes('Query') ||
      error?.message?.includes('TanStack') ||
      error?.message?.includes('vite') ||
      error?.message?.includes('does not provide an export') ||
      error?.name === 'AbortError') {
    return; // Silently ignore these expected errors
  }
  
  // Log unexpected errors for debugging
  if (error instanceof Error) {
    console.warn('Unhandled promise rejection:', error.message);
  }
});
