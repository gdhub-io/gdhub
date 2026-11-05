import type { Meta, StoryObj } from "@storybook/nextjs";
import { AnnouncementsAvatar } from "../AnnouncementsAvatar";
import { ChatComposer } from "../ChatComposer";
import { contextSlot, type RoomContext } from "../ChatContextLine/kinds";
import { ChatTimeline } from "../ChatTimeline";
import {
	adviceContext,
	closedAdviceContext,
	vacancyContext,
} from "../fixtures/context";
import { conversationFixture } from "../fixtures/timeline";
import { buildTimeline } from "../model/timeline";
import {
	AnnouncementsBanner,
	ChatConversation,
	ChatInvite,
	EmptyAnnouncements,
	EmptyConversation,
	PostingAsGdhub,
	ReadOnlyBanner,
} from "./index";

const noop = () => undefined;

const t = (_key: string, fallback: string, params?: Record<string, string>) =>
	fallback.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? "");

const slotOf = (context: RoomContext, invited = false) =>
	contextSlot(context, { t, invited, onClose: noop });

const meta: Meta<typeof ChatConversation> = {
	title: "Chat/ChatConversation",
	component: ChatConversation,
	parameters: { layout: "centered" },
	args: {
		name: "Anna Volkova",
		presence: "online",
		state: "ready",
		onBack: noop,
		onClose: noop,
		info: "Messages travel over a secure connection (TLS) and only the people in this chat can read them.",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: 520,
					height: 720,
					background: "var(--gd-color-surface)",
					border: "1px solid var(--gd-color-border)",
					borderRadius: "var(--gd-radius-panel)",
					overflow: "hidden",
				}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ChatConversation>;

/** Frame `YGPUq`: an advice chat with two days of messages. */
export const Chat: Story = {
	args: {
		context: slotOf(adviceContext),
		children: <ChatTimeline items={buildTimeline(conversationFixture)} />,
	},
};

/** Opening a conversation: header is known, messages are still loading. */
export const Loading: Story = {
	args: { state: "loading", context: slotOf(adviceContext) },
};

/** Frame `u8M7E`: a new direct chat with nothing in it yet. */
export const Empty: Story = {
	args: {
		name: "Jesus Mayer",
		presence: null,
		children: <EmptyConversation name="Jesus Mayer" />,
	},
};

/** Frame `ZMcrW`: the invite replaces the timeline and the composer. */
export const Invite: Story = {
	args: {
		name: "Nebula Drift",
		presence: "invitation",
		context: slotOf(vacancyContext, true),
		children: (
			<ChatInvite
				name="Nebula Drift"
				position="Unity Gameplay Programmer"
				offerMessage="Hi! We liked your jam entry — would you talk to us about the gameplay role?"
				onAccept={noop}
				onDecline={noop}
			/>
		),
	},
};

/** Frame `B9jTEp`: closed, read-only banner in place of the composer. */
export const Closed: Story = {
	args: {
		presence: null,
		context: slotOf(closedAdviceContext),
		children: <EmptyConversation name="Anna Volkova" />,
		footer: <ReadOnlyBanner />,
	},
};

/** A room the user can no longer see. */
export const Unavailable: Story = {
	args: { name: "", presence: null, state: "unavailable" },
};

const announcementsHeader = {
	name: "Announcements",
	presence: null,
	subtitle: "News from GDHub",
	avatar: <AnnouncementsAvatar size={32} />,
	info: undefined,
};

/** Frame `P9oMmV`: a member reads Announcements — no composer, the read-only line instead. */
export const AnnouncementsMember: Story = {
	args: {
		...announcementsHeader,
		children: <EmptyAnnouncements />,
		footer: <AnnouncementsBanner />,
	},
};

/** Frame `Z3xk5b`: a super admin or hub admin gets the composer, posting as GDHub. */
export const AnnouncementsAdmin: Story = {
	args: {
		...announcementsHeader,
		children: <EmptyAnnouncements />,
		footer: (
			<ChatComposer
				value="Live intro stream this Friday, 18:00 CET"
				onChange={noop}
				onSubmit={noop}
				notice={<PostingAsGdhub />}
				onAttach={noop}
			/>
		),
	},
};
