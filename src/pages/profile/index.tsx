import GeneralProfileForm from '@/components/profile-forms/GeneralProfileForm'
import InterestsProfileForm from '@/components/profile-forms/InterestsProfileForm'
import ResourcesProfileForm from '@/components/profile-forms/ResourcesProfileForm'
import SpecialitiesProfileForm from '@/components/profile-forms/SpecialitiesProfileForm'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Profile } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Space } from 'antd'
import axios from 'axios'
import Head from 'next/head'

const ProfilePage: NextPageWithLayout = () => {
	const queryClient = useQueryClient()
	const { data: profile } = useQuery(['profile'], () => axios.get<Profile>('/api/user/profile'))
	const { mutateAsync: saveProfile } = useMutation<any, any, any>(
		(variables: any) => axios.put<void>('/api/user/profile', variables),
		{
			onSuccess: async () => {
				await queryClient.invalidateQueries(['profile'])
			},
		}
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
					<SpecialitiesProfileForm profile={profile.data} />
					<ResourcesProfileForm profile={profile.data} saveProfile={saveProfile} />
					<InterestsProfileForm profile={profile.data} saveProfile={saveProfile} />
				</Space>
			)}
		</>
	)
}

ProfilePage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default ProfilePage
