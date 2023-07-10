import { Profile } from '@prisma/client'
import { Space } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import GeneralProfileForm from '@/components/profile-forms/GeneralProfileForm'
import PreferencesProfileForm from '@/components/profile-forms/PreferencesProfileForm'
import ResourcesProfileForm from '@/components/profile-forms/ResourcesProfileForm'
import SpecialitiesProfileForm from '@/components/profile-forms/SpecialitiesProfileForm'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'

const ProfilePage: NextPageWithLayout = () => {
	const queryClient = useQueryClient()
	const { data: profile } = useQuery('profile', () => axios.get<Profile>('/api/profile'))
	const { mutateAsync: saveProfile } = useMutation<any, any, any>(
		(variables: any) => axios.post('/api/profile/update', variables),
		{ onSuccess: () => queryClient.invalidateQueries('profile') }
	)

	return (
		<>
			<Head>
				<title>Ваш профиль</title>
			</Head>
			<h1>Настройки профиля</h1>
			{!!profile?.data && (
				<Space size={24} direction="vertical" style={{ width: '100%' }}>
					<GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />
					<PreferencesProfileForm profile={profile.data} saveProfile={saveProfile} />
					<SpecialitiesProfileForm profile={profile.data} saveProfile={saveProfile} />
					<ResourcesProfileForm profile={profile.data} saveProfile={saveProfile} />
				</Space>
			)}
		</>
	)
}

ProfilePage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default ProfilePage
