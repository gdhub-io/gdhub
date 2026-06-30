import type { Paddle } from "@paddle/paddle-js";
import { useCallback, useEffect, useState } from "react";

import { getPaddleInstance, openPaddleCheckout } from "./index";

export function usePaddle() {
	const [paddle, setPaddle] = useState<Paddle | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;

		const initPaddle = async () => {
			try {
				setIsLoading(true);
				const instance = await getPaddleInstance();
				if (mounted) {
					setPaddle(instance);
					setError(null);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error
							? err
							: new Error("Failed to initialize Paddle"),
					);
					setPaddle(null);
				}
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		};

		initPaddle();

		return () => {
			mounted = false;
		};
	}, []);

	const checkout = useCallback(
		async (options: {
			priceId: string;
			customData?: Record<string, any>;
			successUrl?: string;
			customerEmail?: string;
		}) => {
			try {
				await openPaddleCheckout(options);
			} catch (err) {
				setError(err instanceof Error ? err : new Error("Checkout failed"));
				throw err;
			}
		},
		[],
	);

	return {
		paddle,
		isLoading,
		error,
		checkout,
	};
}
