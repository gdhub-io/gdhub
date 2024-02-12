import { useEffect, useState } from 'react'
import { TeamVacancyStatus } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { List, Modal, Spin } from 'antd'
import axios from 'axios'
import { BsCheckLg } from 'react-icons/bs'

const VacancyArchiveModal = ({ projectId, projectName, teamId, open, onRestore, onCancel }: any) => {
	const [processing, setProcessing] = useState(true)
	const [selectedItem, setSelectedItem] = useState<string>()

	const {
		data: archivedProjectVacancies,
		refetch: fetchArchivedProjectVacancies,
		isLoading: isLoadingMyArchivedProjectVacancies,
	} = useQuery(
		['project-team-vacancies', 'archive', teamId],
		() =>
			axios.get('/api/user/project/vacancies', {
				params: { teamId, isArchive: true },
			}),
		{
			enabled: !!teamId,
			refetchOnWindowFocus: false,
		}
	)

	const { mutateAsync: saveVacancy, isLoading: isUpdating } = useMutation(
		(params: { id: string; data: Record<string, any> }) =>
			axios.put<any>('/api/user/project/vacancy', params.data, { params: { id: params.id } })
	)

	useEffect(() => {
		if (open) {
			setProcessing(false)
			setSelectedItem(undefined)
			fetchArchivedProjectVacancies()
		}
	}, [open])

	const handleCancel = () => {
		onCancel()
	}

	const handleOk = async () => {
		if (!selectedItem) return

		try {
			setProcessing(true)

			await saveVacancy({ id: selectedItem, data: { status: TeamVacancyStatus.Draft, publishedAt: null } })
			fetchArchivedProjectVacancies()

			setProcessing(false)
			onRestore(selectedItem)
		} catch (error) {
			console.log(error)
			setProcessing(false)
		}
	}

	return (
		<Modal
			centered
			title={`Архив вакансий с проекта ${projectName}`}
			width={800}
			destroyOnClose
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			confirmLoading={processing}
			okText="Восстановить"
			onOk={handleOk}
			okButtonProps={{
				disabled: !selectedItem,
			}}
		>
			<Spin spinning={processing}>
				<p>Выберите вакансию, которую хотите восстановить</p>
				<List
					bordered
					dataSource={archivedProjectVacancies?.data}
					renderItem={(vacancy: any) => (
						<List.Item
							style={{ cursor: 'pointer', fontWeight: selectedItem == vacancy.id ? 'bold' : 'normal' }}
							onClick={() => setSelectedItem(vacancy.id)}
							actions={selectedItem == vacancy.id ? [<BsCheckLg color="#000" key="icon-check-speciality" />] : []}
						>
							{vacancy.title}
						</List.Item>
					)}
				/>
			</Spin>
		</Modal>
	)
}

export default VacancyArchiveModal
