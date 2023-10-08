import { useQuery } from '@tanstack/react-query'
import { Alert, Space, Typography } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import styles from './style.module.scss'

const { Title } = Typography

const CheckHealth = ({ children }: any) => {
	const { data } = useQuery(['app-health'], () => axios.get<boolean>('/api/internal/health'), {
		refetchInterval: false,
		retry: 0,
	})

	if (data?.data === true) {
		return children
	}

	return (
		<>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				<Space direction="vertical" align="center" size="large">
					<div className="logo">
						<Title>Game Developers Hub</Title>
					</div>
					<p>This is a community of gaming industry professionals whose members form teams to develop new games..</p>
					<Alert type="error" message="No connection. Try later." showIcon />
				</Space>
			</div>
		</>
	)
}

export default CheckHealth
