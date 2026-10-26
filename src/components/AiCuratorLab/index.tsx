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
	Flex,
	Input,
	List,
	Menu,
	Segmented,
	Skeleton,
	Spin,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useState } from "react";
import { useStandingStatus } from "@/components/checkpoints/EvidenceStanding";
import {
	useVerdictCopy,
	VERDICT_TONE,
} from "@/components/checkpoints/VerdictChip";
import { StatusDot } from "@/components/ui";
import { formatCount, formatDollar } from "@/helpers/format";
import { MICROS_PER_USD } from "@/lib/checkpoint-costs";
import type { Standing } from "@/lib/checkpoint-verdict";
import type {
	LabSettled,
	labCatalogue,
	runLab,
} from "@/services/ai-curator-lab";
import type { LabLanguage } from "@/services/ai-curator-lab/schemas";
import type { AiTrace } from "@/services/ai-trace";
import styles from "./style.module.scss";

const { Title, Text, Paragraph } = Typography;

type Catalogue = ReturnType<typeof labCatalogue>;
type Ran = Exclude<Awaited<ReturnType<typeof runLab>>, { error: string }>;

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const Code = ({ children }: { children: string }) => (
	<Paragraph className={styles.code}>{children}</Paragraph>
);

/** Every standing labelled, delivered and nothing attached included. */
function useStandingDot() {
	const statusOf = useStandingStatus();
	return (standing: Standing) => (
		<StatusDot
			{...(statusOf(standing) ??
				(standing.is === "delivered"
					? { tone: "success", label: "Delivered" }
					: { tone: "danger", label: "Nothing attached" }))}
		/>
	);
}

const standingWhy = (standing: Standing) =>
	standing.is === "partly"
		? standing.note
		: standing.is === "trusted" || standing.is === "unproven"
			? standing.reason
			: null;

/** The settled tab: what the platform made of the answer. */
function Settled({ settled }: { settled: LabSettled | undefined }) {
	const verdict = useVerdictCopy();
	const dot = useStandingDot();

	switch (settled?.kind) {
		case "report":
			return (
				<Flex vertical gap={16}>
					<Flex vertical gap={8}>
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
						<Text type="secondary">
							{settled.overrode
								? "The rule overruled the model."
								: "The rule kept the model's verdict."}
						</Text>
					</Flex>
					<List
						bordered
						size="small"
						dataSource={settled.tasks}
						renderItem={(task) => (
							<List.Item extra={dot(task.standing)}>
								<List.Item.Meta
									title={task.text}
									description={standingWhy(task.standing)}
								/>
							</List.Item>
						)}
					/>
					<Card size="small" className={styles.note}>
						<Text type="secondary">
							Verdict note, as the author will read it
						</Text>
						<Paragraph className={styles.noteText}>{settled.note}</Paragraph>
					</Card>
				</Flex>
			);
		case "evidence":
			return (
				<Flex vertical gap={12}>
					{dot(settled.standing)}
					<Text type="secondary">What was read</Text>
					<Code>{pretty(settled.read)}</Code>
				</Flex>
			);
		case "media":
			return <Code>{settled.devlogMedia.join("\n")}</Code>;
		default:
			return (
				<Text type="secondary">
					Nothing to settle: the answer is used as written.
				</Text>
			);
	}
}

function Messages({ traces }: { traces: AiTrace[] }) {
	return (
		<Flex vertical gap={16}>
			{traces.map((trace, index) => (
				<Flex key={`${trace.name}-${index}`} vertical gap={8}>
					<Flex gap={8} align="center">
						<Tag className={styles.mono}>{trace.name}</Tag>
						<Text type="secondary">
							{trace.model} · {(trace.ms / 1000).toFixed(1)} s
						</Text>
					</Flex>
					<Text type="secondary">system</Text>
					<Code>{trace.system}</Code>
					<Text type="secondary">messages</Text>
					<Code>{pretty(trace.messages)}</Code>
				</Flex>
			))}
		</Flex>
	);
}

type Tab = "settled" | "answer" | "messages" | "raw";

