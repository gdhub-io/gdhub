import type { Meta, StoryObj } from "@storybook/nextjs";
import { IconUserSearch } from "@tabler/icons-react";
import { Button, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DirectionBadge } from "@/components/DirectionBadge";
import { StatusDot, type StatusTone } from "@/components/ui";
import { ModernTable } from "./index";

const { Text } = Typography;

/**
 * The table the product actually uses — thirteen screens render it, so what it
 * looks like here is what admin, team and devlog lists look like.
 *
 * It is a thin wrapper over antd's `<Table>`: horizontal scroll is always on and
 * every row gets a `table-row` class the stylesheet hangs on. Everything else is
 * `TableProps`, so the stories below vary the props real callers vary.
 */
type Applicant = {
	key: string;
	name: string;
	direction: string;
	rate: string;
	status: [StatusTone, string];
};

const rows: Applicant[] = [
	{
		key: "1",
		name: "Alex Whitfield",
		direction: "development",
		rate: "$12,480",
		status: ["success", "Hired"],
	},
	{
		key: "2",
		name: "Marta Ilves",
		direction: "2d art & animation",
		rate: "$8,200",
		status: ["info", "In review"],
	},
	{
		key: "3",
		name: "Ren Kowalski",
		direction: "technical art",
		rate: "$10,750",
		status: ["warning", "Offer sent"],
	},
	{
		key: "4",
		name: "Sofia Marchetti",
		direction: "game design",
		rate: "$9,300",
		status: ["danger", "Declined"],
	},
	{
		key: "5",
		name: "Tomas Berg",
		direction: "qa",
		rate: "$6,100",
		status: ["neutral", "Draft"],
	},
];

const columns: ColumnsType<Applicant> = [
	{
		title: "Name",
		dataIndex: "name",
		render: (value: string) => <Text strong>{value}</Text>,
	},
	{
		title: "Direction",
		dataIndex: "direction",
		render: (value: string) => <DirectionBadge name={value} />,
	},
	{
		title: "Rate",
		dataIndex: "rate",
		align: "right",
		render: (value: string) => (
			<span style={{ fontFeatureSettings: '"tnum"' }}>{value}</span>
		),
	},
	{
		title: "Status",
		dataIndex: "status",
		render: ([tone, label]: [StatusTone, string]) => (
			<StatusDot tone={tone} label={label} />
		),
	},
	{
		title: "",
		key: "actions",
		align: "right",
		render: () => <Button size="small">Open</Button>,
	},
];

const meta: Meta<typeof ModernTable<Applicant>> = {
	title: "Components/ModernTable",
	component: ModernTable,
	parameters: { layout: "padded" },
	args: { columns, dataSource: rows, pagination: false },
};

export default meta;

type Story = StoryObj<typeof ModernTable<Applicant>>;

/** How it reads on an admin or team screen: dots for state, tints for craft. */
export const Default: Story = {};

/**
 * `showHeader={false}` drops the column titles and switches the container class.
 * Used where the surrounding card already names the columns.
 */
export const WithoutHeader: Story = {
	args: { showHeader: false },
};

/**
 * The state a fresh project spends most of its time in. The fallback is
 * deliberately generic — a caller that knows its subject should pass
 * `emptyState` and say something useful instead.
 */
export const Empty: Story = {
	args: { dataSource: [] },
};

/** What an empty table should look like once the screen supplies its own copy. */
export const EmptyWithCopy: Story = {
	args: {
		dataSource: [],
		emptyState: {
			icon: IconUserSearch,
			title: "No applicants yet",
			description: "People who apply to this vacancy will show up here.",
			action: <Button type="primary">Share the vacancy</Button>,
		},
	},
};

/** A refetch: the rows stay, under antd's spinner. */
export const Loading: Story = {
	args: { loading: true },
};

/** The first load: no rows yet, so the columns are drawn as bars. */
export const FirstLoad: Story = {
	args: { loading: true, dataSource: undefined },
};

/** Paged tables are the norm on admin screens, so check the footer sits right. */
/** `DS · 11 Tables`, "On the page": outlined, with the paging outside. */
export const OnPage: Story = {
	args: { surface: "page", pagination: { pageSize: 3, total: 12, current: 1 } },
};

export const Paginated: Story = {
	args: { pagination: { pageSize: 3, total: 12, current: 1 } },
};
