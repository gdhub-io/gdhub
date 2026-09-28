/** An hours range as it is read aloud: one figure when both ends agree. */
export const span = (range: { from: number; to: number }) =>
	range.from === range.to ? `${range.from}` : `${range.from}–${range.to}`;
