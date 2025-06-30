import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

const BlogPostEditor = dynamic(() => import('@/components/admin/BlogPostEditor').then((mod) => mod.default), {
	ssr: false,
})

const BlogPostEditorAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { id: postId } = router.query as { id: string }

	return <BlogPostEditor id={postId} />
}

BlogPostEditorAdminPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default BlogPostEditorAdminPage
