import { useState } from 'react'
import { CreateBlogPostModal } from '@/components/admin/CreateBlogPostModal'
import ModernTable from '@/components/ModernTable'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Popover, Row, Space, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Text, Paragraph } = Typography

const BlogPostsAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const [postId, setPostId] = useState<string | undefined>(undefined)
	const {
		data: response,
		refetch: refetchPosts,
		isFetching,
	} = useQuery(['admin', 'posts'], () => axios.get('/api/admin/posts'), { refetchOnWindowFocus: false })
	const { mutateAsync: deletePost } = useMutation(({ id }: { id: string }) => axios.delete(`/api/admin/post/${id}`), {
		onSuccess: () => {
			refetchPosts()
		},
	})

	// const handleChange = (recordId: string) => {
	// 	setLectureId(recordId)
	// 	setShowModal(true)
	// }

	const handleDelete = (recordId: string) => {
		deletePost({ id: recordId })
		setPostId(undefined)
	}

	const handleCreatePost = (id: string) => {
		setPostId(id)
		setShowModal(false)

		router.push(`/admin/post/${id}`)
	}

	const columns: ColumnsType<prismaClient.BlogPost> = [
		{
			title: 'Title',
			dataIndex: 'title',
			key: 'title',
			render: (value, record) => <Link href={`/admin/post/${record.id}`}>{value}</Link>,
		},
		{
			title: 'Date',
			dataIndex: 'publishedAt',
			key: 'publishedAt',
			render: (value, data) =>
				data.status == prismaClient.BlogPostStatus.Draft ? (
					<Text type="secondary">not selected</Text>
				) : (
					dayjs(data.publishedAt).format('LLL')
				),
		},
		{
			title: 'Authors',
			dataIndex: 'authorIds',
			key: 'authorIds',
			render: (value, data) =>
				!!data.authorIds ? (
					data.authorIds.map((id) => (
						<Link key={id} href={`/admin/user/${id}`}>
							{id}
						</Link>
					))
				) : (
					<Text type="secondary">not selected</Text>
				),
		},
		{ title: 'Status', dataIndex: 'status', key: 'status' },
		{
			title: 'Created at',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (value) => (
				<Popover content={dayjs(value).format('LLL')}>
					<Text>{dayjs(value).fromNow()}</Text>
				</Popover>
			),
		},
		{
			key: 'actions',
			width: '1%',
			render(value, record) {
				return (
					<Space size="large">
						<Link href={`/blog/${record.slug}`} target="_blank">
							<Button type="text">Go to post</Button>
						</Link>
						<Popconfirm title="Are you sure you want to delete this entry?" onConfirm={() => handleDelete(record.id)}>
							<Button type="text" danger icon={<GoTrash />} />
						</Popconfirm>
					</Space>
				)
			},
		},
	]

	return (
		<>
			<div className={styles.main}>
				<Row justify="space-between" align="middle">
					<Title level={2}>Blog posts</Title>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add post
					</Button>
				</Row>
				<ModernTable loading={isFetching} dataSource={response?.data} columns={columns} />
			</div>

			<CreateBlogPostModal open={showModal} onCancel={() => setShowModal(false)} onOk={handleCreatePost} />
		</>
	)
}

BlogPostsAdminPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default BlogPostsAdminPage
