"use client";

import { Card, Typography } from "antd";
import {
	AiValidationTester,
	EXAMPLE_FIELDS,
	type TesterPreset,
} from "@/components/AiValidationTester";
import type {
	FieldInput,
	ValidationResult,
} from "@/services/ai-validation/types";

const { Title, Paragraph } = Typography;

// The default (valid) values, derived from the example fields.
const VALID: Record<string, string> = Object.fromEntries(
	EXAMPLE_FIELDS.map((f) => [f.key, f.value]),
);

/** One-click fills wired to the outcomes the real model should produce. */
const PRESETS: TesterPreset[] = [
	{ label: "Valid", values: VALID },
	{
		// Blocking errors: gibberish speciality, off-topic specialization,
		// gibberish experience (all "error" kinds).
		label: "Invalid",
		values: {
			...VALID,
			speciality: "asdfgh",
			specialization: "I love swimming in the sea in summer",
			experience: "qwerty qwerty qwerty asdf",
		},
	},
	{
		// Warnings only: not-a-name first name, gibberish skills / education
		// (all "warning" kinds); speciality/specialization/experience stay valid.
		label: "Has warnings",
		values: {
			...VALID,
			firstName: "xyz123qwe",
			skills: "zxcv zxcv zxcv",
			education: "asdf random meaningless text",
		},
	},
];

/**
 * Runs the REAL AI validation via `/api/dev/ai-validation`. Pressing "Check"
 * fires a genuine request (visible in the Network tab) and the server calls
 * OpenAI (moderation + relevance).
 */
async function validate(fields: FieldInput[]): Promise<ValidationResult> {
	const response = await fetch("/api/dev/ai-validation", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fields, locale: "en" }),
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body?.error ?? `Request failed: ${response.status}`);
	}

	return response.json();
}

export default function DevAiValidationPage() {
	return (
		<main
			style={{
				minHeight: "100vh",
				background: "var(--gd-color-surface-sunken)",
				padding: "40px 16px",
				display: "flex",
				justifyContent: "center",
			}}
		>
			<Card style={{ width: "100%", maxWidth: 760 }}>
				<Title level={3} style={{ marginTop: 0 }}>
					AI validation — live tester
				</Title>
				<Paragraph type="secondary">
					Press Check — the request goes to <code>/api/dev/ai-validation</code>{" "}
					(visible in the Network tab); the server calls OpenAI. Requires{" "}
					<code>OPENAI_API_KEY</code> in the environment; this page is available
					outside production only.
				</Paragraph>
				<AiValidationTester
					fields={EXAMPLE_FIELDS}
					onValidate={validate}
					presets={PRESETS}
				/>
			</Card>
		</main>
	);
}
