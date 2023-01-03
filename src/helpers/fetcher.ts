export const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)
