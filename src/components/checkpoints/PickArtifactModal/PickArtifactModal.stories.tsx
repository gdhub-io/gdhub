import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
	ArtifactCheckStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { PickArtifactModal } from ".";

const PROJECT_ID = "prj-1";

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
		name: "Concept document",
		type: ProjectArtifactType.Concept,
		link: "https://example.com/tidewalker-concept",
		checkStatus: ArtifactCheckStatus.Readable,
		createdAt: "2026-08-02T10:00:00.000Z",
		createdByUser: { name: "Dima Ivanou" },
	},
];

/** The picker reads the store through TanStack Query; the story seeds its key. */
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

const meta: Meta<typeof PickArtifactModal> = {
	title: "Checkpoints/PickArtifactModal",
	component: PickArtifactModal,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof PickArtifactModal>;

/** The draft's picker: it hands the artifact back and writes nothing. */
export const Choosing: Story = {
	decorators: [withArtifacts(ARTIFACTS)],
	args: {
		open: true,
		projectId: PROJECT_ID,
		onPick: () => {},
		onClose: () => {},
	},
};

/** A project with an empty store, where the second face is the only way on. */
export const EmptyProject: Story = {
	decorators: [withArtifacts([])],
	args: {
		open: true,
		projectId: PROJECT_ID,
		onPick: () => {},
		onClose: () => {},
	},
};
