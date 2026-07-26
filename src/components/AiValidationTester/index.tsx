"use client";

import { Alert, Button, Input, Space, Tag, Typography } from "antd";
import { useState } from "react";
import type {
	FieldInput,
	FieldKind,
	ValidationResult,
} from "@/services/ai-validation/types";

const { Title, Text, Paragraph } = Typography;

/** A field rendered by the tester. Extends the service's FieldInput with a UI hint. */
export type TesterField = FieldInput & {
	control?: "input" | "textarea";
};

/** A named set of values to pre-fill the fields with (keyed by field key). */
export type TesterPreset = {
	label: string;
	values: Record<string, string>;
};

export interface AiValidationTesterProps {
	/** Fields to render, pre-filled with example values. */
	fields: TesterField[];
	/**
	 * Runs the validation. In the dev page this proxies the real
	 * `aiValidation.validate` via an API route.
	 */
	onValidate: (fields: FieldInput[]) => Promise<ValidationResult>;
	/** Optional one-click fills, e.g. "Valid" / "Invalid" / "Has warnings". */
	presets?: TesterPreset[];
}

const controlForKind = (kind: FieldKind): "input" | "textarea" =>
	kind === "person_name" || kind === "speciality" ? "input" : "textarea";

type FieldStatus =
	| { state: "passed" }
	| { state: "error"; message: string }
	| { state: "warning"; message: string };

/**
 * A self-contained harness for eyeballing AI validation results: prepared
 * inputs / textareas for every field kind, optional preset fills, a "Check"
 * button, and a per-field pass / warning / error readout. Presentational only —
 * the caller supplies `onValidate`.
 */
export const AiValidationTester = ({
	fields,
	onValidate,
	presets,
}: AiValidationTesterProps) => {
	const [values, setValues] = useState<Record<string, string>>(() =>
		Object.fromEntries(fields.map((f) => [f.key, f.value])),
	);
	const [result, setResult] = useState<ValidationResult | null>(null);
	const [loading, setLoading] = useState(false);

	const applyPreset = (preset: TesterPreset) => {
		setValues((prev) => ({ ...prev, ...preset.values }));
		setResult(null);
	};

	const handleCheck = async () => {
		setLoading(true);
		try {
			const payload: FieldInput[] = fields.map((f) => ({
				key: f.key,
				label: f.label,
				kind: f.kind,
				severity: f.severity,
				skipRelevance: f.skipRelevance,
				value: values[f.key] ?? "",
			}));
			setResult(await onValidate(payload));
		} finally {
			setLoading(false);
		}
	};

	const statusFor = (key: string): FieldStatus => {
		const issue = result?.issues.find((i) => i.key === key);
		if (!issue) return { state: "passed" };
		return { state: issue.severity, message: issue.message };
	};

	const summary = (() => {
		if (!result) return null;
		if (result.errors.length > 0)
			return {
				type: "error" as const,
				text: "Blocking errors — saving is not allowed.",
			};
		if (result.warnings.length > 0)
			return {
				type: "warning" as const,
				text: "No blocking errors, but some fields are worth reviewing.",
			};
		return { type: "success" as const, text: "All checks passed." };
	})();

	return (
		<Space
			direction="vertical"
			size={20}
			style={{ width: "100%", maxWidth: 720 }}
		>
			<div>
				<Title level={4} style={{ marginBottom: 4 }}>
					AI validation tester
				</Title>
				<Text type="secondary">
					Edit the values if needed, or pick a preset, then press Check.
				</Text>
			</div>

			{presets && presets.length > 0 && (
				<Space wrap size={8}>
					<Text type="secondary">Presets:</Text>
					{presets.map((preset) => (
						<Button
							key={preset.label}
							size="small"
							onClick={() => applyPreset(preset)}
						>
							{preset.label}
						</Button>
					))}
				</Space>
			)}

			<Space direction="vertical" size={16} style={{ width: "100%" }}>
				{fields.map((field) => {
					const control = field.control ?? controlForKind(field.kind);
					const status = result ? statusFor(field.key) : null;

					return (
						<div key={field.key}>
							<Space
								align="center"
								style={{ justifyContent: "space-between", width: "100%" }}
							>
								<Text strong>{field.label ?? field.key}</Text>
								<Tag>{field.kind}</Tag>
							</Space>
							{control === "textarea" ? (
								<Input.TextArea
									rows={2}
									value={values[field.key]}
									onChange={(e) =>
										setValues((prev) => ({
											...prev,
											[field.key]: e.target.value,
										}))
									}
								/>
							) : (
								<Input
									value={values[field.key]}
									onChange={(e) =>
										setValues((prev) => ({
											...prev,
											[field.key]: e.target.value,
										}))
									}
								/>
							)}
							{status && (
								<div style={{ marginTop: 6 }}>
									{status.state === "passed" && (
										<Tag color="success">✓ Passed</Tag>
									)}
									{status.state === "warning" && (
										<Space size={8} wrap>
											<Tag color="gold">⚠ Warning</Tag>
											<Text type="secondary">{status.message}</Text>
										</Space>
									)}
									{status.state === "error" && (
										<Space size={8} wrap>
											<Tag color="error">✕ Error</Tag>
											<Text type="danger">{status.message}</Text>
										</Space>
									)}
								</div>
							)}
						</div>
					);
				})}
			</Space>

			<Button type="primary" loading={loading} onClick={handleCheck}>
				Check
			</Button>

			{summary && (
				<Alert
					type={summary.type}
					showIcon
					message={summary.text}
					description={
						result && (
							<Paragraph style={{ margin: 0 }} type="secondary">
								Errors: {result.errors.length} · Warnings:{" "}
								{result.warnings.length} · Fields checked: {fields.length}
							</Paragraph>
						)
					}
				/>
			)}
		</Space>
	);
};

/** One pre-filled (valid) field per kind — shared by the dev page. */
export const EXAMPLE_FIELDS: TesterField[] = [
	{
		key: "firstName",
		label: "First name",
		kind: "person_name",
		value: "Dmitry",
	},
	{
		key: "speciality",
		label: "Speciality",
		kind: "speciality",
		value: "Game Designer",
	},
	{
		key: "specialization",
		label: "Specialization",
		kind: "specialization",
		value: "Designing combat systems and economy balance for mobile RPGs",
	},
	{
		key: "experience",
		label: "Experience",
		kind: "experience",
		value: "5 years in gamedev: 2 shipped mobile titles as lead designer",
	},
	{
		key: "skills",
		label: "Skills",
		kind: "skills",
		value: "Unity, Figma, design documentation, economy balancing",
	},
	{
		key: "education",
		label: "Education",
		kind: "education",
		value: "Game Design course at Skillbox, 2021",
	},
	{
		key: "motivation",
		label: "Motivation",
		kind: "motivation",
		value: "I want to build deep combat systems and grow as a lead designer",
	},
	{
		key: "freeform",
		label: "About",
		kind: "freeform",
		value: "I love board games and analyzing the design of my favorite games",
	},
	{
		key: "projectName",
		label: "Project title",
		kind: "project_name",
		value: "Drain the Galaxy",
	},
	{
		key: "projectDescription",
		label: "Project description",
		kind: "project_description",
		value:
			"A roguelike space shooter where you pilot a salvage ship through hostile sectors, upgrading modules between runs.",
	},
];

export default AiValidationTester;
