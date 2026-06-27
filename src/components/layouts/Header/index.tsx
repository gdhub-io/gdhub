"use client";

import type { BreadcrumbProps } from "antd";
import { Breadcrumb, Col, Layout, Row } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import styles from "./style.module.scss";

const { Header: AntHeader } = Layout;

export type HeaderProps = {
	/**
	 * Breadcrumb items shown to the right of the logo. This is the only part
	 * that differs between sections (my/project, my/event, my/course, …) — the
	 * logo is always prepended automatically.
	 */
	breadcrumbItems?: NonNullable<BreadcrumbProps["items"]>;
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
 * Shared top header used across the authenticated layouts. Every section
 * renders the same logo + right-side actions; only the breadcrumbs after the
 * logo change, so they are passed in via `breadcrumbItems`.
 */
export const Header = ({
	breadcrumbItems = [],
	actions,
	menu,
	logoHref = "/hub",
	className,
}: HeaderProps) => {
	return (
		<AntHeader
			className={className ? `${styles.header} ${className}` : styles.header}
		>
			<Row wrap={false} align="middle" className={styles.topRow}>
				<Col flex="auto" style={{ minWidth: 0 }}>
					<Breadcrumb
						separator={<span className={styles.separator}>/</span>}
						items={[
							{
								title: (
									<Link href={logoHref} className="logo">
										<GdhubLogo style={{ width: 100 }} />
									</Link>
								),
							},
							...breadcrumbItems,
						]}
					/>
				</Col>
				{actions ? <Col flex="none">{actions}</Col> : null}
			</Row>
			{menu}
		</AntHeader>
	);
};

export default Header;
