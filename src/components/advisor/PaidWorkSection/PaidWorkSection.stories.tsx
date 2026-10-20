import type { Meta, StoryObj } from "@storybook/nextjs";
import { App } from "antd";
import type { ReactElement } from "react";
import { userEvent, within } from "storybook/test";
import { ExpertInvoicing } from "@/config/prisma-enums";
import type { CurationDto, PaidWorkDto } from "@/types/checkpoints";
import { PaidWorkSection } from ".";

const NOT_SET_UP: PaidWorkDto = {
	holder: null,
	account: null,
	invoicing: null,
	terms: null,
	termsNeeded: true,
};

const SET_UP: PaidWorkDto = {
	holder: "Marek Kowalski",
	account: "LT12 •••• 4421",
	invoicing: ExpertInvoicing.SelfEmployed,
	terms: { version: 1, acceptedAt: "2026-10-12T09:30:00.000Z" },
	termsNeeded: false,
};

const STAGES = [
	"Ideation",
	"Concepting",
	"Prototyping",
	"Preparing a demo version",
	"Release version",
];

const CURATION_OFF: CurationDto = {
	locked: false,
	on: false,
	stages: [],
	stageOptions: STAGES,
	status: null,
	requestedAt: null,
	approvedAt: null,
	note: null,
};

const curation = (extra: Partial<CurationDto>): CurationDto => ({
	...CURATION_OFF,
	on: true,
	stages: ["Concepting", "Prototyping"],
	...extra,
});

const meta: Meta<typeof PaidWorkSection> = {
	title: "Advisor/PaidWorkSection",
	component: PaidWorkSection,
	decorators: [
		(Story: () => ReactElement) => (
			<App>
				<div style={{ maxWidth: 760 }}>
					<Story />
				</div>
			</App>
		),
	],
	args: {
		paidWork: NOT_SET_UP,
		curation: { ...CURATION_OFF, locked: true },
		onSave: async () => undefined,
		onSaveCuration: async () => undefined,
		onAskAgain: async () => undefined,
	},
};

export default meta;

type Story = StoryObj<typeof PaidWorkSection>;

/** `Q8dNW0`: empty fields, the terms unticked; Project curation locked until they are saved. */
export const NotSetUp: Story = {};

/** `SyTre`: an account that fails the IBAN checksum and the terms left unticked. */
export const FieldErrors: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const [holder, account] = canvas.getAllByRole("textbox");
		await userEvent.type(holder, "Marek Kowalski");
		await userEvent.type(account, "LT12 1000 0111 01");
		await userEvent.click(canvas.getByText("Self-employed"));
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
	},
};

/** `S5YkC`: the account masked with Change, the terms accepted; curation off and never asked. */
export const SetUp: Story = {
	args: { paidWork: SET_UP, curation: CURATION_OFF },
};

/** `g9B7RS`: after Change the saved account is replaced by an empty input. */
export const ChangingAccount: Story = {
	args: { paidWork: SET_UP, curation: CURATION_OFF },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Change" }));
	},
};

/** `g9B7RS`: Save shows loading; the form is read-only until the answer. */
export const Saving: Story = {
	args: { paidWork: SET_UP, curation: CURATION_OFF, saving: true },
};

/** `g9B7RS`: the save is refused; what was typed stays. */
export const SaveFailed: Story = {
	args: {
		paidWork: SET_UP,
		curation: CURATION_OFF,
		onSave: () => Promise.reject(new Error("Network Error")),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
	},
};

/** `S5YkC`: turned on and saved, waiting for an admin. */
export const CurationWaiting: Story = {
	args: {
		paidWork: SET_UP,
		curation: curation({
			stages: STAGES.slice(1),
			status: "pending",
			requestedAt: "2026-10-20T09:00:00.000Z",
		}),
	},
};

/** `JPpKq`: approved, offered at these stages. */
export const CurationApproved: Story = {
	args: {
		paidWork: SET_UP,
		curation: curation({
			status: "approved",
			requestedAt: "2026-10-14T09:00:00.000Z",
			approvedAt: "2026-10-18T09:00:00.000Z",
		}),
	},
};

/** `JPpKq`: declined or revoked — the admin's note and Ask again. */
export const CurationNotApproved: Story = {
	args: {
		paidWork: SET_UP,
		curation: curation({
			status: "notApproved",
			requestedAt: "2026-10-14T09:00:00.000Z",
			note: "Your profile doesn't show a game you worked on that reached release.",
		}),
	},
};
