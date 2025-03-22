import React, { useEffect, useRef, useState } from 'react'
import * as Plot from '@observablehq/plot'
import * as d3 from 'd3'
import styles from './EquityPlot.module.scss'

interface EquityShare {
	memberId: string
	percentage: number
	isFixed: boolean
	vested: boolean
	name?: string
	userId?: string
	promises?: any[]
}

interface EquityPlotProps {
	platformShare: number
	mentorFundShare: number
	investmentReserve: number
	teamShares: EquityShare[]
	teamMembers?: any[]
}

interface DataItem {
	category: string
	value: number
	color: string
	vested?: boolean
	type?: string
	original?: EquityShare
}

const EquityPlot: React.FC<EquityPlotProps> = ({ platformShare, mentorFundShare, investmentReserve, teamShares }) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const [chartWidth, setChartWidth] = useState<number>(0)

	// Function for rendering the chart
	const renderChart = () => {
		if (!containerRef.current) return

		// Get the current width of the container
		const currentWidth = containerRef.current.clientWidth
		setChartWidth(currentWidth)

		// Clear the container before creating a new graph
		if (containerRef.current) {
			containerRef.current.innerHTML = ''
		}

		// Create SVG pattern for the unallocated section
		const svg = d3.create('svg').attr('width', 0).attr('height', 0).style('position', 'absolute')

		// Define the pattern
		const defs = svg.append('defs')
		const pattern = defs
			.append('pattern')
			.attr('id', 'unallocated-pattern')
			.attr('patternUnits', 'userSpaceOnUse')
			.attr('width', 5)
			.attr('height', 5)
			.attr('patternTransform', 'rotate(45)')

		// Add stripes to the pattern
		pattern.append('rect').attr('width', 5).attr('height', 5).attr('fill', 'rgba(158, 158, 158, 0.3)') // Base color for unallocated

		pattern
			.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', 5)
			.attr('stroke', 'rgba(250, 250, 250, 1)')
			.attr('stroke-width', 4)

		// Append the SVG to the body to make the pattern available
		document.body.appendChild(svg.node()!)

		// Convert data to a format suitable for Plot
		const data: DataItem[] = []

		// Platform - fixed share that the author cannot change - gray and less saturated
		data.push({ category: 'Platform', value: platformShare, color: '#9E9E9E', type: 'system' })
		// Mentors - can only change the total share, has a minimum - limited ability to change
		data.push({ category: 'Mentor Fund', value: mentorFundShare, color: '#78909C', type: 'system' })
		// Investment Reserve - more flexible, but also a system constraint
		data.push({ category: 'Investment Reserve', value: investmentReserve, color: '#5C6BC0', type: 'system' })

		// Add team shares - more flexible, but depend on the overall picture
		data.push({
			category: 'Team Member',
			value: teamShares.map((m) => m.percentage).reduce((sum, share) => sum + share, 0),
			color: '#3949AB', // More saturated for issued shares, less for promised
			type: 'team',
		})

		// Calculate unallocated shares
		const allocatedShares =
			platformShare + mentorFundShare + investmentReserve + teamShares.reduce((sum, share) => sum + share.percentage, 0)

		// Unused shares - the most free, which can be distributed
		if (100 - allocatedShares > 0) {
			data.push({
				category: 'Unallocated',
				value: 100 - allocatedShares,
				color: 'url(#unallocated-pattern)', // Use the pattern for unallocated shares
				type: 'unallocated',
			})
		}

		// Create a graph using Plot
		const chart = Plot.plot({
			width: currentWidth,
			height: 60,
			margin: 0,
			style: {
				backgroundColor: 'transparent',
				overflow: 'visible',
				borderRadius: '6px',
			},
			x: {
				axis: null, // Remove the X axis
			},
			y: {
				axis: null, // Remove the Y axis
			},
			color: {
				// Remove the border around the legend
				legend: false,
			},
			// Remove the border around the graph
			grid: false,
			marks: [
				// Main bars
				Plot.barX(data, {
					y: 0,
					x: 'value',
					fill: (d: DataItem) => d.color,
					title: (d: DataItem) => {
						const vestedStatus = d.type === 'team' && d.original ? (d.original.vested ? 'vested' : 'promised') : ''
						return `${d.category}: ${d.value.toFixed(1)}% ${vestedStatus}`
					},
					sort: null, // Keep the original order
					inset: 0,
					// Remove the border of the elements
					stroke: null,
				}),
				// Text with percentages for large segments
				Plot.text(
					data.filter((d) => d.value >= 5),
					{
						y: 0,
						x: (d: DataItem) => {
							// Find the position of the center for each segment
							const index = data.indexOf(d)
							const prevSum = data.slice(0, index).reduce((sum, item) => sum + item.value, 0)
							return prevSum + d.value / 2
						},
						text: (d: DataItem) => `${d.value > 10 ? d.category : ''} ${d.value.toFixed(1)}%`,
						fill: (d: DataItem) => (d.type === 'unallocated' ? 'black' : 'white'),
						fontWeight: 'bold',
						fontSize: 12,
						textAnchor: 'middle',
					}
				),
			],
		})

		// Add border-radius for the graph elements after rendering
		const barElements = chart.querySelectorAll('rect')
		if (barElements.length > 0) {
			// Determine the first and last elements for rounding the corners
			const firstBar = barElements[0]
			const lastBar = barElements[barElements.length - 1]
			// Round only the left corners of the first element using SVG path
			// SVG does not support rounding individual corners, so we use clip-path
			const firstBarWidth = parseFloat(firstBar.getAttribute('width') || '0')
			const firstBarHeight = parseFloat(firstBar.getAttribute('height') || '0')
			// Create a path for rounding the left side of the first element
			firstBar.setAttribute(
				'style',
				`clip-path: path('M6,0 H${firstBarWidth} V${firstBarHeight} H6 Q0,${firstBarHeight} 0,${firstBarHeight - 6} V6 Q0,0 6,0 Z');`
			)
			// Round only the right corners of the last element
			const lastBarWidth = parseFloat(lastBar.getAttribute('width') || '0')
			const lastBarHeight = parseFloat(lastBar.getAttribute('height') || '0')
			const lastBarX = parseFloat(lastBar.getAttribute('x') || '0')
			// Create a path for rounding the right side of the last element
			lastBar.setAttribute(
				'style',
				`clip-path: path('M0,0 H${lastBarWidth - 6} Q${lastBarWidth},0 ${lastBarWidth},6 V${lastBarHeight - 6} Q${lastBarWidth},${lastBarHeight} ${lastBarWidth - 6},${lastBarHeight} H0 V0 Z');`
			)
		}

		// Add tooltips for small segments
		barElements.forEach((bar, index) => {
			if (index < data.length) {
				const barData = data[index]
				if (barData.value < 5) {
					// Create a tooltip element
					bar.setAttribute('data-tooltip', `${barData.category}: ${barData.value.toFixed(1)}%`)
					bar.setAttribute('class', styles.tooltipTrigger || 'tooltip-trigger')
					// Add an event listener for showing/hiding the tooltip
					bar.addEventListener('mouseenter', (e) => {
						const tooltip = document.createElement('div')
						tooltip.className = styles.tooltip
						tooltip.textContent = `${barData.category}: ${barData.value.toFixed(1)}%`

						// Position the tooltip above the segment
						const rect = bar.getBoundingClientRect()
						tooltip.style.top = `${rect.top - 30}px`
						tooltip.style.left = `${rect.left + rect.width / 2}px`

						document.body.appendChild(tooltip)

						bar.addEventListener(
							'mouseleave',
							() => {
								document.body.removeChild(tooltip)
							},
							{ once: true }
						)
					})
				}
			}
		})

		// Clear the container and add a new graph
		if (containerRef.current) {
			containerRef.current.appendChild(chart)
		}
	}

	// Effect for initial rendering and when data changes
	useEffect(() => {
		renderChart()

		// Create a ResizeObserver to track changes in the container size
		const resizeObserver = new ResizeObserver(() => {
			if (containerRef.current && containerRef.current.clientWidth !== chartWidth) {
				renderChart()
			}
		})

		// Observe the container
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current)
		}

		// Cleanup when unmounting
		return () => {
			if (containerRef.current) {
				containerRef.current.innerHTML = ''
				resizeObserver.disconnect()
			}
		}
	}, [platformShare, mentorFundShare, investmentReserve, teamShares])

	return (
		<div>
			<div
				ref={containerRef}
				className={styles.equityBarContainer}
				style={{
					background: 'transparent',
					marginTop: 0,
					marginBottom: 0,
					borderRadius: '6px',
					overflow: 'hidden',
				}}
			></div>
			<div style={{ marginTop: 4 }}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9E9E9E' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
							Platform: {platformShare}%
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#78909C' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Mentors</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#5C6BC0' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Investment Reserve</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3949AB' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Team</span>
					</div>
					{100 -
						platformShare -
						mentorFundShare -
						investmentReserve -
						teamShares.reduce((sum, share) => sum + share.percentage, 0) >
						0 && (
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'rgba(158, 158, 158, 0.3)' }} />
							<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Unallocated</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default EquityPlot
