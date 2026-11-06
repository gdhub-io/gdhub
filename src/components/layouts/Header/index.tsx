"use client";

import { Layout } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import { SpaceTrail } from "@/components/layouts/SpaceTrail";
import type { SpaceTrailConfig } from "@/components/layouts/SpaceTrail/types";
import styles from "./style.module.scss";

const { Header: AntHeader } = Layout;

export type HeaderProps = {
	/**
	 * The space this page belongs to, shown after the logo. Ordinary app pages
	 * publish none and get `fallback` instead.
	 */
	trail?: SpaceTrailConfig;
	/** What stands after the logo when there is no space — the hub's switcher. */
	fallback?: ReactNode;
	/** Right-side actions (docs link, notifications, avatar menu, …). */
	actions?: ReactNode;
	/** Optional horizontal navigation rendered under the top row. */
	menu?: ReactNode;
	/** Where the logo links to. */
	logoHref?: string;
	/** Extra class merged onto the header (e.g. a layout's sticky styles). */
	className?: string;
};

/**
 * The top header of the authenticated app: the logo, where you are, and the
 * actions that are the same everywhere.
 *
 * There is no separator after the logo. It is a mark, not the first step of a
 * path — a rule after it claimed a hierarchy between the brand and the page
 * that does not exist.
 */
export const Header = ({
	trail,
	fallback,
	actions,
	menu,
	logoHref = "/hub",
	className,
}: HeaderProps) => {
	return (
		<AntHeader
			className={className ? `${styles.header} ${className}` : styles.header}
		>
			{/* A plain flex row rather than antd's Row/Col: those centre their
			    columns, so the trail's column was only as tall as its text and the
			    separator could not reach the edges of the 64px row. */}
			<div className={styles.topRow}>
				<div className={styles.trailRow}>
					<Link href={logoHref} className={`${styles.logo} logo`}>
						<GdhubLogo style={{ width: 100 }} />
					</Link>

					{trail ? <SpaceTrail trail={trail} /> : fallback}
				</div>
				{actions ? <div className={styles.actions}>{actions}</div> : null}
			</div>
			{menu}
		</AntHeader>
	);
};

export default Header;
