import { useEffect } from 'react'
import { Lecture, LectureStage, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Input, message, Modal, Select, Spin } from 'antd'
import axios from 'axios'

const LectureRequestModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	// const [processing, setProcessing] = useState(true)
	// const [lecture, setLectureId] = useState<any>()

	const {
		data: lecture,
		refetch: fetchLecture,
		isFetching,
		isPaused,
	} = useQuery(['lecture', lectureId], () => axios.get<Lecture>('/api/lecture', { params: { id: lectureId } }), {
		enabled: !!lectureId,
		onSuccess({ data }) {
			form.setFieldsValue({
				name: data.name,
				wishes: data.wishes,
				directionId: data.directionId,
			})
		},
	})

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const { mutateAsync: createLecture } = useMutation((data: Partial<Lecture>) =>
		axios.post<Lecture>('/api/user/lecture', { ...data, stage: LectureStage.Requested })
	)
	const { mutateAsync: updateLecture } = useMutation(({ id, data }: { id: string; data: Partial<Lecture> }) =>
		axios.put<Lecture>('/api/user/lecture', data, { params: { id } })
	)

	const workDirectionOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			if (lectureId) {
				await updateLecture({ id: lectureId, data: formData })
				message.success('Лекция изменена')
			} else {
				await createLecture(formData)
				message.success('Добавлена новый запрос на лекцию')
			}

			form.resetFields()
			onOk()
		} catch (error: any) {
			message.error(error.message)
		}
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			centered
			title={lectureId ? 'Изменить запрос на лекцию' : 'Запросить новую лекцию'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText={lectureId ? 'Сохранить' : 'Опубликовать'}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isFetching}
		>
			<Spin spinning={isFetching}>
				<Form
					form={form}
					layout="vertical"
					name="lecture-request-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
				>
					<Form.Item label="Тема лекции" name="name" rules={[{ required: true }]} required wrapperCol={{ span: 24 }}>
						<Input width={'100%'} placeholder={`Например: Как проводить анализ проекта`} />
					</Form.Item>

					<Form.Item
						name="directionId"
						label="К какому направлению относится данная лекция"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select style={{ width: '100%' }} placeholder={`Например: геймдизайн`} options={workDirectionOptions} />
					</Form.Item>

					<Form.Item
						name="wishes"
						label="Пожелания по содержанию лекции"
						help="Чтобы вы хотели узнать на данной лекции?"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={`Например: Хочу узнать как проводить swot-анализ и для чего он нужен`}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default LectureRequestModal
