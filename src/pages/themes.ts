/* Theme Manager for AVIORCART main website */

const THEME_STORAGE_KEY = 'aviorcart-themes';
const ACTIVE_THEME_KEY = 'aviorcart-active-theme';

interface ThemeConfig {
    name: string;
    variables: Record<string, string>;
    customCSS: string;
    overlay?: string;
    createdAt: string;
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
    name: 'Default Gold',
    variables: {
        '--gold': '#fbbf24',
        '--black': '#060608',
        '--white': '#ffffff',
        '--gray-50': '#f9fafb',
        '--radius': '8px'
    },
    customCSS: '/* AVIORCART Original Default Theme */\n',
    overlay: 'none',
    createdAt: '2026-01-01T00:00:00.000Z'
};

const SAMPLE_PRESETS: Record<string, ThemeConfig> = {
    'Default Gold': DEFAULT_THEME_CONFIG,
    'Winter Wonderland': {
        name: 'Winter Wonderland',
        variables: {
            '--gold': '#38bdf8',
            '--black': '#050d1a',
            '--white': '#f0f9ff',
            '--gray-50': '#f0f6fa',
            '--radius': '10px'
        },
        customCSS: '/* Winter Wonderland Theme */\n.logo-avi, .logo-cart { background: linear-gradient(180deg, #38bdf8, #0284c7) !important; -webkit-background-clip: text !important; }\n',
        overlay: 'snowfall',
        createdAt: '2026-01-01T00:00:00.000Z'
    },
    'Diwali / Festive Glow': {
        name: 'Diwali / Festive Glow',
        variables: {
            '--gold': '#f59e0b',
            '--black': '#0f0505',
            '--white': '#fffbeb',
            '--gray-50': '#faf7f2',
            '--radius': '8px'
        },
        customCSS: '/* Festive Royal Gold */\n.logo-avi, .logo-cart { background: linear-gradient(180deg, #fcd34d, #f59e0b) !important; -webkit-background-clip: text !important; }\n',
        overlay: 'sparkles',
        createdAt: '2026-01-01T00:00:00.000Z'
    },
    'Sakura Spring': {
        name: 'Sakura Spring',
        variables: {
            '--gold': '#f472b6',
            '--black': '#130810',
            '--white': '#fdf2f8',
            '--gray-50': '#faf5f8',
            '--radius': '12px'
        },
        customCSS: '/* Sakura Spring Petals */\n.logo-avi, .logo-cart { background: linear-gradient(180deg, #f472b6, #db2777) !important; -webkit-background-clip: text !important; }\n',
        overlay: 'sakura',
        createdAt: '2026-01-01T00:00:00.000Z'
    },
    'Midnight Sapphire': {
        name: 'Midnight Sapphire',
        variables: {
            '--gold': '#0ea5e9',
            '--black': '#030712',
            '--white': '#f8fafc',
            '--gray-50': '#f1f5f9',
            '--radius': '8px'
        },
        customCSS: '/* Midnight Sapphire Blue */\n',
        overlay: 'none',
        createdAt: '2026-01-01T00:00:00.000Z'
    }
};

function getThemes(): Record<string, ThemeConfig> {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
        try { 
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                return parsed;
            }
        } catch (e) { /* ignore */ }
    }
    return Object.assign({}, SAMPLE_PRESETS);
}

function saveThemes(themes: Record<string, ThemeConfig>): void {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
}

function getActiveThemeName(): string {
    const active = localStorage.getItem(ACTIVE_THEME_KEY);
    if (active && _allThemes && _allThemes[active]) return active;
    return 'Default Gold';
}

function setActiveThemeName(name: string): void {
    localStorage.setItem(ACTIVE_THEME_KEY, name);
    const theme = _allThemes[name] || SAMPLE_PRESETS[name] || DEFAULT_THEME_CONFIG;
    applyThemeVariables(theme);

    // Sync to Supabase so the separate Main Storefront repo gets the active theme & overlay instantly!
    try {
        if (typeof sb !== 'undefined') {
            sb.from('store_settings').upsert({
                key: 'active_theme',
                value: {
                    name: theme.name,
                    variables: theme.variables,
                    customCSS: theme.customCSS || '',
                    overlay: theme.overlay || 'none'
                },
                updated_at: new Date().toISOString()
            }).then(function(res: any) {
                if (res && res.error) {
                    console.warn('Theme cloud sync error:', res.error);
                } else {
                    console.log('Theme synced to Supabase with overlay:', theme.overlay);
                }
            });
        }
    } catch (e) {
        console.warn('Cloud sync error:', e);
    }
}

