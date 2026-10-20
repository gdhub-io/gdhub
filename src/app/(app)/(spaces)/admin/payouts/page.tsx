import { createPermissionGate } from "@/lib/space-gate";
import { PayoutsPage } from "./PayoutsPage";

// The admin space lets every staff member in; this page needs the checkpoints view on top.
const Gate = createPermissionGate("admin.payouts.view");

export default function AdminPayoutsPage() {
	return (
		<Gate>
			<PayoutsPage />
		</Gate>
	);
}
