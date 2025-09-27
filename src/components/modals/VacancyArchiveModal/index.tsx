import { useEffect, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { BsCheckLg } from '@react-icons/all-files/bs/BsCheckLg'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { List, Modal, Spin } from 'antd'
import axios from 'axios'

const VacancyArchiveModal = ({ projectId, projectName, teamId, open, onRestore, onCancel }: any) => {
	const { t } = useTranslate()
	const [processing, setProcessing] = useState(true)
	const [selectedItem, setSelectedItem] = useState<string>()

	const {
		data: archivedProjectVacancies,
		refetch: fetchArchivedProjectVacancies,
		isLoading: isLoadingMyArchivedProjectVacancies,
	} = useQuery({
		queryKey: ['project-team-vacancies', 'archive', teamId],
		queryFn: () =>
			axios.get('/api/user/project/vacancies', {
				params: { teamId, isArchive: true },
			}),
		enabled: !!teamId,
		refetchOnWindowFocus: false,
	})

	const { mutateAsync: saveVacancy, isPending: isUpdating } = useMutation({
		mutationFn: (params: { id: string; data: Record<string, any> }) =>
			axios.put<any>('/api/user/project/vacancy', params.data, { params: { id: params.id } }),
	})

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

			await saveVacancy({ id: selectedItem, data: { status: prismaClient.TeamVacancyStatus.Draft, publishedAt: null } })
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
			title={t('modal.vacancyArchive.title', 'Archive of vacancies from the {projectName} project', { projectName })}
			width={800}
			destroyOnHidden
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			confirmLoading={processing}
			okText={t('modal.vacancyArchive.restore', 'Restore')}
			onOk={handleOk}
			okButtonProps={{
				disabled: !selectedItem,
			}}
		>
			<Spin spinning={processing}>
				<p>{t('modal.vacancyArchive.selectVacancy', 'Select the vacancy you want to restore')}</p>
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
