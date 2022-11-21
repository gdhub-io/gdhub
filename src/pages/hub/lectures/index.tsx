import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Button, Space, Spin, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DateTime } from 'luxon'
import Head from 'next/head'
import { useRouter } from 'next/router'
import useSWR from 'swr'

type LectureStatus = 'Requested' | 'Actualized' | 'Canceled' | 'Ready' | 'Held'

type LectureDirection =
	| 'Programming'
	| 'Game Design'
	| '2D Art & Animation'
	| '3D Art & Animation'
	| 'Project Management'
	| 'Product Management'
	| 'Technical Artist'
	| 'Team Management'

interface DataType {
	key: string
	Name: string
	Status: LectureStatus
	Direction: LectureDirection
	Wishes: string
	[key: string]: any
}

const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)

const LecturesPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [loading, setLoading] = useState(true)

	const {
		data: lectures,
		mutate: mutateLectures,
		isValidating: isLoadingLectures,
	} = useSWR(['/api/lecture/list'], fetcher)

	useEffect(() => {
		setLoading(false)
	}, [])

	const columnsForRequested: ColumnsType<DataType> = [
		{
			title: 'Тема лекции',
			dataIndex: 'Name',
			key: 'Name',
			render: (text) => <strong>{text}</strong>,
		},
		{
			title: 'Направление',
			dataIndex: 'Direction',
			key: 'Direction',
		},
		{
			title: 'Хочешь провести лекцию?',
			dataIndex: 'Lecturer Name',
			key: 'Lecturer Name',
			render: (data: any, lecture) => {
				const applicatnsCount = lecture['Applicants Number'] as number

				if (data) {
					return data
				} else {
					return applicatnsCount >= 10 ? <Button>Стать лектором</Button> : <small>Недостаточно желающих</small>
				}
			},
		},
		{
			title: 'Вам актуальна лекция?',
			key: 'join-to-lecture',
			render: (_, lecture) => (
				<Space wrap>
					<Button>Пойду</Button>
					{(lecture['Applicants Number'] as number) >= 3 ? (
						<small>идут {lecture['Applicants Number']} участников</small>
					) : (
						<small>интересующихся пока мало</small>
					)}
				</Space>
			),
		},
	]

	const columnsForReady: ColumnsType<DataType> = [
		{
			title: 'Дата',
			dataIndex: 'Date',
			key: 'Date',
			render: (date) => {
				return DateTime.fromISO(date).toFormat('dd LLL yyyy, t', {
					locale: router.locale,
				})
			},
		},
		{
			title: 'Тема лекции',
			dataIndex: 'Name',
			key: 'Name',
			render: (text) => <strong>{text}</strong>,
		},
		{
			title: 'Направление',
			dataIndex: 'Direction',
			key: 'Direction',
		},
		{
			title: 'Лектор',
			dataIndex: 'Lecturer Name',
			key: 'Lecturer Name',
		},
		{
			key: 'register-to-lecture',
			render: () => <Button>Подробнее</Button>,
		},
	]

	return (
		<>
			<Head>
				<title>Лекции</title>
			</Head>
			<h1>Лекции</h1>
			<Space direction="vertical" size="large">
				<p>
					Часто при решении тех или иных задач возникает множество вопросов. Этот раздел поможет найти на них ответы у
					других участников геймхаба. Создайте запрос на интересующую вас тему и, если она будет актуальна не только для
					вас, попробуем ее провести.
					<br />А тем, кто хочет делиться своим опытом с другими, здесь вы найдете возможность это делать. Следите за
					темами, которые интересуют других участников и предлагайте себя в качестве лектора.
					<br />
					Делимся знаниями, набираемся мудрости ;)
				</p>
				<Button type="primary">Предложить тему лекции</Button>
				<div>
					<h3>Запросы на лекции</h3>
					Отметьте лекции, которые вам было бы интересно посетить.
					<Spin spinning={isLoadingLectures}>
						<Table
							columns={columnsForRequested}
							dataSource={lectures?.data.filter((l: any) => ['Requested', 'Actualized'].includes(l.Status))}
							pagination={false}
						/>
					</Spin>
				</div>
				<div>
					<h3>Запланированные лекции</h3>
					<Spin spinning={isLoadingLectures}>
						<Table
							columns={columnsForReady}
							dataSource={lectures?.data.filter((l: any) => l.Status == 'Ready')}
							pagination={false}
						/>
					</Spin>
				</div>
			</Space>
		</>
	)
}

LecturesPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default LecturesPage
