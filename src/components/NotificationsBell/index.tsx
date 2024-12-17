import { Inbox } from '@novu/react'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { theme } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

export const NotificationsBell = () => {
	const { getLanguage, t } = useTolgee()
	const router = useRouter()
	const { data: session } = useSession()
	const { token } = theme.useToken()

	const { data: signature } = useQuery(['novu-signature', session?.user.id], () =>
		axios.get<{ signature: string }>('/api/services/novu/signature')
	)

	if (!session || !signature?.data.signature) {
		return null
	}

	return (
		<div className={styles.component}>
			<Inbox
				localization={{
					'inbox.filters.labels.archived': t('novu.inbox.filters.labels.archived', 'Archived'),
					'inbox.filters.labels.unread': t('novu.inbox.filters.labels.unread', 'Unread'),
					'inbox.filters.dropdownOptions.default': t('novu.inbox.filters.dropdownOptions.default', 'All'),
					'inbox.filters.dropdownOptions.archived': t('novu.inbox.filters.dropdownOptions.archived', 'Archived'),
					'inbox.filters.dropdownOptions.unread': t('novu.inbox.filters.dropdownOptions.unread', 'Unread'),
					'notifications.emptyNotice': t('novu.notifications.emptyNotice', 'No notifications'),
					'inbox.filters.labels.default': t('novu.inbox.filters.labels.default', 'All'),
					'notification.actions.archive.tooltip': t('novu.notification.actions.archive.tooltip', 'Archive'),
					'notification.actions.read.tooltip': t('novu.notification.actions.read.tooltip', 'Mark as read'),
					'notification.actions.unarchive.tooltip': t('novu.notification.actions.unarchive.tooltip', 'Unarchive'),
					'notification.actions.unread.tooltip': t('novu.notification.actions.unread.tooltip', 'Mark as unread'),
					'notifications.actions.archiveAll': t('novu.notifications.actions.archiveAll', 'Archive all'),
					'notifications.actions.archiveRead': t('novu.notifications.actions.archiveRead', 'Archive read'),
					'notifications.actions.readAll': t('novu.notifications.actions.readAll', 'Mark all as read'),
					'notifications.newNotifications': t('novu.notifications.newNotifications', 'New notifications'),
					'preferences.global': t('novu.preferences.global', 'General'),
					'preferences.title': t('novu.preferences.title', 'Settings'),
					'preferences.workflow.disabled.notice': t(
						'novu.preferences.workflow.disabled.notice',
						'This workflow is disabled'
					),
					'preferences.workflow.disabled.tooltip': t(
						'novu.preferences.workflow.disabled.tooltip',
						'This workflow is disabled'
					),
					dynamic: {
						// use the workflowId as a key to localize the workflow name
						'comment-on-post': t('novu.dynamic.comment-on-post', 'Post comments'),
					},
					locale: getLanguage() == 'ru' ? 'ru-RU' : 'en-US',
				}}
				applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_CLIENT_APP_ID as string}
				subscriberId={session?.user.id}
				subscriberHash={signature?.data.signature}
				routerPush={(path: string) => router.push(path)}
				appearance={{
					variables: {
						colorPrimary: token.colorPrimaryText,
						colorBackground: token.colorBgBase,
						fontSize: `${token.fontSize}px`,
					},
					elements: {
						bellIcon: styles.bellIcon,
						popoverTrigger: styles.popoverTrigger,
						notification: styles.notification,
						popoverContent: styles.popoverContent,
					},
				}}
			/>
		</div>
	)
}
