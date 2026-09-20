"use client";

import { createContext, useContext } from "react";
import type { StartStep } from "./StartLayout";

export type PrepareNav = {
	/** Move to another question of the purchase. */
	go: (step: StartStep) => void;
	/** Leave the purchase entirely — the draft stays where it is. */
	exit: () => void;
};

const Context = createContext<PrepareNav | null>(null);

export const PrepareNavProvider = Context.Provider;

/**
 * How the five questions move between each other.
 *
 * They used to be five routes and pushed paths at each other. Now they are one
 * step of the checkpoint page, so the move is a query string — and the questions
 * themselves no longer know where they are hosted.
 */
export const usePrepareNav = () => {
	const nav = useContext(Context);

	if (!nav)
		throw new Error("A checkpoint question was rendered outside the panel");

	return nav;
};
