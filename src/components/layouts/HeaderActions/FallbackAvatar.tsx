"use client";

import { useMemo } from "react";
import ReactNiceAvatar, { genConfig } from "react-nice-avatar";

/** A generated avatar for a user without an uploaded image, seeded by email. */
export default function FallbackAvatar({ seed }: { seed: string }) {
	const config = useMemo(
		() => ({ ...genConfig(seed), hairStyle: "normal" as const }),
		[seed],
	);

	return (
		<ReactNiceAvatar style={{ width: "32px", height: "32px" }} {...config} />
	);
}
