import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import styles from "./style.module.scss";

export const EmptyDevLog = ({ projectName }: { projectName?: string }) => {
	const { t } = useTranslate();

	return (
		<div className={styles.emptyDevLog}>
			<div className={styles.emptyIllustration}>
				<svg
					role="img"
					aria-label="Empty devlog"
					width="200"
					height="200"
					viewBox="0 0 200 200"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						x="40"
						y="40"
						width="120"
						height="80"
						rx="4"
						fill="var(--gd-color-border)"
						stroke="var(--gd-color-border-strong)"
						strokeWidth="2"
					/>
					<rect
						x="50"
						y="50"
						width="100"
						height="10"
						rx="2"
						fill="var(--gd-color-border-strong)"
					/>
					<rect
						x="50"
						y="70"
						width="80"
						height="6"
						rx="2"
						fill="var(--gd-color-border-strong)"
					/>
					<rect
						x="50"
						y="85"
						width="60"
						height="6"
						rx="2"
						fill="var(--gd-color-border-strong)"
					/>
					<rect
						x="50"
						y="100"
						width="40"
						height="6"
						rx="2"
						fill="var(--gd-color-border-strong)"
					/>
					<path d="M100 140 L110 130 L90 130 Z" fill="var(--gd-info-solid)" />
					<circle cx="100" cy="150" r="10" fill="var(--gd-info-solid)" />
				</svg>
			</div>
			<Typography.Title level={4}>
				{t("devlog.empty.title", "Your devlog is empty")}
			</Typography.Title>
			<Typography.Paragraph className={styles.emptyDescription}>
				{t(
					"devlog.empty.description",
					"Share your progress on the development of {projectName}",
					{
						projectName: projectName || "your game",
					},
				)}
				{t(
					"devlog.empty.description2",
					" will help attract attention to the project and get feedback.",
				)}
			</Typography.Paragraph>
		</div>
	);
};
