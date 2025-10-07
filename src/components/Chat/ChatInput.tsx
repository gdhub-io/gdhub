import { useState } from 'react'
import { Sender } from '@ant-design/x'
import { message } from 'antd'
import styles from './ChatModal.module.scss'

export default function ChatInput() {
	const [value, setValue] = useState('')
	const [loading, setLoading] = useState(false)

	return (
		<Sender
			loading={loading}
			value={value}
			className={styles.chatInput}
			onChange={(v) => {
				setValue(v)
			}}
			onSubmit={() => {
				setValue('')
				setLoading(true)
				message.info('Send message!')
			}}
			onCancel={() => {
				setLoading(false)
				message.error('Cancel sending!')
			}}
			autoSize={{ minRows: 1, maxRows: 3 }}
		/>
	)
}
