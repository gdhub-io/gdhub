"use client";

import { Flex, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { chatDeepLinkFromHash } from "@/lib/chat/deep-link";

/**
 * Landing page for the links in Synapse's "you have missed messages" emails —
 * see `email.client_base_url` on the homeserver. Nothing renders for long: the
 * room id sits in the URL fragment, so the browser reads it and moves on to
 * the chat drawer.
 */
export default function ChatRedirectPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace(chatDeepLinkFromHash(window.location.hash));
	}, [router]);

	return (
		<Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
			<Spin size="large" />
		</Flex>
	);
}
