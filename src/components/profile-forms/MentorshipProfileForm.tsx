import { useEffect, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Card, Form, Input, message, Spin, Switch, Tooltip, Typography } from 'antd'
import Select from 'antd/es/select'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import styles from './MentorshipProfileForm.module.scss'

const { Paragraph, Text } = Typography

type MentorshipProfileFormArgs = {
	profile: prismaClient.Profile
	onUpdate: () => Promise<void> | void
}

const MentorshipProfileForm = ({ profile, onUpdate = () => {} }: MentorshipProfileFormArgs) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [enabled, setEnabled] = useState(false)
	const [selectedSpecialityId, setSelectedSpecialityId] = useState<string | null>(null)
	const { data: session, update: refreshSession } = useSession()

	const { mutateAsync: switchMentorship, isPending: isSwitching } = useMutation({
		mutationFn: ({ enabled }: { enabled: boolean }) => axios.put<any>('/api/user/profile/mentorship', { enabled }),
		onSuccess: ({ data }) => setEnabled(data.enabled),
	})

	useEffect(() => {
		if (session) {
			setEnabled(session.user.roles.includes(prismaClient.$Enums.UserRole.Mentor))
		}
	}, [session])

	useEffect(() => {
		if (selectedSpecialityId) {
			const speciality = specialities?.data.find((r: any) => r.id === selectedSpecialityId)

			if (speciality) {
				form.setFieldsValue({
					timeForMentoring: speciality.timeForMentoring,
					openForQuestions: speciality.openForQuestions,
				})
			}
		}
	}, [selectedSpecialityId])

	const { mutateAsync: saveMentorshipSetting, isPending: isSaving } = useMutation({
		mutationFn: (data: { specialityId: string; timeForMentoring: string; openForQuestions: string[] }) =>
			axios.put<any>('/api/user/profile/mentorship', data),
		onSuccess: async () => {
			await refetchSpecialityList()
		},
	})

	const {
		data: specialities,
		isLoading: isSpecialityFetching,
		refetch: refetchSpecialityList,
		dataUpdatedAt,
	} = useQuery({
		queryKey: ['user-specialities', 'mentorship'],
		queryFn: () =>
			axios.get<any>('/api/user/specialities', {
				params: {
					level: [prismaClient.$Enums.SkillLevel.Experienced, prismaClient.$Enums.SkillLevel.Expert],
				},
			}),
		enabled,
	})

	useEffect(() => {
		if (!selectedSpecialityId && specialities?.data) {
			form.setFieldsValue({
				specialityId: specialities?.data[0].id,
				timeForMentoring: specialities?.data[0].timeForMentoring,
				openForQuestions: specialities?.data[0].openForQuestions,
			})
		}
	}, [specialities?.data, dataUpdatedAt])

	const handleForm = async () => {
		try {
			const data = await form.validateFields()

			await saveMentorshipSetting(data)
			await onUpdate()

			message.success(t('profile-forms.mentorship.update-message', 'Mentorship settins is updated'))
		} catch {}
	}

	const switchMentorshipStatus = async (checked: boolean) => {
		await switchMentorship({ enabled: checked })
		await refreshSession()

		if (!checked) {
			form.resetFields()
			setSelectedSpecialityId(null)
		}
	}

	const specialityListOptions = specialities?.data.map((r: any) => ({
		label: (
			<Typography.Text ellipsis>
				<T>{r.name}</T>
			</Typography.Text>
		),
		value: r.id,
	}))

	return (
		<Card
			title={<T keyName="profile-forms.mentorship.card.title">Mentorship</T>}
			bordered={false}
			extra={
				<Tooltip
					title={
						<Text>
							<T keyName="profile-form.mentorship.card.description">
								Turn on if you want other community members to contact you for advice.
							</T>
						</Text>
					}
				>
					<Switch checked={enabled} loading={isSwitching} onChange={switchMentorshipStatus} />
				</Tooltip>
			}
		>
			<Spin spinning={isSaving}>
				<Paragraph>
					<T>Allows you to contribute to game development through advising</T>
				</Paragraph>
				{enabled && !!specialities?.data.length && (
					<Form
						form={form}
						layout="vertical"
						variant="filled"
						name="profile-mentorship-form"
						autoComplete="off"
						requiredMark="optional"
						initialValues={
							{
								/** some fileds */
							}
						}
					>
						<Form.Item
							label={t('profile-forms.mentorship.field.speciality.label', 'Speciality in which you can help')}
							rules={[{ required: true }]}
							name="specialityId"
						>
							<Select
								options={specialityListOptions}
								style={{ width: '100%' }}
								placeholder={t('Select')}
								onChange={(value) => setSelectedSpecialityId(value)}
								loading={isSpecialityFetching}
							/>
						</Form.Item>

						<Form.Item
							label={t(
								'profile-forms.mentorship.field.openForQuestions.label',
								'A list of questions that can be addressed to you'
							)}
							name="openForQuestions"
							rules={[{ required: true }]}
						>
							<Select
								className={styles.questionSelect}
								mode="tags"
								maxCount={5}
								style={{ width: '100%' }}
								placeholder={t('Start typing and press Enter')}
								loading={isSpecialityFetching}
							/>
						</Form.Item>

						<Form.Item
							label={t('profile-forms.mentorship.field.timeForMentoring.label', 'Query response rate')}
							help={t(
								'profile-forms.mentorship.field.timeForMentoring.help',
								'How quickly do you plan to respond to new requests?'
							)}
							name="timeForMentoring"
						>
							<Input.TextArea
								rows={1}
								placeholder={t(
									'profile-forms.mentorship.field.timeForMentoring.placeholder',
									'I answer as much as possible'
								)}
							/>
						</Form.Item>

						<Button type="primary" style={{ marginTop: 32 }} onClick={handleForm} loading={isSaving}>
							<T>Save</T>
						</Button>
					</Form>
				)}

				{enabled && !specialities?.data.length && (
					<Alert
						message={t(
							'profile-forms.mentorship.card.no-specialities',
							'To become a mentor, you must have at least one specialty of the Experienced or Expert level'
						)}
					/>
				)}
			</Spin>
		</Card>
	)
}

export default MentorshipProfileForm
