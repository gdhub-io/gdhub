// import { useEffect } from 'react'
import SeasonContent from '@/components/SeasonContent'
import { fetcher } from '@/helpers/fetcher'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { getSeasonsSlugs } from '@/services/airtable'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import styles from './style.module.scss'

const SeasonPage: NextPageWithLayout = () => {
	const router = useRouter()
	const session: any = useSession()
	const { seasonSlug } = router.query
	const { data: season, isLoading } = useSWR(
		!!seasonSlug && { url: '/api/season/get', data: { slug: seasonSlug } },
		fetcher,
		{
			revalidateOnFocus: false,
		}
	)

	return (
		<>
			<Head>
				<title>{season?.Name || 'Season'}</title>
			</Head>
			<div className={styles.container}>
				<SeasonContent season={season} />
			</div>
		</>
	)
}

SeasonPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonPage

export async function getStaticPaths() {
	const slugs = await getSeasonsSlugs()

	return {
		paths: slugs.map((slug) => ({ params: { seasonSlug: slug } })), //[{ params: { id: '1' } }, { params: { id: '2' } }],
		fallback: false, // can also be true or 'blocking'
	}
}

export async function getStaticProps() {
	return {
		// Passed to the page component as props
		props: {},
	}
}
