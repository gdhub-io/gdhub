import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Col, Empty, Row, Spin } from "antd";
import type React from "react";
import GameCard from "./index";
import styles from "./styles.module.scss";

type GameListItem = prismaClient.Project & {
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

/**
 * GameCardList component displays a responsive grid of game cards
 *
 * @param {GameCardListProps} props - Component properties
 * @returns {JSX.Element} Rendered component
 */
const GameCardList: React.FC<GameCardListProps> = ({ games, loading }) => {
	if (loading) {
		return (
			<div className={styles.loadingContainer}>
				<Spin size="large" />
			</div>
		);
	}

	if (!games || games.length === 0) {
		return <Empty description="No games found" />;
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
