export function getDeviceDisplayName(userAgent?: string) {
	if (typeof navigator !== "undefined") {
		return navigator.userAgent;
	}

	return userAgent || "Unknown device";
}
