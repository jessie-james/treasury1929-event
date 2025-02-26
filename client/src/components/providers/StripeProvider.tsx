import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ReactNode } from "react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Props {
  children: ReactNode;
  clientSecret?: string;
}

export function StripeProvider({ children, clientSecret }: Props) {
  const options = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe',
    },
  } : undefined;

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}