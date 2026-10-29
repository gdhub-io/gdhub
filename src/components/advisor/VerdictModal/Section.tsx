"use client";

import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui";
import type { CheckpointItemDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text, Link } = Typography;

/** A section of the left column: a 16px title over a hairline, an aside on the right. */
export function Section({
	title,
	aside,
	children,
}: {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section>
			<div className={styles.sectionHead}>
				<SectionHeading level={4} title={title} action={aside} />
			</div>
			{children}
		</section>
	);
}

export function Aside({ children }: { children: ReactNode }) {
	return <Text className={styles.aside}>{children}</Text>;
}

export function ArtifactLink({
	artifact,
}: {
	artifact: CheckpointItemDto["evidence"][number]["artifact"];
}) {
	const { t } = useTranslate();

	return (
		<Link
			href={artifact.link}
			target="_blank"
			rel="noreferrer"
			className={styles.small}
			ellipsis
		>
			{artifact.name ?? t("advisor.verdict.artifact", "Artifact")}
		</Link>
	);
}
