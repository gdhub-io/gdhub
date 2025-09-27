import { HeldLectures } from '@/components/lectures/HeldLectures'
import { ReadyLectures } from '@/components/lectures/ReadyLectures'
import { RequestedLectures } from '@/components/lectures/RequestedLectures'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTranslate } from '@tolgee/react'
import { Space } from 'antd'

const LecturesPage: NextPageWithLayout = () => {
	const { t } = useTranslate()

	return (
		<ProtectedLayout title={t('Lectures')}>
			<Space direction="vertical" size="large">
				<p>
					{t(
						'hub.lectures.text1.part1',
						'Often, when solving certain problems, many questions arise. This section will help you find answers to them from other gamehub participants. Create a request for a topic that interests you and, if it is relevant not only for you, we will try to carry it out.'
					)}

					<br />
					{t(
						'hub.lectures.text1.part2',
						'And for those who want to share their experience with others, here you will find the opportunity to do so. Follow topics that interest other participants and offer yourself as a lecturer.'
					)}

					<br />
					{t('hub.lectures.text1.part3', 'Let&apos;s share knowledge, gain wisdom ;)')}
				</p>

				<RequestedLectures />
				<ReadyLectures />
				<HeldLectures />
			</Space>
		</ProtectedLayout>
	)
}

export default LecturesPage
