"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Progress, Typography } from "antd";
import { lazy, Suspense, useState } from "react";
import styles from "./style.module.scss";

// three.js and the scene load as their own chunk, after the hero has painted.
const HeroGame = lazy(() =>
	import("./index").then((m) => ({ default: m.HeroGame })),
);

/**
 * The hero game behind a blurred still of itself: the still holds the place
 * while the code and models load, then dissolves into the live scene.
 * Re-capture preview.png when the board changes.
 */
export const LazyHeroGame = () => {
	const { t } = useTranslate();
	const [ready, setReady] = useState(false);
	const [progress, setProgress] = useState(0);

	return (
		<div className={styles.root}>
			<Suspense fallback={null}>
				<HeroGame onReady={() => setReady(true)} onProgress={setProgress} />
			</Suspense>
			<div
				className={`${styles.preview} ${ready ? styles.previewGone : ""}`}
				aria-hidden
			/>
			<Flex
				vertical
				align="center"
				gap="small"
				className={`${styles.loader} ${ready ? styles.previewGone : ""}`}
				aria-hidden={ready}
			>
				<Typography.Text type="secondary" className={styles.loaderText}>
					{t("landing.heroGame.loading", "Building the world…")}
				</Typography.Text>
				<Progress
					percent={Math.round(progress * 100)}
					showInfo={false}
					className={styles.loaderBar}
					size={[180, 2]}
					strokeColor="var(--gd-color-text)"
					railColor="var(--gd-color-border-strong)"
				/>
			</Flex>
		</div>
	);
};
