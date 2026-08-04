import type { Project } from "@gdhub-io/gdhub-prisma";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { Col, Row, Skeleton } from "antd";
import type React from "react";
import { EmptyState } from "@/components/ui";
import GameCard from "./index";
import styles from "./styles.module.scss";

type GameListItem = Project & {
	applauseCount?: number;
	hasOpenPositions?: boolean;
};

/**
 * GameCardList properties
 * @typedef {Object} GameCardListProps
 * @property {Game[]} games - Array of game data
 * @property {boolean} loading - Whether the data is loading
 */
interface GameCardListProps {
	games: GameListItem[];
	loading: boolean;
}

const GAME_CARD_SKELETON_KEYS = [
	"game-skeleton-1",
	"game-skeleton-2",
	"game-skeleton-3",
	"game-skeleton-4",
	"game-skeleton-5",
	"game-skeleton-6",
	"game-skeleton-7",
	"game-skeleton-8",
] as const;

/**
 * GameCardList component displays a responsive grid of game cards
 *
 * @param {GameCardListProps} props - Component properties
 * @returns {JSX.Element} Rendered component
 */
const GameCardList: React.FC<GameCardListProps> = ({ games, loading }) => {
	if (loading) {
		return (
			<Row gutter={[24, 24]} className={styles.gameCardList}>
				{GAME_CARD_SKELETON_KEYS.map((key) => (
					<Col key={key} xs={24} sm={12} md={8} lg={6} xl={6}>
						<div className={styles.gameCardSkeleton}>
							<Skeleton.Image active className={styles.gameCardSkeletonCover} />
							<div className={styles.gameCardSkeletonContent}>
								<Skeleton
									active
									title={{ width: "70%" }}
									paragraph={{ rows: 2, width: ["50%", "35%"] }}
								/>
							</div>
						</div>
					</Col>
				))}
			</Row>
		);
	}

	if (!games || games.length === 0) {
		return (
			<EmptyState
				icon={IconDeviceGamepad2}
				title="No games found"
				description="Projects matching your filters will appear here."
			/>
		);
	}

	return (
		<Row gutter={[24, 24]} className={styles.gameCardList}>
			{games.map((game) => (
				<Col key={game.id} xs={24} sm={12} md={8} lg={6} xl={6}>
					<GameCard
						id={game.id}
						title={game.name}
						genre={game.genre || undefined}
						platform={game.platform || undefined}
						coverImage={game.coverImage || undefined}
						slug={game.slug}
						applauseCount={game.applauseCount}
						hasOpenPositions={game.hasOpenPositions}
					/>
				</Col>
			))}
		</Row>
	);
};

export default GameCardList;
