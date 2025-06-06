import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'running' | 'success' | 'failed';
  message: string;
  details?: any;
}

export function PaymentDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateDiagnostic = (test: string, status: DiagnosticResult['status'], message: string, details?: any) => {
    setDiagnostics(prev => {
      const filtered = prev.filter(d => d.test !== test);
      return [...filtered, { test, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    // Test 1: Environment Variables
    updateDiagnostic('env', 'running', 'Checking environment variables...');
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      updateDiagnostic('env', 'failed', 'VITE_STRIPE_PUBLISHABLE_KEY is missing');
    } else if (!stripeKey.startsWith('pk_')) {
      updateDiagnostic('env', 'failed', 'Invalid Stripe key format', { keyPrefix: stripeKey.substring(0, 10) });
    } else {
      updateDiagnostic('env', 'success', 'Stripe publishable key found', { 
        keyType: stripeKey.startsWith('pk_test_') ? 'test' : 'live',
        keyPrefix: stripeKey.substring(0, 12)
      });
    }

    // Test 2: CDN Connectivity
    updateDiagnostic('cdn', 'running', 'Testing Stripe CDN connectivity...');
    try {
      const response = await fetch('https://js.stripe.com/v3/', { method: 'HEAD' });
      if (response.ok) {
        updateDiagnostic('cdn', 'success', 'Stripe CDN is accessible');
      } else {
        updateDiagnostic('cdn', 'failed', `CDN returned status: ${response.status}`);
      }
    } catch (error) {
      updateDiagnostic('cdn', 'failed', 'Cannot reach Stripe CDN', { error: (error as Error).message });
    }

    // Test 3: Network Environment
    updateDiagnostic('network', 'running', 'Analyzing network environment...');
    const networkInfo = {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
    updateDiagnostic('network', 'success', 'Network environment analyzed', networkInfo);

    // Test 4: Script Loading
    updateDiagnostic('script', 'running', 'Testing manual script loading...');
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = resolve;
        script.onerror = reject;
        script.timeout = 10000;
        document.head.appendChild(script);
        
        setTimeout(() => {
          document.head.removeChild(script);
          reject(new Error('Script load timeout'));
        }, 10000);
      });
      
      if ((window as any).Stripe) {
        updateDiagnostic('script', 'success', 'Stripe script loaded successfully');
      } else {
        updateDiagnostic('script', 'failed', 'Script loaded but Stripe object not available');
      }
    } catch (error) {
      updateDiagnostic('script', 'failed', 'Script loading failed', { error: error.message });
    }

    // Test 5: Alternative CDN
    updateDiagnostic('alt-cdn', 'running', 'Testing alternative CDN access...');
    try {
      const response = await fetch('https://cdn.jsdelivr.net/npm/@stripe/stripe-js@latest/dist/stripe.js', { method: 'HEAD' });
      if (response.ok) {
        updateDiagnostic('alt-cdn', 'success', 'Alternative CDN accessible');
      } else {
        updateDiagnostic('alt-cdn', 'failed', 'Alternative CDN not accessible');
      }
    } catch (error) {
      updateDiagnostic('alt-cdn', 'failed', 'Alternative CDN test failed', { error: error.message });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span>Payment System Diagnostics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {diagnostics.map((diagnostic) => (
            <div key={diagnostic.test} className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {diagnostic.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {diagnostic.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {diagnostic.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{diagnostic.test.toUpperCase()}</div>
                <div className="text-sm text-gray-600">{diagnostic.message}</div>
                {diagnostic.details && (
                  <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(diagnostic.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? 'Running...' : 'Re-run Diagnostics'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}