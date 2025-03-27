import React from 'react'
import EquityPlot, { getMockTeamShares } from './EquityPlot'

const EquityPlotDemo: React.FC = () => {
	// Mock data for testing
	const platformShare = 5
	const mentorFundShare = 10
	const investmentReserve = 15
	const teamShares = getMockTeamShares()

	return (
		<div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
			<h2>Equity Distribution Demo</h2>
			<p>This demo shows vested (striped) and promised (solid) team shares in the equity plot</p>
			<EquityPlot
				platformShare={platformShare}
				mentorFundShare={mentorFundShare}
				investmentReserve={investmentReserve}
				teamShares={teamShares}
			/>

			<div style={{ marginTop: '20px' }}>
				<h3>Team Shares:</h3>
				<ul>
					{teamShares.map((share) => (
						<li key={share.memberId}>
							{share.name}: {share.percentage}% ({share.vested ? 'vested' : 'promised'})
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}

export default EquityPlotDemo
