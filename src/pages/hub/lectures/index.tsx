import { HeldLectures } from '@/components/lectures/HeldLectures'
import { ReadyLectures } from '@/components/lectures/ReadyLectures'
import { RequestedLectures } from '@/components/lectures/RequestedLectures'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { T, useTolgee } from '@tolgee/react'
import { Space } from 'antd'

const LecturesPage: NextPageWithLayout = () => {
	const { t } = useTolgee()

	return (
		<ProtectedLayout title={t('Lectures')}>
			<h1>
				<T>Lectures</T>
			</h1>
			<Space direction="vertical" size="large">
				<p>
					<T keyName="hub.lectures.text1.part1">
						Often, when solving certain problems, many questions arise. This section will help you find answers to them
						from other gamehub participants. Create a request for a topic that interests you and, if it is relevant not
						only for you, we will try to carry it out.
					</T>
					<br />
					<T keyName="hub.lectures.text1.part1">
						And for those who want to share their experience with others, here you will find the opportunity to do so.
						Follow topics that interest other participants and offer yourself as a lecturer.
					</T>
					<br />
					<T keyName="hub.lectures.text1.part1">Let&apos;s share knowledge, gain wisdom ;)</T>
				</p>

				<RequestedLectures />
				<ReadyLectures />
				<HeldLectures />
			</Space>
		</ProtectedLayout>
	)
}

export default LecturesPage
