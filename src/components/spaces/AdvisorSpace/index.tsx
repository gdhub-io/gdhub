"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";
import { NavLink } from "@/components/ui";
import type { Permission } from "@/config/spaces";

const MENU_ITEMS: {
	key: string;
	permission: Permission;
	name: string;
}[] = [
	{
		key: "/advisor/requests",
		permission: "advisor.requests.view",
		name: "Requests",
	},
	{
		key: "/advisor/checkpoints",
		permission: "advisor.checkpoints.view",
		name: "Checkpoints",
	},
	{
		key: "/advisor/calendar",
		permission: "advisor.calendar.view",
		name: "Calendar",
	},
	{
		key: "/advisor/earnings",
		permission: "advisor.checkpoints.view",
		name: "Earnings",
	},
	{
		key: "/advisor/settings",
		permission: "advisor.settings.view",
		name: "Settings",
	},
];

/** Advisor space chrome: the tabs and the trail. Entry is gated in the layout. */
export const AdvisorSpace = ({ children }: { children: ReactNode }) => {
	const pathname = usePathname() ?? "";
	const { can } = useAccess();

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		const selected =
			MENU_ITEMS.find((item) => pathname.startsWith(item.key)) ?? MENU_ITEMS[0];

		return {
			scope: "/advisor",
			trail: {
				parent: { href: MENU_ITEMS[0].key, label: "Advisor" },
				current: { label: selected.name },
				space: { kind: "advisor" },
			},
			menuItems: MENU_ITEMS.filter((item) => can(item.permission)).map(
				({ key, name }) => ({
					key,
					label: (
						<NavLink href={key} prefetch>
							{name}
						</NavLink>
					),
				}),
			),
			menuSelectedKeys: [selected.key],
		};
	}, [pathname, can]);

	useSetSpaceHeader(spaceHeader);

	return <>{children}</>;
};

export default AdvisorSpace;
