"use strict";
let productsList = [];
let filteredProductsList = [];
let editingProductId = null;
async function initProductsPage() {
    const main = document.querySelector('#products-page .dash-main');
    if (!main)
        return;
    main.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Products Management</h2>
            <div class="actions" style="display: flex; gap: 1rem;">
                <button class="btn btn-secondary" onclick="exportProductsCSV()" style="background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    Export CSV
                </button>
                <button class="btn btn-primary" onclick="openProductModal()" style="background: var(--gold); border: none; color: var(--bg); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.2s;">
                    + Add Product
                </button>
            </div>
        </div>

        <div class="filters" style="margin-bottom: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <input type="text" id="product-search" placeholder="Search products..." oninput="filterProducts()" style="flex: 1; min-width: 250px; padding: 0.75rem; background: var(--card); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
            <select id="product-category-filter" onchange="filterProducts()" style="padding: 0.75rem; background: var(--card); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                <option value="">All Categories</option>
            </select>
        </div>

        <div id="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
            <!-- Products will be rendered here -->
        </div>

        <!-- Product Modal -->
        <div id="product-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; justify-content: center; align-items: center;">
            <div class="modal-content" style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 id="product-modal-title" style="margin: 0; font-size: 1.5rem;">Add Product</h3>
                    <button onclick="closeProductModal()" style="background: transparent; border: none; color: var(--text); font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                
                <form id="product-form" onsubmit="handleProductSubmit(event)" style="display: flex; flex-direction: column; gap: 1.2rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Title</label>
                        <input type="text" id="prod-title" required style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Description</label>
                        <textarea id="prod-desc" rows="3" style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none; resize: vertical;"></textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Price</label>
                            <input type="number" id="prod-price" step="0.01" required style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Compare Price</label>
                            <input type="number" id="prod-compare" step="0.01" style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">SKU</label>
                            <input type="text" id="prod-sku" style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Stock</label>
                            <input type="number" id="prod-stock" required style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Category</label>
                            <input type="text" id="prod-category" style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--muted); font-size: 0.9rem;">Image URL</label>
                        <input type="url" id="prod-image" style="width: 100%; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; outline: none;">
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
                        <button type="button" onclick="closeProductModal()" class="btn btn-secondary" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="background: var(--gold); border: none; color: var(--bg); padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Product</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    await loadProducts();
}
async function loadProducts() {
    try {
        const { data, error } = await window.sb.from('products').select('*').order('created_at', { ascending: false });
        if (error)
            throw error;
        productsList = data || [];
        filteredProductsList = [...productsList];
        updateCategoryFilter();
        renderProducts();
    }
    catch (err) {
        console.error('Error loading products:', err);
        if (typeof window.showToast === 'function')
            window.showToast('Error loading products', 'error');
    }
}
function updateCategoryFilter() {
    const select = document.getElementById('product-category-filter');
    if (!select)
        return;
    const categories = new Set(productsList.map(p => p.category).filter(Boolean));
    let options = '<option value="">All Categories</option>';
    categories.forEach(c => {
        const catStr = c;
        const escaped = typeof window.escapeHtml === 'function' ? window.escapeHtml(catStr) : catStr;
        options += `<option value="${escaped}">${escaped}</option>`;
    });
    select.innerHTML = options;
}
function filterProducts() {
    const searchInput = document.getElementById('product-search')?.value.toLowerCase() || '';
    const categoryInput = document.getElementById('product-category-filter')?.value || '';
    filteredProductsList = productsList.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchInput) ||
            (p.sku && p.sku.toLowerCase().includes(searchInput));
        const matchesCategory = categoryInput === '' || p.category === categoryInput;
        return matchesSearch && matchesCategory;
    });
    renderProducts();
}
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid)
        return;
    if (filteredProductsList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--muted); background: var(--card); border-radius: 8px; border: 1px dashed var(--border);">No products found matching your criteria.</div>`;
        return;
    }
    grid.innerHTML = filteredProductsList.map(p => {
        const esc = typeof window.escapeHtml === 'function' ? window.escapeHtml : (s) => s;
        const formatMoney = typeof window.money === 'function' ? window.money : (n) => '$' + n.toFixed(2);
        const title = esc(p.title);
        const category = esc(p.category || 'Uncategorized');
        const imgUrl = p.image_url ? esc(p.image_url) : null;
        return `
        <div class="product-card" style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column;">
            <div style="height: 220px; background: var(--bg); position: relative; border-bottom: 1px solid var(--border);">
                ${imgUrl ? `<img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${title}">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted);">No Image</div>`}
                ${p.stock <= 0 ? `<div style="position: absolute; top: 12px; right: 12px; background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Out of Stock</div>` : ''}
            </div>
            <div style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column;">
                <div style="color: var(--muted); font-size: 0.8rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">${category}</div>
                <h4 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: var(--text); line-height: 1.4;">${title}</h4>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto;">
                    <div>
                        <div style="color: var(--gold); font-weight: bold; font-size: 1.25rem;">${formatMoney(p.price)}</div>
                        ${p.compare_price && p.compare_price > p.price ? `<div style="text-decoration: line-through; color: var(--muted); font-size: 0.9rem;">${formatMoney(p.compare_price)}</div>` : ''}
                    </div>
                    <div style="color: var(--muted); font-size: 0.9rem;">
                        ${p.stock > 0 ? `<span style="color: #10b981;">●</span> ${p.stock} in stock` : ''}
                    </div>
                </div>
            </div>
            <div style="border-top: 1px solid var(--border); padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; background: rgba(0,0,0,0.2);">
                <button onclick="editProduct(${p.id})" style="background: transparent; border: none; color: var(--text); cursor: pointer; opacity: 0.7; transition: opacity 0.2s; font-size: 0.9rem; padding: 0;">Edit</button>
                <button onclick="deleteProduct(${p.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; font-size: 0.9rem; padding: 0;">Delete</button>
            </div>
        </div>
        `;
    }).join('');
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
            const btns = e.currentTarget.querySelectorAll('button');
            btns.forEach(b => b.style.opacity = '1');
        });
        card.addEventListener('mouseleave', (e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
            const btns = e.currentTarget.querySelectorAll('button');
            btns.forEach(b => b.style.opacity = '0.7');
        });
    });
}
function openProductModal(id) {
    const modal = document.getElementById('product-modal');
    if (!modal)
        return;
    editingProductId = id || null;
    const title = document.getElementById('product-modal-title');
    if (title)
        title.textContent = id ? 'Edit Product' : 'Add Product';
    const form = document.getElementById('product-form');
    form.reset();
    if (id) {
        const product = productsList.find(p => p.id === id);
        if (product) {
            document.getElementById('prod-title').value = product.title || '';
            document.getElementById('prod-desc').value = product.description || '';
            document.getElementById('prod-price').value = product.price?.toString() || '';
            document.getElementById('prod-compare').value = product.compare_price?.toString() || '';
            document.getElementById('prod-sku').value = product.sku || '';
            document.getElementById('prod-stock').value = product.stock?.toString() || '0';
            document.getElementById('prod-category').value = product.category || '';
            document.getElementById('prod-image').value = product.image_url || '';
        }
    }
    modal.style.display = 'flex';
}
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal)
        modal.style.display = 'none';
    editingProductId = null;
}
async function handleProductSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('prod-title').value;
    const desc = document.getElementById('prod-desc').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const compareVal = document.getElementById('prod-compare').value;
    const compare = compareVal ? parseFloat(compareVal) : null;
    const sku = document.getElementById('prod-sku').value;
    const stock = parseInt(document.getElementById('prod-stock').value, 10);
    const category = document.getElementById('prod-category').value;
    const imageUrl = document.getElementById('prod-image').value;
    const productData = {
        title,
        description: desc || null,
        price,
        compare_price: compare,
        sku: sku || null,
        stock,
        category: category || null,
        image_url: imageUrl || null
    };
    try {
        if (editingProductId) {
            const { error } = await window.sb.from('products').update(productData).eq('id', editingProductId);
            if (error)
                throw error;
            if (typeof window.showToast === 'function')
                window.showToast('Product updated successfully', 'success');
        }
        else {
            const { error } = await window.sb.from('products').insert([productData]);
            if (error)
                throw error;
            if (typeof window.showToast === 'function')
                window.showToast('Product added successfully', 'success');
        }
        closeProductModal();
        await loadProducts();
    }
    catch (err) {
        console.error('Error saving product:', err);
        if (typeof window.showToast === 'function')
            window.showToast('Error saving product: ' + err.message, 'error');
    }
}
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?'))
        return;
    try {
        const { error } = await window.sb.from('products').delete().eq('id', id);
        if (error)
            throw error;
        if (typeof window.showToast === 'function')
            window.showToast('Product deleted successfully', 'success');
        await loadProducts();
    }
    catch (err) {
        console.error('Error deleting product:', err);
        if (typeof window.showToast === 'function')
            window.showToast('Error deleting product', 'error');
    }
}
function editProduct(id) {
    openProductModal(id);
}
function exportProductsCSV() {
    if (!productsList || productsList.length === 0) {
        if (typeof window.showToast === 'function')
            window.showToast('No products to export', 'warning');
        return;
    }
    if (typeof window.Papa === 'undefined') {
        if (typeof window.showToast === 'function')
            window.showToast('CSV export library not loaded', 'error');
        return;
    }
    const csv = window.Papa.unparse(productsList);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
