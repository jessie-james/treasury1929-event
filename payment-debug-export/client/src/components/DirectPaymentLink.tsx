import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink } from 'lucide-react';

interface DirectPaymentLinkProps {
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
  buttonText?: string;
  onGenerated?: (reference: string) => void;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
}

/**
 * A component that generates a direct payment link without requiring authentication
 */
export function DirectPaymentLink({
  amount,
  description = 'Complete your payment',
  metadata = {},
  buttonText = 'Pay Now',
  onGenerated,
  className = '',
  variant = 'default'
}: DirectPaymentLinkProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generatePaymentLink = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Make request to generate a payment reference
      const response = await fetch('/api/payment/reference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          metadata: {
            ...metadata,
            description,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate payment link');
      }

      const data = await response.json();

      if (!data.success || !data.reference) {
        throw new Error('Invalid response from server');
      }

      // Construct the payment URL
      const paymentUrl = `${window.location.origin}/standalone-payment/${data.reference}`;
      
      // Save the URL and call the callback if provided
      setPaymentUrl(paymentUrl);
      if (onGenerated) {
        onGenerated(data.reference);
      }

      // Show success message
      toast({
        title: 'Payment Link Generated',
        description: 'Your payment link has been created successfully.',
      });
    } catch (err: any) {
      console.error('Error generating payment link:', err);
      setError(err.message || 'Failed to generate payment link');
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate payment link',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // If we have a payment URL, show it
  if (paymentUrl) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Payment Link Ready</CardTitle>
          <CardDescription>Use the link below to process your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
            {paymentUrl}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setPaymentUrl(null); // Reset to generate a new link
            }}
          >
            Generate New Link
          </Button>
          <Button
            onClick={() => {
              window.open(paymentUrl, '_blank');
            }}
            className="flex items-center gap-1"
          >
            Open Payment Page <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show a button to generate the payment link
  return (
    <Button
      onClick={generatePaymentLink}
      disabled={isGenerating}
      className={className}
      variant={variant}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}