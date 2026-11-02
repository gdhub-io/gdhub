import axios from "axios";
import { openPaddleTransaction } from "@/services/paddle";

/** Where Paddle sends the author back: the vacancies page, told which fee to check. */
export const listingFeeReturnUrl = (projectSlug: string, vacancyId: string) =>
	`${window.location.origin}/user/project/${projectSlug}/open-positions?${new URLSearchParams({ feePaid: vacancyId })}`;

/**
 * Opens Paddle's overlay on the transaction the server made for the vacancy's
 * listing fee. False when there is nothing to pay: no price configured, or the
 * fee turned out to be paid already.
 */
export async function payListingFee(options: {
	vacancyId: string;
	projectSlug: string;
	customerEmail?: string;
}) {
	const { data } = await axios.post<{ transactionId: string | null }>(
		"/api/user/project/vacancy/payment/checkout",
		{ vacancyId: options.vacancyId },
	);
	if (!data.transactionId) return false;

	await openPaddleTransaction({
		transactionId: data.transactionId,
		successUrl: listingFeeReturnUrl(options.projectSlug, options.vacancyId),
		customerEmail: options.customerEmail,
	});
	return true;
}

/** Back from Paddle: whether the fee is paid now, the vacancy published. */
export const reconcileListingFee = async (vacancyId: string) =>
	(
		await axios.post<{ paid: boolean }>(
			"/api/user/project/vacancy/payment/reconcile",
			{ vacancyId },
		)
	).data.paid;
