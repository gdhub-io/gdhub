"use client";

import { Card } from "antd";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui";
import styles from "./ScoutSettingsCard.module.scss";

/** One settings section: a title, a line about it, and the form. */
export function ScoutSettingsCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<Card variant="borderless">
			<SectionHeading
				level={4}
				title={title}
				description={description}
				className={styles.heading}
			/>
			{children}
		</Card>
	);
}