function applyThemeVariables(theme: ThemeConfig): void {
    let styleEl = document.getElementById('custom-theme');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-theme';
        document.head.appendChild(styleEl);
    }
    let css = ':root {\n';
    for (const key in theme.variables) {
        css += '  ' + key + ': ' + theme.variables[key] + ';\n';
    }
    css += '}\n\n' + (theme.customCSS || '');
    styleEl.textContent = css;

    _updatePreview(theme);
}

function _updatePreview(theme: ThemeConfig): void {
    const btn = document.getElementById('preview-btn');
    if (btn) {
        btn.style.background = theme.variables['--gold'] || '#fbbf24';
        btn.style.borderRadius = theme.variables['--radius'] || '8px';
    }
    const card = document.getElementById('preview-card');
    if (card) {
        card.style.background = theme.variables['--black'] || '#060608';
        card.style.color = theme.variables['--white'] || '#ffffff';
        card.style.borderRadius = theme.variables['--radius'] || '8px';
    }
    const badge = document.getElementById('preview-overlay-badge');
    if (badge) {
        const ov = theme.overlay || 'none';
        if (ov === 'snowfall') badge.textContent = '❄️ Snowfall Active';
        else if (ov === 'sparkles') badge.textContent = '✨ Sparkles Active';
        else if (ov === 'sakura') badge.textContent = '🌸 Sakura Active';
        else badge.textContent = 'Clean (No Overlay)';
    }
}

let _themeEditing: string | null = null;
let _allThemes: Record<string, ThemeConfig> = {};

function initThemesPage(): void {
    const container = document.querySelector('#themes-page .dash-main');
    if (!container) return;

    _allThemes = getThemes();
    for (const key in SAMPLE_PRESETS) {
        if (!_allThemes[key]) {
            _allThemes[key] = SAMPLE_PRESETS[key];
        }
    }
    saveThemes(_allThemes);

    const active = getActiveThemeName();
    applyThemeVariables(_allThemes[active] || DEFAULT_THEME_CONFIG);
    _themeEditing = active;

    _renderThemesUI(container as HTMLElement);
}

