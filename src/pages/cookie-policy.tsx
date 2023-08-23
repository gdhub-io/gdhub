import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import NotionService, { getPage } from '@/services/notion'
import styles from '@/styles/cookie-policy.module.scss'
import { Render } from '@9gustin/react-notion-render'
import { Typography } from 'antd'
import Head from 'next/head'
import '@9gustin/react-notion-render/dist/index.css'

const { Title } = Typography

const PrivacyPolicyPage: NextPageWithLayout = ({ page, blocks }: any) => {
	return (
		<>
			<Head>
				<title>Cookie Policy</title>
			</Head>

			<div className={styles.container}>
				<Title>{page?.properties.title.title[0].plain_text}</Title>
				<Render blocks={blocks.results} />
			</div>
		</>
	)
}

PrivacyPolicyPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getStaticProps = async () => {
	const page = await getPage({ pageId: 'c3fb3089-a57e-42f1-8383-3b13ea4842de' })

	const blocks = await NotionService.blocks.children.list({
		block_id: 'c3fb3089-a57e-42f1-8383-3b13ea4842de',
	})

	if (!blocks) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			page,
			blocks,
		},
		revalidate: 60,
	}
}

export default PrivacyPolicyPage
