"use client";

import type { BreadcrumbProps, MenuProps } from "antd";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

/**
 * The parts of the global app header a space (project, event, admin, …) can
 * replace with its own: the breadcrumbs after the logo and the top navigation.
 * Everything else in the header stays the same everywhere.
 */
export type SpaceHeaderConfig = {
	breadcrumbItems?: NonNullable<BreadcrumbProps["items"]>;
	menuItems?: MenuProps["items"];
	menuSelectedKeys?: string[];
};

type SpaceHeaderStore = {
	config: SpaceHeaderConfig | null;
	setConfig: (config: SpaceHeaderConfig | null) => void;
};

const SpaceHeaderContext = createContext<SpaceHeaderStore | null>(null);

/**
 * Lets nested spaces configure the single header rendered by ProtectedShell —
 * they sit below it in the tree, so the configuration travels up through this
 * context instead of being passed as props.
 */
export function SpaceHeaderProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<SpaceHeaderConfig | null>(null);
	const store = useMemo(() => ({ config, setConfig }), [config]);

	return (
		<SpaceHeaderContext.Provider value={store}>
			{children}
		</SpaceHeaderContext.Provider>
	);
}

/** Header config of the current space; `null` on ordinary app pages. */
export function useSpaceHeader(): SpaceHeaderConfig | null {
	return useContext(SpaceHeaderContext)?.config ?? null;
}

/**
 * Publish this space's breadcrumbs and top navigation to the app header. The
 * header falls back to the default app navigation once the space unmounts, so
 * callers must memoise `config` to avoid re-publishing on every render.
 */
export function useSetSpaceHeader(config: SpaceHeaderConfig): void {
	const setConfig = useContext(SpaceHeaderContext)?.setConfig;

	useEffect(() => {
		if (!setConfig) return;

		setConfig(config);
		return () => setConfig(null);
	}, [setConfig, config]);
}
