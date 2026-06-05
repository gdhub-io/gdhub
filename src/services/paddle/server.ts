// Server-side Paddle API helpers. Uses the secret PADDLE_API_KEY — never import
// this into client components.

const PADDLE_API_BASE =
	process.env.NODE_ENV === "production"
		? "https://api.paddle.com"
		: "https://sandbox-api.paddle.com";

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
