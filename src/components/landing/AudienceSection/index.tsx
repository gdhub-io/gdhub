import type { Icon } from "@tabler/icons-react";
import { Flex, Typography } from "antd";
import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { IconTile } from "@/components/ui";
import { AppImage } from "@/components/ui/AppImage";
import styles from "./style.module.scss";

const { Title, Paragraph, Text } = Typography;

export type AudienceLine = { icon: Icon; lead: string; rest: string };

export type AudienceSectionProps = {
	/** The header menu's anchor: one per page by design. */
	anchor: string;
	art: StaticImageData;
	artSide: "left" | "right";
	title: string;
	lead: string;
	lines: AudienceLine[];
	/** The marker colour: the section's accent. */
	accent: string;
	/** Sits in the copy column, under the lines. */
	strip?: ReactNode;
	/** A strip that needs the whole width, under the row. */
	wideStrip?: ReactNode;
	action: ReactNode;
};

/**
 * Frames `PGIqH`, `qZEjF`, `z1xiD`, `X7LgqE` (desktop) and `USBN9`, `oefqG`,
 * `Q3tVNg`, `K9pTpZ` (mobile): one audience, its art on alternating sides with
 * a glow behind it, three lines, a live strip and the way in.
 */
export function AudienceSection({
	anchor,
	art,
	artSide,
	title,
	lead,
	lines,
	accent,
	strip,
	wideStrip,
	action,
}: AudienceSectionProps) {
	return (
		<section id={anchor} className={styles.section}>
			<div
				className={`${styles.row} ${artSide === "left" ? styles.artLeft : ""}`}
			>
				<div className={styles.copy}>
					<div className={styles.heading}>
						<Title level={2} className={styles.title}>
							{title}
						</Title>
						<Paragraph className={styles.lead}>{lead}</Paragraph>
					</div>

					<Flex vertical gap="var(--gd-space-6)" className={styles.lines}>
						{lines.map((line) => (
							<div key={line.lead} className={styles.line}>
								<IconTile
									icon={line.icon}
									tint="var(--gd-fill-base)"
									ink={accent}
								/>
								<Paragraph className={styles.lineText}>
									<Text strong>{line.lead}</Text> {line.rest}
								</Paragraph>
							</div>
						))}
					</Flex>

					{strip}
					<div className={styles.action}>{action}</div>
				</div>

				<div className={styles.art}>
					<div className={styles.glow} />
					<AppImage
						src={art}
						alt=""
						sizes="(max-width: 991px) 100vw, 576px"
						className={styles.image}
					/>
				</div>
			</div>
			{wideStrip && <div className={styles.wideStrip}>{wideStrip}</div>}
		</section>
	);
}

/** A strip's title and its cards. */
export function AudienceStrip({
	title,
	children,
	columns = 2,
}: {
	title: string;
	children: ReactNode;
	columns?: 2 | 4;
}) {
	return (
		<div className={styles.strip}>
			<Title level={3} className={styles.stripTitle}>
				{title}
			</Title>
			<div
				className={`${styles.stripGrid} ${columns === 4 ? styles.stripGridWide : ""}`}
			>
				{children}
			</div>
		</div>
	);
}

/** A button with a line of text beside it: "Register — and create your first project". */
export function AudienceAction({
	button,
	note,
}: {
	button: ReactNode;
	note?: string;
}) {
	return (
		<div className={styles.actionRow}>
			{button}
			{note && <Text className={styles.actionNote}>{note}</Text>}
		</div>
	);
}
