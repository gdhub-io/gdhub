import { useState } from 'react'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Popover, Space, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const { Title, Text, Paragraph } = Typography

const BlogPostEditor = dynamic(() => import('@/components/admin/BlogPostEditor').then((mod) => mod.default), {
	ssr: false,
})

const BlogPostEditorAdminPage: NextPageWithLayout = () => {
	const [postId, setPostId] = useState<string | undefined>(undefined)
	const {
		data: response,
		refetch: refetchPosts,
		isFetching,
	} = useQuery(['admin', 'posts'], () => axios.get('/api/admin/posts'), { refetchOnWindowFocus: false })
	const { mutateAsync: deletePost } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/post`, { params: { id } }),
		{
			onSuccess: () => {
				refetchPosts()
			},
		}
	)

	// const handleChange = (recordId: string) => {
	// 	setLectureId(recordId)
	// 	setShowModal(true)
	// }

	const handleDelete = (recordId: string) => {
		deletePost({ id: recordId })
		setPostId(undefined)
	}

	const handleCreatePost = (values: any) => {
		console.log(values)
	}

	return (
		<>
			<BlogPostEditor id={postId} />
		</>
	)
}

BlogPostEditorAdminPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default BlogPostEditorAdminPage
