import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Checkbox, Form, Input, List, Modal, Spin } from 'antd'
import { CheckboxValueType } from 'antd/es/checkbox/Group'
import axios from 'axios'
import { BsCheckLg } from 'react-icons/bs'
import styles from './style.module.scss'

const SpecialitySelectModal = ({ open = false, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(false)
	const [selectedItem, setSelectedItem] = useState<string>()
	const [contactType, setContactType] = useState<CheckboxValueType[]>(['email'])
	const [telegramNickname, setTelegramNickname] = useState<string>()

	const {
		data: specialities,
		isLoading,
		refetch: fetchSpecialities,
	} = useQuery(['user-specialities'], () => axios.get('/api/user/specialities'))

	const {
		data: contacts,
		isLoading: isContactsLoading,
		refetch: fetchContacts,
	} = useQuery(['user-contacts'], () => axios.get('/api/user/contacts'))

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
				label: `Электронная почта ${contacts?.data.email ? '(' + contacts?.data.email + ')' : ''}`,
				disabled: !contacts?.data.email,
			},
			{
				value: 'telegram',
				label: `Телеграм ${contacts?.data.telegram ? '(@' + contacts?.data.telegram + ')' : ''}`,
			},
		],
		[contacts]
	)

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const handleSetContact = (checkedValue: CheckboxValueType[]) => {
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
				title="Укажите специальность"
				destroyOnClose
				okButtonProps={{
					disabled:
						!selectedItem ||
						!contactType?.length ||
						(!contacts?.data.telegram && contactType.includes('telegram') && !telegramNickname),
				}}
				maskClosable={false}
				okText="Выбрать"
				onOk={handleOk}
				cancelText={'Отмена'}
				open={open}
				onCancel={handleCancel}
				confirmLoading={isLoading || isContactsLoading || processing}
			>
				<Spin spinning={isLoading || isContactsLoading || processing}>
					<p>Выберите вашу специальность, которая соответствует выбранной вакансии</p>
					<List
						bordered
						dataSource={specialities?.data}
						renderItem={(speciality: any) => (
							<List.Item
								style={{ cursor: 'pointer', fontWeight: selectedItem == speciality.id ? 'bold' : 'normal' }}
								onClick={() => setSelectedItem(speciality.id)}
								actions={selectedItem == speciality.id ? [<BsCheckLg color="#000" key="icon-check-speciality" />] : []}
							>
								{speciality.Name}
							</List.Item>
						)}
					/>
					<br />
					<p>Как автору проекта связаться с вами?</p>
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
							placeholder="Укажите Телеграм-никнейм"
							onChange={(e) => setTelegramNickname(e.target.value)}
						/>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default SpecialitySelectModal
