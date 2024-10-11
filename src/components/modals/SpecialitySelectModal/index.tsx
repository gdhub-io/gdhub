import { useEffect, useMemo, useState } from 'react'
import { Speciality } from '@prisma/client'
import { BsCheckLg } from '@react-icons/all-files/bs/BsCheckLg'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Checkbox, Form, Input, List, Modal, Spin } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

const SpecialitySelectModal = ({ open = false, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [processing, setProcessing] = useState(false)
	const [selectedItem, setSelectedItem] = useState<string>()
	const [contactType, setContactType] = useState<string[]>(['email'])
	const [telegramNickname, setTelegramNickname] = useState<string>()

	const {
		data: specialities,
		isLoading,
		refetch: fetchSpecialities,
	} = useQuery(['user-specialities'], () => axios.get<Speciality[]>('/api/user/specialities'))

	const {
		data: contacts,
		isLoading: isContactsLoading,
		refetch: fetchContacts,
	} = useQuery(['user-contacts'], (): Promise<any> => axios.get('/api/user/contacts'))

	useEffect(() => {
		if (open) {
			fetchSpecialities()
			fetchContacts()
			setSelectedItem(undefined)
		}
	}, [open])

	const options = useMemo(
		() => [
			{
				value: 'email',
				label: t(`Email`) + ' ' + `${contacts?.data.email ? '(' + contacts?.data.email + ')' : ''}`,
				disabled: !contacts?.data.email,
			},
			{
				value: 'telegram',
				label: t(`Telegram`) + ' ' + `${contacts?.data.telegram ? '(@' + contacts?.data.telegram + ')' : ''}`,
			},
		],
		[contacts]
	)

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const handleSetContact = (checkedValue: string[]) => {
		setContactType(checkedValue)
	}

	const handleOk = async () => {
		try {
			setProcessing(true)

			await onOk({ specialityId: selectedItem, contactType, telegramNickname })

			setProcessing(false)
		} catch (error) {
			console.log(error)
			setProcessing(false)
		}
	}

	return (
		<>
			<Modal
				centered
				title={<T keyName="modal.speciality-select.title">Indicate the specialty</T>}
				destroyOnClose
				okButtonProps={{
					disabled:
						!selectedItem ||
						!contactType?.length ||
						(!contacts?.data.telegram && contactType.includes('telegram') && !telegramNickname),
				}}
				maskClosable={false}
				okText={<T keyName="modal.speciality-select.okText">Choose</T>}
				onOk={handleOk}
				cancelText={<T>Close</T>}
				open={open}
				onCancel={handleCancel}
				confirmLoading={isLoading || isContactsLoading || processing}
			>
				<Spin spinning={isLoading || isContactsLoading || processing}>
					<p>
						<T keyName="modal.speciality-select.choose-text">
							Choose your specialty that corresponds to the selected vacancy
						</T>
					</p>
					<List
						bordered
						dataSource={specialities?.data}
						renderItem={(speciality) => (
							<List.Item
								style={{ cursor: 'pointer', fontWeight: selectedItem == speciality.id ? 'bold' : 'normal' }}
								onClick={() => setSelectedItem(speciality.id)}
								actions={selectedItem == speciality.id ? [<BsCheckLg color="#000" key="icon-check-speciality" />] : []}
							>
								{speciality.name}
							</List.Item>
						)}
					/>
					<br />
					<p>
						<T keyName="modal.speciality-select.contact-text">How to contact the author of the project with you?</T>
					</p>
					<Checkbox.Group
						rootClassName={styles.contactTypes}
						options={options}
						// defaultValue={contactType}
						value={contactType}
						onChange={handleSetContact}
					/>

					{!contacts?.data.telegram && contactType.includes('telegram') && (
						<Input
							prefix="@"
							placeholder={t('Enter your Telegram nickname')}
							onChange={(e) => setTelegramNickname(e.target.value)}
						/>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default SpecialitySelectModal
