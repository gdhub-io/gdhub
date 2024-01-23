import { useTolgee } from '@tolgee/react'
import { Button, Dropdown, MenuProps, Typography } from 'antd'
import { useRouter } from 'next/router'
import { TbWorld } from 'react-icons/tb'
import styles from './style.module.scss'

const { Text } = Typography

export const SwitchLanguage = ({ type = 'default' }: { type?: 'default' | 'primary' }) => {
	const router = useRouter()
	const tolgee = useTolgee(['language'])

	const langMenuItems = [
		{
			key: 'en',
			label: <Text>English</Text>,
			value: 'en',
		},
		{
			key: 'ru',
			label: <Text>Русский</Text>,
		},
	]

	const handleSelectLanguage: MenuProps['onClick'] = ({ key }) => {
		router.replace(router.pathname, undefined, { locale: key })
	}

	return (
		<Dropdown
			className={styles.switcher}
			menu={{ items: langMenuItems, onClick: handleSelectLanguage }}
			placement="bottomLeft"
			trigger={['click']}
		>
			<Button type="text" icon={<TbWorld size={24} />}>
				{tolgee.getLanguage()}
			</Button>
		</Dropdown>
	)
}