function _renderThemesUI(container: HTMLElement): void {
    container.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:24px;">' +
        '<div>' +
        '<h2 class="page-title">🎨 Theme & Seasonal Overlay Manager</h2>' +
        '<p class="page-desc" style="margin-bottom:0;">Customize main store appearance, season overlays (Snowfall, Sparkles, Petals), and colors. Original default theme is permanently preserved.</p>' +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button class="btn-gold" id="btn-create-theme">+ Create New Theme</button>' +
        '<button class="btn-outline" id="btn-download-default" title="Download Default CSS file">📥 Download Default CSS</button>' +
        '<button class="btn-outline" id="btn-upload-css" title="Upload custom CSS to create theme">📤 Upload CSS File</button>' +
        '<input type="file" id="css-file-input" accept=".css" style="display:none;">' +
        '<button class="btn-outline" id="btn-reset-presets" title="Reset all to original sample presets" style="color:#ef4444;border-color:rgba(239,68,68,0.3);">↺ Reset Presets</button>' +
        '</div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:320px 1fr;gap:24px;">' +

        // Sidebar
        '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<h3 style="color:var(--gold);font-family:Orbitron,monospace;font-size:14px;margin:0;">Theme Library (<span id="theme-count">0</span>)</h3>' +
        '</div>' +
        '<div id="theme-list" style="display:flex;flex-direction:column;gap:12px;"></div>' +
        '</div>' +

        // Editor
        '<div class="card" style="padding:24px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:14px;">' +
        '<h3 id="editor-title" style="color:var(--gold);font-family:Orbitron,monospace;font-size:16px;margin:0;">Edit Theme</h3>' +
        '<div id="editor-badge"></div>' +
        '</div>' +

        '<div class="grid-2" style="margin-bottom:16px;">' +
        '<div class="field"><label>Theme Name</label>' +
        '<input type="text" id="theme-name-input" placeholder="e.g. Winter Wonderland"></div>' +
        '<div class="field"><label>Atmospheric Overlay (Live on Shopping Store!)</label>' +
        '<select id="theme-overlay-select">' +
        '<option value="none">None (Clean Store)</option>' +
        '<option value="snowfall">❄️ Snowfall (Winter Wonderland)</option>' +
        '<option value="sparkles">✨ Golden Sparkles (Diwali / Festive)</option>' +
        '<option value="sakura">🌸 Sakura Petals (Spring / Romantic)</option>' +
        '</select></div>' +
        '</div>' +

        '<div class="grid-2" style="margin-bottom:20px;">' +
        '<div class="field"><label>Primary Accent (--gold)</label><input type="color" id="var-gold" style="height:42px;cursor:pointer"></div>' +
        '<div class="field"><label>Background (--black)</label><input type="color" id="var-black" style="height:42px;cursor:pointer"></div>' +
        '<div class="field"><label>Text Color (--white)</label><input type="color" id="var-white" style="height:42px;cursor:pointer"></div>' +
        '<div class="field"><label>Light Background (--gray-50)</label><input type="color" id="var-gray50" style="height:42px;cursor:pointer"></div>' +
        '<div class="field"><label>Border Radius (--radius)</label><input type="text" id="var-radius" placeholder="e.g. 8px"></div>' +
        '</div>' +

        '<div class="field"><label>Custom CSS (Special animations, fonts, overrides)</label>' +
        '<textarea id="theme-custom-css" rows="6" placeholder="/* Extra custom CSS rules for storefront */" style="font-family:monospace;font-size:13px;line-height:1.5;"></textarea></div>' +

        '<div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">' +
        '<button class="btn-gold" id="btn-save-theme">💾 Save Changes</button>' +
        '<button class="btn-outline" id="btn-apply-theme" style="border-color:var(--gold);color:var(--gold);font-weight:700;">✨ Apply This Theme & Overlay to Store</button>' +
        '<button class="btn-outline" id="btn-download-current">📥 Download .CSS</button>' +
        '<button class="btn-danger" id="btn-delete-theme" style="margin-left:auto;display:none;">🗑️ Delete Theme</button>' +
        '</div>' +

        // Preview Box
        '<div style="border:1px solid var(--border);padding:20px;border-radius:12px;background:var(--card2);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<h4 style="color:var(--gold);margin:0;font-size:14px;letter-spacing:1px;font-family:Orbitron,monospace;">LIVE INTERACTIVE PREVIEW</h4>' +
        '<span id="preview-overlay-badge" style="font-size:11px;background:rgba(251,191,36,0.15);color:var(--gold);padding:3px 10px;border-radius:12px;font-weight:700;">Clean</span>' +
        '</div>' +
        '<p style="color:var(--muted);font-size:12.5px;margin-bottom:16px;">This shows your storefront styling and overlay effect:</p>' +
        '<div id="preview-card" style="padding:20px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:#060608;transition:all .3s ease;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<span style="font-weight:700;font-size:15px;">AVIORCART Premium Store</span>' +
        '<span style="font-size:11px;opacity:0.8;">Sample Badge</span>' +
        '</div>' +
        '<p style="font-size:13px;opacity:0.85;margin-bottom:16px;">Welcome to the new look of your storefront with live theme and seasonal overlay.</p>' +
        '<div style="display:flex;gap:10px;">' +
        '<button id="preview-btn" style="background:#fbbf24;color:#000;border:none;padding:9px 18px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;transition:all .2s ease;">Primary Action</button>' +
        '<button style="background:transparent;color:inherit;border:1px solid rgba(255,255,255,0.2);padding:9px 18px;border-radius:8px;font-size:12px;cursor:pointer;">Secondary</button>' +
        '</div>' +
        '</div>' +
        '</div>' +

        '</div>' + // end editor card
        '</div>'; // end grid

    _bindThemeEvents();
    _renderThemeCards();
    _loadThemeEditor(_themeEditing || 'Default Gold');
}

