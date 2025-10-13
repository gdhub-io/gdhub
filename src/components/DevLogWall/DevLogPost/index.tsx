import { T } from "@tolgee/react";
import Button from "antd/es/button";
import Card from "antd/es/card";
import Typography from "antd/es/typography";
import styles from "./style.module.scss";

interface DevLogPostArgs {
	editable?: boolean;
	data: {
		id: string;
		label?: JSX.Element | string;
		children: JSX.Element | string;
		dot?: JSX.Element | string;
	};
	onUpdate?: (postId: string) => Promise<void> | void;
}

const { Text } = Typography;

export const DevLogPost = ({
	data,
	editable = false,
	onUpdate = () => {},
}: DevLogPostArgs) => {
	return (
		<Card
			style={{ width: "100%" }}
			styles={{ title: { fontSize: 16 } }}
			className={styles.postCard}
			title={<Text type="secondary">{data.label}</Text>}
			extra={
				editable ? (
					<Button type="text" size="small" onClick={() => onUpdate(data.id)}>
						<T keyName="button.edit.label">Edit</T>
					</Button>
				) : null
			}
		>
			{data.children}
		</Card>
	);
};
