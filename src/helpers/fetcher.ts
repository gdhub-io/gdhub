export const fetcher = ({ url, data }: { url: string; data?: any }) =>
	fetch(url, {
		method: 'post',
		headers: { 'Content-Type': 'application/json' },
		body: data ? JSON.stringify(data) : undefined,
	}).then((res) => res.json())

export const fetherForMutation = (url: string, { arg }: { arg: any }) => fetcher({ url, data: arg })
