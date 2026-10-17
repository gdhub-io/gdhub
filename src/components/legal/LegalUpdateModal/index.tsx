"use client";

import { IconFileText } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { T, useTranslate } from "@tolgee/react";
import { Button, Form, Modal, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { signOutWithChat } from "@/components/Chat/session";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { IconTile } from "@/components/ui";
import type { LegalCode } from "@/config/legal/registry";
import { resyncSession } from "@/helpers/session";
import type { PendingDocument } from "@/lib/legal/pending";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

/**
 * Frames `BnOHg` / `wx2Zi` / `qGqSf`, styled after the cookie panel: the documents the user is bound by
 * and has not accepted in their current version. It cannot be dismissed — the
 * only way past it is accepting, or signing out.
 */
export function LegalUpdateModal({
	documents,
}: {
	documents: PendingDocument[];
}) {
	const { t } = useTranslate();
	const router = useRouter();
	const { update } = useSession();
	const [form] = Form.useForm();
	// Opened after mount: a portal rendered on the server does not match the client's.
	const [open, setOpen] = useState(false);
	useEffect(() => setOpen(documents.length > 0), [documents.length]);
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
			setOpen(false);
			await resyncSession(update);
			router.refresh();
		} catch (error) {
			const outdated = outdatedLegalCode(error);
			if (!outdated) throw error;
			form.setFieldValue(clickwrapFieldName(outdated), false);
			setStale(outdated);
			router.refresh();
		}
	};

	const firstTime = documents.every((d) => d.firstTime);

	return (
		<Modal
			open={open}
			closable={false}
			mask={{ closable: false }}
			keyboard={false}
			footer={null}
			width={460}
			centered
			className={styles.modal}
		>
			<div className={styles.body}>
				<div className={styles.head}>
					<IconTile icon={IconFileText} tint="var(--gd-neutral-100)" />
					<div className={styles.headText}>
						<Title level={5} className={styles.title}>
							{firstTime
								? t("legal.update.first.title", "Please accept our terms")
								: t("legal.update.changed.title", "We updated our terms")}
						</Title>
						<Text className={styles.lead}>
							{firstTime
								? t(
										"legal.update.first.why",
										"We now record which version of our terms you accepted. Nothing changes for you.",
									)
								: t(
										"legal.update.changed.why",
										"See what changed and confirm to continue.",
									)}
						</Text>
					</div>
				</div>

				<Form form={form} layout="vertical" className={styles.documents}>
					{documents.map((doc) => (
						<section key={doc.code} className={styles.document}>
							<ClickwrapField
								code={doc.code}
								stale={stale === doc.code}
								label={(link) => (
									<span className={styles.label}>
										<span>
											<T
												keyName="legal.clickwrap.label"
												defaultValue="I accept the <doc>{title}</doc>"
												params={{ title: doc.title, doc: link }}
											/>
										</span>
										<span className={styles.version}>
											{t("legal.clickwrap.version", "v{version} · {date}", {
												version: doc.version,
												date: dayjs(doc.effectiveAt).format("D MMM YYYY"),
											})}
										</span>
									</span>
								)}
							/>
							{doc.changes.length > 0 && (
								<ul className={styles.changes}>
									{doc.changes.map((line) => (
										<li key={line}>{line}</li>
									))}
								</ul>
							)}
						</section>
					))}
				</Form>

				<div className={styles.actions}>
					<Button type="primary" block onClick={onContinue} loading={isPending}>
						{t("legal.update.accept", "Accept and continue")}
					</Button>
					<Button
						type="link"
						className={styles.signOut}
						onClick={() => signOutWithChat({ callbackUrl: "/" })}
					>
						{t("legal.update.sign-out", "Sign out")}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
