import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    // Set a timeout of 10 seconds for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      method,
      headers: bodyData ? { "Content-Type": "application/json" } : {},
      body: bodyData ? JSON.stringify(bodyData) : undefined,
      credentials: "include",
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
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
