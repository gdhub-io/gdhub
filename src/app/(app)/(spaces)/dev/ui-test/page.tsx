"use client";

import { IconBrandGoogle } from "@tabler/icons-react";
import { Button, Space } from "antd";

export default function UITestPage() {
	return (
		<div style={{ padding: 32 }}>
			<Space>
				<Button type="primary" size="large">
					Primary
				</Button>
				<Button>Default</Button>
				<Button type="primary">Tertiary</Button>
				<Button type="primary">Tertiary</Button>
				<Button type="primary" icon={<IconBrandGoogle size={16} />}>
					With Icon
				</Button>
			</Space>
		</div>
	);
}
