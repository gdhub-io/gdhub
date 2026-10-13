"use client";

import { ConfigProvider } from "antd";
import type { CSSProperties, ReactNode } from "react";
import {
	type DesignDensity,
	inverseProductTheme,
	inverseTheme,
} from "@/config/design";
import { designCssVariables } from "@/config/design/css";

const bands = {
	marketing: {
		vars: designCssVariables("inverse", "marketing") as CSSProperties,
		theme: inverseTheme,
	},
	product: {
		vars: designCssVariables("inverse", "product") as CSSProperties,
		theme: inverseProductTheme,
	},
} satisfies Record<DesignDensity, unknown>;

export type InverseBandProps = {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	/** Skip the band's own background — for a strip that sits on artwork. */
	transparent?: boolean;
	/** `product` keeps the product's control sizes — a dark panel inside a screen. */
	density?: DesignDensity;
};

/**
 * A dark strip on a light page — page header, footer, a call-to-action band.
 *
 * Both modes declare the same role names, so re-declaring them on this subtree
 * is all it takes: nested components keep reading `--gd-color-text` and follow
 * without knowing they moved. The antd theme is swapped in the same place, so
 * controls rendered inside pick up the inverse palette too — which is what stops
 * a dark header from serving a button with dark text on a dark background.
 *
 * This is a band, not a theme. Anything that needs its own theme is a page.
 */
export function InverseBand({
	children,
	className,
	style,
	transparent = false,
	density = "marketing",
}: InverseBandProps) {
	const band = bands[density];

	return (
		<div
			className={className}
			data-gd-theme="inverse"
			style={{
				...band.vars,
				...(transparent
					? {}
					: {
							background: "var(--gd-color-bg)",
							color: "var(--gd-color-text)",
						}),
				...style,
			}}
		>
			<ConfigProvider theme={band.theme}>{children}</ConfigProvider>
		</div>
	);
}
