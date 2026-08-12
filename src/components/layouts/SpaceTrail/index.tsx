"use client";

import { IconSelector } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Dropdown, Grid } from "antd";
import Link from "next/link";
import { useState } from "react";
import { SpaceSwitcherMenu } from "./SpaceSwitcherMenu";
import styles from "./style.module.scss";
import type { SpaceTrailConfig } from "./types";

export type { SpaceKind, SpaceTrailConfig } from "./types";

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
	const [open, setOpen] = useState(false);

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
					{/* A switcher only where there is something to switch to. Admin
					    is a platform space and not in the menu, so its last crumb is
					    a plain name — a chevron that opened a list without it in
					    would be a lie about where you are. */}
					{!trail.space ? (
						<span className={styles.currentStatic} aria-current="page">
							{trail.current.label}
						</span>
					) : (
						<Dropdown
							open={open}
							onOpenChange={setOpen}
							trigger={["click"]}
							placement="bottomLeft"
							popupRender={() => (
								<SpaceSwitcherMenu
									currentId={trail.space?.id}
									onNavigate={() => setOpen(false)}
								/>
							)}
						>
							<button
								type="button"
								className={styles.current}
								aria-haspopup="menu"
								aria-expanded={open}
								aria-current="page"
							>
								{trail.current.label}
								<IconSelector size={15} className={styles.chevron} />
							</button>
						</Dropdown>
					)}
				</li>
			</ol>
		</nav>
	);
}

export default SpaceTrail;
