import { useContext, useState } from 'react'
import VacancyModal from '@/components/modals/VacancyModal'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { HiOutlineLockClosed } from '@react-icons/all-files/hi/HiOutlineLockClosed'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Flex, Grid, message, Popconfirm, Space, Tag, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import VacancyArchiveModal from '../modals/VacancyArchiveModal'

const { Text } = Typography

interface Vacancy {
	key: string
	Name: string
	Description: string
	FinishedAt: string
	Status: prismaClient.TeamVacancyStatus
	[key: string]: any
}

const MyProjectVacancies = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [showVacancyModal, setShowVacancyModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const [showVacancyArchiveModal, setShowVacancyArchiveModal] = useState(false)

	const {
		data: projectVacancies,
		refetch: fetchMyProjectVacancies,
		isLoading: isLoadingMyMyProjectVacancies,
	} = useQuery(
		['project-team-vacancies', contextProject?.teamId],
		() =>
			axios.get('/api/user/project/vacancies', {
				params: { teamId: contextProject?.teamId },
			}),
		{
			enabled: !!contextProject?.teamId,
			refetchOnWindowFocus: false,
		}
	)

	const { mutateAsync: cancelVacany } = useMutation((data: { id: string }) =>
		axios.delete<any>('/api/user/project/vacancy', { params: data })
	)

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: t('Title'),
			dataIndex: 'title',
			key: 'title',
			width: '50%',
			render: (value, data) => (
				<Space direction="vertical" size={0}>
					<Text
						className={tableStyles.tableMemberName}
						onClick={() => handleEditVacancy(data.id)}
						style={{ cursor: 'pointer' }}
					>
						{value}
					</Text>
					{data.status == 'Draft' && (
						<Tag color="lime">
							<T keyName={data.status} />
						</Tag>
					)}
				</Space>
			),
		},
		{
			title: t('Direction'),
			dataIndex: 'direction',
			key: 'direction',
			responsive: ['md'],
			render: (value) => <Text className={tableStyles.tableMemberPosition}>{value}</Text>,
		},
		{
			title: t('Valid until'),
			dataIndex: 'finishedAt',
			key: 'finishedAt',
			responsive: ['md'],
			render: (value) =>
				value ? (
					<Text className={tableStyles.tableMemberDates}>{t('to') + ' ' + dayjs(value).format('LLL')}</Text>
				) : null,
		},
		{
			key: 'actions',
			width: '1%',
			render: (value, record) => (
				<Space>
					{screens.md && (
						<Button onClick={() => handleEditVacancy(record.id)}>
							<T>Change</T>
						</Button>
					)}
					<Popconfirm
						title={t('You definitely want to close the vacancy?')}
						okText={<T>Yes</T>}
						cancelText={<T>No</T>}
						onConfirm={() => handleCloseVacancy(record.id)}
					>
						<Button type="text" danger>
							<HiOutlineLockClosed />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	]

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyModal(true)
	}

	const handleCloseVacancy = async (id: string) => {
		// await fetcher({ url: '/api/user/project/vacancy/close', data: { id } })
		await cancelVacany({ id })
		setSelectedVacancyId(undefined)
		fetchMyProjectVacancies()

		message.success(<T>The vacancy is closed</T>)
	}

	const handleSaveVacancy = () => {
		setShowVacancyModal(false)
		setSelectedVacancyId(undefined)
		fetchMyProjectVacancies()
	}

	const handleRestoreVacation = (vacancyId: string) => {
		setShowVacancyArchiveModal(false)
		fetchMyProjectVacancies()

		setSelectedVacancyId(vacancyId)
		setShowVacancyModal(!!vacancyId)
	}

	return (
		<>
			<Flex justify="space-between" align="center" style={{ marginTop: 60 }}>
				<Space align="center">
					<h3 style={{ margin: 0 }}>
						<T>Vacancies</T>
					</h3>
					<Button onClick={() => setShowVacancyModal(true)}>
						<T>Add the vacancy</T>
					</Button>
				</Space>
				<Button type="link" onClick={() => setShowVacancyArchiveModal(true)}>
					<T>Archive</T>
				</Button>
			</Flex>

			{projectVacancies?.data.length > 0 ? (
				<ModernTable
					showHeader={false}
					loading={isLoadingMyMyProjectVacancies}
					columns={vacanciesColumns}
					dataSource={projectVacancies?.data?.map((m: any) => ({ ...m, key: m.id }))}
					pagination={false}
				/>
			) : (
				<p style={{ marginTop: 12, color: 'gray' }}>
					<T>There are no open vacancies at the moment</T>
				</p>
			)}

			<VacancyModal
				teamId={contextProject?.teamId}
				vacancyId={selectedVacancyId}
				open={showVacancyModal}
				onCancel={() => {
					setShowVacancyModal(false)
					setSelectedVacancyId(undefined)
				}}
				onOk={handleSaveVacancy}
			/>

			<VacancyArchiveModal
				teamId={contextProject?.teamId}
				projectId={contextProject?.id}
				projectName={contextProject?.name}
				open={showVacancyArchiveModal}
				onCancel={() => {
					setShowVacancyArchiveModal(false)
				}}
				onRestore={handleRestoreVacation}
			/>
		</>
	)
}

export default MyProjectVacancies
