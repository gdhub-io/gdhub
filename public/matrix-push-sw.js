self.addEventListener("push", (event) => {
	let payload = {};
	try {
		payload = event.data?.json() || {};
	} catch {
		payload = { body: event.data?.text() };
	}

	const title = payload.title || payload.notification?.title || "GDHub Chat";
	const roomId = payload.notification?.room_id || payload.data?.room_id;
	const defaultChatUrl = roomId
		? `/hub?chat=1&roomId=${encodeURIComponent(roomId)}`
		: "/hub?chat=1";

	const options = {
		body:
			payload.body ||
			payload.notification?.body ||
			"You have a new message",
		icon: payload.icon || "/favicon.png",
		badge: payload.badge || "/favicon.png",
		data: {
			...(payload.data || {}),
			url: payload.data?.url || defaultChatUrl,
			roomId,
		},
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = event.notification?.data?.url || "/";

	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then(
			(clientList) => {
				for (const client of clientList) {
					if ("focus" in client) {
						if (client.url === targetUrl) {
							return client.focus();
						}
					}
				}
				if (clients.openWindow) {
					return clients.openWindow(targetUrl);
				}
			},
		),
	);
});

