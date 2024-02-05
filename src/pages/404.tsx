import { EmptyLayout } from '@/layouts/EmptyLayout'
import styles from '@/styles/errors.module.scss'
import { T, useTolgee } from '@tolgee/react'
import { Button, Space, Typography } from 'antd'
import Head from 'next/head'
import Link from 'next/link'

const { Paragraph } = Typography

export default function Custom404() {
	const { t } = useTolgee()

	return (
		<EmptyLayout>
			<Head>
				<title>{t('Error 404')}</title>
			</Head>
			<div className={styles.errorPageContainer}>
				<Space direction="vertical">
					<div className={styles.notFound}>
						<h1>
							<T>Error 404</T>
						</h1>
					</div>
					<Paragraph>
						<T>Sorry, we couldn&apos;t find the page you&apos;re looking for.</T>
					</Paragraph>
					<Button>
						<Link href="/">
							<T>Back to home</T>
						</Link>
					</Button>
				</Space>
			</div>
		</EmptyLayout>
	)
}
