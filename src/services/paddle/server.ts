// Server-side Paddle API helpers. Uses the secret PADDLE_API_KEY — never import
// this into client components.

import crypto from "node:crypto";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { paddleLive } from "./environment";

/**
 * Verifies a Paddle webhook against the `Paddle-Signature` header
 * (`ts=<unix>;h1=<hex>`): HMAC-SHA256 of `${ts}:${rawBody}` with the
 * destination's secret key, compared in constant time.
 *
 * Pass the RAW request body (not parsed) — any reformatting breaks the hash.
 *
 * If `PADDLE_WEBHOOK_SECRET` is unset, verification is skipped outside of
 * production (so local dev / Paddle "simulate" works without it) and rejected in
 * production (a missing secret there is a misconfiguration).
 *
 * Note: the timestamp is intentionally not range-checked. Our handlers are
 * idempotent, so replay is harmless, and a strict window would risk dropping
 * legitimately delayed/retried deliveries.
 */
export function verifyPaddleWebhook(
	rawBody: string,
	signatureHeader: string | null,
): { ok: boolean; reason?: string } {
	const secret = process.env.PADDLE_WEBHOOK_SECRET;

	if (!secret) {
		if (paddleLive()) {
			return { ok: false, reason: "PADDLE_WEBHOOK_SECRET is not set" };
		}
		return { ok: true, reason: "skipped (no secret in the sandbox)" };
	}

	if (!signatureHeader)
		return { ok: false, reason: "missing Paddle-Signature" };

	const parts: Record<string, string> = {};
	for (const segment of signatureHeader.split(";")) {
		const [k, v] = segment.split("=");
		if (k && v) parts[k.trim()] = v.trim();
	}
	const { ts, h1 } = parts;
	if (!ts || !h1) return { ok: false, reason: "malformed signature header" };

	const computed = crypto
		.createHmac("sha256", secret)
		.update(`${ts}:${rawBody}`)
		.digest("hex");

	const a = Buffer.from(computed, "hex");
	const b = Buffer.from(h1, "hex");
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
		return { ok: false, reason: "signature mismatch" };
	}

	return { ok: true };
}

const PADDLE_API_BASE = paddleLive()
	? "https://api.paddle.com"
	: "https://sandbox-api.paddle.com";

let client: Paddle | null = null;

/** The Paddle SDK client, built on first use so a build without the key still loads. */
export const paddleClient = () => {
	const key = process.env.PADDLE_API_KEY;
	if (!key)
		throw new Error("PADDLE_API_KEY is not set in environment variables");

	client ??= new Paddle(key, {
		environment: paddleLive() ? Environment.production : Environment.sandbox,
	});

	return client;
};

/** A Paddle amount (minor units as a string) as a number, or null when absent. */
export const paddleMinor = (value: string | null | undefined) => {
	const parsed = value == null ? Number.NaN : Number.parseInt(value, 10);

	return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Returns a temporary URL to the invoice PDF for a completed transaction.
 * The URL is pre-signed and short-lived (~1h), so request it on demand rather
 * than persisting it. Returns null if Paddle has no invoice for the transaction.
 */
export async function getTransactionInvoiceUrl(
	transactionId: string,
): Promise<string | null> {
	const key = process.env.PADDLE_API_KEY;
	if (!key) {
		throw new Error("PADDLE_API_KEY is not set in environment variables");
	}

	const res = await fetch(
		`${PADDLE_API_BASE}/transactions/${transactionId}/invoice`,
		{ headers: { Authorization: `Bearer ${key}` } },
	);

	if (!res.ok) {
		console.error(
			"[paddle.invoice] failed",
			res.status,
			await res.text().catch(() => ""),
		);
		return null;
	}

	const json = (await res.json()) as { data?: { url?: string } };
	return json?.data?.url ?? null;
}
