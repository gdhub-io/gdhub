"use client";

import type { MenuProps } from "antd";
import { usePathname } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { SpaceTrailConfig } from "@/components/layouts/SpaceTrail/types";

/**
 * The parts of the global app header a space (project, event, admin, …) can
 * replace with its own: the trail after the logo and the top navigation.
 * Everything else in the header stays the same everywhere.
 */
export type SpaceHeaderConfig = {
	/**
	 * Described rather than rendered: the header decides how a crumb looks, and
	 * a space only knows where it sits and what it is called. Passing finished
	 * antd items meant every space owned a copy of the styling.
	 */
	trail?: SpaceTrailConfig;
	menuItems?: MenuProps["items"];
	menuSelectedKeys?: string[];
	/**
	 * A focused flow (buying a checkpoint): the way out replaces the header's
	 * actions and the navigation is dropped, so the only exit is this one.
	 */
	exit?: ReactNode;
	/** The space's root path: the header stays while the path is under it. */
	scope?: string;
};

type SetSpaceHeader = (config: SpaceHeaderConfig | null) => void;

const SpaceHeaderContext = createContext<SpaceHeaderConfig | null>(null);
// Apart from the config, so publishing a header does not re-render every publisher.
const SetSpaceHeaderContext = createContext<SetSpaceHeader | null>(null);

/**
 * Lets nested spaces configure the single header rendered by ProtectedShell —
 * they sit below it in the tree, so the configuration travels up through this
 * context instead of being passed as props.
 */
export function SpaceHeaderProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<SpaceHeaderConfig | null>(null);
	const pathname = usePathname() ?? "";

	// A scoped header outlives its page: while the next tab of the same space
	// loads, the tabs stay put instead of dropping to the default navigation.
	const visible = useMemo(
		() => headerForPath(config, pathname),
		[config, pathname],
	);

	return (
		<SetSpaceHeaderContext.Provider value={setConfig}>
			<SpaceHeaderContext.Provider value={visible}>
				{children}
			</SpaceHeaderContext.Provider>
		</SetSpaceHeaderContext.Provider>
	);
}

/** The header to keep at `pathname`: a scoped one only while the path is under its scope. */
export function headerForPath(
	config: SpaceHeaderConfig | null,
	pathname: string,
): SpaceHeaderConfig | null {
	if (!config?.scope) return config;

	return pathname === config.scope || pathname.startsWith(`${config.scope}/`)
		? config
		: null;
}

/** Header config of the current space; `null` on ordinary app pages. */
export function useSpaceHeader(): SpaceHeaderConfig | null {
	return useContext(SpaceHeaderContext);
}

/**
 * Publish this space's breadcrumbs and top navigation to the app header. The
 * header falls back to the default app navigation once the space unmounts (or,
 * with a `scope`, once the path leaves it), so callers must memoise `config`
 * to avoid re-publishing on every render.
 */
export function useSetSpaceHeader(config: SpaceHeaderConfig): void {
	const setConfig = useContext(SetSpaceHeaderContext);

	useEffect(() => {
		if (!setConfig) return;

		setConfig(config);
		if (!config.scope) return () => setConfig(null);
	}, [setConfig, config]);
}
