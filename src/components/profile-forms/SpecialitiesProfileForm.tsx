import { useEffect, useState } from 'react'
import { Button, Card, List, message, Popconfirm, Space, Spin } from 'antd'
import { HiOutlineTrash } from 'react-icons/hi'
import SpecialityModal from './modals/SpecialityModal'

const SpecialitiesProfileForm = ({ profile }: any) => {
	const [processing, setProcessing] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [specialities, setSpecialities] = useState([])
	const [selectedSpeciality, setSelectedSpeciality] = useState<any>()

	useEffect(() => {
		if (!profile?.id) {
			return
		}

		fetchSpecialities()
	}, [profile])

	const fetchSpecialities = () => {
		try {
			setProcessing(true)

			fetch('/api/profile/specialities', {
				method: 'post',
				body: JSON.stringify({ profileId: profile?.id }),
				headers: {
					'Content-Type': 'application/json',
				},
			}).then(async (response: any) => {
				setProcessing(false)

				if (response.error) {
					throw new Error(response.error.message)
				}

				const data = await response.json()

				setSpecialities(data)
				console.log('specialities', data)
			})
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	const showModal = () => {
		setSelectedSpeciality(null)
		setIsModalOpen(true)
	}

	const handleOk = () => {
		fetchSpecialities()
		setIsModalOpen(false)
	}

	const handleCancel = () => {
		setSelectedSpeciality(null)
		setIsModalOpen(false)
	}

	const handleEditSpeciality = (speciality: any) => {
		setSelectedSpeciality(speciality)
		setIsModalOpen(true)
	}

	const handleDeleteSpeciality = async (specialityId: string) => {
		try {
			await fetch('/api/profile/speciality/delete', {
				method: 'post',
				body: JSON.stringify({ specialityId }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			fetchSpecialities()
			message.success('Специальность была удалена')
		} catch (error: any) {
			message.error('Error')
		}
	}

	return (
		<Card title="Специальности">
			<Spin spinning={processing}>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					{specialities?.length > 0 && (
						<List
							size="small"
							bordered
							dataSource={specialities}
							renderItem={(speciality: any) => (
								<List.Item>
									<List.Item.Meta
										title={
											<>
												{speciality.fields.Name}
												<div style={{ opacity: 0.5, fontSize: '11px' }}>{speciality.fields.Level}</div>
											</>
										}
										description={speciality.fields.Specialization}
									/>
									<Space>
										<Button onClick={() => handleEditSpeciality(speciality)}>Изменить</Button>
										<Popconfirm
											title="Точно хотите удалить？"
											okText="Да"
											cancelText="Нет"
											onConfirm={() => handleDeleteSpeciality(speciality.id)}
										>
											<Button type="text" danger>
												<HiOutlineTrash />
											</Button>
										</Popconfirm>
									</Space>
								</List.Item>
							)}
						/>
					)}
					<Button type="primary" onClick={showModal}>
						Добавить специальность
					</Button>
				</Space>
				<SpecialityModal
					speciality={selectedSpeciality}
					profileId={profile?.id}
					open={isModalOpen}
					onOk={handleOk}
					onCancel={handleCancel}
				/>
			</Spin>
		</Card>
	)
}

export default SpecialitiesProfileForm
