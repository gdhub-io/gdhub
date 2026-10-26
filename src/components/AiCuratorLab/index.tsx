"use client";

import {
	IconArrowRight,
	IconCopy,
	IconPlayerPlay,
	IconRestore,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Alert,
	App,
	Button,
	Card,
	Descriptions,
	Divider,
	Flex,
	Input,
	Menu,
	Segmented,
	Select,
	Skeleton,
	Spin,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
	useVerdictCopy,
	VERDICT_TONE,
} from "@/components/checkpoints/VerdictChip";
import { StatusDot } from "@/components/ui";
import { formatCount, formatDollar } from "@/helpers/format";
import { MICROS_PER_USD } from "@/lib/checkpoint-costs";
import type {
	LabSettled,
	labCatalogue,
	runLab,
} from "@/services/ai-curator-lab";
import type { LabLanguage } from "@/services/ai-curator-lab/schemas";
import type { AiTrace } from "@/services/ai-trace";
import { AuthorView } from "./AuthorView";
import styles from "./style.module.scss";

const { Title, Text, Paragraph } = Typography;

type Catalogue = ReturnType<typeof labCatalogue>;
type Ran = Exclude<Awaited<ReturnType<typeof runLab>>, { error: string }>;
type Tab = "author" | "input" | "sent" | "received" | "steps";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const Code = ({ children }: { children: string }) => (
	<Paragraph className={styles.code}>{children}</Paragraph>
);

/** One model call as it went: what was sent, or what came back. */
function TraceBlock({
	trace,
	part,
}: {
	trace: AiTrace;
	part: "sent" | "received";
}) {
	return (
		<Flex vertical gap={8}>
			<Flex gap={8} align="center">
				<Tag className={styles.mono}>{trace.name}</Tag>
				<Text type="secondary">
					{trace.model} · {(trace.ms / 1000).toFixed(1)} s
				</Text>
			</Flex>
			{part === "sent" ? (
				<>
					<Text type="secondary">system</Text>
					<Code>{trace.system}</Code>
					<Text type="secondary">messages</Text>
					<Code>{pretty(trace.messages)}</Code>
				</>
			) : (
				<Code>{trace.raw ?? "(nothing)"}</Code>
			)}
		</Flex>
	);
}

/** What the rule made of the answer, beside the answer itself. */
function SettledLine({ settled }: { settled: LabSettled | undefined }) {
	const verdict = useVerdictCopy();
	if (settled?.kind !== "report") return null;
	return (
		<Flex gap={12} align="center" wrap>
			<Text type="secondary">Proposed</Text>
			<StatusDot
				tone={VERDICT_TONE[settled.proposed]}
				label={verdict.label(settled.proposed)}
			/>
			<IconArrowRight size={16} className={styles.muted} />
			<Text type="secondary">Written</Text>
			<StatusDot
				tone={VERDICT_TONE[settled.written]}
				label={verdict.label(settled.written)}
			/>
		</Flex>
	);
}

/**
 * Frames 12.18.1–12.18.3: pick a call and a situation, Run, and read the answer
 * as the author would on Curator's Review — then what went in, what came back,
 * and any model calls on the way.
 */
