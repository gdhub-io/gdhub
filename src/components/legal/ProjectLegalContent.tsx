import { DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	Card,
	Descriptions,
	Flex,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import parse from "html-react-parser";
import { marked } from "marked";
import { useMemo } from "react";
import type { ProjectLegalSnapshotInput } from "@/helpers/legal/projectLegalSnapshot";
import {
	buildProjectLegalAgreementMarkdown,
	buildProjectLegalSnapshotMarkdown,
	getProjectLegalTerms,
} from "@/helpers/legal/projectLegalSnapshot";

const { Paragraph, Text, Title } = Typography;

type ProjectWorkflowStepPreview = {
	id: string;
	order: number;
	name: string;
};

type ProjectWorkflowPreview = {
	currentStep: ProjectWorkflowStepPreview | null;
	steps: ProjectWorkflowStepPreview[];
};

type ProjectLegalContentProps = {
	title?: string;
	appendixInput?: ProjectLegalSnapshotInput;
	showDownload?: boolean;
	showProjectAppendix?: boolean;
};

const ProjectLegalContent = ({
	title,
	appendixInput,
	showDownload = false,
	showProjectAppendix = false,
}: ProjectLegalContentProps) => {
	const { t } = useTranslate();
	const { data, isLoading } = useQuery({
		queryKey: ["legal", "co-development-agreement"],
		queryFn: () =>
			axios.get<{ markdown: string }>("/api/legal/co-development-agreement"),
		refetchOnWindowFocus: false,
	});
	const { data: workflowData, isLoading: isWorkflowLoading } = useQuery({
		queryKey: ["legal", "project-workflow-preview", appendixInput?.projectId],
		queryFn: () =>
			axios.get<ProjectWorkflowPreview>("/api/user/project/workflow", {
				params: { projectId: appendixInput?.projectId },
			}),
		enabled: !!appendixInput?.projectId,
		refetchOnWindowFocus: false,
	});

	const agreementMarkdown = data?.data.markdown || "";
	const workflowSteps = useMemo(() => {
		if (appendixInput?.workflowSteps?.length) {
			return appendixInput.workflowSteps;
		}

		if (!workflowData?.data?.steps?.length) {
			return undefined;
		}

		return workflowData.data.steps.map((step) => ({
			name: step.name,
			order: step.order,
			isCurrent: workflowData.data.currentStep?.id === step.id,
		}));
	}, [appendixInput?.workflowSteps, workflowData?.data]);
	const effectiveAppendixInput = useMemo(() => {
		if (!appendixInput) {
			return undefined;
		}

		const derivedProjectPageUrl =
			appendixInput.projectPageUrl ||
			appendixInput.sharesPageUrl ||
			(typeof window !== "undefined" && appendixInput.projectSlug
				? `${window.location.origin}/my/projects/${appendixInput.projectSlug}/team`
				: undefined);

		return {
			...appendixInput,
			projectPageUrl: derivedProjectPageUrl,
			sharesPageUrl: derivedProjectPageUrl,
			workflowSteps,
		};
	}, [appendixInput, workflowSteps]);
	const terms = useMemo(
		() =>
			effectiveAppendixInput
				? getProjectLegalTerms(effectiveAppendixInput)
				: [],
		[effectiveAppendixInput],
	);
	const snapshotMarkdown = useMemo(() => {
		if (!agreementMarkdown || !effectiveAppendixInput) {
			return agreementMarkdown;
		}

		return buildProjectLegalSnapshotMarkdown(
			agreementMarkdown,
			effectiveAppendixInput,
		);
	}, [agreementMarkdown, effectiveAppendixInput]);
	const effectiveAgreementMarkdown = useMemo(() => {
		if (!agreementMarkdown || !effectiveAppendixInput) {
			return agreementMarkdown;
		}

		return buildProjectLegalAgreementMarkdown(
			agreementMarkdown,
			effectiveAppendixInput,
		);
	}, [agreementMarkdown, effectiveAppendixInput]);
	const agreementHtml = useMemo(
		() =>
			marked.parse(effectiveAgreementMarkdown, {
				async: false,
				breaks: true,
				gfm: true,
			}) as string,
		[effectiveAgreementMarkdown],
	);

	const handleDownload = () => {
		if (!snapshotMarkdown) return;

		const blob = new Blob([snapshotMarkdown], {
			type: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = appendixInput?.projectSlug
			? `${appendixInput.projectSlug}-co-development-agreement.md`
			: "co-development-agreement.md";
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Spin spinning={isLoading || isWorkflowLoading}>
			<Flex vertical gap={16}>
				{title ? <Title level={4}>{title}</Title> : null}

				{showProjectAppendix && appendixInput ? (
					<>
						<Alert
							type="info"
							message={t(
								"project.legal.snapshotNotice",
								"This legal appendix is generated from the current project settings.",
							)}
						/>
						<Card>
							<Flex
								justify="space-between"
								align="center"
								gap={16}
								wrap="wrap"
								style={{ marginBottom: 16 }}
							>
								<div>
									<Title level={5} style={{ marginBottom: 0 }}>
										{t("project.legal.snapshot", "Project legal snapshot")}
									</Title>
									<Text type="secondary">
										{t(
											"project.legal.snapshotDescription",
											"These values should be reflected in the agreement appendix and re-confirmed when they change.",
										)}
									</Text>
								</div>
								{showDownload ? (
									<Button icon={<DownloadOutlined />} onClick={handleDownload}>
										{t("project.legal.downloadSnapshot", "Download snapshot")}
									</Button>
								) : null}
							</Flex>
							<Descriptions
								column={1}
								size="small"
								items={terms.map((term) => ({
									key: term.key,
									label: term.label,
									children: term.value,
								}))}
							/>
						</Card>
					</>
				) : null}

				<Card>
					<Paragraph type="secondary">
						{t(
							"project.legal.documentDescription",
							"The current platform agreement template is shown below. Project-specific parameters are inserted directly into the agreement and duplicated in the appendix card.",
						)}
					</Paragraph>
					<div style={{ overflowX: "auto" }}>{parse(agreementHtml)}</div>
				</Card>
			</Flex>
		</Spin>
	);
};

export default ProjectLegalContent;
