/** Free-text values as antd `Select` options, where the label is the value. */
export const toOptions = (values?: string[]) =>
	(values ?? []).map((value) => ({ label: value, value }));
