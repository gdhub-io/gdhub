export const abbrName = (name: string) => {
	const words = name?.split(' ')

	if (words?.length >= 2) {
		return words[0][0] + words[1][0]
	}

	return name
}

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
