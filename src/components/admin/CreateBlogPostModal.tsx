import { useMutation } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Form, Input, Modal } from 'antd'
import axios from 'axios'

export const CreateBlogPostModal = ({
	open,
	onCancel,
	onOk,
}: {
	open: boolean
	onCancel: () => void
	onOk: (values: any) => void
}) => {
	const { t } = useTolgee()
	const [form] = Form.useForm()

	const { mutateAsync: createPost, isLoading } = useMutation({
		mutationFn: (values: { title: string }) => {
			return axios.post('/api/admin/post', values)
		},
	})

	const handleOk = async () => {
		const values = form.getFieldsValue()
		const post = await createPost(values)

		onOk(post.data)
	}

	return (
		<Modal
			centered
			okText={t('blog.create-post.modal.ok-text', 'Create')}
			cancelText={t('blog.create-post.modal.cancel-text', 'Cancel')}
			title={t('blog.create-post.modal.title', 'Create blog post')}
			open={open}
			onCancel={onCancel}
			onOk={handleOk}
			confirmLoading={isLoading}
		>
			<Form form={form} onFinish={onOk} layout="vertical" requiredMark={false} variant="filled">
				<Form.Item
					name="title"
					rules={[{ required: true, message: t('blog.create-post.modal.title-required', 'Title is required') }]}
				>
					<Input placeholder={t('blog.create-post.modal.title-placeholder', 'Title')} />
				</Form.Item>
			</Form>
		</Modal>
	)
}
