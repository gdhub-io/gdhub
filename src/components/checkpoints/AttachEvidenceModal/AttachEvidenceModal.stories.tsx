import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type { CheckpointDto, CheckpointItemDto } from "@/types/checkpoints";
import { AttachEvidenceModal } from ".";

const PROJECT_ID = "prj-1";

const outcome = (
	id: string,
	text: string,
	extra: Partial<CheckpointItemDto> = {},
): CheckpointItemDto => ({
	id,
	kind: CheckpointItemKind.Outcome,
	order: Number(id.split("-")[1]),
	text,
	originalText: null,
	cut: false,
	addedAt: null,
	note: null,
	acceptedNote: null,
	artifact: null,
	...extra,
});

const CHECKPOINT: CheckpointDto = {
	id: "cp-1",
	projectId: PROJECT_ID,
	stepId: "step-3",
	stageName: "Prototyping",
	order: 2,
	status: CheckpointStatus.Active,
	goal: "A playable vertical slice with two tide states and one boss encounter.",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: "2026-09-01T09:00:00.000Z",
	dueAt: "2026-09-28T09:00:00.000Z",
	goalAgreedAt: "2026-09-01T15:00:00.000Z",
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: "2026-09-01T08:55:00.000Z",
	declinedCuratorIds: [],
	curatorAcceptedAt: null,
	curatorDeclinedAt: null,
	paymentId: null,
	createdAt: "2026-09-01T08:40:00.000Z",
	updatedAt: "2026-09-14T09:00:00.000Z",
	items: [
		outcome("out-1", "A playable build with both tide states"),
		outcome("out-2", "The boss encounter from first contact to defeat"),
		outcome("out-3", "Two minutes of gameplay footage a stranger can follow"),
		outcome("out-4", "The economy table the slice is balanced against", {
			cut: true,
		}),
	],
	day: 14,
	daysLeft: 14,
};

/** As `/api/user/project/artifacts` sends them — the row, not the narrow ref. */
const ARTIFACTS = [
	{
		id: "art-1",
		name: "Tidewalker — build 0.4",
		type: ProjectArtifactType.ExecutableBuild,
		link: "https://example.com/tidewalker-0-4.zip",
		checkStatus: ArtifactCheckStatus.Readable,
		createdAt: "2026-09-13T10:00:00.000Z",
		createdByUser: { name: "Priya Raman" },
	},
	{
		id: "art-2",
		name: "Boss fight — first pass",
		type: ProjectArtifactType.GameplayVideo,
		link: "https://example.com/boss-first-pass",
		checkStatus: ArtifactCheckStatus.Readable,
		createdAt: "2026-09-11T10:00:00.000Z",
		createdByUser: { name: "Dima Ivanou" },
	},
	{
		id: "art-3",
		name: "Concept document",
		type: ProjectArtifactType.Concept,
		link: "https://example.com/tidewalker-concept",
		checkStatus: ArtifactCheckStatus.Readable,
		createdAt: "2026-08-02T10:00:00.000Z",
		createdByUser: { name: "Dima Ivanou" },
	},
];

/**
 * The picker reads the store through TanStack Query, so the stories seed the
 * cache under its key rather than mocking the network.
 */
function withArtifacts(artifacts: unknown[]) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});

	client.setQueryData(["project-artifacts", PROJECT_ID], artifacts);

	return (Story: () => ReactElement) => (
		<QueryClientProvider client={client}>
			<Story />
		</QueryClientProvider>
	);
}

const meta: Meta<typeof AttachEvidenceModal> = {
	title: "Checkpoints/AttachEvidenceModal",
	component: AttachEvidenceModal,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof AttachEvidenceModal>;

/** One artifact, then the lines it settles. The cut outcome is not offered. */
export const Picking: Story = {
	decorators: [withArtifacts(ARTIFACTS)],
	args: { open: true, checkpoint: CHECKPOINT, onClose: () => {} },
};

/** Nothing in the store yet — the only way out is the second face. */
export const EmptyProject: Story = {
	decorators: [withArtifacts([])],
	args: { open: true, checkpoint: CHECKPOINT, onClose: () => {} },
};