function _renderThemeCards(): void {
    const listEl = document.getElementById('theme-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const countEl = document.getElementById('theme-count');
    if (countEl) countEl.textContent = String(Object.keys(_allThemes).length);

    const active = getActiveThemeName();

    for (const name in _allThemes) {
        const theme = _allThemes[name];
        const isActive = name === active;
        const isEditing = name === _themeEditing;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText =
            'padding:14px;cursor:pointer;transition:all .25s ease;position:relative;' +
            'border-color:' + (isActive ? 'var(--gold)' : (isEditing ? 'rgba(251,191,36,0.4)' : 'var(--border)')) + ';' +
            'background:' + (isEditing ? 'var(--card2)' : 'var(--card)') + ';';

        const activeBadge = isActive 
            ? '<span style="font-size:10px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;padding:2px 8px;border-radius:12px;font-weight:800;letter-spacing:0.5px;">ACTIVE</span>' 
            : '';

        let overlayPill = '';
        if (theme.overlay === 'snowfall') overlayPill = '<span style="font-size:10px;background:rgba(56,189,248,0.15);color:#38bdf8;padding:2px 6px;border-radius:8px;margin-left:6px;">❄️ Snow</span>';
        else if (theme.overlay === 'sparkles') overlayPill = '<span style="font-size:10px;background:rgba(245,158,11,0.15);color:#f59e0b;padding:2px 6px;border-radius:8px;margin-left:6px;">✨ Sparks</span>';
        else if (theme.overlay === 'sakura') overlayPill = '<span style="font-size:10px;background:rgba(244,114,182,0.15);color:#f472b6;padding:2px 6px;border-radius:8px;margin-left:6px;">🌸 Sakura</span>';

        const goldVal = theme.variables['--gold'] || '#fbbf24';
        const blackVal = theme.variables['--black'] || '#060608';
        const whiteVal = theme.variables['--white'] || '#ffffff';

        card.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<div style="font-weight:700;font-size:13.5px;color:' + (isActive ? 'var(--gold)' : 'var(--text)') + ';display:flex;align-items:center;">' + 
            escapeHtml(name) + overlayPill + 
            '</div>' +
            activeBadge +
            '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">' +
            '<div style="display:flex;gap:6px;" title="Color palette">' +
            '<div style="width:20px;height:20px;border-radius:50%;background:' + goldVal + ';box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>' +
            '<div style="width:20px;height:20px;border-radius:50%;background:' + blackVal + ';border:1px solid rgba(255,255,255,0.2);"></div>' +
            '<div style="width:20px;height:20px;border-radius:50%;background:' + whiteVal + ';border:1px solid rgba(0,0,0,0.2);"></div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
            (!isActive ? '<button class="card-apply-btn" data-theme="' + escapeHtml(name) + '" style="font-size:11px;padding:4px 10px;background:rgba(251,191,36,0.15);border:1px solid var(--gold);color:var(--gold);border-radius:6px;font-weight:700;cursor:pointer;">Apply</button>' : '') +
            (name !== 'Default Gold' && name !== 'Default Theme' ? '<button class="card-delete-btn" data-theme="' + escapeHtml(name) + '" title="Delete this theme" style="font-size:11px;padding:4px 8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:6px;cursor:pointer;">✕</button>' : '') +
            '</div>' +
            '</div>';

        card.addEventListener('click', function (e) {
            const target = e.target as HTMLElement;
            if (target.classList.contains('card-apply-btn') || target.classList.contains('card-delete-btn')) {
                return;
            }
            _themeEditing = name;
            _renderThemeCards();
            _loadThemeEditor(name);
        });

        const applyBtn = card.querySelector('.card-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                const tName = name;
                setActiveThemeName(tName);
                _themeEditing = tName;
                _renderThemeCards();
                _loadThemeEditor(tName);
                showToast('✨ Theme "' + tName + '" is now active on store!');
            });
        }

        const delBtn = card.querySelector('.card-delete-btn');
        if (delBtn) {
            delBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _deleteTheme(name);
            });
        }

        listEl.appendChild(card);
    }
}

