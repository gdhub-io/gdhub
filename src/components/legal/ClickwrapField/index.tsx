"use client";

import { T, useTranslate } from "@tolgee/react";
import { Checkbox, Form, type FormItemProps } from "antd";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { LEGAL_DOCUMENTS, type LegalCode } from "@/config/legal/registry";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";
import { versionInEffect } from "@/lib/legal/versions";
import styles from "./style.module.scss";

/** A legal document link inside a checkbox label: opens in a new tab and never toggles the box. */
export function LegalLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<Link
			href={href}
			target="_blank"
			rel="noreferrer"
			className={styles.link}
			onClick={(e) => e.stopPropagation()}
		>
			{children}
		</Link>
	);
}

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
	/** A second box about the same document, e.g. a request it names; defaults to the document's acceptance. */
	name?: FormItemProps["name"];
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
export function ClickwrapField({
	code,
	name,
	stale,
	requiredMessage,
	label,
}: Props) {
	const { t } = useTranslate();
	const { title, slug } = LEGAL_DOCUMENTS[code];
	const version = versionInEffect(code);
	const href = version
		? `/legal/${slug}/v${version.version}`
		: `/legal/${slug}`;

	const doc = (chunks: ReactNode) => (
		<LegalLink href={href}>{chunks}</LegalLink>
	);

	return (
		<Form.Item
			name={name ?? clickwrapFieldName(code)}
			valuePropName="checked"
			initialValue={false}
			// Full width whatever the form's column layout: the label is a sentence.
			wrapperCol={{ span: 24 }}
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

const refusedLegalCode = (
	error: unknown,
	status: number,
	reason: string,
): LegalCode | null => {
	const data = (
		error as {
			response?: {
				status?: number;
				data?: { details?: { reason?: string; code?: LegalCode } };
			};
		}
	)?.response;
	return data?.status === status && data.data?.details?.reason === reason
		? (data.data.details.code ?? null)
		: null;
};

/** The document whose version the server refused as outdated, from an axios error. */
export const outdatedLegalCode = (error: unknown) =>
	refusedLegalCode(error, 409, "legal.outdated");

/** The document the server asked for and the request did not carry. */
export const missingLegalCode = (error: unknown) =>
	refusedLegalCode(error, 400, "legal.required");
