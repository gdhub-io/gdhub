import GdhubLogo from '@/assets/images/gdhub-beta-logo.svg'
import { EmptyLayout } from '@/layouts/EmptyLayout'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Alert, Space, Typography } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

const { Title } = Typography

const CheckHealth = ({ children }: any) => {
	const { data, isFetched } = useQuery(['app-health'], () => axios.get<boolean>('/api/internal/health'), {
		refetchInterval: false,
		retry: 0,
	})

	if (data?.data === true && isFetched) {
		return children
	}

	if (data?.data === false && isFetched) {
		return (
			<EmptyLayout>
				<div className={styles.container}>
					<Space direction="vertical" align="center" size="large">
						<div className="logo">
							<GdhubLogo style={{ width: '120px', height: '31px' }} />
						</div>
						<p>
							<T keyName="checkhealth.description">
								This is a game developers hub for industry professionals whose members form teams to develop new games.
							</T>
						</p>
						<Alert
							type="error"
							message={<T keyName="checkhealth.error_no_connection">No connection. Try later.</T>}
							showIcon
						/>
					</Space>
				</div>
			</EmptyLayout>
		)
	}

	return null
}

export default CheckHealth