function _loadThemeEditor(name: string): void {
    const theme = _allThemes[name] || SAMPLE_PRESETS[name] || DEFAULT_THEME_CONFIG;

    const titleEl = document.getElementById('editor-title');
    if (titleEl) titleEl.textContent = 'Edit: ' + name;

    const active = getActiveThemeName();
    const isActive = name === active;

    const badgeEl = document.getElementById('editor-badge');
    if (badgeEl) {
        badgeEl.innerHTML = isActive 
            ? '<span style="font-size:11px;background:rgba(34,197,94,0.15);color:#22c55e;padding:3px 10px;border-radius:12px;font-weight:700;">CURRENTLY APPLIED</span>'
            : '<span style="font-size:11px;background:rgba(255,255,255,0.06);color:var(--muted);padding:3px 10px;border-radius:12px;">INACTIVE</span>';
    }

    const nameInput = document.getElementById('theme-name-input') as HTMLInputElement;
    if (nameInput) {
        nameInput.value = name;
        nameInput.disabled = (name === 'Default Gold' || name === 'Default Theme');
    }

    const overlaySelect = document.getElementById('theme-overlay-select') as HTMLSelectElement;
    if (overlaySelect) {
        overlaySelect.value = theme.overlay || 'none';
    }

    function setVal(id: string, val: string): void {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) el.value = val || '';
    }

    setVal('var-gold', theme.variables['--gold'] || '#fbbf24');
    setVal('var-black', theme.variables['--black'] || '#060608');
    setVal('var-white', theme.variables['--white'] || '#ffffff');
    setVal('var-gray50', theme.variables['--gray-50'] || '#f9fafb');
    setVal('var-radius', theme.variables['--radius'] || '8px');

    const cssArea = document.getElementById('theme-custom-css') as HTMLTextAreaElement;
    if (cssArea) cssArea.value = theme.customCSS || '';

    const delBtn = document.getElementById('btn-delete-theme');
    if (delBtn) {
        if (name === 'Default Gold' || name === 'Default Theme') {
            delBtn.style.display = 'none';
        } else {
            delBtn.style.display = 'inline-flex';
        }
    }

    _updatePreview(theme);
}

function _getEditorData(): ThemeConfig {
    const nameInput = document.getElementById('theme-name-input') as HTMLInputElement;
    const name = nameInput ? nameInput.value.trim() : 'New Theme';

    function getVal(id: string): string {
        const el = document.getElementById(id) as HTMLInputElement;
        return el ? el.value : '';
    }

    const overlaySelect = document.getElementById('theme-overlay-select') as HTMLSelectElement;
    const overlayVal = overlaySelect ? overlaySelect.value : 'none';

    return {
        name: name || 'Unnamed Theme',
        variables: {
            '--gold': getVal('var-gold'),
            '--black': getVal('var-black'),
            '--white': getVal('var-white'),
            '--gray-50': getVal('var-gray50'),
            '--radius': getVal('var-radius')
        },
        customCSS: (document.getElementById('theme-custom-css') as HTMLTextAreaElement)?.value || '',
        overlay: overlayVal,
        createdAt: new Date().toISOString()
    };
}

