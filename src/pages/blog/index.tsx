import { PublicLayout } from '@/layouts/PublicLayout'
import { GetServerSidePropsContext } from 'next'
import styles from './style.module.scss'

export default function BlogPage({ posts }: { posts: any[] }) {
	return (
		<PublicLayout title="The latest news and articles" seo={{ title: 'Blog | gdhub.io' }}>
			<div className={styles.page}>
				<h2>
					{posts.length} {posts.length === 1 ? 'post' : 'posts'}
				</h2>
				<div className={styles.posts}>
					{posts.map((post) => (
						<div key={post.id}>{post.title}</div>
					))}
				</div>
			</div>
		</PublicLayout>
	)
}

export async function getServerSideProps({ query }: GetServerSidePropsContext) {
	return {
		props: {
			posts: [],
		},
	}
}
