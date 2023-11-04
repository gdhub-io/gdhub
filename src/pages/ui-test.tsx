import { GoogleOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'

const UITestPage = () => {
	return (
		<div style={{ padding: 32 }}>
			<Space>
				{/* Primary button */}
				<Button type="primary" size="large">
					Primary
				</Button>
				{/* Secondary button */}
				<Button>Default</Button>
				{/* Tertiary Orange button */}
				<Button type="primary">Tertiary</Button>
				{/* Tertiary Blue button */}
				<Button type="primary" className="tertiary-blue-btn">
					Tertiary
				</Button>
				{/* Tertiary Blue button */}
				<Button type="primary" icon={<GoogleOutlined rev="span" />}>
					With Icon
				</Button>
			</Space>
		</div>
	)
}

export default UITestPage
