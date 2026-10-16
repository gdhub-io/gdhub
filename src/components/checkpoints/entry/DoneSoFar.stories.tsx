import type { Meta, StoryObj } from "@storybook/nextjs";
import { Form } from "antd";
import { ProjectArtifactType } from "@/config/prisma-enums";
import {
	DONE_SO_FAR_FIELD,
	DoneSoFar,
	type DoneSoFarRow,
	EMPTY_DONE_ROW,
} from "./DoneSoFar";
import { entryArtifact, entryStatusReady } from "./entry.fixtures";

type Args = { rows: DoneSoFarRow[]; carriedFrom?: number | null };

const List = ({ rows, carriedFrom }: Args) => (
	<div style={{ maxWidth: 800 }}>
		<Form initialValues={{ [DONE_SO_FAR_FIELD]: rows }}>
			<DoneSoFar projectId="p1" carriedFrom={carriedFrom} />
		</Form>
	</div>
);

const meta: Meta<typeof List> = {
	title: "Checkpoints/Entry/DoneSoFar",
	component: List,
};
export default meta;

type Story = StoryObj<typeof List>;

/** A project without history: one empty row. */
export const Empty: Story = { args: { rows: [{ ...EMPTY_DONE_ROW }] } };

/** 12.2: three rows, two with evidence. */
export const Filled: Story = {
	args: { rows: entryStatusReady.draft?.items ?? [] },
};

/** 12.2b: carried over from the previous checkpoint, five rows, "Add item" hidden. */
export const CarriedOver: Story = {
	args: {
		carriedFrom: 2,
		rows: [
			...(entryStatusReady.draft?.items ?? []),
			{
				text: "Vertical slice with the lantern mechanic",
				artifact: entryArtifact(
					"a3",
					"Slice gameplay",
					ProjectArtifactType.GameplayVideo,
				),
			},
			{ text: "Steam page draft", artifact: null },
		],
	},
};
