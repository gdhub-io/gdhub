"use client";

import { AiOutlineGoogle } from "@react-icons/all-files/ai/AiOutlineGoogle";
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
				<Button type="primary" className="tertiary-blue-btn">
					Tertiary
				</Button>
				<Button type="primary" icon={<AiOutlineGoogle rev="span" />}>
					With Icon
				</Button>
			</Space>
		</div>
	);
}
