import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { entryProjects } from "./entry.fixtures";
import { ProjectPicker } from "./ProjectPicker";

const Picker = ({ loading }: { loading?: boolean }) => {
	const [value, setValue] = useState(entryProjects[0].id);

	return (
		<div style={{ maxWidth: 800 }}>
			<ProjectPicker
				projects={entryProjects}
				value={value}
				onChange={setValue}
				onNewProject={() => {}}
				loading={loading}
			/>
		</div>
	);
};

const meta: Meta<typeof Picker> = {
	title: "Checkpoints/Entry/ProjectPicker",
	component: Picker,
};
export default meta;

/** 12.2 / 12.2a: open it to see the options with the current one ticked. */
export const Default: StoryObj<typeof Picker> = {};

/** The chosen project's lines are being read. */
export const Switching: StoryObj<typeof Picker> = { args: { loading: true } };
