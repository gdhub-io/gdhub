import { EmptyLayout } from '@/layouts/EmptyLayout'
import styles from '@/styles/errors.module.scss'
import { Button, Space, Typography } from 'antd'
import Link from 'next/link'

const { Paragraph } = Typography

export default function Custom404() {
	return (
		<EmptyLayout>
			<div className={styles.errorPageContainer}>
				<Space direction="vertical">
					<div className={styles.notFound}>
						<h1>Error 404</h1>
					</div>
					<Paragraph>Sorry, we couldn&apos;t find the page you&apos;re looking for.</Paragraph>
					<Button>
						<Link href="/">Back to home</Link>
					</Button>
				</Space>
			</div>
		</EmptyLayout>
	)
}
