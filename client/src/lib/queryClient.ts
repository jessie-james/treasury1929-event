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
    const res = await fetch(url, {
      method,
      headers: bodyData ? { "Content-Type": "application/json" } : {},
      body: bodyData ? JSON.stringify(bodyData) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Handle network errors (like failed connection attempts)
    console.error(`Network error with ${method} request to ${url}:`, error);
    
    // Create a custom response to maintain the expected return type
    const errorResponse = new Response(
      JSON.stringify({ 
        error: "Network error", 
        message: error instanceof Error ? error.message : "Failed to connect to server"
      }),
      { 
        status: 503, // Service Unavailable
        headers: { "Content-Type": "application/json" }
      }
    );
    
    // Set a custom property so we can detect it's our custom error
    Object.defineProperty(errorResponse, 'isNetworkError', {
      value: true,
      writable: false
    });
    
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
