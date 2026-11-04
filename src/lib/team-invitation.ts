/** Whether a team invitation is for this user: by account, or by the address it went to. */
export const invitationAddressedTo = (
	invitation: { email: string; userId: string | null },
	user: { id: string; email?: string | null },
) =>
	invitation.userId === user.id ||
	(!!user.email && invitation.email.toLowerCase() === user.email.toLowerCase());
