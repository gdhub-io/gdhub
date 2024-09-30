import { TbWorld } from '@react-icons/all-files/tb/TbWorld'
import { useTolgee } from '@tolgee/react'
import { Button, Dropdown, MenuProps, Typography } from 'antd'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Text } = Typography

export const SwitchLanguage = ({
	type = 'default',
	border = false,
	size = 'middle',
}: {
	type?: 'default' | 'primary'
	border?: boolean
	size?: 'small' | 'middle' | 'large'
}) => {
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
			className={`${styles.switcher} ${border ? styles.withBorder : undefined}`}
			overlayClassName={`${styles.overlay} ${border ? styles.withBorder : undefined}`}
			menu={{ items: langMenuItems, onClick: handleSelectLanguage }}
			placement="bottomLeft"
			trigger={['click']}
		>
			<Button type="text" size={size} icon={<TbWorld />}>
				{tolgee.getLanguage()}
			</Button>
		</Dropdown>
	)
}
