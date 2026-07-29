import type { ReactNode } from "react";

/**
 * Marketing (landing) route group — dark theme.
 *
 * Owns the dark page background here, at the group boundary: it is
 * server-rendered (no light flash) and unmounts when navigating out of the
 * group, reverting to the light default in globals.scss so the dark background
 * never bleeds into the app. The antd dark ConfigProvider is applied inside the
 * page tree (see HomeClient → LandingLayout).
 */
export default function LandingGroupLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			<style>{`:root{--background-color:#050505}`}</style>
			{children}
		</>
	);
}
