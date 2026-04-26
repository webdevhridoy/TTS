import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_fallback", {
  apiVersion: "2024-06-20",
  appInfo: {
    name: "Sawti TTS SaaS",
    version: "0.1.0",
  },
});
