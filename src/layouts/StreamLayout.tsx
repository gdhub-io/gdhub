import { useEffect, useMemo, useState } from 'react'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'
import { DailyProvider } from '@daily-co/daily-react'
import { RecoilRoot } from 'recoil'

export const StreamLayout = ({ children }: any) => {
	const [callObject, setCallObject] = useState<DailyCall>()

	useEffect(() => {
		const co = DailyIframe.createCallObject()

		setCallObject(co)
	}, [])

	return (
		<RecoilRoot>
			<DailyProvider callObject={callObject}>{children}</DailyProvider>
		</RecoilRoot>
	)
}
