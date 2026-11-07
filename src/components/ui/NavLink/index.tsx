"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { PendingLabel } from "@/components/ui/PendingLabel";

/** A navigation item: a `Link` whose label pulses while its route is on the way. */
export function NavLink({
	children,
	...props
}: LinkProps & { children: ReactNode }) {
	return (
		<Link {...props}>
			<PendingLabel>{children}</PendingLabel>
		</Link>
	);
}
