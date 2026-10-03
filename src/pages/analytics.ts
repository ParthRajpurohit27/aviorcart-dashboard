declare const Chart: any;



let analyticsCharts: any[] = [];

async function initAnalyticsPage() {
    const container = document.querySelector('#analytics-page .dash-main');
    if (!container) return;

    container.innerHTML = `
        <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Analytics Overview</h2>
            <button class="btn btn-primary" onclick="initAnalyticsPage()" style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-arrows-clockwise"></i> Refresh Data
            </button>
        </div>
        <div id="analytics-content" style="opacity: 0; transition: opacity 0.5s ease;">
            <div id="analytics-stats" class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <!-- Stats will be rendered here -->
            </div>
            
            <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card chart-card" style="grid-column: 1 / -1;">
                    <h3>Revenue Over Time (Last 30 Days)</h3>
                    <div style="position: relative; height: 300px; width: 100%;">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
                
                <div class="card chart-card">
                    <h3>Order Status Distribution</h3>
                    <div style="position: relative; height: 250px; width: 100%; display: flex; justify-content: center;">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
                
                <div class="card chart-card">
                    <h3>Top 5 Products</h3>
                    <div style="position: relative; height: 250px; width: 100%;">
                        <canvas id="productsChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>Recent Orders Summary</h3>
                <div class="table-responsive" style="margin-top: 1rem; overflow-x: auto;">
                    <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                                <th style="padding: 1rem;">Order ID</th>
                                <th style="padding: 1rem;">Date</th>
                                <th style="padding: 1rem;">Amount</th>
                                <th style="padding: 1rem;">Status</th>
                            </tr>
                        </thead>
                        <tbody id="analytics-recent-orders">
                            <!-- Recent orders will go here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="analytics-loader" style="display: flex; justify-content: center; padding: 3rem;">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const { data: orders, error } = await sb
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        processAnalyticsData(orders || []);
        
        document.getElementById('analytics-loader')!.style.display = 'none';
        document.getElementById('analytics-content')!.style.opacity = '1';
    } catch (err: any) {
        console.error('Error fetching analytics:', err);
        showToast('Failed to load analytics data');
        container.innerHTML = `<div class="error-state">Failed to load data. <button onclick="initAnalyticsPage()">Retry</button></div>`;
    }
}

function processAnalyticsData(orders: any[]) {
    // Clear old charts
    analyticsCharts.forEach(c => c.destroy());
    analyticsCharts = [];

    // Basic Stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => (o.payment_status || '').toLowerCase() === 'success' ? sum + (o.amount || 0) : sum, 0);
    const successOrders = orders.filter(o => (o.payment_status || '').toLowerCase() === 'success');
    const avgOrderValue = successOrders.length > 0 ? totalRevenue / successOrders.length : 0;
    
    // Render Stats
    const statsContainer = document.getElementById('analytics-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="card stat-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="color: var(--text-muted); font-size: 0.9rem;">Total Revenue</div>
                <div style="font-size: 1.8rem; font-weight: 600; color: var(--primary);">${money(totalRevenue)}</div>
            </div>
            <div class="card stat-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="color: var(--text-muted); font-size: 0.9rem;">Total Orders</div>
                <div style="font-size: 1.8rem; font-weight: 600;">${totalOrders}</div>
            </div>
            <div class="card stat-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="color: var(--text-muted); font-size: 0.9rem;">Avg Order Value</div>
                <div style="font-size: 1.8rem; font-weight: 600;">${Number.isNaN(avgOrderValue) ? money(0) : money(avgOrderValue)}</div>
            </div>
            <div class="card stat-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="color: var(--text-muted); font-size: 0.9rem;">Success Rate</div>
                <div style="font-size: 1.8rem; font-weight: 600;">${totalOrders > 0 ? Math.round((orders.filter(o => o.payment_status === 'success').length / totalOrders) * 100) : 0}%</div>
            </div>
        `;
    }

    // Prepare chart data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueByDay: Record<string, number> = {};
    const statusCounts: Record<string, number> = { success: 0, pending: 0, failed: 0 };
    const productCounts: Record<string, number> = {};

    orders.forEach(order => {
        const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Status
        const status = order.payment_status?.toLowerCase() || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Revenue over time (only successful)
        if (status === 'success' && new Date(order.created_at) >= thirtyDaysAgo) {
            revenueByDay[dateStr] = (revenueByDay[dateStr] || 0) + order.amount;
        }

        // Products
        if (order.items && Array.isArray(order.items) && status === 'success') {
            order.items.forEach((item: any) => {
                const name = item.title || item.name || 'Unknown';
                const qty = item.quantity || 1;
                productCounts[name] = (productCounts[name] || 0) + qty;
            });
        }
    });

    // 1. Revenue Line Chart
    const revCanvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (revCanvas) {
        // Sort dates
        const sortedDates = Object.keys(revenueByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const revData = sortedDates.map(d => revenueByDay[d]);

        analyticsCharts.push(new Chart(revCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Revenue',
                    data: revData,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
                }
            }
        }));
    }

    // 2. Status Doughnut Chart
    const statusCanvas = document.getElementById('statusChart') as HTMLCanvasElement;
    if (statusCanvas) {
        analyticsCharts.push(new Chart(statusCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Success', 'Pending', 'Failed'],
                datasets: [{
                    data: [statusCounts.success || 0, statusCounts.pending || 0, statusCounts.failed || 0],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#e5e7eb', padding: 20 } }
                }
            }
        }));
    }

    // 3. Top Products Bar Chart
    const prodCanvas = document.getElementById('productsChart') as HTMLCanvasElement;
    if (prodCanvas) {
        const topProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        analyticsCharts.push(new Chart(prodCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topProducts.map(p => p[0].length > 15 ? p[0].substring(0,15)+'...' : p[0]),
                datasets: [{
                    label: 'Units Sold',
                    data: topProducts.map(p => p[1]),
                    backgroundColor: '#fbbf24',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af', stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
                }
            }
        }));
    }

    // Recent Orders Table (Top 10)
    const recentOrdersContainer = document.getElementById('analytics-recent-orders');
    if (recentOrdersContainer) {
        const top10 = orders.slice(0, 10);
        if (top10.length === 0) {
            recentOrdersContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No orders found.</td></tr>`;
        } else {
            recentOrdersContainer.innerHTML = top10.map(o => {
                const statusStr = o.payment_status || 'pending';
                let statusColor = 'var(--text-muted)';
                if (statusStr === 'success') statusColor = '#22c55e';
                if (statusStr === 'failed') statusColor = '#ef4444';
                
                return `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 1rem; font-family: monospace;">#${String(o.id).split('-')[0]}</td>
                    <td style="padding: 1rem;">${new Date(o.created_at).toLocaleDateString()}</td>
                    <td style="padding: 1rem;">${money(o.amount)}</td>
                    <td style="padding: 1rem;">
                        <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; background: ${statusColor}20; color: ${statusColor}; font-size: 0.85rem; text-transform: capitalize;">
                            ${escapeHtml(statusStr)}
                        </span>
                    </td>
                </tr>
                `;
            }).join('');
        }
    }
}
