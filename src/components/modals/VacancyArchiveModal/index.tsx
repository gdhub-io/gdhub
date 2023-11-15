import { useEffect, useState } from 'react'
import { fetcher, fetherForMutation } from '@/helpers/fetcher'
import { List, Modal, Spin } from 'antd'
import { BsCheckLg } from 'react-icons/bs'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

const VacancyArchiveModal = ({ projectId, projectName, vacancyId, open, onRestore, onCancel }: any) => {
	const [processing, setProcessing] = useState(true)
	const [selectedItem, setSelectedItem] = useState<string>()

	const {
		data: archivedProjectVacancies,
		mutate: fetchArchivedProjectVacancies,
		isValidating: isLoadingMyArchivedProjectVacancies,
	} = useSWR({ url: '/api/my/project-vacancies', data: { projectId, projectName, archived: true } }, fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !projectId,
	})

	const { trigger: updateVacancy } = useSWRMutation('/api/vacancy/save', fetherForMutation)

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
		try {
			setProcessing(true)

			await updateVacancy({ id: selectedItem, data: { Status: 'Draft', 'Published At': null } })
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
							{vacancy.Name}
						</List.Item>
					)}
				/>
			</Spin>
		</Modal>
	)
}

export default VacancyArchiveModal
