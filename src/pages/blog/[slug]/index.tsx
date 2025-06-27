import { PublicLayout } from '@/layouts/PublicLayout'
import { GetServerSidePropsContext } from 'next'
import styles from './style.module.scss'

export default function BlogPage({ post }: { post: any }) {
	return (
		<PublicLayout title="The latest gdhub.io articles" seo={{ title: 'Blog | gdhub.io' }}>
			<div className={styles.page}>
				<h2>{post}</h2>
			</div>
		</PublicLayout>
	)
}

export async function getServerSideProps({ query }: GetServerSidePropsContext) {
	const slug = query.slug

	return {
		props: {
			post: slug,
		},
	}
}
