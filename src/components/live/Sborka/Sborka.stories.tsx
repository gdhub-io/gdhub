import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { screenKey } from "@/lib/live/sborka";
import { BroadcastSettings } from "./BroadcastSettings";
import { PeoplePanel } from "./PeoplePanel";
import { ProgramPreview } from "./ProgramPreview";
import type { StudioPerson } from "./use-studio";

const noop = () => undefined;

const person = (
	id: string,
	name: string,
	role: string,
	direction: string,
	extra: Partial<StudioPerson> = {},
): StudioPerson => ({
	id,
	name,
	role,
	direction,
	host: direction === "host",
	local: false,
	audio: true,
	video: false,
	sharing: false,
	...extra,
});

const CAST = [
	person("pavel", "Pavel Orlov", "Host", "host", { local: true }),
	person("olga", "Olga Kim", "Unity Developer", "development"),
	person("mark", "Mark Sato", "3D Artist", "3d-art-animation", {
		audio: false,
	}),
	person("anna", "Anna Sousa", "Sound Designer", "music-sound"),
	person("leo", "Leo Marin", "Game Designer", "game-design", { sharing: true }),
];

function Directed({ host }: { host: boolean }) {
	const [people, setPeople] = useState(CAST);
	const [onScreen, setOnScreen] = useState(["pavel", "olga", "mark"]);
	return (
		<div style={{ width: 400 }}>
			<PeoplePanel
				people={
					host ? people : people.map((p) => ({ ...p, local: p.id === "olga" }))
				}
				onScreen={onScreen}
				host={host}
				actions={{
					reorder: (order) =>
						setPeople(
							order.map(
								(id) => people.find((p) => p.id === id) as StudioPerson,
							),
						),
					toggleOnScreen: (key) =>
						setOnScreen((keys) =>
							keys.includes(key)
								? keys.filter((k) => k !== key)
								: [...keys, key],
						),
					setMic: (id, on) =>
						setPeople((ps) =>
							ps.map((p) => (p.id === id ? { ...p, audio: on } : p)),
						),
					edit: (id, name, role) =>
						setPeople((ps) =>
							ps.map((p) => (p.id === id ? { ...p, name, role } : p)),
						),
				}}
			/>
		</div>
	);
}

const meta: Meta = { title: "Live/Sborka", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

/** 03.15.2 — the host directs: drag, mute, on screen, rename. */
export const GuestsPanelHost: Story = { render: () => <Directed host /> };

/** 03.15.11 — a guest sees who is there and edits only themselves. */
export const PeoplePanelGuest: Story = {
	render: () => <Directed host={false} />,
};

/** 03.15.7 — the room is open and only the host is in it. */
export const GuestsPanelAlone: Story = {
	render: () => (
		<div style={{ width: 400 }}>
			<PeoplePanel
				people={CAST.slice(0, 1)}
				onScreen={["pavel"]}
				host
				actions={undefined}
			/>
		</div>
	),
};

/** 03.15.1 — the stream target, remembered in this browser. */
export const Settings: Story = {
	render: () => (
		<div style={{ width: 760 }}>
			<BroadcastSettings live={false} onChange={noop} />
		</div>
	),
};

/** 03.15.3 — on air the RTMP target is locked; the title still changes. */
export const SettingsOnAir: Story = {
	render: () => (
		<div style={{ width: 760 }}>
			<BroadcastSettings live onChange={noop} />
		</div>
	),
};

const preview = (sources: string[], speakerId: string | null) => (
	<div style={{ width: 760 }}>
		<ProgramPreview
			title="Как ИИ меняет разработку игр"
			sources={sources}
			people={CAST.map((p) => ({ ...p, video: false }))}
			speakerId={speakerId}
		/>
	</div>
);

/** 03.15.16 — two people: no speaker frame below three. */
export const ProgramTwo: Story = {
	render: () => preview(["pavel", "olga"], "olga"),
};

/** 03.15.17 — three people: the last row is centred, the speaker framed. */
export const ProgramThree: Story = {
	render: () => preview(["pavel", "olga", "mark"], "olga"),
};

/** 03.15.18 — five people, 3 + 2. */
export const ProgramFive: Story = {
	render: () => preview(["pavel", "olga", "mark", "anna", "leo"], "olga"),
};

/** 03.15.19 — a shared screen takes the stage. */
export const ProgramScreenShare: Story = {
	render: () => preview([screenKey("leo"), "pavel", "olga", "mark"], "olga"),
};