function Result({
	ran,
	pending,
	failure,
	model,
}: {
	ran: Ran | undefined;
	pending: boolean;
	failure: string | null;
	model: string | undefined;
}) {
	const [tab, setTab] = useState<Tab>("settled");

	if (pending) {
		return (
			<Flex vertical gap={12}>
				<Flex gap={8} align="center">
					<Spin size="small" />
					<Text type="secondary">Waiting for {model ?? "the model"}…</Text>
				</Flex>
				<Skeleton active title={false} paragraph={{ rows: 3 }} />
			</Flex>
		);
	}
	if (failure) {
		return <Alert type="error" message="Not run" description={failure} />;
	}
	if (!ran) {
		return (
			<Text type="secondary">
				Run the situation to see what the model is sent and what it answers.
			</Text>
		);
	}

	const models = [...new Set(ran.traces.map((trace) => trace.model))];

	return (
		<Flex vertical gap={16}>
			<Descriptions
				bordered
				size="small"
				column={4}
				layout="vertical"
				items={[
					{ key: "model", label: "Model", children: models.join(", ") || "—" },
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
			{ran.answer === null && (
				<Alert
					type="error"
					message="No usable answer"
					description="The model answered nothing the platform can use. In production the step waits for the next cron run. The Raw tab shows what came back."
				/>
			)}
			<Segmented<Tab>
				value={tab}
				onChange={setTab}
				options={[
					{ value: "settled", label: "Settled" },
					{ value: "answer", label: "Answer" },
					{ value: "messages", label: `Messages · ${ran.traces.length}` },
					{ value: "raw", label: "Raw" },
				]}
			/>
			{tab === "settled" && <Settled settled={ran.settled} />}
			{tab === "answer" && <Code>{pretty(ran.answer)}</Code>}
			{tab === "messages" && <Messages traces={ran.traces} />}
			{tab === "raw" &&
				ran.traces.map((trace, index) => (
					<Code key={`${trace.name}-${index}`}>
						{`${trace.name}\n${trace.raw ?? "(nothing)"}`}
					</Code>
				))}
		</Flex>
	);
}

/**
 * Frames 12.18.1–12.18.3: one of the AI curator's calls run on a prepared
 * situation, through the production code. Feedback goes to the chat by copying
 * the input.
 */
export function AiCuratorLab() {
	const { message } = App.useApp();
	const { data: catalogue } = useQuery({
		queryKey: ["dev", "ai-curator"],
		queryFn: () =>
			axios.get<Catalogue>("/api/dev/ai-curator").then(({ data }) => data),
	});
	const [callId, setCallId] = useState<string>();
	const [situationId, setSituationId] = useState<string>();
	const [text, setText] = useState<string>();
	const [language, setLanguage] = useState<LabLanguage>("en");

	const calls = catalogue?.calls ?? [];
	const current = calls.find((each) => each.id === callId) ?? calls.at(-1);
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
			return axios
				.post<Ran>("/api/dev/ai-curator", {
					call: current?.id,
					input,
					language,
				})
				.then(({ data }) => data);
		},
	});
	const failure = !run.error
		? null
		: axios.isAxiosError<{ error?: string }>(run.error)
			? (run.error.response?.data?.error ?? run.error.message)
			: run.error.message;

	const pick = (next: { call?: string; situation?: string }) => {
		if (next.call) setCallId(next.call);
		setSituationId(next.situation);
		setText(undefined);
		run.reset();
	};

	const byModel = Object.entries(
		Object.groupBy(calls, (each) => each.model),
	).map(([model, used]) => ({
		model,
		for: (used ?? []).map((each) => each.label[language]).join(", "),
	}));

	return (
		<Flex vertical gap={24} className={styles.page}>
			<Flex vertical gap={4}>
				<Flex gap={12} align="center">
					<Title level={3} className={styles.title}>
						AI curator lab
					</Title>
					<Tag color="warning">Dev only</Tag>
					<Flex gap={8} align="center" className={styles.readIn}>
						<Text type="secondary">Situations and answers in</Text>
						<Segmented<LabLanguage>
							value={language}
							onChange={(next) => {
								setLanguage(next);
								setText(undefined);
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
				<Flex gap={16} wrap>
					{byModel.map((each) => (
						<Text key={each.model} type="secondary" className={styles.small}>
							{each.for} <Text className={styles.mono}>{each.model}</Text>
						</Text>
					))}
					<Text type="secondary" className={styles.small}>
						from src/config/ai-models.ts
					</Text>
				</Flex>
			</Flex>

			<Flex gap={24} align="flex-start" className={styles.body}>
				<Flex vertical gap={20} className={styles.pick}>
					<Flex vertical gap={6}>
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
					<Flex vertical gap={6}>
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
				</Flex>

				<Card
					className={styles.input}
					title={
						<Flex vertical>
							<Text strong>Input</Text>
							{edited && (
								<Text type="warning" className={styles.small}>
									Edited · runs as shown
								</Text>
							)}
						</Flex>
					}
					extra={
						<Button
							type="text"
							icon={<IconRestore size={16} />}
							disabled={!edited}
							onClick={() => setText(undefined)}
						>
							Reset to the situation
						</Button>
					}
				>
					<Flex vertical gap={12}>
						{current && (
							<Flex vertical gap={2}>
								<Text type="secondary" className={styles.small}>
									What this call is for
								</Text>
								<Text>{current.purpose[language]}</Text>
							</Flex>
						)}
						<Flex vertical className={styles.editor}>
							<Input.TextArea
								className={styles.mono}
								value={shown}
								onChange={(event) => setText(event.target.value)}
								autoSize={{ minRows: 12, maxRows: 40 }}
								spellCheck={false}
							/>
							<Button
								className={styles.copy}
								aria-label="Copy the input"
								icon={<IconCopy size={16} />}
								onClick={() =>
									navigator.clipboard
										.writeText(shown)
										.then(() => message.success("Input copied"))
								}
							/>
						</Flex>
						<Button
							type="primary"
							className={styles.run}
							icon={<IconPlayerPlay size={16} />}
							loading={run.isPending}
							disabled={!current}
							onClick={() => run.mutate(shown)}
						>
							Run
						</Button>
					</Flex>
				</Card>

				<Card className={styles.result} title="Result">
					<Result
						ran={run.data}
						pending={run.isPending}
						failure={failure}
						model={current?.model}
					/>
				</Card>
			</Flex>
		</Flex>
	);
}
