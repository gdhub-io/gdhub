"use client";

import { IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Form, Modal, Skeleton, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { ClickwrapField } from "@/components/legal/ClickwrapField";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LEGAL_DOCUMENTS, type LegalCode } from "@/config/legal/registry";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

type Props = {
	code: LegalCode;
	open: boolean;
	okText: string;
	requiredMessage?: string;
	stale?: boolean;
	onCancel: () => void;
	/** Called once the box is ticked; the caller sends the acceptance with its own save. */
	onAccept: () => void;
};

/** Frame `Opj60`: the text in full, the tick, and the action it unlocks. */
export function LegalAcceptModal({
	code,
	open,
	okText,
	requiredMessage,
	stale,
	onCancel,
	onAccept,
}: Props) {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const { slug } = LEGAL_DOCUMENTS[code];

	const { data } = useQuery({
		queryKey: ["legal-text", slug],
		queryFn: () =>
			axios
				.get<{
					title: string;
					version: number;
					effectiveAt: string;
					text: string;
				}>(`/api/legal/${slug}`)
				.then((r) => r.data),
		enabled: open,
	});

	const accept = async () => {
		try {
			await form.validateFields();
		} catch {
			return;
		}
		onAccept();
	};

	return (
		<Modal
			open={open}
			width={720}
			centered
			onCancel={onCancel}
			closeIcon={<IconX size={20} />}
			className={styles.modal}
			title={
				<div className={styles.head}>
					<Title level={3} className={styles.title}>
						{LEGAL_DOCUMENTS[code].title}
					</Title>
					{data && (
						<Text className={styles.version}>
							{t(
								"legal.index.version",
								"Version {version} · in effect since {date}",
								{
									version: data.version,
									date: dayjs(data.effectiveAt).format("D MMM YYYY"),
								},
							)}
						</Text>
					)}
				</div>
			}
			footer={[
				<Button key="cancel" onClick={onCancel}>
					{t("common.cancel", "Cancel")}
				</Button>,
				<Button key="accept" type="primary" onClick={accept}>
					{okText}
				</Button>,
			]}
		>
			<div className={styles.document}>
				{data ? (
					<LegalDocument text={data.text} />
				) : (
					<Skeleton active title={false} paragraph={{ rows: 8 }} />
				)}
			</div>
			<Form form={form}>
				<ClickwrapField
					code={code}
					stale={stale}
					requiredMessage={requiredMessage}
				/>
			</Form>
		</Modal>
	);
}
