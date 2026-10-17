"use client";

import { T, useTranslate } from "@tolgee/react";
import { Checkbox, Form } from "antd";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { LEGAL_DOCUMENTS, type LegalCode } from "@/config/legal/registry";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";
import { versionInEffect } from "@/lib/legal/versions";
import styles from "./style.module.scss";

export const clickwrapFieldName = (code: LegalCode) => ["legal", code];

/** What a form sends for its ticked documents: the version each box showed. */
export function legalAcceptances(codes: LegalCode[]): LegalAcceptanceInput[] {
	return codes.flatMap((code) => {
		const v = versionInEffect(code);
		return v ? [{ code, version: v.version }] : [];
	});
}

type Props = {
	code: LegalCode;
	/** The server refused the version this box showed — the text changed under the form. */
	stale?: boolean;
	/** Replaces the generic "You need to accept…", e.g. "…to create a project". */
	requiredMessage?: string;
	/** Replaces the label; the document link is passed as the `doc` tag. */
	label?: (doc: (chunks: ReactNode) => ReactElement) => ReactNode;
};

/**
 * The one checkbox every legal acceptance goes through: never pre-ticked, it
 * names the document, and the name is the only link to the exact version.
 */
export function ClickwrapField({ code, stale, requiredMessage, label }: Props) {
	const { t } = useTranslate();
	const { title, slug } = LEGAL_DOCUMENTS[code];
	const version = versionInEffect(code);
	const href = version
		? `/legal/${slug}/v${version.version}`
		: `/legal/${slug}`;

	const doc = (chunks: ReactNode) => (
		<Link
			href={href}
			target="_blank"
			rel="noreferrer"
			className={styles.link}
			onClick={(e) => e.stopPropagation()}
		>
			{chunks}
		</Link>
	);

	return (
		<Form.Item
			name={clickwrapFieldName(code)}
			valuePropName="checked"
			initialValue={false}
			className={styles.field}
			validateStatus={stale ? "warning" : undefined}
			help={
				stale
					? t(
							"legal.clickwrap.stale",
							"The {title} were updated. Please read and accept the current version.",
							{ title },
						)
					: undefined
			}
			rules={[
				{
					validator: (_, checked) =>
						checked
							? Promise.resolve()
							: Promise.reject(
									new Error(
										requiredMessage ??
											t(
												"legal.clickwrap.required",
												"You need to accept the {title} to continue",
												{ title },
											),
									),
								),
				},
			]}
		>
			<Checkbox>
				{label ? (
					label(doc)
				) : (
					<T
						keyName="legal.clickwrap.label"
						defaultValue="I accept the <doc>{title}</doc>"
						params={{ title, doc }}
					/>
				)}
			</Checkbox>
		</Form.Item>
	);
}

/** The document whose version the server refused as outdated, from an axios error. */
export function outdatedLegalCode(error: unknown): LegalCode | null {
	const data = (
		error as {
			response?: {
				status?: number;
				data?: { details?: { reason?: string; code?: LegalCode } };
			};
		}
	)?.response;
	return data?.status === 409 && data.data?.details?.reason === "legal.outdated"
		? (data.data.details.code ?? null)
		: null;
}
