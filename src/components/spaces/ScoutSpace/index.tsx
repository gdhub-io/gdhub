"use client";

import { useTranslate } from "@tolgee/react";
import { Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";
import type { Permission } from "@/config/spaces";

/**
 * The cabinet's sections. `planned` ones are designed and permissioned but have
 * no route yet: they are shown disabled rather than hidden, so the shape of the
 * cabinet is honest about where the rest is going instead of appearing to grow
 * tabs out of nowhere later.
 */
const MENU_ITEMS: {
	key: string;
	permission: Permission;
	name: string;
	planned?: boolean;
}[] = [
	{ key: "/scout/games", permission: "scout.games.view", name: "Games" },
	{
		key: "/scout/deals",
		permission: "scout.deals.view",
		name: "Deals",
		planned: true,
	},
	{
		key: "/scout/team",
		permission: "scout.team.view",
		name: "Team",
		planned: true,
	},
	{
		key: "/scout/settings",
		permission: "scout.settings.view",
		name: "Settings",
	},
];

const SHIPPED = MENU_ITEMS.filter((item) => !item.planned);

/** Scout cabinet chrome: the tabs and the trail. Entry is gated in the layout. */
export const ScoutSpace = ({ children }: { children: ReactNode }) => {
	const pathname = usePathname() ?? "";
	const { can } = useAccess();
	const { t } = useTranslate();

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		// Only shipped sections can be current: a planned key has no page behind
		// it, so matching one would name a crumb for a route that 404s.
		const selected =
			SHIPPED.find((item) => pathname.startsWith(item.key)) ?? SHIPPED[0];

		return {
			trail: {
				parent: { href: SHIPPED[0].key, label: "Scout" },
				current: { label: selected.name },
				space: { kind: "scout" },
			},
			menuItems: MENU_ITEMS.filter((item) => can(item.permission)).map(
				({ key, name, planned }) =>
					planned
						? {
								key,
								disabled: true,
								label: (
									<Tooltip title={t("scout.menu.planned", "Planned")}>
										<span>{name}</span>
									</Tooltip>
								),
							}
						: { key, label: <Link href={key}>{name}</Link> },
			),
			menuSelectedKeys: [selected.key],
		};
	}, [pathname, can, t]);

	useSetSpaceHeader(spaceHeader);

	return <>{children}</>;
};

export default ScoutSpace;
