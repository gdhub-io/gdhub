'use client'

import React, { useState } from 'react'
import UserAdviceArchiveModal from '@/components/modals/UserAdviceArchiveModal'
import MyAdviceRequests from '@/components/MyAdviceRequests'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { AiOutlineHistory } from '@react-icons/all-files/ai/AiOutlineHistory'
import { useTranslate } from '@tolgee/react'
import { Button, Typography } from 'antd'
import { theme } from 'antd'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Text } = Typography

const MyExpertRequestsPage: NextPageWithLayout = () => {
	const { t } = useTranslate()
	const { data: session } = useSession()
	const { token } = theme.useToken()
	const router = useRouter()
	const [showArchive, setShowArchive] = useState(false)

	return (
		<ProtectedLayout
			title={t('expert-requests.myRequests', 'Advice Requests')}
			extra={
				<Button
					type="text"
					icon={<AiOutlineHistory />}
					onClick={() => setShowArchive(true)}
					aria-label="Archive"
					title={t('Archive')}
				>
					{t('Archive')}
				</Button>
			}
			showBackButton
			backButtonUrl="/hub/experts"
		>
			<div className={styles.container}>
				<MyAdviceRequests showTitle={false} />
			</div>

			<UserAdviceArchiveModal open={showArchive} user={session?.user} onClose={() => setShowArchive(false)} />
		</ProtectedLayout>
	)
}

export default MyExpertRequestsPage
