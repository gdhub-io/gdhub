"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div style={{ padding: 48, textAlign: "center" }}>
			<h1>Something went wrong</h1>
			<button type="button" onClick={reset} style={{ marginTop: 16 }}>
				Try again
			</button>
		</div>
	);
}
