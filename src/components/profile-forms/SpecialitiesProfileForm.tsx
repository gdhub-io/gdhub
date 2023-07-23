import { useState } from 'react'
import { Speciality, UserRole } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, List, message, Popconfirm, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { GiSkills } from 'react-icons/gi'
import { GoPlus, GoTrash } from 'react-icons/go'
import SpecialityModal from './modals/SpecialityModal'

const { Text } = Typography

const SpecialitiesProfileForm = ({ profile }: any) => {
	const session = useSession()
	const queryClient = useQueryClient()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedSpeciality, setSelectedSpeciality] = useState<any>()

	const { data: specialities, isFetching: processing } = useQuery(['user-specialities'], () =>
		axios.get<Speciality[]>('/api/user/specialities')
	)

	const { mutateAsync: deleteSpeciality } = useMutation(
		(params: any) => axios.delete('/api/user/speciality', { params }),
		{ onSuccess: () => queryClient.invalidateQueries(['user-specialities']) }
	)

	const showModal = () => {
		setSelectedSpeciality(null)
		setIsModalOpen(true)
	}

	const handleOk = () => {
		setIsModalOpen(false)
		queryClient.invalidateQueries(['user-specialities'])
		session.update({ roles: session.data?.user.roles.includes(UserRole.Member) })
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
			await deleteSpeciality({ id: specialityId })

			message.success('Специальность была удалена')
		} catch (error: any) {
			message.error('Error')
		}
	}

	return (
		<Card title="Специальности">
			<Spin spinning={processing}>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<Text>Специальности позволяют вам откликаться на вакансии с действующих проектов и проводить лекции.</Text>
					{specialities?.data && (
						<List
							size="small"
							bordered
							locale={{
								emptyText: (
									<Space direction="vertical">
										<GiSkills size={24} />
										<span>Вы не добавили еще ни одной специальности.</span>
										<Button type="primary" icon={<GoPlus />} onClick={showModal}>
											Добавить
										</Button>
									</Space>
								),
							}}
							dataSource={specialities.data}
							renderItem={(speciality: Speciality) => (
								<List.Item>
									<List.Item.Meta
										title={
											<>
												{speciality.name}
												<div style={{ opacity: 0.5, fontSize: '11px' }}>{speciality.level}</div>
											</>
										}
										description={speciality.specialization}
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
												<GoTrash />
											</Button>
										</Popconfirm>
									</Space>
								</List.Item>
							)}
						/>
					)}
					{!!specialities?.data.length && (
						<Button type="primary" onClick={showModal}>
							Добавить специальность
						</Button>
					)}
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
