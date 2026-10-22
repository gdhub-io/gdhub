import { PaymentProvider } from "@gdhub-io/gdhub-prisma";
import { CHECKPOINT_PAYMENT_PROVIDER } from "@/config/checkpoint";
import { paddleGateway } from "./paddle";
import { stripeGateway } from "./stripe";
import type { PaymentGateway } from "./types";

export * from "./types";

const gateways: Record<PaymentProvider, PaymentGateway> = {
	[PaymentProvider.STRIPE]: stripeGateway,
	[PaymentProvider.PADDLE]: paddleGateway,
};

/** The provider that took a payment: everything after its checkout goes back there. */
export const gatewayFor = (provider: PaymentProvider) => gateways[provider];

/** The provider new checkpoint checkouts and promotion codes go to. */
export const checkoutGateway = () => gateways[CHECKPOINT_PAYMENT_PROVIDER];
