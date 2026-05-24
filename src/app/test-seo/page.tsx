import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
	return { title: "Home Page Title" };
}

export default function TestSeoPage() {
	return <p>Simple Usage</p>;
}
