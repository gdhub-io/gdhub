import GeneralProfileForm from '@components/profile-forms/GeneralProfileForm'
import PreferencesProfileForm from '@components/profile-forms/PreferencesProfileForm'
import ResourcesProfileForm from '@components/profile-forms/ResourcesProfileForm'
import SpecialitiesProfileForm from '@components/profile-forms/SpecialitiesProfileForm'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { getProfile } from '@services/airtable'
import { NextPageWithLayout } from 'pages/_app'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { Space } from 'antd'
import { unstable_getServerSession } from 'next-auth'
import Head from 'next/head'

const ProfilePage: NextPageWithLayout = ({ profile }: any) => {
	return (
		<>
			<Head>
				<title>Ваш профиль</title>
			</Head>
			<h1>Настройки профиля</h1>
			<Space size={24} direction="vertical" style={{ width: '100%' }}>
				<GeneralProfileForm profile={profile} />
				<PreferencesProfileForm profile={profile} />
				<SpecialitiesProfileForm profile={profile} />
				<ResourcesProfileForm profile={profile} />
			</Space>
		</>
	)
}

ProfilePage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getServerSideProps = async (context: any) => {
	const session: any = await unstable_getServerSession(context.req, context.res, authOptions)

	if (!session || !session.user.email) {
		return {
			redirect: {
				destination: '/',
				permanent: false,
			},
		}
	}

	const profile = await getProfile(session.user.email)

	return {
		props: {
			profile,
		},
	}
}

export default ProfilePage
