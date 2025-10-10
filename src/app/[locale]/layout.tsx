import Providers from "../providers";

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
	return <Providers>{children}</Providers>;
}

export function generateStaticParams() {
	return [{ locale: "en" }, { locale: "ru" }];
}
