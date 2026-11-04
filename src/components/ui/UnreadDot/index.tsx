"use client";

import { Badge, theme } from "antd";
import type { ReactNode } from "react";

export type UnreadDotProps = {
	/** Something unread waits: the dot shows. No count — the number lives in the open panel. */
	unread: boolean;
	/** The header icon the dot sits on. */
	children: ReactNode;
};

/** Frame 07.02.1 (`Wt114`): one graphite dot on the icon's top-right corner, for every header icon alike. */
export function UnreadDot({ unread, children }: UnreadDotProps) {
	const { token } = theme.useToken();
	return (
		<Badge
			dot={unread}
			// Colour and corner set here, not by props: `color` renders a status dot,
			// and Novu's reset (`sup { position: relative }`) would pull it out of the corner.
			styles={{
				// A flex box, not inline: no line box to lift the icon off its button's centre.
				root: { display: "flex" },
				// 2px inside the corner, over the icon's edge, cut out by a ring of the
				// header's surface — kept on the button's hover and open fill too.
				indicator: {
					background: token.colorPrimary,
					boxShadow: "0 0 0 2px var(--gd-color-surface)",
					position: "absolute",
					top: 2,
					insetInlineEnd: 2,
					transform: "translate(50%, -50%)",
				},
			}}
		>
			{children}
		</Badge>
	);
}