export function AiCuratorLab() {
	const { message } = App.useApp();
	const { data: catalogue } = useQuery({
		queryKey: ["dev", "ai-curator"],
		queryFn: () =>
			axios.get<Catalogue>("/api/dev/ai-curator").then(({ data }) => data),
	});
	// The case lives in the address — ?lang=ru&call=report&situation=partly —
	// so a link opens it straight away.
	const query = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [callId, setCallId] = useState(query.get("call") ?? undefined);
	const [situationId, setSituationId] = useState(
		query.get("situation") ?? undefined,
	);
	const [text, setText] = useState<string>();
	const [language, setLanguage] = useState<LabLanguage>(
		query.get("lang") === "ru" ? "ru" : "en",
	);
	const [personaId, setPersonaId] = useState(query.get("persona") ?? undefined);
	const remember = (next: {
		lang: LabLanguage;
		call?: string;
		situation?: string;
		persona?: string;
	}) => {
		const params = new URLSearchParams({ lang: next.lang });
		if (next.call) params.set("call", next.call);
		if (next.situation) params.set("situation", next.situation);
		if (next.persona) params.set("persona", next.persona);
		router.replace(`${pathname}?${params}`, { scroll: false });
	};
	const [tab, setTab] = useState<Tab>("input");
	// The input the shown answer came from, as it ran.
	const [ranInput, setRanInput] = useState<unknown>();

	const calls = catalogue?.calls ?? [];
	const current = calls.find((each) => each.id === callId) ?? calls[0];
	const situation =
		current?.situations[language].find((each) => each.id === situationId) ??
		current?.situations[language][0];
	const original = situation ? pretty(situation.input) : "";
	const shown = text ?? original;
	const edited = shown !== original;

	const run = useMutation({
		mutationFn: (source: string) => {
			let input: unknown;
			try {
				input = JSON.parse(source);
			} catch (error) {
				throw new Error(`The input is not JSON: ${(error as Error).message}`);
			}
			setRanInput(input);
			return axios
				.post<Ran>("/api/dev/ai-curator", {
					call: current?.id,
					input,
					language,
					persona: personaId,
				})
				.then(({ data }) => data);
		},
		onSuccess: () => setTab("author"),
	});
	const failure = !run.error
		? null
		: axios.isAxiosError<{ error?: string }>(run.error)
			? (run.error.response?.data?.error ?? run.error.message)
			: run.error.message;

	const pick = (next: { call?: string; situation?: string }) => {
		if (next.call) setCallId(next.call);
		setSituationId(next.situation);
		remember({
			lang: language,
			call: next.call ?? current?.id,
			situation: next.situation,
			persona: personaId,
		});
		setText(undefined);
		setTab("input");
		run.reset();
	};

	const ran = run.data;
	// The call the answer comes from is the last; any before it are steps on the way.
	const main = ran?.traces.at(-1);
	const steps = ran?.traces.slice(0, -1) ?? [];

	const inputTab = (
		<Flex vertical gap={12}>
			<Flex justify="space-between" align="center" gap={8}>
				{edited ? (
					<Text type="warning" className={styles.small}>
						Edited · runs as shown
					</Text>
				) : (
					<Text type="secondary" className={styles.small}>
						The situation as prepared
					</Text>
				)}
				<Flex gap={8}>
					<Button
						type="text"
						size="small"
						icon={<IconRestore size={16} />}
						disabled={!edited}
						onClick={() => setText(undefined)}
					>
						Reset to the situation
					</Button>
					<Button
						size="small"
						aria-label="Copy the input"
						icon={<IconCopy size={16} />}
						onClick={() =>
							navigator.clipboard
								.writeText(shown)
								.then(() => message.success("Input copied"))
						}
					/>
				</Flex>
			</Flex>
			<Input.TextArea
				className={styles.mono}
				value={shown}
				onChange={(event) => setText(event.target.value)}
				autoSize={{ minRows: 16, maxRows: 48 }}
				spellCheck={false}
			/>
		</Flex>
	);

	let body: React.ReactNode;
	if (tab === "input") body = inputTab;
	else if (run.isPending) {
		body = (
			<Flex vertical gap={12}>
				<Flex gap={8} align="center">
					<Spin size="small" />
					<Text type="secondary">
						Waiting for {current?.model ?? "the model"}…
					</Text>
				</Flex>
				<Skeleton active title={false} paragraph={{ rows: 4 }} />
			</Flex>
		);
	} else if (failure) {
		body = <Alert type="error" message="Not run" description={failure} />;
	} else if (!ran) {
		body = (
			<Text type="secondary">
				Run the situation to see the answer as the author would.
			</Text>
		);
	} else if (tab === "author") {
		body =
			ran.answer === null ? (
				<Alert
					type="error"
					message="No usable answer"
					description="The model answered nothing the platform can use. In production the step waits for the next cron run. Received shows what came back."
				/>
			) : (
				<AuthorView
					call={current?.id ?? ""}
					input={ranInput}
					answer={ran.answer}
					settled={ran.settled}
				/>
			);
	} else if (tab === "sent") {
		body = main ? <TraceBlock trace={main} part="sent" /> : null;
	} else if (tab === "received") {
		body = (
			<Flex vertical gap={16}>
				<SettledLine settled={ran.settled} />
				{main && <TraceBlock trace={main} part="received" />}
				{ran.settled && (
					<>
						<Text type="secondary">What the platform settled</Text>
						<Code>{pretty(ran.settled)}</Code>
					</>
				)}
			</Flex>
		);
	} else {
		body = (
			<Flex vertical gap={24}>
				{steps.map((trace, index) => (
					<Flex key={`${trace.name}-${index}`} vertical gap={12}>
						<TraceBlock trace={trace} part="sent" />
						<Text type="secondary">answer</Text>
						<Code>{trace.raw ?? "(nothing)"}</Code>
					</Flex>
				))}
			</Flex>
		);
	}

	const models = [...new Set(ran?.traces.map((trace) => trace.model) ?? [])];

	return (
		<Flex vertical gap={24} className={styles.page}>
			<Flex vertical gap={4}>
				<Flex gap={12} align="center">
					<Title level={3} className={styles.title}>
						AI curator lab
					</Title>
					<Tag color="warning">Dev only</Tag>
					<Flex gap={8} align="center" className={styles.readIn}>
						<Text type="secondary">Author's profile</Text>
						<Select<string>
							allowClear
							placeholder="Nothing picked"
							className={styles.persona}
							value={personaId}
							onChange={(next) => {
								setPersonaId(next);
								remember({
									lang: language,
									call: current?.id,
									situation: situation?.id,
									persona: next,
								});
								run.reset();
							}}
							options={(catalogue?.personas ?? []).map((each) => ({
								value: each.id,
								label: each.label[language],
							}))}
						/>
						<Text type="secondary">Situations and answers in</Text>
						<Segmented<LabLanguage>
							value={language}
							onChange={(next) => {
								setLanguage(next);
								remember({
									lang: next,
									call: current?.id,
									situation: situation?.id,
									persona: personaId,
								});
								setText(undefined);
								setTab("input");
								run.reset();
							}}
							options={[
								{ value: "en", label: "English" },
								{ value: "ru", label: "Русский" },
							]}
						/>
					</Flex>
				</Flex>
				<Text type="secondary">
					Runs the production prompt and model on a prepared situation. Real
					model calls, nothing is saved.
				</Text>
			</Flex>

			<Flex gap={24} align="flex-start" className={styles.body}>
				<Flex vertical gap={6} className={styles.calls}>
					<Text strong type="secondary" className={styles.small}>
						Call
					</Text>
					<Menu
						className={styles.menu}
						selectedKeys={current ? [current.id] : []}
						onClick={({ key }) => pick({ call: key })}
						items={calls.map((each) => ({
							key: each.id,
							label: (
								<Flex vertical>
									<Text>{each.label[language]}</Text>
									<Text type="secondary" className={styles.small}>
										{each.when[language]}
									</Text>
								</Flex>
							),
						}))}
					/>
				</Flex>
				<Divider orientation="vertical" className={styles.divider} />
				<Flex vertical gap={6} className={styles.situations}>
					<Text strong type="secondary" className={styles.small}>
						Situation
					</Text>
					<Menu
						className={styles.menu}
						selectedKeys={situation ? [situation.id] : []}
						onClick={({ key }) => pick({ situation: key })}
						items={current?.situations[language].map((each) => ({
							key: each.id,
							label: each.label,
						}))}
					/>
				</Flex>

				<Card
					className={styles.result}
					title={
						<Flex vertical gap={2} className={styles.resultTitle}>
							<Text strong>{current?.label[language] ?? "Result"}</Text>
							{current && (
								<Text type="secondary" className={styles.purpose}>
									{current.purpose[language]}
								</Text>
							)}
							<Button
								type="primary"
								icon={<IconPlayerPlay size={16} />}
								loading={run.isPending}
								disabled={!current}
								onClick={() => run.mutate(shown)}
								className={styles.run}
							>
								Run
							</Button>
						</Flex>
					}
				>
					<Flex vertical gap={16}>
						{ran && (
							<Descriptions
								bordered
								size="small"
								column={4}
								layout="vertical"
								items={[
									{
										key: "model",
										label: "Model",
										children: models.join(", ") || "—",
									},
									{
										key: "tokens",
										label: "Tokens in / out",
										children: `${formatCount(ran.inputTokens)} / ${formatCount(ran.outputTokens)}`,
									},
									{
										key: "cost",
										label: "Cost",
										children: formatDollar(ran.costMicros / MICROS_PER_USD, {
											fractionDigits: 4,
										}),
									},
									{
										key: "time",
										label: "Time",
										children: `${(ran.ms / 1000).toFixed(1)} s`,
									},
								]}
							/>
						)}
						<Segmented<Tab>
							value={tab}
							onChange={setTab}
							options={[
								{ value: "author", label: "Author's view" },
								{ value: "input", label: "Input" },
								{ value: "sent", label: "Sent" },
								{ value: "received", label: "Received" },
								...(steps.length
									? [
											{
												value: "steps" as const,
												label: `Steps · ${steps.length}`,
											},
										]
									: []),
							]}
						/>
						{body}
					</Flex>
				</Card>
			</Flex>
		</Flex>
	);
}
