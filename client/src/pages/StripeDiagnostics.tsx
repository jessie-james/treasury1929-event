import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";

// Define the response type from our diagnostics endpoint
interface DiagnosticsResponse {
  timestamp: string;
  overall: {
    initialized: boolean;
    connected: boolean;
    authenticated: boolean;
    ready: boolean;
  };
  diagnostics: {
    environment: {
      nodeEnv: string;
      hasStripeSecretKey: boolean;
      stripeSecretKeyPrefix: string;
      stripeApiVersionConfigured: string;
      deployedUrl: string;
    };
    stripeInstance: {
      initialized: boolean;
      apiVersion: string;
    };
    tests: {
      connectivity: {
        success: boolean;
        startTime: string;
        endTime: string | null;
        durationMs: number;
        statusCode?: number;
        statusText?: string;
        error: {
          message: string;
          details: string;
          code: string;
        } | null;
      };
      authentication: {
        success: boolean;
        startTime: string;
        endTime: string | null;
        durationMs: number;
        hasResults?: boolean;
        error: {
          message: string;
          details: string;
          type: string;
          code: string;
          statusCode: number;
        } | null;
      };
    };
  };
}

export default function StripeDiagnostics() {
  const [expanded, setExpanded] = useState(false);
  
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery<DiagnosticsResponse>({ 
    queryKey: ['/api/stripe-diagnostics'],
    enabled: false // Don't fetch automatically on component mount
  });

  // Helper to safely access data with proper typing
  const diagnosticsData = data as DiagnosticsResponse | undefined;

  const runDiagnostics = () => {
    refetch();
  };

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <span>Stripe Payment Diagnostics</span>
            {diagnosticsData?.overall && (
              diagnosticsData.overall.ready 
                ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                : <XCircle className="h-5 w-5 text-red-500" />
            )}
          </CardTitle>
          <CardDescription>
            Test connectivity and authentication with the Stripe payment service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || isFetching ? (
            <div className="py-10 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-center text-muted-foreground">Running Stripe diagnostics...</p>
            </div>
          ) : isError ? (
            <div className="py-6 text-center space-y-2">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
              <h3 className="font-semibold text-lg text-destructive">Diagnostic Tool Error</h3>
              <p className="text-muted-foreground">{error instanceof Error ? error.message : "An error occurred running diagnostics"}</p>
            </div>
          ) : diagnosticsData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className={`shadow-sm ${diagnosticsData.overall.initialized ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Stripe Initialized</h3>
                      {diagnosticsData.overall.initialized 
                        ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                        : <XCircle className="h-5 w-5 text-red-500" />
                      }
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {diagnosticsData.overall.initialized 
                        ? "Stripe library successfully initialized" 
                        : "Failed to initialize Stripe library"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className={`shadow-sm ${diagnosticsData.overall.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Network Connectivity</h3>
                      {diagnosticsData.overall.connected 
                        ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                        : <XCircle className="h-5 w-5 text-red-500" />
                      }
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {diagnosticsData.overall.connected 
                        ? "Can reach Stripe API servers" 
                        : "Cannot connect to Stripe API servers"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className={`shadow-sm ${diagnosticsData.overall.authenticated ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">API Authentication</h3>
                      {diagnosticsData.overall.authenticated 
                        ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                        : <XCircle className="h-5 w-5 text-red-500" />
                      }
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {diagnosticsData.overall.authenticated 
                        ? "Successfully authenticated with Stripe" 
                        : "Failed to authenticate with Stripe"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className={`shadow-sm ${diagnosticsData.overall.ready ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Payment Ready</h3>
                      {diagnosticsData.overall.ready 
                        ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                        : <XCircle className="h-5 w-5 text-red-500" />
                      }
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {diagnosticsData.overall.ready 
                        ? "Stripe is ready to process payments" 
                        : "Stripe is not ready for payments"}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {!diagnosticsData.overall.ready && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <h3 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span>Payment System Issues Detected</span>
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {!diagnosticsData.overall.initialized && (
                      <li>• Stripe library initialization failed. Check server logs and Stripe secret key.</li>
                    )}
                    {!diagnosticsData.overall.connected && (
                      <li>• Cannot connect to Stripe servers. Check your network connectivity.</li>
                    )}
                    {!diagnosticsData.overall.authenticated && (
                      <li>• Authentication with Stripe failed. Verify your API keys are correct and not expired.</li>
                    )}
                    {diagnosticsData.diagnostics.tests.authentication?.error?.details && (
                      <li className="text-red-600">• {diagnosticsData.diagnostics.tests.authentication.error.details}</li>
                    )}
                  </ul>
                  <div className="mt-3">
                    <a 
                      href="https://dashboard.stripe.com/test/apikeys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary inline-flex items-center"
                    >
                      Check Stripe Dashboard
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
              
              {expanded && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Detailed Diagnostics</h3>
                  <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                    <pre className="text-xs text-gray-800">
                      {JSON.stringify(diagnosticsData.diagnostics, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p>Click "Run Diagnostics" to test Stripe connectivity</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setExpanded(!expanded)}
            disabled={!diagnosticsData}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </Button>
          <Button onClick={runDiagnostics} disabled={isLoading || isFetching}>
            {(isLoading || isFetching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Diagnostics
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stripe Test Mode</CardTitle>
          <CardDescription>
            Your application is configured to use Stripe in test mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Test mode lets you simulate payments without processing real money. Use these test card numbers:
          </p>
          <div className="mt-4 space-y-2">
            <div className="p-3 rounded bg-gray-50 text-sm">
              <div className="font-medium">Successful payment</div>
              <div className="font-mono mt-1">4242 4242 4242 4242</div>
              <div className="text-xs text-muted-foreground mt-1">
                Any future expiration date, any 3-digit CVC
              </div>
            </div>
            <div className="p-3 rounded bg-gray-50 text-sm">
              <div className="font-medium">Payment requires authentication</div>
              <div className="font-mono mt-1">4000 0025 0000 3155</div>
              <div className="text-xs text-muted-foreground mt-1">
                Simulates 3D Secure authentication flow
              </div>
            </div>
            <div className="p-3 rounded bg-gray-50 text-sm">
              <div className="font-medium">Payment declined</div>
              <div className="font-mono mt-1">4000 0000 0000 9995</div>
              <div className="text-xs text-muted-foreground mt-1">
                Simulates a declined payment
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}