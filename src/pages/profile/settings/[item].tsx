import React, { useEffect, useState } from 'react'
import ConnectProfileForm from '@/components/profile-forms/ConnectProfileForm'
import GeneralProfileForm from '@/components/profile-forms/GeneralProfileForm'
import InterestsProfileForm from '@/components/profile-forms/InterestsProfileForm'
import MentorshipProfileForm from '@/components/profile-forms/MentorshipProfileForm'
import ResourcesProfileForm from '@/components/profile-forms/ResourcesProfileForm'
import SpecialitiesProfileForm from '@/components/profile-forms/SpecialitiesProfileForm'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Layout, Menu } from 'antd'
import { ItemType, MenuItemType } from 'antd/es/menu/interface'
import axios from 'axios'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Sider, Content } = Layout

const ProfilePage: NextPageWithLayout = ({ params }: any) => {
	const [content, setContent] = useState<React.JSX.Element>()
	const searchParams = useSearchParams()
	const router = useRouter()
	const { t } = useTolgee()
	const queryClient = useQueryClient()
	const { data: profile } = useQuery(['profile'], () => axios.get<prismaClient.Profile>('/api/user/profile'))
	const { mutateAsync: saveProfile } = useMutation<any, any, any>(
		(variables: any) => axios.put<void>('/api/user/profile', variables),
		{
			onSuccess: async () => {
				await queryClient.invalidateQueries(['profile'])
			},
		}
	)

	const settingsMenu: ItemType<MenuItemType>[] = [
		{
			label: t('profile.settings.menu.general', 'General'),
			key: 'general',
		},
		{
			label: t('profile.settings.menu.specialities', 'Specialities'),
			key: 'specialities',
		},
		{
			label: t('profile.settings.menu.mentorship', 'Mentorship'),
			key: 'mentorship',
		},
		{
			label: t('profile.settings.menu.resources', 'Resources'),
			key: 'resources',
		},
		{
			label: t('profile.settings.menu.connections', 'Connections'),
			key: 'connections',
		},
		{
			label: t('profile.settings.menu.interests', 'Interests'),
			key: 'interests',
		},
	]

	useEffect(() => {
		if (!router.query?.item) return

		switchContent(router.query.item as string)
	}, [router.query.item])

	const switchContent = (key: string) => {
		if (!profile) return

		let _content = <GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />

		switch (key) {
			case 'general':
				_content = <GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />
				break
			case 'specialities':
				_content = <SpecialitiesProfileForm profile={profile.data} />
				break
			case 'mentorship':
				_content = <MentorshipProfileForm profile={profile.data} />
				break
			case 'resources':
				_content = <ResourcesProfileForm profile={profile.data} saveProfile={saveProfile} />
				break
			case 'connections':
				_content = <ConnectProfileForm profile={profile.data} saveProfile={saveProfile} />
				break
			case 'interests':
				_content = <InterestsProfileForm profile={profile.data} saveProfile={saveProfile} />
				break
		}

		router.push(`/profile/settings/${key}`)

		setContent(_content)
	}

	if (!profile?.data)
		return (
			<ProtectedLayout title={t('Settings')}>
				<></>
			</ProtectedLayout>
		)

	return (
		<ProtectedLayout title={t('Settings')}>
			<Layout>
				<Sider width={200} className={styles.sider}>
					<Menu
						mode="vertical"
						defaultSelectedKeys={[(router.query?.item as string) || 'general']}
						style={{ height: '100%', borderRight: 0 }}
						items={settingsMenu}
						onSelect={({ key }) => switchContent(key)}
					/>
				</Sider>
				<Content className={styles.content}>{content}</Content>
			</Layout>
		</ProtectedLayout>
	)
}

export default ProfilePage
