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
 * The space's three sections. `planned` ones are designed and permissioned but
 * have no route yet — shown disabled rather than hidden, so the shape of the
 * space is honest about where the rest is going instead of growing tabs out of
 * nowhere later.
 */
const MENU_ITEMS: {
	key: string;
	permission: Permission;
	name: string;
	planned?: boolean;
}[] = [
	{
		key: "/advisor/requests",
		permission: "advisor.requests.view",
		name: "Requests",
	},
	{
		key: "/advisor/reviews",
		permission: "advisor.reviews.view",
		name: "Reviews",
		planned: true,
	},
	{
		key: "/advisor/settings",
		permission: "advisor.settings.view",
		name: "Settings",
		planned: true,
	},
];

const SHIPPED = MENU_ITEMS.filter((item) => !item.planned);

/** Advisor space chrome: the tabs and the trail. Entry is gated in the layout. */
export const AdvisorSpace = ({ children }: { children: ReactNode }) => {
	const pathname = usePathname() ?? "";
	const { can } = useAccess();
	const { t } = useTranslate();

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		const selected =
			SHIPPED.find((item) => pathname.startsWith(item.key)) ?? SHIPPED[0];

		return {
			trail: {
				parent: { href: SHIPPED[0].key, label: "Advisor" },
				current: { label: selected.name },
			},
			menuItems: MENU_ITEMS.filter((item) => can(item.permission)).map(
				({ key, name, planned }) =>
					planned
						? {
								key,
								disabled: true,
								label: (
									<Tooltip title={t("advisor.menu.planned", "Planned")}>
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

export default AdvisorSpace;
