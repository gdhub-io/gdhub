import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Button, Card, Form, Input, Space } from 'antd'
import Head from 'next/head'
import GeneralProfileForm from './general-form'
import PreferencesProfileForm from './preferences-form'
import SpecialitiesProfileForm from './specialities-form'

const ProfilePage: NextPageWithLayout = () => {
	const [form] = Form.useForm()

	return (
		<>
			<Head>
				<title>Profile</title>
			</Head>
			<h1>Profile Settings</h1>
			<Space size={24} direction="vertical" style={{ width: '100%' }}>
				<GeneralProfileForm />
				<PreferencesProfileForm />
				<SpecialitiesProfileForm />
			</Space>
		</>
	)
}

ProfilePage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default ProfilePage
