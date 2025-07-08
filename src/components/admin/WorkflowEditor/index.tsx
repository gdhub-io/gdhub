import { Link } from '@react-email/components'
import { useQuery } from '@tanstack/react-query'
import { Breadcrumb, theme } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

export const WorkflowEditor = ({ id }: { id: string }) => {
	const { token } = theme.useToken()

	const { data: workflow } = useQuery(['workflow', id], () => axios.get(`/api/admin/workflow/${id}`))

	return (
		<>
			<Breadcrumb
				items={[
					{
						title: (
							<Link href="/admin/workflows" className={styles.stepTitle} style={{ color: token.colorPrimary }}>
								Workflows
							</Link>
						),
					},
					{
						title: <span className={styles.stepTitle}>{workflow?.data?.title}</span>,
					},
				]}
				style={{ marginTop: 16 }}
			/>
		</>
	)
}
