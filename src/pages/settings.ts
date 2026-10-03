// Settings Page for AVIORCART Dashboard
// Note: no import/export to keep it a global script

function initSettingsPage() {
    const page = document.querySelector('#settings-page .dash-main');
    if (!page) return;

    // Mask the Supabase URL for security display
    const maskedUrl = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL
        ? SUPABASE_URL.substring(0, 15) + '...' + SUPABASE_URL.substring(SUPABASE_URL.length - 5) 
        : 'Not configured';

    // Current theme and font size
    const currentTheme = localStorage.getItem('avior_theme') || 'dark';
    const currentFontSize = localStorage.getItem('avior_font_size') || 'medium';

    const brandName = typeof BRAND_NAME !== 'undefined' ? BRAND_NAME : 'AVIORCART';
    const ownerName = typeof OWNER_NAME !== 'undefined' ? OWNER_NAME : 'Parth Rajpurohit';

    const html = `
        <div class="settings-container">
            <h2 class="dash-title">Settings</h2>
            
            <div class="settings-grid">
                <!-- Store Information -->
                <div class="settings-card">
                    <h3>Store Information</h3>
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Store Name</label>
                            <input type="text" value="${brandName}" readonly class="form-input readonly">
                        </div>
                        <div class="form-group">
                            <label>Owner Name</label>
                            <input type="text" value="${ownerName}" readonly class="form-input readonly">
                        </div>
                        <div class="form-group">
                            <label>Contact Email</label>
                            <input type="text" value="contact@aviorcart.com" readonly class="form-input readonly">
                        </div>
                    </div>
                </div>

                <!-- Supabase Connection -->
                <div class="settings-card">
                    <h3>Supabase Connection</h3>
                    <div class="settings-form">
                        <div class="connection-status">
                            <span id="sb-status-dot" class="status-dot unknown"></span>
                            <span id="sb-status-text">Checking connection...</span>
                        </div>
                        <div class="form-group">
                            <label>URL</label>
                            <input type="text" value="${maskedUrl}" readonly class="form-input readonly">
                        </div>
                        <div class="settings-actions">
                            <button onclick="testSupabaseConnection()" class="btn btn-primary">Test Connection</button>
                            <button onclick="reconnectSupabase()" class="btn btn-secondary">Reconnect</button>
                        </div>
                    </div>
                </div>

                <!-- Appearance -->
                <div class="settings-card">
                    <h3>Appearance</h3>
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Theme</label>
                            <select id="theme-select" class="form-input" onchange="updateTheme(this.value)">
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Mode</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Font Size</label>
                            <select id="font-size-select" class="form-input" onchange="updateFontSize(this.value)">
                                <option value="small" ${currentFontSize === 'small' ? 'selected' : ''}>Small</option>
                                <option value="medium" ${currentFontSize === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="large" ${currentFontSize === 'large' ? 'selected' : ''}>Large</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Data Management -->
                <div class="settings-card">
                    <h3>Data Management</h3>
                    <div class="settings-actions">
                        <button onclick="clearLocalStorage()" class="btn btn-danger">Clear Local Storage</button>
                        <button onclick="exportDataAsJson()" class="btn btn-primary">Export All Data as JSON</button>
                    </div>
                </div>

                <!-- About -->
                <div class="settings-card">
                    <h3>About</h3>
                    <ul class="about-list">
                        <li><strong>Version:</strong> 1.0.0</li>
                        <li><strong>Founder:</strong> Parth Rajpurohit</li>
                        <li><strong>Tech Stack:</strong> Supabase, TypeScript, Vercel</li>
                        <li><strong>Payment Partners:</strong> Delhivery, PayU</li>
                    </ul>
                </div>
            </div>
        </div>

        <style>
            .settings-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                animation: fadeIn 0.3s ease-in-out;
            }
            .settings-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 24px;
                margin-top: 20px;
            }
            .settings-card {
                background: var(--card, #13131a);
                border: 1px solid var(--border, #2a2a35);
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .settings-card h3 {
                color: var(--gold, #fbbf24);
                margin-top: 0;
                margin-bottom: 20px;
                font-size: 1.2rem;
                border-bottom: 1px solid var(--border, #2a2a35);
                padding-bottom: 10px;
            }
            .form-group {
                margin-bottom: 16px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #a0a0ab;
                font-size: 0.9rem;
            }
            .form-input {
                width: 100%;
                padding: 10px 12px;
                background: var(--card2, #1c1c24);
                border: 1px solid var(--border, #2a2a35);
                border-radius: 6px;
                color: #fff;
                font-size: 1rem;
                box-sizing: border-box;
                transition: border-color 0.2s;
            }
            .form-input.readonly {
                opacity: 0.7;
                cursor: not-allowed;
            }
            .form-input:focus {
                outline: none;
                border-color: var(--gold, #fbbf24);
            }
            .settings-actions {
                display: flex;
                gap: 12px;
                margin-top: 20px;
                flex-wrap: wrap;
            }
            .btn {
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: opacity 0.2s, transform 0.1s;
                font-size: 0.95rem;
            }
            .btn:hover {
                opacity: 0.9;
            }
            .btn:active {
                transform: scale(0.98);
            }
            .btn-primary {
                background: var(--gold, #fbbf24);
                color: #000;
            }
            .btn-secondary {
                background: var(--card2, #1c1c24);
                color: #fff;
                border: 1px solid var(--border, #2a2a35);
            }
            .btn-danger {
                background: #ef4444;
                color: #fff;
            }
            .connection-status {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                padding: 12px;
                background: var(--card2, #1c1c24);
                border-radius: 6px;
                border: 1px solid var(--border, #2a2a35);
            }
            .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                display: inline-block;
                box-shadow: 0 0 5px currentColor;
            }
            .status-dot.unknown { background: #9ca3af; color: #9ca3af; }
            .status-dot.connected { background: #10b981; color: #10b981; }
            .status-dot.disconnected { background: #ef4444; color: #ef4444; }
            .about-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .about-list li {
                margin-bottom: 12px;
                color: #e4e4e7;
                font-size: 0.95rem;
            }
            .about-list li strong {
                color: #a0a0ab;
                display: inline-block;
                width: 140px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 768px) {
                .settings-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    `;

    page.innerHTML = html;

    // Initial connection check
    checkInitialSupabaseConnection();
}

