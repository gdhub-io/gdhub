import { useEffect, useMemo, useState } from 'react'
import { Checkbox, Form, Input, List, Modal, Spin } from 'antd'
import { CheckboxValueType } from 'antd/es/checkbox/Group'
import { BsCheckLg } from 'react-icons/bs'
import useSWR from 'swr'
import styles from './style.module.scss'
import { fetcher } from '@/helpers/fetcher'

const SpecialitySelectModal = ({ open = false, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [selectedItem, setSelectedItem] = useState<string>()
	const [contactType, setContactType] = useState<CheckboxValueType[]>(['email'])
	const [telegramNickname, setTelegramNickname] = useState<string>()

	const {
		data: specialities,
		mutate: fetchSpecialities,
		isValidating: isLoading,
	} = useSWR({ url: '/api/my/specialities' }, fetcher, {
		revalidateOnFocus: false,
	})

	const {
		data: contacts,
		mutate: fetchContacts,
		isValidating: isContactsLoading,
	} = useSWR({ url: '/api/my/contacts' }, fetcher, {
		revalidateOnFocus: false,
	})

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
				label: `Электронная почта ${contacts?.email ? '(' + contacts?.email + ')' : ''}`,
				disabled: !contacts?.email,
			},
			{
				value: 'telegram',
				label: `Телеграм ${contacts?.telegram ? '(@' + contacts?.telegram + ')' : ''}`,
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
						(!contacts.telegram && contactType.includes('telegram') && !telegramNickname),
				}}
				maskClosable={false}
				okText="Выбрать"
				onOk={() => onOk({ specialityId: selectedItem, contactType, telegramNickname })}
				cancelText={'Отмена'}
				open={open}
				onCancel={handleCancel}
				confirmLoading={isLoading}
			>
				<Spin spinning={isLoading || isContactsLoading}>
					<p>Выберите вашу специальность, которая соответствует выбранной вакансии</p>
					<List
						bordered
						dataSource={specialities}
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

					{!contacts?.telegram && contactType.includes('telegram') && (
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
