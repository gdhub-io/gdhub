export function urlBase64ToUint8Array(base64String: string) {
	if (typeof window === "undefined" && typeof Buffer !== "undefined") {
		return Uint8Array.from(Buffer.from(base64String, "base64"));
	}

	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = globalThis.atob
		? globalThis.atob(base64)
		: Buffer.from(base64, "base64").toString("binary");
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray;
}
