import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import NotionService, { getPage } from '@/services/notion'
import styles from '@/styles/cookie-policy.module.scss'
import { Render } from '@9gustin/react-notion-render'
import { Language } from '@prisma/client'
import { T, useTolgee } from '@tolgee/react'
import { Typography } from 'antd'
import { GetStaticProps } from 'next'
import Head from 'next/head'
import '@9gustin/react-notion-render/dist/index.css'

const { Title } = Typography

const PrivacyPolicyPage: NextPageWithLayout = ({ page, blocks }: any) => {
	const { t } = useTolgee()

	return (
		<PublicLayout>
			<Head>
				<title>{t('Cookie Policy')}</title>
			</Head>

			<div className={styles.container}>
				<Title>
					<T>{page?.properties.title.title[0].plain_text}</T>
				</Title>
				<Render blocks={blocks.results} simpleTitles />
			</div>
		</PublicLayout>
	)
}

export const getStaticProps: GetStaticProps = async ({ defaultLocale, locale }) => {
	const page = await getPage({ pageId: 'c3fb3089-a57e-42f1-8383-3b13ea4842de' })

	let blockId = 'c3fb3089-a57e-42f1-8383-3b13ea4842de'
	switch (locale) {
		case Language.ru:
			blockId = '3f615959-cbd7-4323-819d-a4566385e242'
		case Language.en:
			blockId = 'c3fb3089-a57e-42f1-8383-3b13ea4842de'
	}

	const blocks = await NotionService.blocks.children.list({
		block_id: '3f615959-cbd7-4323-819d-a4566385e242',
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
