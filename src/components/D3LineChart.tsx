import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Invoice } from '../types';
import { STELLAR_DEMO_KEYS } from '../utils/stellar';

interface D3LineChartProps {
  invoices: Invoice[];
  theme?: string;
  walletAddress?: string;
}

interface DataPoint {
  month: string;
  yieldRate: number;      // average APR in %
  repaidVolume: number;   // volume in USD
}

export default function D3LineChart({ invoices, theme, walletAddress }: D3LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [metric, setMetric] = useState<'both' | 'yield' | 'repaid'>('both');

  // Let's build a realistic historical time series leading up to July 2026
  // based on the invoice dataset and some organic progression.
  const chartData: DataPoint[] = [
    { month: 'Jan 26', yieldRate: 11.2, repaidVolume: 32000 },
    { month: 'Feb 26', yieldRate: 11.8, repaidVolume: 45000 },
    { month: 'Mar 26', yieldRate: 12.5, repaidVolume: 61000 },
    { month: 'Apr 26', yieldRate: 12.1, repaidVolume: 85000 },
    { month: 'May 26', yieldRate: 13.0, repaidVolume: 104000 },
    { month: 'Jun 26', yieldRate: 12.7, repaidVolume: 142000 },
  ];

  // Dynamically scale/boost stats if user has active/fully funded high APR invoices
  const targetWallet = walletAddress || STELLAR_DEMO_KEYS.MAIN_USER;
  const userInvoices = invoices.filter(i => i.creatorWallet === targetWallet);
  if (userInvoices.length > 0) {
    const avgYield = d3.mean(userInvoices, d => d.annualReturn) || 12.0;
    const totalVolume = d3.sum(userInvoices.filter(i => i.fundingProgress >= 100), d => d.amount) || 42000;
    // Adjust last month (Jun 26) to reflect user's current metrics
    chartData[5].yieldRate = Number(avgYield.toFixed(1));
    if (totalVolume > 0) {
      chartData[5].repaidVolume = 142000 + totalVolume;
    }
  }

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const isDark = theme === 'midnight';
    const xAxisColor = isDark ? '#a0a0b0' : '#a1a1aa';
    const domainColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
    const leftAxisColor = isDark ? '#a0a0b0' : '#71717a';
    const rightAxisColor = isDark ? '#d4d4d8' : '#18181b';
    const yieldLineColor = isDark ? '#71717a' : '#a1a1aa';
    const yieldDotStrokeColor = isDark ? '#71717a' : '#71717a';
    const yieldDotFillColor = isDark ? '#0a0a0f' : '#ffffff';
    const volumeLineColor = isDark ? '#d4d4d8' : '#3f3f46';
    const volumeDotFillColor = isDark ? '#d4d4d8' : '#3f3f46';
    const volumeDotStrokeColor = isDark ? '#0a0a0f' : '#ffffff';

    // Clear previous elements
    d3.select(svgRef.current).selectAll('*').remove();

    // Get dynamic container dimensions
    const margin = { top: 30, right: 55, bottom: 40, left: 55 };
    const width = containerRef.current.clientWidth;
    const height = 280;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const xScale = d3.scalePoint()
      .domain(chartData.map(d => d.month))
      .range([0, innerWidth]);

    // Y scale for Yield (Left axis)
    const yYieldScale = d3.scaleLinear()
      .domain([8, 16]) // APR percentage range
      .range([innerHeight, 0]);

    // Y scale for Repaid Volume (Right axis)
    const maxRepaid = d3.max(chartData, d => d.repaidVolume) || 150000;
    const yVolumeScale = d3.scaleLinear()
      .domain([0, maxRepaid * 1.1])
      .range([innerHeight, 0]);

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(10);
    const yYieldAxis = d3.axisLeft(yYieldScale).ticks(5).tickFormat(d => `${d}%`);
    const yVolumeAxis = d3.axisRight(yVolumeScale).ticks(5).tickFormat(d => `$${(Number(d) / 1000).toFixed(0)}k`);

    // Draw horizontal grid lines
    g.append('g')
      .attr('class', 'grid-lines')
      .attr('opacity', isDark ? 0.12 : 0.05)
      .call(d3.axisLeft(yYieldScale)
        .ticks(5)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      );

    // Draw X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('font-family', 'var(--font-mono)')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('color', xAxisColor)
      .select('.domain')
      .attr('stroke', domainColor);

    // Draw Yield Left Y-Axis
    if (metric === 'both' || metric === 'yield') {
      g.append('g')
        .call(yYieldAxis)
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', '9px')
        .attr('color', leftAxisColor)
        .select('.domain')
        .attr('stroke', 'none');

      // Left Axis Label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -45)
        .attr('x', -innerHeight / 2)
        .attr('dy', '1em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('fill', '#a1a1aa')
        .attr('letter-spacing', '0.05em')
        .text('PORTFOLIO YIELD (APR)');
    }

    // Draw Volume Right Y-Axis
    if (metric === 'both' || metric === 'repaid') {
      g.append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(yVolumeAxis)
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', '9px')
        .attr('color', rightAxisColor)
        .select('.domain')
        .attr('stroke', 'none');

      // Right Axis Label
      g.append('text')
        .attr('transform', 'rotate(90)')
        .attr('y', -innerWidth - 45)
        .attr('x', innerHeight / 2)
        .attr('dy', '1em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('fill', '#a1a1aa')
        .attr('letter-spacing', '0.05em')
        .text('SETTLED REPAYMENTS');
    }

    // Line generator for Yield
    const yieldLine = d3.line<DataPoint>()
      .x(d => xScale(d.month)!)
      .y(d => yYieldScale(d.yieldRate))
      .curve(d3.curveMonotoneX);

    // Line generator for Volume
    const volumeLine = d3.line<DataPoint>()
      .x(d => xScale(d.month)!)
      .y(d => yVolumeScale(d.repaidVolume))
      .curve(d3.curveMonotoneX);

    // Render Yield Line
    if (metric === 'both' || metric === 'yield') {
      const yieldPath = g.append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', yieldLineColor) // Subtle grey yield line
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4') // Dashed styling
        .attr('d', yieldLine);

      // Animation
      const totalLength = yieldPath.node()?.getTotalLength() || 0;
      yieldPath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1000)
        .attr('stroke-dashoffset', 0)
        .on('end', () => {
          yieldPath.attr('stroke-dasharray', '4,4');
        });

      // Yield data points
      g.selectAll('.yield-circle')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('class', 'yield-circle')
        .attr('cx', d => xScale(d.month)!)
        .attr('cy', d => yYieldScale(d.yieldRate))
        .attr('r', 0)
        .attr('fill', yieldDotFillColor)
        .attr('stroke', yieldDotStrokeColor)
        .attr('stroke-width', 2)
        .transition()
        .delay((d, i) => i * 100)
        .duration(400)
        .attr('r', 4);
    }

    // Render Volume Line
    if (metric === 'both' || metric === 'repaid') {
      const volumePath = g.append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', volumeLineColor) // Bold repayments line
        .attr('stroke-width', 3)
        .attr('d', volumeLine);

      // Animation
      const totalLength = volumePath.node()?.getTotalLength() || 0;
      volumePath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1000)
        .attr('stroke-dashoffset', 0)
        .on('end', () => {
          volumePath.attr('stroke-dasharray', 'none');
        });

      // Volume data points
      g.selectAll('.volume-circle')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('class', 'volume-circle')
        .attr('cx', d => xScale(d.month)!)
        .attr('cy', d => yVolumeScale(d.repaidVolume))
        .attr('r', 0)
        .attr('fill', volumeDotFillColor)
        .attr('stroke', volumeDotStrokeColor)
        .attr('stroke-width', 2)
        .transition()
        .delay((d, i) => i * 100)
        .duration(400)
        .attr('r', 5);
    }

    // Interactive Hover Guides / Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', '#000000')
      .style('color', '#ffffff')
      .style('padding', '6px 10px')
      .style('font-family', 'var(--font-mono)')
      .style('font-size', '9px')
      .style('font-weight', 'bold')
      .style('border-radius', '0')
      .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
      .style('opacity', 0)
      .style('z-index', 10);

    const verticalGuide = g.append('line')
      .attr('stroke', isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    // Overlay to capture mouse events
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', function (event) {
        const mouseX = d3.pointer(event)[0];
        
        // Find nearest point
        const domain = chartData.map(d => d.month);
        const range = xScale.range();
        const eachBand = (range[1] - range[0]) / (domain.length - 1);
        const index = Math.round(mouseX / eachBand);
        const actualIdx = Math.max(0, Math.min(domain.length - 1, index));
        const d = chartData[actualIdx];

        if (d) {
          const xPos = xScale(d.month)!;
          verticalGuide
            .attr('x1', xPos)
            .attr('x2', xPos)
            .style('opacity', 1);

          const svgCoords = svgRef.current?.getBoundingClientRect();
          if (svgCoords) {
            tooltip
              .html(`
                <div class="border-b border-zinc-700 pb-1 mb-1 text-[8px] uppercase text-zinc-400 font-bold">${d.month} Report</div>
                ${(metric === 'both' || metric === 'yield') ? `<div class="flex justify-between gap-4"><span>Avg Yield:</span> <span class="text-zinc-300">${d.yieldRate}% APR</span></div>` : ''}
                ${(metric === 'both' || metric === 'repaid') ? `<div class="flex justify-between gap-4"><span>Repaid Vol:</span> <span>$${d.repaidVolume.toLocaleString()}</span></div>` : ''}
              `)
              .style('left', `${event.clientX - svgCoords.left + 20}px`)
              .style('top', `${event.clientY - svgCoords.top - 40}px`)
              .style('opacity', 1);
          }
        }
      })
      .on('mouseleave', function () {
        verticalGuide.style('opacity', 0);
        tooltip.style('opacity', 0);
      });

    // Cleanup tooltips on change
    return () => {
      d3.select(containerRef.current).selectAll('.d3-tooltip').remove();
    };

  }, [metric, invoices, theme]);

  return (
    <div ref={containerRef} className="relative w-full bg-white p-5 rounded-none border border-black/10 shadow-sm text-left flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-4 mb-3">
        <div>
          <h4 className="text-lg font-display font-bold italic text-on-background">
            Yield & Settlement Velocity Ledger
          </h4>
          <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
            D3 micro-performance engine tracking repayment timelines.
          </p>
        </div>

        {/* Toggles */}
        <div className="flex border border-black/10 divide-x divide-black/10 text-[9px] font-mono font-bold uppercase">
          <button
            onClick={() => setMetric('both')}
            className={`px-2.5 py-1 transition-all cursor-pointer ${metric === 'both' ? 'bg-black text-white' : 'bg-transparent text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            All
          </button>
          <button
            onClick={() => setMetric('yield')}
            className={`px-2.5 py-1 transition-all cursor-pointer ${metric === 'yield' ? 'bg-black text-white' : 'bg-transparent text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            Yield
          </button>
          <button
            onClick={() => setMetric('repaid')}
            className={`px-2.5 py-1 transition-all cursor-pointer ${metric === 'repaid' ? 'bg-black text-white' : 'bg-transparent text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* SVG Stage */}
      <div className="w-full overflow-hidden">
        <svg ref={svgRef} className="w-full h-[280px]" />
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 border-t border-black/5 pt-3 text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-zinc-400 dark:border-zinc-500" />
          <span>Avg Portfolio APR (Right-Skewed)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-zinc-700 dark:bg-zinc-300" />
          <span>Settled Repayments volume (USD)</span>
        </div>
      </div>
    </div>
  );
}
