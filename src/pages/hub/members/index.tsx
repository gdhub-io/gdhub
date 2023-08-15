import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Drawer, Grid, Row, Space, Tag, Typography } from 'antd'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { BsFilter } from 'react-icons/bs'
import {
	SearchBox,
	InstantSearch,
	Hits,
	Pagination,
	RefinementList,
	ClearRefinements,
	Highlight,
	Stats,
	useInstantSearch,
} from 'react-instantsearch-hooks-web'
import useSWR from 'swr'
import styles from './style.module.scss'
import SpecialistPreviewModal from '@/components/modals/SpecialistPreviewModal'
import { fetcher } from '@/helpers/fetcher'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { InstantsearchAdapter } from '@/services/typesense/adapter'

const { Paragraph, Text, Title } = Typography

const searchAdapter = new InstantsearchAdapter()

const SpecialistsPage: NextPageWithLayout = () => {
	const session = useSession()
	const [openedFilter, setOpenFilter] = useState(false)
	const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | undefined>()
	const screens = Grid.useBreakpoint()

	const allowAccess = useMemo(() => {
		return hasRole('author', session)
	}, [session])

	const { data: specialistsCount } = useSWR({ url: '/api/specialists/count' }, fetcher, {
		revalidateOnFocus: false,
	})
	const { data: usersCount } = useSWR({ url: '/api/account/count' }, fetcher, {
		revalidateOnFocus: false,
	})

	const Hit = ({ hit }: any) => {
		return (
			<Card
				actions={[
					<Button key="details" onClick={() => setSelectedSpecialistId(hit.ID)}>
						Подробнее
					</Button>,
				]}
			>
				<Card.Meta
					title={
						<Title level={4} style={{ whiteSpace: 'initial' }}>
							<Highlight attribute="Name" hit={hit} />
						</Title>
					}
				/>
				{!!hit.Direction && (
					<Space wrap>
						<Highlight attribute="Direction" hit={hit} />
						<Tag>
							<Highlight attribute="Level" hit={hit} />
						</Tag>
					</Space>
				)}
				{!!hit.Skills && (
					<div className={styles.hitItem}>
						<Text strong>Навыки: </Text>
						<Highlight attribute="Skills" hit={hit} />
					</div>
				)}
				{!!hit.Tools && (
					<div className={styles.hitItem}>
						<Text strong>Инструменты: </Text>
						<Highlight attribute="Tools" hit={hit} />
					</div>
				)}
				{/* {!!hit.Schools && (
					<div className={styles.hitItem}>
						<Text strong>Образование</Text>
						<br />
						<Highlight attribute="Schools" hit={hit} />
					</div>
				)}
				{!!hit.Workplaces && (
					<div className={styles.hitItem}>
						<Text strong>Опыт</Text>
						<br />
						<Highlight attribute="Workplaces" hit={hit} />
					</div>
				)} */}
			</Card>
		)
	}

	if (!allowAccess) {
		return (
			<>
				<Head>
					<title>Участники</title>
				</Head>
				<div className={styles.container}>
					<h1>Участники</h1>
					<p>
						Участником сообщества считается любой зарегистрированный пользователь нашего портала. На сегодня нас{' '}
						<strong>{usersCount}</strong>.
					</p>
					<p>
						Те из нас, кто указал специальности в своем профиле, считаются участниками, которые открыты для предложений
						участвовать в разработке инди-проектов. На сегодня зарегистрировано <strong>{specialistsCount}</strong>{' '}
						специалиста.
					</p>
					<p>Авторы инди-проектов имеют доступ к базе специалистов и могут приглашать их на свои проекты.</p>
				</div>
			</>
		)
	}

	return (
		<>
			<Head>
				<title>Участники</title>
			</Head>
			<div className={styles.container}>
				<h1>Участники</h1>
				<InstantSearch searchClient={searchAdapter.searchClient} indexName="specialists">
					<SearchBox placeholder="Type search query..." />
					<Row justify="end" className={styles.stats}>
						<Stats />
					</Row>

					<Row gutter={[16, 16]}>
						<Col xs={{ span: 24 }} lg={{ span: 8 }}>
							{screens.lg ? <SearchFilter /> : <SearchMobileFilter onClick={() => setOpenFilter(true)} />}
						</Col>
						<Col xs={{ span: 24 }} lg={{ span: 16 }}>
							<NoResultsBoundary fallback={<NoResults />}>
								<Hits hitComponent={Hit} />
								<Pagination />
							</NoResultsBoundary>
						</Col>
					</Row>

					<Drawer
						open={openedFilter}
						title="Фильтр поиска"
						className={styles.container}
						onClose={() => setOpenFilter(false)}
					>
						<SearchFilter />
					</Drawer>

					<SpecialistPreviewModal
						open={!!selectedSpecialistId}
						specialistId={selectedSpecialistId}
						onCancel={() => setSelectedSpecialistId(undefined)}
					/>
				</InstantSearch>
			</div>
		</>
	)
}

SpecialistsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SpecialistsPage

function NoResultsBoundary({ children, fallback }: any) {
	const { results } = useInstantSearch()
	if (!results.__isArtificial && results.nbHits === 0) {
		return (
			<>
				{fallback}
				<div hidden>{children}</div>
			</>
		)
	}

	return children
}

function NoResults() {
	const { indexUiState } = useInstantSearch()

	return (
		<Paragraph type="secondary">
			No results for <q>{indexUiState.query}</q>.
		</Paragraph>
	)
}

function SearchFilter() {
	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Card title="Направление" className={styles.panel}>
				<RefinementList attribute="Direction" showMore />
			</Card>
			<Card title="Уровень" className={styles.panel}>
				<RefinementList attribute="Level" />
			</Card>
			<Card title="Страна" className={styles.panel}>
				<RefinementList attribute="Country" showMore />
			</Card>
			<ClearRefinements translations={{ resetButtonText: 'Очистить фильтр' }} />
		</Space>
	)
}

function SearchMobileFilter({ onClick }: any) {
	const { indexUiState } = useInstantSearch()
	const [count, setCount] = useState(0)

	useEffect(() => {
		let _count = 0

		if (!indexUiState?.refinementList || Object.entries(indexUiState.refinementList).length == 0) {
			setCount(_count)
			return
		}

		for (const attr of Object.values(indexUiState.refinementList)) {
			_count += attr.length
		}

		setCount(_count)
	}, [indexUiState])

	return (
		<Space>
			<Button onClick={onClick} icon={<BsFilter />}>
				Фильтр&nbsp;
				<Badge count={count} size="small" />
			</Button>
			{count > 0 && <ClearRefinements translations={{ resetButtonText: 'Очистить фильтр' }} />}
		</Space>
	)
}
