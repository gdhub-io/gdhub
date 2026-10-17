import type { Meta, StoryObj } from "@storybook/nextjs";
import { MyDocumentsView } from "./index";

/** Frames `CJGPi` (with data) and `ZssMc` (loading, empty, error). */
const meta: Meta<typeof MyDocumentsView> = {
	title: "Legal/MyDocuments",
	component: MyDocumentsView,
	parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof MyDocumentsView>;

export const WithData: Story = {
	args: {
		data: {
			acceptances: [
				{
					id: "a1",
					code: "TermsOfUse",
					title: "Terms of Use",
					version: 1,
					context: "SignUp",
					acceptedAt: "2026-10-17T10:00:00Z",
					href: "/legal/terms-of-use/v1",
					subject: null,
				},
				{
					id: "a2",
					code: "CheckpointPurchaseTerms",
					title: "Checkpoint Purchase Terms",
					version: 1,
					context: "CheckpointPurchase",
					acceptedAt: "2026-10-20T10:00:00Z",
					href: "/legal/checkpoint-purchase-terms/v1",
					subject: "Hollow Tide · Prototyping",
				},
			],
			certificates: [
				{
					id: "c1",
					number: "GDH-2026-0042",
					source: "Event",
					title: "GameJam Winter 2026",
					issuedAt: "2026-02-01T10:00:00Z",
				},
			],
		},
	},
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = {
	args: { data: { acceptances: [], certificates: [] } },
};

export const LoadError: Story = { args: { error: true } };
