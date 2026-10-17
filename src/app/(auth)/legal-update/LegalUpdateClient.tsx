"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { LegalDocument } from "@/components/legal/LegalDocument";
import type { LegalCode } from "@/config/legal/registry";
import { resyncSession } from "@/helpers/session";
import styles from "./style.module.scss";

const { Paragraph, Text, Title } = Typography;

export type PendingDocument = {
	code: LegalCode;
	title: string;
	version: number;
	effectiveAt: string;
	changes: string[];
	text: string;
};

/** Frame `yuMw7`: each pending document with what changed, its text and its own box. */
export function LegalUpdateClient({
	documents,
	next,
}: {
	documents: PendingDocument[];
	next: string;
}) {
	const { t } = useTranslate();
	const router = useRouter();
	const { update } = useSession();
	const [form] = Form.useForm();
	const [stale, setStale] = useState<LegalCode | null>(null);

	const { mutateAsync: accept, isPending } = useMutation({
		mutationFn: () =>
			axios.post("/api/legal/accept", {
				legal: legalAcceptances(documents.map((d) => d.code)),
			}),
	});

	const onContinue = async () => {
		try {
			await form.validateFields();
		} catch {
			return;
		}
		try {
			setStale(null);
			await accept();
			await resyncSession(update);
			router.replace(next);
		} catch (error) {
			const outdated = outdatedLegalCode(error);
			if (!outdated) throw error;
			form.setFieldValue(clickwrapFieldName(outdated), false);
			setStale(outdated);
			// The text changed under the screen; reload it before asking again.
			router.refresh();
		}
	};

	return (
		<Form form={form} layout="vertical" className={styles.page}>
			<Flex vertical gap={32}>
				{documents.map((doc) => (
					<section key={doc.code}>
						<Title level={3} className={styles.title}>
							{doc.title}
						</Title>
						<Text type="secondary">
							{t(
								"legal.index.version",
								"Version {version} · in effect since {date}",
								{
									version: doc.version,
									date: dayjs(doc.effectiveAt).format("D MMM YYYY"),
								},
							)}
						</Text>
						{doc.changes.length > 0 && (
							<div className={styles.changes}>
								<Text strong>
									{t("legal.update.what-changed", "What changed")}
								</Text>
								<ul>
									{doc.changes.map((line) => (
										<li key={line}>{line}</li>
									))}
								</ul>
							</div>
						)}
						<div className={styles.text}>
							<LegalDocument text={doc.text} />
						</div>
						<ClickwrapField code={doc.code} stale={stale === doc.code} />
					</section>
				))}
				<Paragraph type="secondary" className={styles.note}>
					{t(
						"legal.update.note",
						"You can keep using GDHub once you have accepted the current versions.",
					)}
				</Paragraph>
				<Button type="primary" onClick={onContinue} loading={isPending} block>
					{t("legal.update.continue", "Continue")}
				</Button>
			</Flex>
		</Form>
	);
}
