import { useEffect, useState } from 'react'
import { fetcher } from '@helpers/fetcher'
import { Form, List, Modal, Spin } from 'antd'
import { BsCheckLg } from 'react-icons/bs'
import useSWR from 'swr'

const SpecialitySelectModal = ({ open = false, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [selectedItem, setSelectedItem] = useState<string>()

	const {
		data: specialities,
		mutate: fetchSpecialities,
		isValidating: isLoading,
	} = useSWR({ url: '/api/my/specialities' }, fetcher, {
		revalidateOnFocus: false,
	})

	useEffect(() => {
		if (open) {
			fetchSpecialities()
			setSelectedItem(undefined)
		}
	}, [open])

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	return (
		<>
			<Modal
				centered
				title="Укажите специальность"
				destroyOnClose
				okButtonProps={{ disabled: !selectedItem }}
				maskClosable={false}
				okText="Выбрать"
				onOk={() => onOk(selectedItem)}
				cancelText={'Отмена'}
				open={open}
				onCancel={handleCancel}
				confirmLoading={isLoading}
			>
				<Spin spinning={isLoading}>
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
				</Spin>
			</Modal>
		</>
	)
}

export default SpecialitySelectModal
