import { useEffect, useState } from 'react'
import { HeldLectures } from '@/components/lectures/HeldLectures'
import { ReadyLectures } from '@/components/lectures/ReadyLectures'
import { RequestedLectures } from '@/components/lectures/RequestedLectures'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Space } from 'antd'
import Head from 'next/head'

const LecturesPage: NextPageWithLayout = () => {
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		setLoading(false)
	}, [])

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

				<RequestedLectures />
				<ReadyLectures />
				<HeldLectures />
			</Space>
		</>
	)
}

LecturesPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default LecturesPage
