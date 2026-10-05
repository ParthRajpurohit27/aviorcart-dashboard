"use strict";
const MAIN_SITE_URL = "https://aviorcart.vercel.app";
const DEFAULT_CATEGORIES = ["Clothing", "Fashion", "Sarees", "Kurtis", "Footwear", "Watches", "Beauty", "Jewelry", "Electronics", "Home", "Food", "Toys", "Baby"];
let _prodList = [];
let _prodDraft = null;
let _prodBusy = false;
let _prodQuery = "";
let _prodCat = "";
let _prodRoot = null;
function _pEsc(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
}
function _pMoney(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
}
function _blankDraft() {
    return { handle: "", title: "", description: "", type: "", tags: "", price: "", mrp: "", category: "", inStock: true, optionName: "", variants: [], images: [] };
}
function _draftFrom(p) {
    const multi = p.option1_name !== "Title" && p.variants.length > 1;
    return {
        handle: p.handle,
        title: p.title,
        description: p.description,
        type: p.type,
        tags: p.tags.join(", "),
        price: String(p.price),
        mrp: p.compare_at_price > 0 ? String(p.compare_at_price) : "",
        category: p.category_name,
        inStock: p.variants.some(function (v) {
            return v.available;
        }),
        optionName: multi ? p.option1_name : "",
        variants: multi
            ? p.variants.map(function (v) {
                return { option1: v.option1, price: v.price === p.price ? "" : String(v.price), available: v.available };
            })
            : [],
        images: p.images.slice(),
    };
}
function initProductsPage() {
    _prodRoot = document.querySelector("#products-page .dash-main");
    if (!_prodRoot)
        return;
    _prodRoot.innerHTML = '<div class="empty-state">Loading products…</div>';
    _loadProducts();
}
function _loadProducts() {
    Promise.all([apiFetch("/api/products"), apiFetch("/api/me").catch(function () {
            return null;
        })])
        .then(function (r) {
        _prodList = r[0].products;
        _renderProductsList(r[1]);
    })
        .catch(function (e) {
        if (_prodRoot) {
            _prodRoot.innerHTML =
                '<h2 class="page-title">🛍️ Products</h2><div class="card pd-alert">⚠ ' + _pEsc(e.message) +
                    '<br><span style="color:var(--muted);font-size:13px;">Check: you are logged in, and Vercel env (GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME) is set.</span>' +
                    '<div style="margin-top:12px"><button class="btn-gold" id="pd-retry">Retry</button></div></div>';
            const b = document.getElementById("pd-retry");
            if (b)
                b.addEventListener("click", initProductsPage);
        }
    });
}
function _categories() {
    const set = {};
    DEFAULT_CATEGORIES.forEach(function (c) {
        set[c] = true;
    });
    _prodList.forEach(function (p) {
        if (p.category_name && p.category_name !== "All")
            set[p.category_name] = true;
    });
    return Object.keys(set);
}
function _renderProductsList(me) {
    if (!_prodRoot)
        return;
    const cats = _categories();
    const warn = me && me.missing && me.missing.length ? '<div class="card pd-alert">⚠ Vercel env missing: <b>' + _pEsc(me.missing.join(", ")) + "</b> — publishing will not work until set.</div>" : "";
    const repo = me && me.repo ? "Publishing to <b>" + _pEsc(me.repo) + "</b>" : "";
    _prodRoot.innerHTML =
        '<div class="pd-head"><div><h2 class="page-title">🛍️ Products <span class="pd-count" id="pd-count"></span></h2>' +
            '<p class="page-desc" style="margin-bottom:0">Add / edit karo — save karte hi main website pe auto publish. ' + repo + "</p></div>" +
            '<button class="btn-gold" id="pd-add">＋ Add Product</button></div>' + warn +
            '<div class="pd-tools"><input type="search" id="pd-search" placeholder="Search products…" value="' + _pEsc(_prodQuery) + '">' +
            '<select id="pd-cat"><option value="">All categories</option>' +
            cats.map(function (c) {
                return '<option value="' + _pEsc(c) + '"' + (c === _prodCat ? " selected" : "") + ">" + _pEsc(c) + "</option>";
            }).join("") +
            '</select><button class="btn-outline" id="pd-reload">↻ Reload</button></div>' +
            '<div class="pd-grid" id="pd-grid"></div>';
    const add = document.getElementById("pd-add");
    if (add)
        add.addEventListener("click", function () {
            _openEditor(_blankDraft());
        });
    const reload = document.getElementById("pd-reload");
    if (reload)
        reload.addEventListener("click", initProductsPage);
    const s = document.getElementById("pd-search");
    if (s)
        s.addEventListener("input", function () {
            _prodQuery = s.value;
            _renderGrid();
        });
    const c = document.getElementById("pd-cat");
    if (c)
        c.addEventListener("change", function () {
            _prodCat = c.value;
            _renderGrid();
        });
    _renderGrid();
}
function _renderGrid() {
    const grid = document.getElementById("pd-grid");
    if (!grid)
        return;
    const q = _prodQuery.trim().toLowerCase();
    const list = _prodList
        .filter(function (p) {
        return (!q || (p.title + " " + p.tags.join(" ") + " " + p.category_name).toLowerCase().indexOf(q) !== -1) && (!_prodCat || p.category_name === _prodCat);
    })
        .slice()
        .reverse();
    const cnt = document.getElementById("pd-count");
    if (cnt)
        cnt.textContent = list.length + " / " + _prodList.length;
    if (!list.length) {
        grid.innerHTML = '<div class="empty-state">No products found.</div>';
        return;
    }
    grid.innerHTML = list
        .map(function (p) {
        const off = p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
        const inStock = p.variants.some(function (v) {
            return v.available;
        });
        return ('<div class="pd-card"><img src="' + _pEsc(p.images[0] || "") + '" alt="" loading="lazy" onerror="this.style.opacity=.2">' +
            '<div class="pd-card__b"><div class="pd-card__t" title="' + _pEsc(p.title) + '">' + _pEsc(p.title) + "</div>" +
            '<div class="pd-card__p"><b>' + _pMoney(p.price) + "</b>" + (off ? " <s>" + _pMoney(p.compare_at_price) + "</s> <em>" + off + "% off</em>" : "") + "</div>" +
            '<div class="pd-pills"><span class="pd-pill">' + _pEsc(p.category_name) + '</span><span class="pd-pill ' + (inStock ? "ok" : "bad") + '">' + (inStock ? "In stock" : "Out of stock") + "</span></div>" +
            '<div class="pd-card__a"><button class="btn-outline" data-edit="' + _pEsc(p.handle) + '">Edit</button>' +
            '<a class="btn-outline" target="_blank" rel="noopener" href="' + MAIN_SITE_URL + "/products/" + encodeURIComponent(p.handle) + '.html">View</a>' +
            '<button class="btn-danger" data-del="' + _pEsc(p.handle) + '">Delete</button></div></div></div>');
    })
        .join("");
    const eb = grid.querySelectorAll("[data-edit]");
    for (let i = 0; i < eb.length; i++) {
        const b = eb[i];
        b.addEventListener("click", function () {
            const p = _prodList.filter(function (x) {
                return x.handle === b.dataset.edit;
            })[0];
            if (p)
                _openEditor(_draftFrom(p));
        });
    }
    const db = grid.querySelectorAll("[data-del]");
    for (let i = 0; i < db.length; i++) {
        const b = db[i];
        b.addEventListener("click", function () {
            const p = _prodList.filter(function (x) {
                return x.handle === b.dataset.del;
            })[0];
            if (p)
                _deleteProduct(p);
        });
    }
}
function _deleteProduct(p) {
    if (_prodBusy)
        return;
    if (!window.confirm('Delete "' + p.title + '" from the website? Ye undo nahi hoga.'))
        return;
    _prodBusy = true;
    showToast("Deleting…");
    apiFetch("/api/products", { method: "POST", body: { action: "delete", handle: p.handle } })
        .then(function () {
        _prodList = _prodList.filter(function (x) {
            return x.handle !== p.handle;
        });
        _renderGrid();
        showToast("🗑️ Deleted. Website ~1 min me update ho jayegi.");
    })
        .catch(function (e) {
        showToast("⚠ " + e.message);
    })
        .then(function () {
        _prodBusy = false;
    });
}
function _openEditor(d) {
    _prodDraft = d;
    let ov = document.getElementById("pd-overlay");
    if (!ov) {
        ov = document.createElement("div");
        ov.id = "pd-overlay";
        ov.className = "pd-overlay";
        document.body.appendChild(ov);
    }
    document.body.style.overflow = "hidden";
    _renderEditor();
}
function _closeEditor() {
    const ov = document.getElementById("pd-overlay");
    if (ov && ov.parentNode)
        ov.parentNode.removeChild(ov);
    document.body.style.overflow = "";
    _prodDraft = null;
}
function _val(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}
function _syncDraft() {
    const d = _prodDraft;
    if (!d)
        return;
    d.title = _val("pe-title");
    d.description = _val("pe-desc");
    d.type = _val("pe-type");
    d.tags = _val("pe-tags");
    d.price = _val("pe-price");
    d.mrp = _val("pe-mrp");
    d.category = _val("pe-cat");
    d.optionName = _val("pe-optname");
    const stock = document.getElementById("pe-stock");
    if (stock)
        d.inStock = stock.checked;
    const rows = document.querySelectorAll(".pe-var");
    const vs = [];
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const o = r.querySelector(".pe-v-o");
        const p = r.querySelector(".pe-v-p");
        const a = r.querySelector(".pe-v-a");
        vs.push({ option1: o.value, price: p.value, available: a.checked });
    }
    d.variants = vs;
}
function _renderEditor() {
    const d = _prodDraft;
    const ov = document.getElementById("pd-overlay");
    if (!d || !ov)
        return;
    const isEdit = d.handle !== "";
    const cats = _categories();
    const price = parseFloat(d.price);
    const mrp = parseFloat(d.mrp);
    const off = mrp > price && price > 0 ? Math.round((1 - price / mrp) * 100) : 0;
    const imgs = d.images
        .map(function (u, i) {
        return ('<div class="pe-img' + (i === 0 ? " main" : "") + '"><img src="' + _pEsc(u) + '" alt="" onerror="this.style.opacity=.2">' +
            (i === 0 ? '<span class="pe-main">MAIN</span>' : "") +
            '<div class="pe-img__a"><button type="button" data-imv="' + i + '|-1" title="Move left">◀</button><button type="button" data-imv="' + i + '|1" title="Move right">▶</button>' +
            '<button type="button" data-imv="' + i + '|x" title="Remove">✕</button></div></div>');
    })
        .join("");
    const vars = d.variants
        .map(function (v) {
        return ('<div class="pe-var"><input class="pe-v-o" placeholder="e.g. M / Red" value="' + _pEsc(v.option1) + '"><input class="pe-v-p" type="number" min="0" placeholder="Price (optional)" value="' + _pEsc(v.price) +
            '"><label class="pe-chk"><input class="pe-v-a" type="checkbox"' + (v.available ? " checked" : "") + '> In stock</label><button type="button" class="pe-x" data-vdel>✕</button></div>');
    })
        .join("");
    ov.innerHTML =
        '<div class="pe-modal" role="dialog" aria-label="Product editor">' +
            '<div class="pe-top"><h3>' + (isEdit ? "✏️ Edit product" : "＋ Add product") + '</h3><button type="button" class="pe-close" id="pe-close" aria-label="Close">✕</button></div>' +
            '<div class="pe-body">' +
            '<div class="field"><label>Title *</label><input id="pe-title" maxlength="300" value="' + _pEsc(d.title) + '" placeholder="e.g. Men Cotton Printed T-Shirt"></div>' +
            '<div class="grid-2"><div class="field"><label>Category *</label><input id="pe-cat" list="pe-cats" value="' + _pEsc(d.category) + '" placeholder="Choose or type new"><datalist id="pe-cats">' +
            cats.map(function (c) {
                return '<option value="' + _pEsc(c) + '">';
            }).join("") +
            '</datalist></div><div class="field"><label>Type (optional)</label><input id="pe-type" value="' + _pEsc(d.type) + '" placeholder="e.g. tshirt"></div></div>' +
            '<div class="grid-2"><div class="field"><label>Selling price (₹) *</label><input id="pe-price" type="number" min="1" step="any" value="' + _pEsc(d.price) + '"></div>' +
            '<div class="field"><label>MRP / cut price (₹) <span class="pe-off" id="pe-off">' + (off ? off + "% off" : "") + '</span></label><input id="pe-mrp" type="number" min="0" step="any" value="' + _pEsc(d.mrp) + '" placeholder="optional"></div></div>' +
            '<div class="field"><label>Description</label><textarea id="pe-desc" rows="5" maxlength="5000" placeholder="Product details…">' + _pEsc(d.description) + "</textarea></div>" +
            '<div class="field"><label>Tags (comma separated)</label><input id="pe-tags" value="' + _pEsc(d.tags) + '" placeholder="cotton, men, summer"></div>' +
            '<div class="field"><label class="pe-chk big"><input type="checkbox" id="pe-stock"' + (d.inStock ? " checked" : "") + "> In stock (uncheck = Out of stock)</label></div>" +
            '<div class="pe-sec"><div class="pe-sec__t">🖼️ Images <span>(first = main image, max 12)</span></div>' +
            '<div class="pe-imgs" id="pe-imgs">' + (imgs || '<div class="pe-empty">No images yet</div>') + "</div>" +
            '<div class="pe-add">' +
            '<div class="pe-drop" id="pe-drop"><b>📁 Choose files</b> or drag &amp; drop here<br><small>Multiple allowed • auto-compressed • uploaded to imgbb → link</small>' +
            '<input type="file" id="pe-files" accept="image/*" multiple></div>' +
            '<div class="pe-link"><input id="pe-link" placeholder="…or paste image link(s) https://…"><button type="button" class="btn-outline" id="pe-link-add">Add link</button></div>' +
            '<div class="pe-upstat" id="pe-upstat"></div></div></div>' +
            '<div class="pe-sec"><div class="pe-sec__t">🎛️ Options / Variants <span>(optional — size, colour…)</span></div>' +
            '<div class="field"><label>Option name</label><input id="pe-optname" value="' + _pEsc(d.optionName) + '" placeholder="e.g. Size  (leave empty for single option)"></div>' +
            '<div id="pe-vars">' + vars + '</div><button type="button" class="btn-outline" id="pe-vadd">＋ Add option</button>' +
            '<div class="pe-hint">Need at least 2 options with an option name to enable variants. Empty price = same as selling price.</div></div>' +
            "</div>" +
            '<div class="pe-foot"><div class="pe-msg" id="pe-msg"></div><button type="button" class="btn-outline" id="pe-cancel">Cancel</button><button type="button" class="btn-gold" id="pe-save">🚀 ' +
            (isEdit ? "Update on website" : "Publish to website") + "</button></div></div>";
    _bindEditor();
}
function _bindEditor() {
    const on = function (id, ev, fn) {
        const el = document.getElementById(id);
        if (el)
            el.addEventListener(ev, fn);
    };
    on("pe-close", "click", _closeEditor);
    on("pe-cancel", "click", _closeEditor);
    on("pe-save", "click", _saveDraft);
    on("pe-vadd", "click", function () {
        _syncDraft();
        if (_prodDraft)
            _prodDraft.variants.push({ option1: "", price: "", available: true });
        _renderEditor();
    });
    const offUpd = function () {
        const p = parseFloat(_val("pe-price"));
        const m = parseFloat(_val("pe-mrp"));
        const o = document.getElementById("pe-off");
        if (o)
            o.textContent = m > p && p > 0 ? Math.round((1 - p / m) * 100) + "% off" : "";
    };
    on("pe-price", "input", offUpd);
    on("pe-mrp", "input", offUpd);
    const vars = document.querySelectorAll("[data-vdel]");
    for (let i = 0; i < vars.length; i++) {
        const b = vars[i];
        b.addEventListener("click", function () {
            _syncDraft();
            const row = b.parentElement;
            const all = document.querySelectorAll(".pe-var");
            let idx = -1;
            for (let k = 0; k < all.length; k++)
                if (all[k] === row)
                    idx = k;
            if (_prodDraft && idx >= 0)
                _prodDraft.variants.splice(idx, 1);
            _renderEditor();
        });
    }
    const imv = document.querySelectorAll("[data-imv]");
    for (let i = 0; i < imv.length; i++) {
        const b = imv[i];
        b.addEventListener("click", function () {
            _syncDraft();
            const parts = (b.dataset.imv || "").split("|");
            const idx = parseInt(parts[0], 10);
            const d = _prodDraft;
            if (!d)
                return;
            if (parts[1] === "x")
                d.images.splice(idx, 1);
            else {
                const to = idx + parseInt(parts[1], 10);
                if (to >= 0 && to < d.images.length) {
                    const t = d.images[idx];
                    d.images[idx] = d.images[to];
                    d.images[to] = t;
                }
            }
            _renderEditor();
        });
    }
    on("pe-link-add", "click", function () {
        const raw = _val("pe-link");
        const urls = raw.split(/[\s,]+/).filter(function (u) {
            return /^https?:\/\/\S+$/i.test(u);
        });
        if (!urls.length) {
            _setUpStat("Valid https:// link daalo.", true);
            return;
        }
        _syncDraft();
        _addImages(urls);
        _renderEditor();
    });
    on("pe-link", "keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            const b = document.getElementById("pe-link-add");
            if (b)
                b.click();
        }
    });
    const fi = document.getElementById("pe-files");
    if (fi)
        fi.addEventListener("change", function () {
            if (fi.files && fi.files.length)
                _uploadFiles(Array.prototype.slice.call(fi.files));
        });
    const drop = document.getElementById("pe-drop");
    if (drop) {
        drop.addEventListener("dragover", function (e) {
            e.preventDefault();
            drop.classList.add("over");
        });
        drop.addEventListener("dragleave", function () {
            drop.classList.remove("over");
        });
        drop.addEventListener("drop", function (e) {
            e.preventDefault();
            drop.classList.remove("over");
            const files = e.dataTransfer ? Array.prototype.slice.call(e.dataTransfer.files) : [];
            if (files.length)
                _uploadFiles(files);
        });
    }
}
function _addImages(urls) {
    const d = _prodDraft;
    if (!d)
        return;
    urls.forEach(function (u) {
        if (d.images.length < 12 && d.images.indexOf(u) === -1)
            d.images.push(u);
    });
}
function _setUpStat(msg, bad) {
    const el = document.getElementById("pe-upstat");
    if (!el)
        return;
    el.textContent = msg;
    el.className = "pe-upstat" + (bad ? " bad" : "");
}
function _setMsg(msg, bad) {
    const el = document.getElementById("pe-msg");
    if (!el)
        return;
    el.textContent = msg;
    el.className = "pe-msg" + (bad ? " bad" : "");
}
function _compress(file) {
    return new Promise(function (resolve, reject) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function () {
            URL.revokeObjectURL(url);
            const MAX = 1600;
            const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.max(1, Math.round(img.naturalWidth * k));
            const h = Math.max(1, Math.round(img.naturalHeight * k));
            const cv = document.createElement("canvas");
            cv.width = w;
            cv.height = h;
            const cx = cv.getContext("2d");
            if (!cx) {
                reject(new Error("Canvas not supported"));
                return;
            }
            cx.fillStyle = "#fff";
            cx.fillRect(0, 0, w, h);
            cx.drawImage(img, 0, 0, w, h);
            let q = 0.86;
            let out = cv.toDataURL("image/jpeg", q);
            while (out.length > 3600000 && q > 0.4) {
                q -= 0.1;
                out = cv.toDataURL("image/jpeg", q);
            }
            resolve(out);
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            reject(new Error("Not a valid image: " + file.name));
        };
        img.src = url;
    });
}
async function _uploadFiles(files) {
    const d = _prodDraft;
    if (!d || _prodBusy)
        return;
    _syncDraft();
    const imgs = files.filter(function (f) {
        return /^image\//.test(f.type);
    });
    if (!imgs.length) {
        _setUpStat("Sirf image files choose karo.", true);
        return;
    }
    const room = 12 - d.images.length;
    if (room <= 0) {
        _setUpStat("Max 12 images.", true);
        return;
    }
    _prodBusy = true;
    const batch = imgs.slice(0, room);
    let ok = 0;
    const errs = [];
    for (let i = 0; i < batch.length; i++) {
        _setUpStat("Uploading " + (i + 1) + " / " + batch.length + "…", false);
        try {
            const data = await _compress(batch[i]);
            const r = await apiFetch("/api/upload-image", { method: "POST", body: { image: data, name: batch[i].name.replace(/\.[^.]+$/, "") } });
            d.images.push(r.url);
            ok++;
        }
        catch (e) {
            errs.push(batch[i].name + ": " + (e instanceof Error ? e.message : "failed"));
        }
    }
    _prodBusy = false;
    if (!document.getElementById("pd-overlay"))
        return;
    _renderEditor();
    _setUpStat(ok + " uploaded" + (errs.length ? " • " + errs.join(" | ") : "") + (imgs.length > room ? " • limit 12" : ""), errs.length > 0);
}
function _saveDraft() {
    if (_prodBusy || !_prodDraft)
        return;
    _syncDraft();
    const d = _prodDraft;
    const price = parseFloat(d.price);
    if (d.title.trim().length < 3)
        return _setMsg("Title likho (min 3 letters).", true);
    if (!d.category.trim())
        return _setMsg("Category choose/type karo.", true);
    if (!(price > 0))
        return _setMsg("Selling price sahi daalo.", true);
    if (!d.images.length)
        return _setMsg("Kam se kam 1 image add karo.", true);
    const mrp = parseFloat(d.mrp);
    if (d.mrp && mrp <= price)
        _setMsg("Note: MRP selling price se bada hoga tabhi discount dikhega.", false);
    const named = d.variants.filter(function (v) {
        return v.option1.trim() !== "";
    });
    const product = {
        handle: d.handle || undefined,
        title: d.title.trim(),
        description: d.description.trim(),
        type: d.type.trim(),
        tags: d.tags,
        price: price,
        compare_at_price: d.mrp ? mrp : 0,
        category_name: d.category.trim(),
        images: d.images,
        in_stock: d.inStock,
        option_name: d.optionName.trim(),
        variants: named.map(function (v) {
            return { option1: v.option1.trim(), price: v.price === "" ? undefined : parseFloat(v.price), available: v.available };
        }),
    };
    _prodBusy = true;
    const btn = document.getElementById("pe-save");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Publishing…";
    }
    _setMsg("Publishing to GitHub… (10-20 sec)", false);
    apiFetch("/api/products", { method: "POST", body: { action: "save", product: product } })
        .then(function (r) {
        const saved = r.product;
        if (saved) {
            const idx = _prodList.map(function (p) {
                return p.handle;
            }).indexOf(saved.handle);
            if (idx >= 0)
                _prodList[idx] = saved;
            else
                _prodList.push(saved);
        }
        _prodBusy = false;
        _closeEditor();
        _renderGrid();
        showToast("✅ Published! Website pe ~1 min me live (Vercel redeploy).");
    })
        .catch(function (e) {
        _prodBusy = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Retry publish";
        }
        _setMsg("⚠ " + e.message, true);
    });
}
