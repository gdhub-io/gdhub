import { IconUser } from "@tabler/icons-react";
import { T, useTranslate } from "@tolgee/react";
import { Carousel, Grid, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { avatarImage } from "@/helpers/image";
import type { FeaturedCurator } from "@/repositories/checkpoint-curators";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

/** The card at 320 plus the 8 of air it keeps on each side. */
const SLIDE_WIDTH = 336;

/** Takes itself off the page when there is nobody to show. */
export const CheckpointCuratorsSection = ({
	curators,
}: {
	curators: FeaturedCurator[];
}) => {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const [viewport, setViewport] = useState(0);

	useEffect(() => {
		const read = () => setViewport(window.innerWidth);

		read();
		window.addEventListener("resize", read);
		return () => window.removeEventListener("resize", read);
	}, []);

	if (!curators.length) return null;

	// The server knows no viewport; the grid is the safer thing to paint first.
	const isWide = screens.lg ?? true;
	// The gutter takes whatever the screen has over the slide, so the card never
	// grows and what peeks out at the edges is the neighbouring card rather than
	// the empty slide it would otherwise be centred in. Slick reads this with
	// `parseInt`, so it cannot be a percentage or a `calc()`.
	const edge = viewport
		? `${Math.max(24, Math.round((viewport - SLIDE_WIDTH) / 2))}px`
		: "28px";

	const cards = curators.map((curator) => (
		<div key={curator.id} className={styles.card}>
			<div className={styles.portrait}>
				{curator.image ? (
					<AppImage
						src={avatarImage(curator.image, 560)}
						alt={curator.name}
						className={styles.photo}
						width={560}
						height={560}
						sizes="(min-width: 992px) 280px, 90vw"
					/>
				) : (
					<IconUser size={48} className={styles.placeholder} />
				)}
			</div>

			<div className={styles.info}>
				<Typography.Title level={3} className={styles.name}>
					{curator.name}
				</Typography.Title>

				<div className={styles.meta}>
					<Typography.Text className={styles.role}>
						{curator.role}
					</Typography.Text>
					<Tag bordered={false} className={styles.level}>
						<T keyName={curator.level} />
					</Tag>
				</div>

				<Typography.Paragraph className={styles.bio} ellipsis={{ rows: 3 }}>
					{curator.summary}
				</Typography.Paragraph>
			</div>
		</div>
	));

	return (
		<CheckpointSection tone="dark">
			<div className={styles.layout}>
				<SectionIntro
					eyebrow={t("checkpointLanding.curators.eyebrow", "Featured curators")}
					headline={t(
						"checkpointLanding.curators.headline",
						"Meet the people behind each Checkpoint",
					)}
				/>

				{isWide ? (
					<div className={styles.cards}>{cards}</div>
				) : (
					// One card at a time with its neighbours showing at the edges, so a
					// thumb has something to pull.
					<div className={styles.slider}>
						<Carousel
							centerMode
							centerPadding={edge}
							slidesToShow={1}
							draggable
							swipeToSlide
							dots={false}
						>
							{cards}
						</Carousel>
					</div>
				)}
			</div>
		</CheckpointSection>
	);
};
