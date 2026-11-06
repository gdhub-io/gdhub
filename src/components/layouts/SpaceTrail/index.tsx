"use client";

import { useTranslate } from "@tolgee/react";
import { Grid } from "antd";
import Link from "next/link";
import { SpaceSwitcher } from "./SpaceSwitcher";
import styles from "./style.module.scss";
import type { SpaceTrailConfig } from "./types";

export { SpaceSwitcher } from "./SpaceSwitcher";
export type { SpaceTrailConfig } from "./types";

/**
 * Where you are, and a way to go somewhere else.
 *
 * The trail is the logo, the list this space belongs to, and the space itself —
 * the last of which opens a switcher. Only the last two crumbs are separated by
 * a rule: the logo is a mark, not a step in the path.
 *
 * Below `md` the parent crumb and the separator are dropped rather than
 * collapsed into an ellipsis: an ellipsis costs a tap to find out it led
 * somewhere you could already reach from the logo.
 */
export function SpaceTrail({ trail }: { trail: SpaceTrailConfig }) {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();

	const showParent = !!trail.parent && !!screens.md;

	return (
		<nav
			aria-label={t("space.trail.label", "Breadcrumb")}
			className={styles.nav}
		>
			<ol className={styles.trail}>
				{showParent && trail.parent && (
					<li>
						<Link href={trail.parent.href} className={styles.parent}>
							{trail.parent.label}
						</Link>
					</li>
				)}

				{showParent && (
					<li className={styles.separator} aria-hidden>
						<span />
					</li>
				)}

				<li>
					{trail.noSwitcher ? (
						<span className={styles.currentStatic} aria-current="page">
							{trail.current.label}
						</span>
					) : (
						<SpaceSwitcher current={trail.space}>
							{trail.current.label}
						</SpaceSwitcher>
					)}
				</li>
			</ol>
		</nav>
	);
}

export default SpaceTrail;
