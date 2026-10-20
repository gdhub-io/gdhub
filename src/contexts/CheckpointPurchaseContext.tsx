"use client";

import { createContext, useContext } from "react";

/** `CHECKPOINTS_PURCHASE_OPEN`, read on the server and handed to the client. */
const CheckpointPurchaseContext = createContext(false);

export const CheckpointPurchaseProvider = CheckpointPurchaseContext.Provider;

export const useCheckpointPurchaseOpen = () =>
	useContext(CheckpointPurchaseContext);
