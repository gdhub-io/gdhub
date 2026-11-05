import type { Meta, StoryObj } from "@storybook/nextjs";
import { LINKS, MEDIA, MediaFixtures } from "../fixtures/media";
import { messageFixture } from "../fixtures/timeline";
import { YouTubeEmbed } from "../media/LinkAttachment";
import type { DeliveryStatus, TimelineImage } from "../model/timeline";
import { MessageGroup } from "./index";

const meta: Meta<typeof MessageGroup> = {
	title: "Chat/MessageGroup",
	component: MessageGroup,
	parameters: { layout: "centered" },
	args: { senderName: "Anna Volkova", avatarMxc: null, ts: Date.now() },
	decorators: [
		(Story) => (
			<MediaFixtures>
				<div
					style={{
						width: 472,
						padding: 16,
						background: "var(--gd-color-surface)",
					}}
				>
					<Story />
				</div>
			</MediaFixtures>
		),
	],
};

export default meta;

type Story = StoryObj<typeof MessageGroup>;

/** Someone else: avatar, name and time once, then the bubbles. */
export const Other: Story = {
	args: {
		own: false,
		messages: [
			messageFixture({ id: "1", text: "Hi! I read your question." }),
			messageFixture({
				id: "2",
				text: "Short answer: one paid DLC first, then a season pass once you know the attach rate.",
			}),
		],
	},
};

const ownWith = (status: DeliveryStatus): Story => ({
	args: {
		own: true,
		senderName: "Me",
		onRetry: () => undefined,
		messages: [
			messageFixture({ id: "1", own: true, text: "Wishlists doubled 🎉" }),
			messageFixture({
				id: "2",
				own: true,
				text: "Posting the numbers",
				status,
			}),
		],
	},
});

export const OwnSending = ownWith("sending");
export const OwnSent = ownWith("sent");
export const OwnRead = ownWith("read");
/** A failed send carries its own Retry. */
export const OwnFailed = ownWith("failed");

export const EditedAndDeleted: Story = {
	args: {
		own: false,
		messages: [
			messageFixture({ id: "1", text: "Fixed the typo", edited: true }),
			messageFixture({ id: "2", text: "…", deleted: true }),
		],
	},
};

/** Frame `X7HUy`: a reply quote and reaction chips, own reaction highlighted. */
export const ReplyAndReactions: Story = {
	args: {
		own: false,
		onReact: () => undefined,
		messages: [
			messageFixture({
				id: "1",
				text: "Great, send me the numbers",
				replyTo: {
					id: "0",
					senderName: "Me",
					text: "Wishlists doubled after the store page test",
					deleted: false,
				},
				reactions: [
					{
						key: "🔥",
						count: 2,
						mineEventId: null,
						senderNames: ["Anna", "Joel"],
					},
					{ key: "👍", count: 1, mineEventId: "$r", senderNames: ["Me"] },
				],
			}),
		],
	},
};

/** Closed chat (`hPrUv` case 5): the menu is Copy only, chips are not togglable. */
export const ReadOnly: Story = {
	args: {
		...ReplyAndReactions.args,
		readOnly: true,
	},
};

/** Frame `ucBkR`: links are clickable; the first gets Synapse's preview card. */
export const LinkWithPreview: Story = {
	args: {
		own: false,
		messages: [
			messageFixture({
				id: "1",
				text: `Wishlist it, the demo is up: ${LINKS.itch}`,
			}),
		],
	},
};

/** Frame `XNDB6` case 4: no og data, so no card — the link still opens. */
export const LinkWithoutPreview: Story = {
	args: {
		own: true,
		senderName: "Me",
		messages: [
			messageFixture({
				id: "1",
				own: true,
				status: "read",
				text: `Docs are here: ${LINKS.docs}`,
			}),
		],
	},
};

const imageMessage = (image: Partial<TimelineImage>, caption = ""): Story => ({
	args: {
		own: true,
		senderName: "Me",
		messages: [
			messageFixture({
				id: "1",
				own: true,
				status: "read",
				text: caption,
				image: {
					mxc: MEDIA.ready,
					name: "level-03-sketch.webp",
					w: 1600,
					h: 1200,
					...image,
				},
			}),
		],
	},
});

/** Frame `TUdvE`: the thumbnail; a click opens antd's viewer (`NYgIg`). */
export const Image = imageMessage({});
export const ImagePortrait = imageMessage({ mxc: MEDIA.tall, w: 900, h: 1600 });
/** A picture and its caption are one event and one bubble (Matrix 1.10). */
export const ImageWithCaption = imageMessage(
	{ caption: "Level 3, first pass — https://gdhub.io/checkpoint" },
	"Level 3, first pass — https://gdhub.io/checkpoint",
);
/** Frame `XNDB6` case 1: Skeleton.Image at the event's own proportions. */
export const ImageLoading = imageMessage({ mxc: MEDIA.loading });
/** Frame `XNDB6` case 2: purged by retention, or failed to load. */
export const ImageUnavailable = imageMessage({ mxc: MEDIA.broken });

/** Frame `KaMFv`: the cover is Synapse's copy of og:image, not Google's. */
export const YouTubeCover: Story = {
	args: {
		own: true,
		senderName: "Me",
		messages: [
			messageFixture({
				id: "1",
				own: true,
				status: "read",
				text: LINKS.youtube,
			}),
		],
	},
};

/** Frame `IT7LP`: after the click. This one story does load youtube-nocookie.com. */
export const YouTubePlaying: Story = {
	render: () => (
		<YouTubeEmbed
			videoId="dQw4w9WgXcQ"
			initiallyPlaying
			preview={{ siteName: "YouTube", title: "Hollow Tide — gameplay trailer" }}
		/>
	),
};

/** Frame `P9oMmV`: an Announcements post spans the timeline; the add-reaction chip opens the strip (`XMaOR`). */
export const WidePost: Story = {
	args: {
		own: false,
		senderName: "GDHub",
		wide: true,
		onReact: () => undefined,
		onCopy: () => undefined,
		messages: [
			messageFixture({
				id: "1",
				senderName: "GDHub",
				text: `November update: chat now shows links, images and YouTube videos — in every conversation, not only here. Roadmap: ${LINKS.itch}`,
				reactions: [
					{ key: "🔥", count: 6, mineEventId: null, senderNames: ["Anna"] },
				],
			}),
		],
	},
};
