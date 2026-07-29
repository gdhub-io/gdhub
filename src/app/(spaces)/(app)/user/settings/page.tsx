import { redirect } from "next/navigation";

export default function SettingsIndexPage() {
	redirect("/user/settings/general");
}