async function checkInitialSupabaseConnection() {
    const dot = document.getElementById('sb-status-dot');
    const text = document.getElementById('sb-status-text');
    if (!dot || !text) return;

    if (typeof sb === 'undefined') {
        dot.className = 'status-dot disconnected';
        text.textContent = 'Supabase client not found';
        text.style.color = '#ef4444';
        return;
    }

    try {
        const res = await sb.from('orders').select('id').limit(1);
        if (res.error) throw res.error;
        
        dot.className = 'status-dot connected';
        text.textContent = 'Connected successfully';
        text.style.color = '#10b981';
    } catch (err) {
        console.error('Supabase connection check failed:', err);
        dot.className = 'status-dot disconnected';
        text.textContent = 'Connection failed';
        text.style.color = '#ef4444';
    }
}

async function testSupabaseConnection() {
    if (typeof showToast === 'function') {
        showToast('Testing connection...', 'info');
    }
    
    const dot = document.getElementById('sb-status-dot');
    const text = document.getElementById('sb-status-text');
    if (dot) dot.className = 'status-dot unknown';
    if (text) {
        text.textContent = 'Checking connection...';
        text.style.color = '#a0a0ab';
    }
    
    await checkInitialSupabaseConnection();
    
    if (typeof showToast === 'function') {
        if (dot?.classList.contains('connected')) {
            showToast('Connection test successful!', 'success');
        } else {
            showToast('Connection test failed. Check console.', 'error');
        }
    }
}

function reconnectSupabase() {
    if (typeof showToast === 'function') {
        showToast('Attempting to reconnect...', 'info');
    }
    // Simple logic: we just test it again, since sb is globally initialized elsewhere
    testSupabaseConnection();
}

function updateTheme(theme: string) {
    localStorage.setItem('avior_theme', theme);
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    if (typeof showToast === 'function') {
        showToast('Theme updated. Some changes may require reload.', 'success');
    }
}

function updateFontSize(size: string) {
    localStorage.setItem('avior_font_size', size);
    let rootFontSize = '16px';
    if (size === 'small') rootFontSize = '14px';
    if (size === 'large') rootFontSize = '18px';
    document.documentElement.style.fontSize = rootFontSize;
    
    if (typeof showToast === 'function') {
        showToast('Font size updated.', 'success');
    }
}

function clearLocalStorage() {
    if (confirm('Are you sure you want to clear all local storage? This will sign you out and reset local preferences.')) {
        localStorage.clear();
        if (typeof showToast === 'function') {
            showToast('Local storage cleared. Reloading...', 'success');
        }
        setTimeout(() => window.location.reload(), 1500);
    }
}

function exportDataAsJson() {
    try {
        const data = {
            localStorage: { ...localStorage },
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aviorcart_export_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (typeof showToast === 'function') {
            showToast('Data exported successfully!', 'success');
        }
    } catch (err) {
        console.error('Failed to export data:', err);
        if (typeof showToast === 'function') {
            showToast('Failed to export data.', 'error');
        }
    }
}
