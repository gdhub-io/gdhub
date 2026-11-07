"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

/**
 * A nav link's label that pulses while its route is on the way. Goes inside a
 * `<Link>`: a route not prefetched yet keeps the old page on screen until it
 * arrives, and this is the sign the click landed.
 */
export function PendingLabel({ children }: { children: ReactNode }) {
	const { pending } = useLinkStatus();

	return (
		<span className={pending ? styles.pending : undefined} aria-busy={pending}>
			{children}
		</span>
	);
}
