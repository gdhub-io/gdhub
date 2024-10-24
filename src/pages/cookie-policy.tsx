import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import NotionService from '@/services/notion'
import styles from '@/styles/cookie-policy.module.scss'
import { Render } from '@9gustin/react-notion-render'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useTolgee } from '@tolgee/react'
import { Typography } from 'antd'
import { GetStaticProps } from 'next'
import '@9gustin/react-notion-render/dist/index.css'

const { Title } = Typography

const PrivacyPolicyPage: NextPageWithLayout = ({ blocks }: any) => {
	const { t } = useTolgee()

	return (
		<PublicLayout title="Cookie Policy">
			{/* <Head>
				<title>{t('Cookie Policy')}</title>
			</Head> */}

			<div className={styles.container}>
				<Render blocks={blocks.results} simpleTitles />
			</div>
		</PublicLayout>
	)
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
	let blockId = 'c3fb3089-a57e-42f1-8383-3b13ea4842de'

	switch (locale) {
		case prismaClient.Language.ru:
			blockId = '3f615959-cbd7-4323-819d-a4566385e242'
		case prismaClient.Language.en:
			blockId = 'c3fb3089-a57e-42f1-8383-3b13ea4842de'
	}

	const blocks = await NotionService.blocks.children.list({
		block_id: blockId,
	})

	if (!blocks) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			blocks,
		},
		revalidate: 60,
	}
}

export default PrivacyPolicyPage
