// import { useEffect } from 'react'
import SeasonContent, { SeasonData } from '@/components/SeasonContent'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const SeasonPage: NextPageWithLayout = () => {
	const router = useRouter()
	const seasonSlug = router.query.seasonSlug as string

	const { data: season } = useQuery(
		['season', seasonSlug],
		() =>
			axios.get<SeasonData>('/api/season', {
				params: { slug: seasonSlug },
			}),
		{ enabled: !!seasonSlug, refetchOnWindowFocus: false }
	)

	return (
		<>
			{/* <Head>
				<title>{season?.data.name || 'Season'}</title>
			</Head> */}
			<div className={styles.container}>{!!season && <SeasonContent season={season?.data} />}</div>
		</>
	)
}

SeasonPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonPage

export async function getStaticPaths() {
	const slugs = await prisma.season.findMany({ select: { slug: true } })

	return {
		paths: slugs.map((season) => ({ params: { seasonSlug: season.slug } })),
		fallback: false, // can also be true or 'blocking'
	}
}

export async function getStaticProps() {
	return {
		// Passed to the page component as props
		props: {},
	}
}
