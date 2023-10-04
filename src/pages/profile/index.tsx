import GeneralProfileForm from '@/components/profile-forms/GeneralProfileForm'
import PreferencesProfileForm from '@/components/profile-forms/PreferencesProfileForm'
import ResourcesProfileForm from '@/components/profile-forms/ResourcesProfileForm'
import SpecialitiesProfileForm from '@/components/profile-forms/SpecialitiesProfileForm'
import { fetcher } from '@/helpers/fetcher'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { Space, Spin } from 'antd'
import Head from 'next/head'
import { getServerSession } from 'next-auth'
import useSWR from 'swr'

const ProfilePage: NextPageWithLayout = () => {
	const {
		data: profile,
		mutate: refreshProfile,
		isLoading,
	} = useSWR({ url: '/api/my/profile' }, fetcher, {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	})

	return (
		<>
			<Head>
				<title>Ваш профиль</title>
			</Head>
			<h1>Настройки профиля</h1>
			<Spin spinning={isLoading}>
				{!!profile && (
					<Space size={24} direction="vertical" style={{ width: '100%' }}>
						<GeneralProfileForm profile={profile} onUpdate={() => refreshProfile()} />
						<PreferencesProfileForm profile={profile} onUpdate={() => refreshProfile()} />
						<SpecialitiesProfileForm profile={profile} />
						<ResourcesProfileForm profile={profile} />
					</Space>
				)}
			</Spin>
		</>
	)
}

ProfilePage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getServerSideProps = async (context: any) => {
	const session: any = await getServerSession(context.req, context.res, authOptions)

	if (!session || !session.user.email) {
		return {
			redirect: {
				destination: '/',
				permanent: false,
			},
		}
	}

	return {
		props: {},
	}
}

export default ProfilePage
