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

		// Pattern for unallocated shares
		const unallocatedPattern = defs
			.append('pattern')
			.attr('id', 'unallocated-pattern')
			.attr('patternUnits', 'userSpaceOnUse')
			.attr('width', 4)
			.attr('height', 4)
			.attr('patternTransform', 'rotate(45)')

		// Add stripes to the pattern
		unallocatedPattern.append('rect').attr('width', 4).attr('height', 4).attr('fill', 'rgba(158, 158, 158, 0.3)')
		unallocatedPattern
			.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', 4)
			.attr('stroke', 'rgba(250, 250, 250, 1)')
			.attr('stroke-width', 4)

		// Add promised pattern
		const promisedPattern = defs
			.append('pattern')
			.attr('id', 'promised-pattern')
			.attr('patternUnits', 'userSpaceOnUse')
			.attr('width', 4)
			.attr('height', 4)
			.attr('patternTransform', 'rotate(45)')

		promisedPattern.append('rect').attr('width', 4).attr('height', 4).attr('fill', 'rgba(89, 202, 158, 1)')
		promisedPattern
			.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', 4)
			.attr('stroke', 'rgba(200, 200, 200, 0.6)')
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
		data.push({ category: 'Investment Reserve', value: investmentReserve, color: '#4f7487', type: 'system' })

		// Split team shares into vested and promised
		const vestedShares = teamShares.filter((share) => share.vested)
		const promisedShares = teamShares.filter((share) => !share.vested)

		const vestedTotal = vestedShares.reduce((sum, share) => sum + share.percentage, 0)
		const promisedTotal = promisedShares.reduce((sum, share) => sum + share.percentage, 0)

		// Add vested team shares
		if (vestedTotal > 0) {
			data.push({
				category: 'Team Vested',
				value: vestedTotal,
				color: 'rgb(72, 166, 130)',
				type: 'team',
				vested: true,
			})
		}

		// Add promised team shares
		if (promisedTotal > 0) {
			data.push({
				category: 'Team Promised',
				value: promisedTotal,
				color: 'url(#promised-pattern)',
				type: 'team',
				vested: false,
			})
		}

		// Calculate unallocated shares
		const allocatedShares =
			platformShare + mentorFundShare + investmentReserve + teamShares.reduce((sum, share) => sum + share.percentage, 0)

		// Unused shares - the most free, which can be distributed
		if (100 - allocatedShares > 0) {
			data.push({
				category: 'Unallocated',
				value: 100 - allocatedShares,
				color: 'url(#unallocated-pattern)',
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
						if (d.type === 'team') {
							return `${d.category}: ${d.value.toFixed(1)}% (${d.vested ? 'vested' : 'promised'})`
						}
						return `${d.category}: ${d.value.toFixed(1)}%`
					},
					sort: null, // Keep the original order
					inset: 0,
					stroke: null,
					strokeWidth: 0,
					dx: 0,
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
						text: (d: DataItem) => {
							if (d.type === 'team') {
								if (d.value > 10) {
									return d.vested ? `Vested ${d.value.toFixed(1)}%` : `Promised ${d.value.toFixed(1)}%`
								}
								return !d.vested ? `${d.value.toFixed(1)}%` : ''
							}
							return `${d.value > 10 ? d.category : ''} ${d.value.toFixed(1)}%`
						},
						fill: (d: DataItem) => {
							if (d.type === 'unallocated') return 'black'
							return 'white'
						},
						fontWeight: 'bold',
						fontSize: 12,
						textAnchor: 'middle',
					}
				),
			],
		})

		// После создания графика находим все элементы и устраняем между ними зазоры
		const svgElement = chart.querySelector('svg')
		if (svgElement) {
			// Добавляем стиль, чтобы убрать все возможные зазоры между элементами
			const styleElement = document.createElement('style')
			styleElement.textContent = `
				svg rect { 
					stroke: none !important; 
					stroke-width: 0 !important; 
					shape-rendering: crispEdges;
				}
				svg g > rect + rect {
					margin-left: -1px; /* Negative margin to overlap bars */
				}
			`
			svgElement.appendChild(styleElement)
		}

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
			// firstBar.setAttribute(
			// 	'style',
			// 	`clip-path: path('M6,0 H${firstBarWidth} V${firstBarHeight} H6 Q0,${firstBarHeight} 0,${firstBarHeight - 6} V6 Q0,0 6,0 Z');`
			// )

			// Round only the right corners of the last element
			const lastBarWidth = parseFloat(lastBar.getAttribute('width') || '0')
			const lastBarHeight = parseFloat(lastBar.getAttribute('height') || '0')

			// Create a path for rounding the right side of the last element
			// lastBar.setAttribute(
			// 	'style',
			// 	`clip-path: path('M0,0 H${lastBarWidth - 6} Q${lastBarWidth},0 ${lastBarWidth},6 V${lastBarHeight - 6} Q${lastBarWidth},${lastBarHeight} ${lastBarWidth - 6},${lastBarHeight} H0 V0 Z');`
			// )

			// Remove borders between elements
			barElements.forEach((bar, index) => {
				// Apply a small offset to each element except the first one,
				// to ensure they slightly overlap and there are no gaps
				if (index > 0) {
					const currentX = parseFloat(bar.getAttribute('x') || '0')
					bar.setAttribute('x', `${currentX - 0.5}`)

					// Increase the width of each element by 1px to ensure overlap
					const currentWidth = parseFloat(bar.getAttribute('width') || '0')
					bar.setAttribute('width', `${currentWidth + 1}`)
				}
			})
		}

		// Add tooltips for small segments
		barElements.forEach((bar, index) => {
			if (index < data.length) {
				const barData = data[index]
				if (barData.value < 5) {
					// Create a tooltip element
					let tooltipText = `${barData.category}: ${barData.value.toFixed(1)}%`
					if (barData.type === 'team') {
						tooltipText += ` (${barData.vested ? 'vested' : 'promised'})`
					}

					bar.setAttribute('data-tooltip', tooltipText)
					bar.setAttribute('class', styles.tooltipTrigger)
					// Add an event listener for showing/hiding the tooltip
					bar.addEventListener('mouseenter', (e) => {
						const tooltip = document.createElement('div')
						tooltip.className = styles.tooltip
						tooltip.textContent = tooltipText

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
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4f7487' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Investment Reserve</span>
					</div>

					{/* Team Vested shares */}
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div
							style={{
								width: 8,
								height: 8,
								borderRadius: '50%',
								background: 'rgb(72, 166, 130)',
							}}
						/>
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Team (vested)</span>
					</div>

					{/* Team Promised shares */}
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<svg width="8" height="8">
							<circle cx="4" cy="4" r="4" fill="url(#promised-pattern)" />
						</svg>
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Team (promised)</span>
					</div>

					{100 -
						platformShare -
						mentorFundShare -
						investmentReserve -
						teamShares.reduce((sum, share) => sum + share.percentage, 0) >
						0 && (
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<svg width="8" height="8">
								<circle cx="4" cy="4" r="4" fill="url(#unallocated-pattern)" />
							</svg>
							<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Unallocated</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default EquityPlot
