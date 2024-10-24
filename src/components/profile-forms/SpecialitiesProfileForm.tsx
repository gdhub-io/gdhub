import { useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GiSkills } from '@react-icons/all-files/gi/GiSkills'
import { GoPlus } from '@react-icons/all-files/go/GoPlus'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, List, message, Popconfirm, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import SpecialityModal from './modals/SpecialityModal'

const { Text } = Typography

const SpecialitiesProfileForm = ({ profile }: any) => {
	const session = useSession()
	const queryClient = useQueryClient()
	const { t } = useTolgee()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedSpeciality, setSelectedSpeciality] = useState<any>()

	const { data: specialities, isFetching: processing } = useQuery(['user-specialities'], () =>
		axios.get<prismaClient.Speciality[]>('/api/user/specialities')
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
		session.update({ roles: session.data?.user.roles.includes(prismaClient.UserRole.Member) })
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

			message.success(t('Specialty has been removed'))
		} catch (error: any) {
			message.error('Error')
		}
	}

	return (
		<Card title={<T keyName="profile-form.specialities.card.title">Specialties</T>}>
			<Spin spinning={processing}>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<Text>
						<T keyName="profile-form.specialities.card.description">
							Specialties allow you to respond to vacancies from existing projects and conduct lectures.
						</T>
					</Text>
					{specialities?.data && (
						<List
							size="small"
							bordered
							locale={{
								emptyText: (
									<Space direction="vertical">
										<GiSkills size={24} />
										<span>
											<T keyName="profile-form.specialities.card.no-specialities">
												You have not added a single specialty yet.
											</T>
										</span>
										<Button type="primary" icon={<GoPlus />} onClick={showModal}>
											<T keyName="profile-form.specialities.card.button.add-speciality">Add</T>
										</Button>
									</Space>
								),
							}}
							dataSource={specialities.data}
							renderItem={(speciality: prismaClient.Speciality) => (
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
										<Button onClick={() => handleEditSpeciality(speciality)}>
											<T keyName="profile-form.specialities.card.button.change-speciality">Change</T>
										</Button>
										<Popconfirm
											title={<T>You definitely want to remove?</T>}
											okText={<T>Yes</T>}
											cancelText={<T>No</T>}
											onConfirm={() => handleDeleteSpeciality(speciality.id)}
										>
											<Button type="text" danger icon={<GoTrash />} />
										</Popconfirm>
									</Space>
								</List.Item>
							)}
						/>
					)}
					{!!specialities?.data.length && (
						<Button type="primary" onClick={showModal}>
							<T>Add specialty</T>
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
