import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { DirectPaymentLink } from "@/components/DirectPaymentLink";

export default function PaymentLinksPage() {
  const [amount, setAmount] = useState("19.99");
  const [description, setDescription] = useState("Event ticket payment");
  const [note, setNote] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [reference, setReference] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and a single decimal point
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Payment link copied to clipboard",
      });
      
      // Reset the copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle when a payment link is generated
  const handlePaymentLinkGenerated = (ref: string) => {
    setReference(ref);
    const url = `${window.location.origin}/standalone-payment/${ref}`;
    setPaymentUrl(url);
  };

  const validateForm = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Payment Links</h1>
      
      {/* Payment Link Generator Form */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Generate Payment Link</CardTitle>
              <CardDescription>
                Create a direct payment link that can be sent to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Payment Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter payment description"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name (optional)</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email (optional)</Label>
                <Input
                  id="customerEmail"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter customer email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="note">Internal Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter internal note (not shown to customer)"
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <DirectPaymentLink
                amount={parseFloat(amount) || 0}
                description={description}
                metadata={{
                  customerName,
                  customerEmail,
                  note,
                  createdBy: "admin",
                  type: "manual_payment_link"
                }}
                buttonText="Generate Payment Link"
                className="w-full"
                onGenerated={handlePaymentLinkGenerated}
              />
            </CardFooter>
          </Card>
        </div>
        
        {/* Payment Link Result */}
        <div>
          {paymentUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>Payment Link Created</CardTitle>
                <CardDescription>
                  Share this link with your customer to collect payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Payment Details</Label>
                  <div className="bg-muted px-3 py-2 rounded-md mt-1">
                    <p className="font-medium">${parseFloat(amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    {customerName && (
                      <p className="text-sm mt-1">Customer: {customerName}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Payment Link</Label>
                  <div className="flex mt-1">
                    <div className="flex-1 bg-muted px-3 py-2 rounded-l-md font-mono text-sm break-all">
                      {paymentUrl}
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-l-none"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset for new link
                    setPaymentUrl("");
                    setReference("");
                  }}
                >
                  Create Another
                </Button>
                <Button
                  onClick={() => window.open(paymentUrl, '_blank')}
                  className="flex items-center"
                >
                  Open Payment Page <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>How to use payment links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Benefits of Payment Links</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li>No login required for customers to pay</li>
                    <li>Works on any device with a web browser</li>
                    <li>Secure Stripe payment processing</li>
                    <li>Track payments in the admin dashboard</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium">How to Use</h3>
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                    <li>Enter payment details and optional customer information</li>
                    <li>Click "Generate Payment Link"</li>
                    <li>Copy the link and send it to your customer</li>
                    <li>Customer completes payment on the secure payment page</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}