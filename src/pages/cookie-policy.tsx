import { PublicLayout } from '@/layouts/PublicLayout'
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
		<PublicLayout title="Cookie Policy">
			<Head>
				<title>Cookie Policy</title>
			</Head>

			<div className={styles.container}>
				<Render blocks={blocks.results} simpleTitles />
			</div>
		</PublicLayout>
	)
}

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
