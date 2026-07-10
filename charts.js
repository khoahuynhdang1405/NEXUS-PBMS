/**
 * charts.js - Custom lightweight SVG-based animated charting library
 * Created to build high-performance, beautiful, and theme-integrated dashboard charts without external libraries.
 */

// Area Chart for Occupancy Rate
function renderOccupancyChart(containerId, hourlyData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth || 500;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Scale data
    const maxVal = 100;
    const points = hourlyData.map((d, i) => {
        const x = padding.left + (i / (hourlyData.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.value / maxVal) * chartHeight;
        return { x, y, label: d.hour, value: d.value };
    });
    
    // Create SVG
    let svgContent = `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible;">
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent-glow-color, #00f3ff)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--accent-glow-color, #00f3ff)" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#00f3ff"/>
                    <stop offset="100%" stop-color="#8000ff"/>
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
    `;
    
    // Draw Grid Lines & Labels
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
        const yVal = maxVal * (i / gridCount);
        const y = padding.top + chartHeight - (yVal / maxVal) * chartHeight;
        
        svgContent += `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            <text x="${padding.left - 10}" y="${y + 4}" fill="var(--text-secondary)" font-size="10" text-anchor="end">${yVal}%</text>
        `;
    }
    
    // Draw X Axis labels
    points.forEach((p, i) => {
        if (i % 2 === 0 || i === points.length - 1) {
            svgContent += `
                <text x="${p.x}" y="${height - 10}" fill="var(--text-secondary)" font-size="10" text-anchor="middle">${p.label}</text>
            `;
        }
    });
    
    // Create Area path
    let areaPath = `M ${points[0].x} ${padding.top + chartHeight} `;
    points.forEach(p => {
        areaPath += `L ${p.x} ${p.y} `;
    });
    areaPath += `L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;
    
    // Create Line path
    let linePath = `M ${points[0].x} ${points[0].y} `;
    for (let i = 1; i < points.length; i++) {
        linePath += `L ${points[i].x} ${points[i].y} `;
    }
    
    svgContent += `<path d="${areaPath}" fill="url(#areaGrad)" />`;
    svgContent += `<path d="${linePath}" fill="none" stroke="url(#lineGrad)" stroke-width="2" filter="url(#glow)" />`;
    
    // Draw dots and tooltips
    points.forEach(p => {
        svgContent += `
            <g class="chart-point-group" style="cursor: pointer;">
                <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--bg-panel)" stroke="#00f3ff" stroke-width="2" />
                <circle class="hover-ring" cx="${p.x}" cy="${p.y}" r="8" fill="#00f3ff" fill-opacity="0" style="transition: fill-opacity 0.2s;">
                    <title>Time: ${p.label}\nOccupancy: ${p.value}%</title>
                </circle>
            </g>
        `;
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

// Doughnut Chart for Vehicle Distribution
function renderVehicleTypeChart(containerId, typeData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const total = typeData.reduce((sum, d) => sum + d.value, 0);
    const width = 160;
    const height = 160;
    const cx = width / 2;
    const cy = height / 2;
    const r = 50;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * r;
    
    let currentAngle = 0;
    let svgContent = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="transform: rotate(-90deg);">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="rgba(255,255,255,0.04)" stroke-width="${strokeWidth}" />
    `;
    
    const colors = {
        car: "#00f3ff",       // cyan
        suv: "#8000ff",       // violet
        ev: "#00ff66",        // neon green
        motorbike: "#ffaa00", // amber
        handicap: "#ff0077"  // pink
    };
    
    let accumulatedPercent = 0;
    
    typeData.forEach((d) => {
        const percent = total > 0 ? d.value / total : 0;
        const strokeLength = percent * circumference;
        const strokeOffset = circumference - strokeLength + (accumulatedPercent * circumference);
        
        svgContent += `
            <circle cx="${cx}" cy="${cy}" r="${r}"
                fill="transparent"
                stroke="${colors[d.type] || '#ccc'}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${strokeOffset}"
                style="transition: stroke-dashoffset 0.8s ease-in-out;"
            >
                <title>${d.label}: ${d.value} vehicles (${Math.round(percent * 100)}%)</title>
            </circle>
        `;
        accumulatedPercent -= percent;
    });
    
    svgContent += `
        </svg>
    `;
    
    // Create details/legend HTML
    let legendHtml = `<div class="chart-legend">`;
    typeData.forEach(d => {
        const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
        legendHtml += `
            <div class="legend-item">
                <span class="legend-dot" style="background-color: ${colors[d.type]}"></span>
                <span class="legend-label">${d.label}</span>
                <span class="legend-value">${d.value} (${percent}%)</span>
            </div>
        `;
    });
    legendHtml += `</div>`;
    
    container.innerHTML = `
        <div class="doughnut-wrapper" style="display: flex; align-items: center; justify-content: space-around; width: 100%; flex-wrap: wrap;">
            <div style="position: relative; width: ${width}px; height: ${height}px;">
                ${svgContent}
                <div class="doughnut-center-text" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                    <div style="font-size: 20px; font-weight: 700; color: #fff;">${total}</div>
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase;">Tổng số</div>
                </div>
            </div>
            ${legendHtml}
        </div>
    `;
}

// Bar Chart for Daily Revenue
function renderRevenueChart(containerId, weeklyData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth || 500;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxVal = Math.max(...weeklyData.map(d => d.value)) * 1.15 || 1000000;
    
    let svgContent = `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8000ff" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#00f3ff" stop-opacity="0.7"/>
                </linearGradient>
            </defs>
    `;
    
    // Gridlines & Y-labels
    const gridCount = 3;
    for (let i = 0; i <= gridCount; i++) {
        const yVal = maxVal * (i / gridCount);
        const y = padding.top + chartHeight - (yVal / maxVal) * chartHeight;
        
        // Format Currency: e.g. 1.2M or 800k
        let formattedLabel = "";
        if (yVal >= 1000000) {
            formattedLabel = (yVal / 1000000).toFixed(1) + "M";
        } else if (yVal >= 1000) {
            formattedLabel = (yVal / 1000).toFixed(0) + "k";
        } else {
            formattedLabel = yVal.toString();
        }
        
        svgContent += `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            <text x="${padding.left - 10}" y="${y + 4}" fill="var(--text-secondary)" font-size="10" text-anchor="end">${formattedLabel}</text>
        `;
    }
    
    // Draw Bars
    const barWidth = Math.min(30, (chartWidth / weeklyData.length) * 0.6);
    const colWidth = chartWidth / weeklyData.length;
    
    weeklyData.forEach((d, i) => {
        const barHeight = (d.value / maxVal) * chartHeight;
        const x = padding.left + i * colWidth + (colWidth - barWidth) / 2;
        const y = padding.top + chartHeight - barHeight;
        
        // Draw round corner bars
        svgContent += `
            <g class="chart-bar-group">
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#barGrad)" rx="3" ry="3">
                    <title>${d.day}: ${d.value.toLocaleString('vi-VN')} VND</title>
                </rect>
                <text x="${x + barWidth/2}" y="${height - 10}" fill="var(--text-secondary)" font-size="10" text-anchor="middle">${d.day}</text>
            </g>
        `;
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

// Window resize handler
window.addEventListener('resize', () => {
    // We can dispatch a global event to trigger chart re-renders
    const event = new Event('pbms-resize-charts');
    window.dispatchEvent(event);
});
