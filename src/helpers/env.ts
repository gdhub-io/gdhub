export function env<T = string>(
	key: keyof NodeJS.ProcessEnv,
	defaultValue?: T,
	warnDefault = false,
): T {
	const value = process.env[key] as T | undefined;
	if (!value) {
		if (typeof defaultValue !== "undefined") {
			if (warnDefault) {
				const message = `env is using a default value for ${key} and has this warning enabled.`;
				console.warn(new Error(message));
			}

			return defaultValue;
		} else {
			throw new Error(`${key} is not defined in environment variables`);
		}
	}

	return value;
}
