"use client";

import { IconSelector } from "@tabler/icons-react";
import { Dropdown } from "antd";
import { type ReactNode, useState } from "react";
import { SpaceSwitcherMenu } from "./SpaceSwitcherMenu";
import styles from "./style.module.scss";
import type { CurrentSpace } from "./types";

/** A chip that opens the space switcher — the last crumb, or the hub's name. */
export function SpaceSwitcher({
	current,
	children,
}: {
	current?: CurrentSpace;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Dropdown
			open={open}
			onOpenChange={setOpen}
			trigger={["click"]}
			placement="bottomLeft"
			popupRender={() => (
				<SpaceSwitcherMenu
					current={current}
					onNavigate={() => setOpen(false)}
				/>
			)}
		>
			<button
				type="button"
				className={styles.current}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-current="page"
			>
				{children}
				<IconSelector size={15} className={styles.chevron} />
			</button>
		</Dropdown>
	);
}
