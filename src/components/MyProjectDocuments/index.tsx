import { useContext, useState } from 'react'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { HiOutlineTrash } from '@react-icons/all-files/hi/HiOutlineTrash'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Flex, Grid, message, Popconfirm, Space, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import dynamic from 'next/dynamic'

const { Text } = Typography

const DocumentModal = dynamic(() => import('@/components/modals/CreateProjectModal'), { ssr: false })

interface ProjectDocument {
	key: string
	Name: string
	Description: string
	FinishedAt: string
	Status: prismaClient.TeamVacancyStatus
	[key: string]: any
}

const MyProjectDocuments = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [showDocumentModal, setShowDocumentModal] = useState(false)
	const [selectedDocumentId, setSelectedDocumentId] = useState<string>()

	const {
		data: projectDocuments,
		refetch: fetchMyProjectDocuments,
		isLoading: isLoadingMyProjectDocuments,
	} = useQuery(
		['project-team-documents', contextProject?.teamId],
		() =>
			axios.get('/api/user/project/documents', {
				params: { teamId: contextProject?.teamId },
			}),
		{
			enabled: !!contextProject?.teamId,
			refetchOnWindowFocus: false,
		}
	)

	const documentsColumns: ColumnsType<ProjectDocument> = [
		{
			title: t('project.documents.title', 'Title'),
			dataIndex: 'title',
			key: 'title',
			width: '50%',
			render: (value, data) => (
				<Space direction="vertical" size={0}>
					<Text
						className={tableStyles.tableMemberName}
						onClick={() => handleEditDocument(data.id)}
						style={{ cursor: 'pointer' }}
					>
						{value}
					</Text>
				</Space>
			),
		},
		{
			title: t('project.documents.type', 'Type'),
			dataIndex: 'type',
			key: 'type',
			responsive: ['md'],
			render: (value) => <Text className={tableStyles.tableMemberPosition}>{value}</Text>,
		},
		{
			title: t('project.documents.uploadedAt', 'Uploaded at'),
			dataIndex: 'uploadedAt',
			key: 'uploadedAt',
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
					<Popconfirm
						title={t('You definitely want to delete the document?')}
						okText={t('Yes', 'Yes')}
						cancelText={t('No', 'No')}
						onConfirm={() => handleDeleteDocument(record.id)}
					>
						<Button type="text" danger>
							<HiOutlineTrash />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	]

	const handleEditDocument = (id: string) => {
		setSelectedDocumentId(id)
		setShowDocumentModal(true)
	}

	const handleDeleteDocument = async (id: string) => {
		// await fetcher({ url: '/api/user/project/vacancy/close', data: { id } })
		// await deleteDocument({ id })
		setSelectedDocumentId(undefined)
		fetchMyProjectDocuments()

		message.success(t('project.documents.documentDeleted', 'Document deleted'))
	}

	const handleSaveVacancy = () => {
		setShowDocumentModal(false)
		setSelectedDocumentId(undefined)
		fetchMyProjectDocuments()
	}

	return (
		<>
			<Flex justify="space-between" align="center" style={{ marginTop: 60 }}>
				<Space align="center">
					<h3 style={{ margin: 0 }}>{t('project.documents.title', 'Documents')}</h3>
					<Button onClick={() => setShowDocumentModal(true)}>
						{t('project.documents.addDocument', 'Upload document')}
					</Button>
				</Space>
			</Flex>

			{projectDocuments?.data.length > 0 ? (
				<ModernTable
					showHeader={false}
					loading={isLoadingMyProjectDocuments}
					columns={documentsColumns}
					dataSource={projectDocuments?.data?.map((m: any) => ({ ...m, key: m.id }))}
					pagination={false}
				/>
			) : (
				<p style={{ marginTop: 12, color: 'gray' }}>
					{t('project.documents.noDocuments', 'There are no documents at the moment')}
				</p>
			)}

			<DocumentModal
				teamId={contextProject?.teamId}
				projectId={contextProject?.id}
				documentId={selectedDocumentId}
				open={showDocumentModal}
				onCancel={() => {
					setShowDocumentModal(false)
					setSelectedDocumentId(undefined)
				}}
				onOk={() => {}}
			/>
		</>
	)
}

export default MyProjectDocuments
