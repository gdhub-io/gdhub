import { Suspense } from "react";
import { AiCuratorLab } from "@/components/AiCuratorLab";

/** The case is read from the address (`?lang=ru&call=…&situation=…`). */
export default function DevAiCuratorPage() {
	return (
		<Suspense>
			<AiCuratorLab />
		</Suspense>
	);
}
