import React from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Row, Col, Empty, Spin } from 'antd'
import styles from './styles.module.scss'
import GameCard from './index'

/**
 * GameCardList properties
 * @typedef {Object} GameCardListProps
 * @property {Game[]} games - Array of game data
 * @property {boolean} loading - Whether the data is loading
 */
interface GameCardListProps {
	games: (prismaClient.Project & {
		workflow: prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }
	})[]
	loading: boolean
}

/**
 * Gets the current workflow stage name
 * @param {any} game - Game data
 * @returns {string|undefined} Workflow stage name
 */
const getWorkflowStage = (game: any): string | undefined => {
	try {
		if (game.workflow && game.workflow.steps && game.workflow.steps.length > 0) {
			return game.workflow.steps[0].name
		}
		return undefined
	} catch (error) {
		console.error('Error getting workflow stage:', error)
		return undefined
	}
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
		)
	}

	if (!games || games.length === 0) {
		return <Empty description="No games found" />
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
						workflowStage={getWorkflowStage(game)}
					/>
				</Col>
			))}
		</Row>
	)
}

export default GameCardList
