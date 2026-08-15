// Minimal ambient types for the PayPal JS SDK (`https://www.paypal.com/sdk/js`),
// loaded dynamically in src/routes/upgrade.tsx. This isn't an npm package —
// it's a script tag — so there's no @types package to install instead.

interface PayPalButtonsOptions {
  style?: {
    shape?: "pill" | "rect";
    color?: "gold" | "blue" | "silver" | "white" | "black";
    layout?: "vertical" | "horizontal";
    label?: "subscribe" | "paypal" | "checkout" | "pay";
  };
  createSubscription?: (
    data: unknown,
    actions: { subscription: { create: (opts: { plan_id: string }) => Promise<string> } },
  ) => Promise<string>;
  onApprove?: (data: { subscriptionID: string }) => void | Promise<void>;
  onError?: (err: unknown) => void;
  onCancel?: (data: unknown) => void;
}

interface PayPalButtonsInstance {
  render: (container: HTMLElement) => void;
}

interface PayPalNamespace {
  Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
}
