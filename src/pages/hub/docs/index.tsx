import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Col, Menu, Row } from 'antd'
import Head from 'next/head'
import styles from './style.module.less'

const DocsPage: NextPageWithLayout = () => {
	const docsMenu = [
		{
			key: '/about',
			label: 'О хабе',
		},
		{
			key: '/getting-started',
			label: 'С чего начать',
		},
	]

	return (
		<>
			<Head>
				<title>Полезные материалы</title>
			</Head>
			<div className={styles.container}>
				<Row>
					<Col xs={{ span: 24 }} md={{ span: 6 }} xl={{ span: 5 }} xxl={{ span: 4 }}>
						<Menu mode="vertical" theme="light" items={docsMenu} style={{ width: '100%' }} />
					</Col>
					<Col xs={{ span: 24 }} md={{ span: 18 }} xl={{ span: 19 }} xxl={{ span: 20 }}>
						<section className="main-container">Text</section>
					</Col>
				</Row>
			</div>
		</>
	)
}

DocsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default DocsPage