function _downloadCSS(theme: ThemeConfig): void {
    let css = '/* AVIORCART Storefront Theme: ' + theme.name + ' */\n';
    if (theme.overlay && theme.overlay !== 'none') {
        css += '/* Overlay Effect: ' + theme.overlay + ' */\n';
    }
    css += '/* Generated from AVIORCART Admin Dashboard */\n\n:root {\n';
    for (const key in theme.variables) {
        css += '  ' + key + ': ' + theme.variables[key] + ';\n';
    }
    css += '}\n\n' + (theme.customCSS || '');

    const blob = new Blob([css], { type: 'text/css;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = theme.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.css';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + link.download);
}

function _deleteTheme(name: string): void {
    if (name === 'Default Gold' || name === 'Default Theme') {
        showToast('Default theme cannot be deleted.');
        return;
    }
    if (!confirm('Are you sure you want to remove the theme "' + name + '"?')) {
        return;
    }
    delete _allThemes[name];
    if (getActiveThemeName() === name) {
        setActiveThemeName('Default Gold');
    }
    saveThemes(_allThemes);
    _themeEditing = getActiveThemeName();
    _renderThemeCards();
    _loadThemeEditor(_themeEditing);
    showToast('Theme "' + name + '" deleted.');
}

function _bindThemeEvents(): void {
    const createBtn = document.getElementById('btn-create-theme');
    if (createBtn) createBtn.addEventListener('click', function () {
        let name = 'Custom Theme';
        let c = 1;
        while (_allThemes[name]) { name = 'Custom Theme ' + c; c++; }

        _allThemes[name] = {
            name: name,
            variables: Object.assign({}, DEFAULT_THEME_CONFIG.variables),
            customCSS: '/* Custom styles for ' + name + ' */\n',
            overlay: 'none',
            createdAt: new Date().toISOString()
        };
        saveThemes(_allThemes);
        _themeEditing = name;
        _renderThemeCards();
        _loadThemeEditor(name);
        showToast('New theme "' + name + '" created!');
    });

    const dlDefBtn = document.getElementById('btn-download-default');
    if (dlDefBtn) dlDefBtn.addEventListener('click', function () {
        _downloadCSS(DEFAULT_THEME_CONFIG);
    });

    const upBtn = document.getElementById('btn-upload-css');
    const fileInput = document.getElementById('css-file-input') as HTMLInputElement;
    if (upBtn && fileInput) {
        upBtn.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function () {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const text = (e.target?.result as string) || '';
                let tName = file.name.replace(/\.css$/i, '').replace(/[-_]/g, ' ');
                tName = tName.charAt(0).toUpperCase() + tName.slice(1);

                const vars: Record<string, string> = Object.assign({}, DEFAULT_THEME_CONFIG.variables);
                const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
                let match;
                while ((match = varRegex.exec(text)) !== null) {
                    vars[match[1]] = match[2].trim();
                }

                _allThemes[tName] = {
                    name: tName,
                    variables: vars,
                    customCSS: text,
                    overlay: 'none',
                    createdAt: new Date().toISOString()
                };
                saveThemes(_allThemes);
                _themeEditing = tName;
                _renderThemeCards();
                _loadThemeEditor(tName);
                showToast('Imported theme "' + tName + '" from CSS file!');
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    const resetPresetsBtn = document.getElementById('btn-reset-presets');
    if (resetPresetsBtn) resetPresetsBtn.addEventListener('click', function () {
        if (confirm('Reset theme library to standard sample presets?')) {
            _allThemes = Object.assign({}, SAMPLE_PRESETS);
            saveThemes(_allThemes);
            setActiveThemeName('Default Gold');
            _themeEditing = 'Default Gold';
            _renderThemeCards();
            _loadThemeEditor('Default Gold');
            showToast('Reset to original sample presets.');
        }
    });

    const saveBtn = document.getElementById('btn-save-theme');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        if (!_themeEditing) return;
        const data = _getEditorData();
        const oldName = _themeEditing;
        const newName = data.name;

        if ((oldName === 'Default Gold' || oldName === 'Default Theme') && (newName !== 'Default Gold' && newName !== 'Default Theme')) {
            showToast('Default theme name cannot be changed.');
            return;
        }

        if (oldName !== newName) {
            delete _allThemes[oldName];
            if (getActiveThemeName() === oldName) {
                localStorage.setItem(ACTIVE_THEME_KEY, newName);
            }
        }

        _allThemes[newName] = data;
        _themeEditing = newName;
        saveThemes(_allThemes);
        _renderThemeCards();

        if (getActiveThemeName() === newName) {
            applyThemeVariables(data);
        }
        showToast('Theme "' + newName + '" saved!');
    });

    const applyBtn = document.getElementById('btn-apply-theme');
    if (applyBtn) applyBtn.addEventListener('click', function () {
        if (!_themeEditing) return;
        const saveB = document.getElementById('btn-save-theme');
        if (saveB) saveB.click();

        setActiveThemeName(_themeEditing);
        _renderThemeCards();
        _loadThemeEditor(_themeEditing);
        showToast('✨ Theme "' + _themeEditing + '" is now active on your store!');
    });

    const dlCurBtn = document.getElementById('btn-download-current');
    if (dlCurBtn) dlCurBtn.addEventListener('click', function () {
        if (!_themeEditing) return;
        const data = _getEditorData();
        _downloadCSS(data);
    });

    const delBtn = document.getElementById('btn-delete-theme');
    if (delBtn) delBtn.addEventListener('click', function () {
        if (!_themeEditing) return;
        _deleteTheme(_themeEditing);
    });

    // Real-time preview updates
    ['var-gold', 'var-black', 'var-white', 'var-gray50', 'var-radius'].forEach(function (id) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function () {
                const currentData = _getEditorData();
                _updatePreview(currentData);
            });
        }
    });

    const overlaySelect = document.getElementById('theme-overlay-select');
    if (overlaySelect) {
        overlaySelect.addEventListener('change', function () {
            const currentData = _getEditorData();
            _updatePreview(currentData);
        });
    }
}
