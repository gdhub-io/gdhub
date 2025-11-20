"use client";

import { useEffect, useState } from "react";
import { getMatrixDeviceId } from "@/helpers/matrix-device";

export function useMatrixDeviceId() {
	const [deviceId, setDeviceId] = useState<string | undefined>(() => {
		if (typeof window === "undefined") return undefined;
		return getMatrixDeviceId();
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		setDeviceId(getMatrixDeviceId());
	}, []);

	return deviceId;
}
