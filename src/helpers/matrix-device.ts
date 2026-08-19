import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "matrix_device_id";

function generateDeviceId() {
	if (typeof window !== "undefined" && window.crypto?.randomUUID) {
		return `web_${window.crypto.randomUUID()}`;
	}

	return `web_${uuidv4()}`;
}

export function getMatrixDeviceId() {
	if (typeof window === "undefined") return undefined;

	let deviceId = window.localStorage.getItem(STORAGE_KEY);
	if (!deviceId) {
		deviceId = generateDeviceId();
		window.localStorage.setItem(STORAGE_KEY, deviceId);
	}

	return deviceId;
}

/** Drop the device id so the next account on this browser gets its own. */
export function clearMatrixDeviceId() {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(STORAGE_KEY);
}
