import { useEffect, useState } from 'react'
import { AvailableLocales } from '@/config/locale'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { getPages } from '@/services/notion'
import { tolgeeService } from '@/services/tolgee'
import { Render } from '@9gustin/react-notion-render'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Col, Menu, Row, Select, Spin, Grid, theme, Typography, Affix } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { GetServerSidePropsContext } from 'next'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import styles from './style.module.scss'
import '@9gustin/react-notion-render/dist/index.css'

const { Text, Title } = Typography

const DocsPage: NextPageWithLayout = ({ pages }: { pages?: any[] }) => {
	const screens = Grid.useBreakpoint()
	const { t, getLanguage } = useTolgee()
	const themeToken = theme.useToken()
	const router = useRouter()
	const { slug: urlSlug } = router.query
	const [docsMenu, setDocsMenu] = useState<any[]>()
	const [pageSlug, setPageSlug] = useState<any>()
	const [pageProperties, setPageProperties] = useState<any>()

	useEffect(() => {
		if (!pages || pages.length == 0) return

		const {
			properties: { Slug },
		} = pages[0]

		const currentPageSlug = urlSlug ? urlSlug[urlSlug.length - 1] : Slug.rich_text[0].plain_text

		setPageSlug(currentPageSlug)
		setPageProperties(getPageProperties(currentPageSlug))

		if (!urlSlug) {
			router.push('/hub/docs/' + Slug.rich_text[0].plain_text, undefined, { shallow: true })
		}
	}, [urlSlug])

	useEffect(() => {
		if (!!pages) {
			setDocsMenu(
				pages
					.filter((p: any) => p.properties.Parent.relation.length == 0)
					.map((page: any, idx) => {
						const {
							properties: { Slug, Name, Childrens },
						} = page

						return {
							key: Slug.rich_text[0] ? Slug.rich_text[0].plain_text : 'menu-' + idx,
							label: Name.title[0].plain_text,
							style: {
								whiteSpace: 'normal',
								height: 'auto',
								lineHeight: 'initial',
								paddingTop: '8px',
								paddingBottom: '8px',
							},
							children: Childrens.relation.length > 0 ? getChildrens(Childrens.relation) : undefined,
						}
					})
			)
		}
	}, [])

	useEffect(() => {
		if (pageSlug) {
			refetchPage()
		}
	}, [pageSlug])

	const getChildrens = (relationsData: any) => {
		const ids = relationsData.map((rd: any) => rd.id)
		const children: any[] = []

		for (const _id of ids) {
			const result = pages?.find((p: any) => p.id == _id)
			const resultIndex = pages?.findIndex((p: any) => p.id == _id)

			if (!result || !resultIndex) continue

			// pages?.splice(resultIndex, 1)

			const {
				properties: { Slug, Name },
			} = result

			children.push({
				key: Slug.rich_text[0].plain_text,
				label: Name.title[0].plain_text,
				style: {
					whiteSpace: 'normal',
					height: 'auto',
					lineHeight: 'initial',
					paddingTop: '8px',
					paddingBottom: '8px',
				},
			})
		}

		return children
	}

	const getPageProperties = (slug: string) => {
		const currentPage = pages?.find((page: any) => page.properties.Slug.rich_text[0]?.plain_text === slug)

		return currentPage
	}

	const handleMainMenuSelect = async ({ key }: any) => {
		try {
			setPageSlug(key)
			await refetchPage()
			await router.push('/hub/docs/' + key, undefined, { shallow: true })
			setPageProperties(getPageProperties(key))
		} catch (error: any) {}
	}

	const handleMobileMenuSelect = async (value: any) => {
		try {
			setPageSlug(value)
			await refetchPage()
			await router.push('/hub/docs/' + value, undefined, { shallow: true })
			setPageProperties(getPageProperties(value))
		} catch (error: any) {}
	}

	const {
		data: pageContent,
		isLoading,
		refetch: refetchPage,
	} = useQuery(['documentation', pageSlug], () => axios.post(`/api/notion/page`, { pageSlug, locale: getLanguage() }), {
		enabled: !!pageSlug && !!getLanguage(),
		refetchInterval: false,
		refetchOnWindowFocus: false,
		onSuccess: () => {
			setPageProperties(getPageProperties(pageSlug))
		},
	})

	return (
		<ProtectedLayout title={t('page.documentation.title', 'Documentation')}>
			<div
				className={styles.container}
				style={{ fontSize: themeToken.token.fontSize, color: themeToken.token.colorText, marginTop: 16 }}
			>
				<Row gutter={16}>
					<Col xs={{ span: 24 }} md={{ span: 6 }} xl={{ span: 5 }} xxl={{ span: 4 }}>
						{screens.md ? (
							<Affix offsetTop={0}>
								<Menu
									className="main-menu"
									selectedKeys={[pageSlug]}
									mode="inline"
									theme="light"
									items={docsMenu}
									onSelect={handleMainMenuSelect}
								/>
							</Affix>
						) : (
							<Select
								defaultValue={pageSlug}
								className="mobile-menu"
								options={docsMenu?.map((i) => ({ label: i.label, value: i.key }))}
								onSelect={handleMobileMenuSelect}
							/>
						)}
					</Col>
					<Col xs={{ span: 24 }} md={{ span: 18 }} xl={{ span: 19 }} xxl={{ span: 20 }}>
						<Spin spinning={isLoading}>
							{!!pageProperties ? (
								<section className="main-container">
									<div className="content-header">
										<Title>{pageProperties?.properties.Name.title[0].plain_text}</Title>
										<Text type="secondary">
											<T>Updated</T> {dayjs(pageProperties?.last_edited_time).format('ll')}
										</Text>
									</div>
									<Render blocks={pageContent?.data} classNames useStyles simpleTitles />
								</section>
							) : (
								<section className="main-container">
									<p>
										<T>The page does not exist or you do not have access to it</T>
									</p>
								</section>
							)}
						</Spin>
					</Col>
				</Row>
			</div>
		</ProtectedLayout>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const locale = tolgeeService.getLanguage() as AvailableLocales
	const session: any = await getServerSession(context.req, context.res, authOptions)
	let pages: any = await getPages({ roles: session?.user.roles, locale: session.user.lang || locale })

	return {
		props: {
			pages,
		},
	}
}

export default DocsPage
