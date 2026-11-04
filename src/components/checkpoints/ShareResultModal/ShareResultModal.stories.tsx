import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CheckpointVerdict } from "@/config/prisma-enums";
import type { ShareCardDto } from "@/types/checkpoints";
import { ShareResultModal } from ".";

const CARD: ShareCardDto = {
	number: 4,
	verdict: CheckpointVerdict.StageClosed,
	decidedAt: "2027-01-04T00:00:00.000Z",
	line: "By my staff, the gnome’s cracking-ice trial is taking shape! May the demo turn your last design doubts into clear answers.",
	curator: { name: "Elder Aldric", avatar: "/curators/wizard.webp" },
	project: { name: "E2E Test Game", slug: "e2e-test-game", cover: null },
	image: "/curators/wizard.webp",
};

/** The window reads its card from the query cache; a story seeds it, or leaves it pending. */
const withCard = (card: ShareCardDto | "pending" | "error") => {
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				queryFn: () =>
					card === "error"
						? Promise.reject(new Error("no card"))
						: new Promise(() => {}),
			},
		},
	});
	if (typeof card === "object")
		client.setQueryData(["checkpoint", "cp1", "share"], card);
	return (
		<QueryClientProvider client={client}>
			<ShareResultModal checkpointId="cp1" open onClose={() => {}} />
		</QueryClientProvider>
	);
};

const meta: Meta<typeof ShareResultModal> = {
	title: "Checkpoints/ShareResultModal",
	component: ShareResultModal,
};
export default meta;

type Story = StoryObj<typeof ShareResultModal>;

/** Frame 12.20.1: the card, the post text, the link and the networks. */
export const Ready: Story = { render: () => withCard(CARD) };

/** A missed goal is shared too: "done", never "passed". */
export const GoalMissed: Story = {
	render: () =>
		withCard({ ...CARD, number: 3, verdict: CheckpointVerdict.GoalMissed }),
};

/** The first open, while the curator writes the line. */
export const Writing: Story = { render: () => withCard("pending") };

export const Failed: Story = { render: () => withCard("error") };
