'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  type ChartArea,
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler)

function gradient(ctx: CanvasRenderingContext2D, area: ChartArea) {
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom)
  g.addColorStop(0, 'rgba(14,165,233,0.35)')
  g.addColorStop(1, 'rgba(14,165,233,0)')
  return g
}

export default function RevenueChart() {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        data: [38, 55, 47, 72, 64, 90, 112],
        borderColor: '#0ea5e9',
        borderWidth: 2.5,
        tension: 0.45,
        pointRadius: 0,
        fill: true,
        backgroundColor: (c: { chart: ChartJS }) => {
          const { ctx, chartArea } = c.chart
          if (!chartArea) return 'rgba(14,165,233,0.2)'
          return gradient(ctx, chartArea)
        },
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false, min: 0 } },
    elements: { line: { capBezierPoints: true } },
  }

  return (
    <div className="hp-chart h-32 w-full">
      <Line data={data} options={options} />
    </div>
  )
}
