import React, { useEffect, useRef } from 'react'
import styles from '@/components/modals/EquityShareModal/styles.module.scss'
import * as Plot from '@observablehq/plot'

interface EquityShare {
	memberId: string
	percentage: number
	isFixed: boolean
	vested: boolean
	name?: string
}

interface EquityPlotProps {
	platformShare: number
	mentorFundShare: number
	investmentReserve: number
	teamShares: EquityShare[]
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

	useEffect(() => {
		if (!containerRef.current) return

		// Преобразуем данные в формат, подходящий для Plot
		const data: DataItem[] = []

		// Платформа - фиксированная доля, которую автор не может менять - серая и менее насыщенная
		data.push({ category: 'Platform', value: platformShare, color: '#9E9E9E', type: 'system' })
		// Менторы - можно менять только общую долю, есть минимум - ограниченная возможность изменения
		data.push({ category: 'Mentor Fund', value: mentorFundShare, color: '#78909C', type: 'system' })
		// Инвестиционный резерв - более гибкий, но тоже системное ограничение
		data.push({ category: 'Investment Reserve', value: investmentReserve, color: '#5C6BC0', type: 'system' })

		// Добавляем доли команды - более гибкие, но зависят от общей картины
		teamShares.forEach((share) => {
			data.push({
				category: share.name || 'Team Member',
				value: share.percentage,
				color: share.vested ? '#3949AB' : '#7986CB', // Более насыщенный для выданных долей, менее для обещанных
				vested: share.vested,
				type: 'team',
				original: share,
			})
		})

		// Рассчитываем нераспределенные доли
		const allocatedShares =
			platformShare + mentorFundShare + investmentReserve + teamShares.reduce((sum, share) => sum + share.percentage, 0)

		// Неиспользуемые доли - самые свободные, которые можно распределять
		if (100 - allocatedShares > 0) {
			data.push({
				category: 'Unallocated',
				value: 100 - allocatedShares,
				color: '#42A5F5', // Яркий синий для неиспользуемых долей - самых свободных
				type: 'unallocated',
			})
		}

		// Создаем график с помощью Plot
		const chart = Plot.plot({
			width: containerRef.current.clientWidth,
			height: 80,
			margin: 0,
			style: {
				backgroundColor: 'transparent',
				overflow: 'visible',
				borderRadius: '6px',
			},
			x: {
				axis: null, // Убираем ось X
			},
			y: {
				axis: null, // Убираем ось Y
			},
			color: {
				// Убираем рамку вокруг легенды
				legend: false,
			},
			// Убираем рамку вокруг графика
			grid: false,
			marks: [
				// Основные бары
				Plot.barX(data, {
					y: 0,
					x: 'value',
					fill: (d: DataItem) => d.color,
					title: (d: DataItem) => {
						const vestedStatus = d.type === 'team' && d.original ? (d.original.vested ? 'vested' : 'promised') : ''
						return `${d.category}: ${d.value.toFixed(1)}% ${vestedStatus}`
					},
					sort: null, // Сохраняем исходный порядок
					inset: 0,
					// Убираем границу элементов
					stroke: null,
				}),
				// Текст с процентами для больших сегментов
				Plot.text(
					data.filter((d) => d.value >= 5),
					{
						y: 0,
						x: (d: DataItem) => {
							// Найдем позицию центра для каждого сегмента
							const index = data.indexOf(d)
							const prevSum = data.slice(0, index).reduce((sum, item) => sum + item.value, 0)
							return prevSum + d.value / 2
						},
						text: (d: DataItem) => `${d.value.toFixed(1)}%`,
						fill: 'white',
						fontWeight: 'bold',
						fontSize: 12,
						textAnchor: 'middle',
						dy: 3,
					}
				),
				// Добавляем метки категорий для Team и Unallocated
				Plot.text(
					data.filter((d) => (d.type === 'team' || d.type === 'unallocated') && d.value >= 10),
					{
						y: 0,
						x: (d: DataItem) => {
							// Найдем позицию центра для каждого сегмента
							const index = data.indexOf(d)
							const prevSum = data.slice(0, index).reduce((sum, item) => sum + item.value, 0)
							return prevSum + d.value / 2
						},
						text: (d: DataItem) => (d.type === 'team' ? 'Team' : d.category),
						fill: 'white',
						fontWeight: 'bold',
						fontSize: 10,
						textAnchor: 'middle',
						dy: -8,
					}
				),
			],
		})

		// Добавляем border-radius для элементов графика после рендеринга
		const barElements = chart.querySelectorAll('rect')
		if (barElements.length > 0) {
			// Определяем первый и последний элементы для скругления углов
			const firstBar = barElements[0]
			const lastBar = barElements[barElements.length - 1]
			// Скругляем только левые углы у первого элемента с помощью SVG path
			// SVG не поддерживает скругление отдельных углов, поэтому используем clip-path
			const firstBarWidth = parseFloat(firstBar.getAttribute('width') || '0')
			const firstBarHeight = parseFloat(firstBar.getAttribute('height') || '0')
			// Создаем путь для скругления левой стороны первого элемента
			firstBar.setAttribute(
				'style',
				`clip-path: path('M6,0 H${firstBarWidth} V${firstBarHeight} H6 Q0,${firstBarHeight} 0,${firstBarHeight - 6} V6 Q0,0 6,0 Z');`
			)
			// Скругляем только правые углы у последнего элемента
			const lastBarWidth = parseFloat(lastBar.getAttribute('width') || '0')
			const lastBarHeight = parseFloat(lastBar.getAttribute('height') || '0')
			const lastBarX = parseFloat(lastBar.getAttribute('x') || '0')
			// Создаем путь для скругления правой стороны последнего элемента
			lastBar.setAttribute(
				'style',
				`clip-path: path('M0,0 H${lastBarWidth - 6} Q${lastBarWidth},0 ${lastBarWidth},6 V${lastBarHeight - 6} Q${lastBarWidth},${lastBarHeight} ${lastBarWidth - 6},${lastBarHeight} H0 V0 Z');`
			)
		}

		// Добавляем всплывающие подсказки для маленьких сегментов
		barElements.forEach((bar, index) => {
			if (index < data.length) {
				const barData = data[index]
				if (barData.value < 5) {
					// Создаем элемент подсказки
					bar.setAttribute('data-tooltip', `${barData.category}: ${barData.value.toFixed(1)}%`)
					bar.setAttribute('class', styles.tooltipTrigger || 'tooltip-trigger')
					// Добавляем слушатель событий для показа/скрытия подсказки
					bar.addEventListener('mouseenter', (e) => {
						const tooltip = document.createElement('div')
						tooltip.className = styles.tooltip || 'tooltip'
						tooltip.textContent = `${barData.category}: ${barData.value.toFixed(1)}%`
						// Позиционируем подсказку над сегментом
						const rect = bar.getBoundingClientRect()
						tooltip.style.position = 'absolute'
						tooltip.style.top = `${rect.top - 30}px`
						tooltip.style.left = `${rect.left + rect.width / 2}px`
						tooltip.style.transform = 'translateX(-50%)'
						tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
						tooltip.style.color = 'white'
						tooltip.style.padding = '4px 8px'
						tooltip.style.borderRadius = '4px'
						tooltip.style.fontSize = '12px'
						tooltip.style.zIndex = '1000'
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

		// Очищаем контейнер и добавляем новый график
		containerRef.current.innerHTML = ''
		containerRef.current.appendChild(chart)

		// Очистка при размонтировании
		return () => {
			if (containerRef.current) {
				containerRef.current.innerHTML = ''
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
					borderRadius: '6px',
					overflow: 'hidden',
				}}
			></div>
			<div style={{ marginTop: 8 }}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9E9E9E' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
							Platform: {platformShare}%
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#78909C' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
							Mentors: {mentorFundShare}%
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#5C6BC0' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
							Investment Reserve: {investmentReserve}%
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3949AB' }} />
						<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
							Team: {teamShares.reduce((sum, share) => sum + share.percentage, 0)}%
						</span>
					</div>
					{100 -
						platformShare -
						mentorFundShare -
						investmentReserve -
						teamShares.reduce((sum, share) => sum + share.percentage, 0) >
						0 && (
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#42A5F5' }} />
							<span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
								Unallocated:{' '}
								{(
									100 -
									platformShare -
									mentorFundShare -
									investmentReserve -
									teamShares.reduce((sum, share) => sum + share.percentage, 0)
								).toFixed(1)}
								%
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default EquityPlot
