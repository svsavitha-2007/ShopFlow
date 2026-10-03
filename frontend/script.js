"use strict";

/* =========================================================
   SHOPFLOW — front-end logic
   API contract with the Node.js server is unchanged.
   ========================================================= */

// Same origin when served by Express (port 3000); otherwise talk to localhost:3000
const API = location.port === "3000" ? "" : "http://localhost:3000";

let products = [];
let orders = [];
let historyLog = [];
let cart = [];
let heapNodes = [];
let skipLevels = [];
let highlightId = null;

const $ = id => document.getElementById(id);
const findProduct = id => products.find(p => Number(p.id) === Number(id));
const money = value => `₹${formatMoney(value)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const PRIORITY_NAMES = { 1: "Express", 2: "Standard", 3: "Economy" };
const priorityBadge = p => `<span class="priority-badge p${p}">${PRIORITY_NAMES[p] || "Standard"}</span>`;

const PRIORITY_PICKER = `
    <fieldset class="priority-picker">
        <legend>Order priority</legend>
        <label><input type="radio" name="priority" value="2" checked>
            <span><strong>Standard</strong><small>Processed in the order it arrived</small></span></label>
        <label><input type="radio" name="priority" value="1">
            <span><strong>⚡ Express</strong><small>Jumps ahead of Standard and Economy</small></span></label>
        <label><input type="radio" name="priority" value="3">
            <span><strong>Economy</strong><small>Processed after everything else</small></span></label>
    </fieldset>`;



/* =========================================================
   HELPERS
   ========================================================= */

function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(API + endpoint, {
        cache: "no-store",
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`Server returned an invalid response (${response.status}).`);
    }

    if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
    return data;
}

function extractList(data, keys) {
    if (Array.isArray(data)) return data;
    for (const key of [...keys, "data", "records", "items"]) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    console.warn("Unexpected API response shape:", data);
    return [];
}

/* Order/history records may use slightly different field names */
function readRecord(item) {
    const productID = Number(item.productID ?? item.productId ?? 0);
    const product = findProduct(productID);
    return {
        id: Number(item.orderID ?? item.id ?? 0),
        productID,
        name: product ? product.name : `Product ${productID}`,
        quantity: Number(item.quantity ?? item.newQuantity ?? 0),
        amount: Number(item.totalAmount ?? item.amount ?? item.newAmount ?? 0),
        priority: Number(item.priority ?? 2),
        action: item.actionType || item.action || item.status || "Processed"
    };
}


/* =========================================================
   PRODUCT IMAGES (with fallback)
   ========================================================= */

const unsplash = id =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

const productImages = {
    101: unsplash("photo-1511707171634-5f897ff02aa9"),
    103: unsplash("photo-1587829741301-dc798b83add3"),
    105: unsplash("photo-1496181133206-80ce9b88a853"),
    108: unsplash("photo-1523275335684-37898b6baf30"),
    110: unsplash("photo-1505740420928-5e560c06d30e")
};

const getProductImage = id =>
    productImages[Number(id)] || productImages[108];

const IMAGE_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#2a313c"/>
        <g fill="none" stroke="#98a3b3" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="150" y="105" width="100" height="90" rx="10"/>
            <path d="M150 190l35-40 30 30 15-15 20 25"/>
        </g>
        <circle cx="222" cy="131" r="8" fill="#98a3b3"/>
    </svg>`
);

/* 'error' does not bubble, so listen in the capture phase */
document.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
    img.dataset.fallback = "true";
    img.src = IMAGE_PLACEHOLDER;
}, true);


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function showToast(title, message, isError = false) {
    const toast = $("toast");
    if (!toast) return console.log(title, message);

    $("toastTitle").textContent = title;
    $("toastMessage").textContent = message;

    const icon = $("toastIcon");
    icon.textContent = isError ? "!" : "✓";
    icon.style.color = isError ? "var(--danger)" : "var(--accent)";

    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3800);
}


/* =========================================================
   DIALOG  (replaces confirm() and prompt())
   openDialog({ title, message, bodyHtml, confirmText, cancelText,
                danger, input: { label, value, min } })
   Resolves true/false, or Number/null when an input is used.
   ========================================================= */

function openDialog(opts) {

    const backdrop = $("dialog");
    const modal = backdrop.querySelector(".modal");
    const confirmBtn = $("dialogConfirm");
    const cancelBtn = $("dialogCancel");
    const body = $("dialogBody");
    const hasInput = Boolean(opts.input);
    const previousFocus = document.activeElement;

    $("dialogTitle").textContent = opts.title || "";
    $("dialogMessage").textContent = opts.message || "";
    $("dialogMessage").hidden = !opts.message;
    confirmBtn.textContent = opts.confirmText || "Confirm";
    cancelBtn.textContent = opts.cancelText || "Cancel";
    confirmBtn.classList.toggle("danger", Boolean(opts.danger));

    body.innerHTML = hasInput
        ? `<label class="modal-field">
               <span>${escapeHtml(opts.input.label)}</span>
               <input id="dialogInput" type="number" inputmode="numeric" step="1"
                      min="${opts.input.min ?? 1}" value="${escapeHtml(opts.input.value ?? "")}">
               <small id="dialogError" class="modal-error" role="alert"></small>
           </label>`
        : (opts.bodyHtml || "");

    backdrop.hidden = false;
    document.body.classList.add("modal-open");

    const input = $("dialogInput");
    (input || confirmBtn).focus();
    if (input) input.select();

    return new Promise(resolve => {

        function close(ok) {
            backdrop.hidden = true;
            document.body.classList.remove("modal-open");
            document.removeEventListener("keydown", onKey, true);
            confirmBtn.onclick = cancelBtn.onclick = backdrop.onmousedown = null;
            if (previousFocus && previousFocus.focus) previousFocus.focus();
            resolve(ok ? (hasInput ? Number(input.value) : true) : (hasInput ? null : false));
        }

        function submit() {
            if (hasInput) {
                const min = Number(opts.input.min ?? 1);
                const value = Number(input.value);
                if (!Number.isInteger(value) || value < min) {
                    $("dialogError").textContent = `Enter a whole number of ${min} or more.`;
                    input.focus();
                    return;
                }
            }
            close(true);
        }

        function onKey(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                close(false);
            } else if (event.key === "Enter" && document.activeElement !== cancelBtn) {
                event.preventDefault();
                submit();
            } else if (event.key === "Tab") {
                const items = [...modal.querySelectorAll("input, button")].filter(el => !el.disabled);
                const first = items[0], last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault(); last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault(); first.focus();
                }
            }
        }

        confirmBtn.onclick = submit;
        cancelBtn.onclick = () => close(false);
        backdrop.onmousedown = e => { if (e.target === backdrop) close(false); };
        document.addEventListener("keydown", onKey, true);
    });
}


/* =========================================================
   NAVIGATION
   ========================================================= */

const sectionTitles = {
    products: "Product explorer",
    orders: "Order queue",
    dsa: "DSA engine",
    history: "Order history"
};

function greeting() {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return `${part} 👋`;
}

function showSection(section) {

    document.querySelectorAll(".nav-item").forEach(item => {
        const active = item.dataset.section === section;
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });

    document.querySelectorAll(".page-section").forEach(page =>
        page.classList.toggle("active-section", page.id === section)
    );

    $("pageTitle").textContent =
        section === "dashboard" ? greeting() : (sectionTitles[section] || "ShopFlow");

    window.scrollTo({ top: 0 });
    if (section === "history") loadHistory().catch(() => {});
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(item =>
        item.addEventListener("click", () => showSection(item.dataset.section))
    );
}


/* =========================================================
   THEME  (dark is the default)
   ========================================================= */

function applyTheme(theme) {
    const light = theme === "light";
    document.body.classList.toggle("light-mode", light);
    $("themeIcon").textContent = light ? "☀️" : "🌙";
    $("themeText").textContent = light ? "Light" : "Dark";
    try { localStorage.setItem("shopflow-theme", theme); } catch { /* storage blocked */ }
}

function setupTheme() {
    let saved = null;
    try { saved = localStorage.getItem("shopflow-theme"); } catch { /* ignore */ }
    applyTheme(saved === "light" ? "light" : "dark");

    $("themeToggle").addEventListener("click", () =>
        applyTheme(document.body.classList.contains("light-mode") ? "dark" : "light")
    );
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {
    const data = await apiRequest("/api/products");
    products = Array.isArray(data.products) ? data.products : [];
    renderProducts();
    renderQuickAdd();
    updateDashboard();
}

function renderProducts() {
    const grid = $("productGrid");

    if (!products.length) {
        grid.innerHTML = `<div class="loading">No products found.</div>`;
        return;
    }

    grid.innerHTML = products.map(product => {
        const stock = Number(product.stock || 0);
        const stockClass = stock <= 0 ? "stock-empty" : stock <= 5 ? "stock-low" : "stock-good";
        const stockText = stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : `${stock} in stock`;

        return `
            <article class="product-card">
                <div class="product-image-wrap">
                    <img class="product-image" src="${getProductImage(product.id)}"
                         alt="${escapeHtml(product.name)}" loading="lazy">
                    <span class="product-id">#${product.id}</span>
                </div>
                <div class="product-card-body">
                    <span class="product-category">ShopFlow product</span>
                    <h3>${escapeHtml(product.name)}</h3>
<div class="product-stock ${stockClass}">
                        <span class="stock-pip"></span>${stockText}
                    </div>
                    <div class="product-footer">
                        <div class="product-price">${money(product.price)}</div>
                        <button type="button" class="primary-button add-cart-button"
                                onclick="addToCart(${Number(product.id)})" ${stock <= 0 ? "disabled" : ""}>
                            ${stock <= 0 ? "Sold out" : "Add to cart"}
                        </button>
                    </div>
                </div>
            </article>`;
    }).join("");
}

async function searchProduct() {
    const input = $("productSearch");
    const result = $("searchResult");
    const id = Number(input.value);

    if (!Number.isInteger(id) || id <= 0) {
        result.innerHTML = `<div class="search-highlight">Enter a product ID, for example 105.</div>`;
        input.focus();
        return;
    }

    try {
        const data = await apiRequest(`/api/products/${id}`);
        const product = data.success && data.product ? data.product : null;

        result.innerHTML = product
            ? `<div class="search-highlight">
                   <strong>Skip list found ${escapeHtml(product.name)}${data.steps ? ` in ${plural(data.steps, "comparison")}` : ""}</strong>
                   <span>Product #${product.id}</span>
                   <span>${money(product.price)}</span>
                   <span>${product.stock} in stock</span>
                   <button type="button" class="small-button" onclick="addToCart(${Number(product.id)})">Add to cart</button>
               </div>`
            : `<div class="search-highlight">No product found with ID ${id}.</div>`;

        highlightId = product ? Number(product.id) : null;
        renderSkipLanes();

    } catch (error) {
        result.innerHTML =
            `<div class="search-highlight">No product found with ID ${id}. ${escapeHtml(error.message)}</div>`;
    }
}

document.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target && event.target.id === "productSearch") searchProduct();
});


/* =========================================================
   CART
   ========================================================= */

function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem("shopflow_cart") || "[]");
        cart = Array.isArray(saved) ? saved : [];
    } catch {
        cart = [];
    }
}

function saveCart() {
    try { localStorage.setItem("shopflow_cart", JSON.stringify(cart)); } catch { /* ignore */ }
}

/* Drop cart lines whose product no longer exists, cap to current stock */
function reconcileCart() {
    cart = cart.filter(item => findProduct(item.productID));
    cart.forEach(item => {
        const stock = Number(findProduct(item.productID).stock || 0);
        item.quantity = Math.min(Number(item.quantity) || 1, Math.max(stock, 1));
    });
    cart = cart.filter(item => Number(findProduct(item.productID).stock || 0) > 0);
    saveCart();
}

function addToCart(productID) {
    const product = findProduct(productID);
    if (!product) return showToast("Product not found", "This product is no longer available.", true);

    const stock = Number(product.stock || 0);
    if (stock <= 0) return showToast("Out of stock", `${product.name} is currently unavailable.`, true);

    const existing = cart.find(item => Number(item.productID) === Number(productID));

    if (existing) {
        if (existing.quantity >= stock) {
            return showToast("Stock limit reached", `Only ${plural(stock, "unit")} available.`, true);
        }
        existing.quantity += 1;
    } else {
        cart.push({ productID: Number(productID), quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showToast("Added to cart", `${product.name} was added to your cart.`);
}

function removeFromCart(productID) {
    cart = cart.filter(item => Number(item.productID) !== Number(productID));
    saveCart();
    updateCartUI();
    showToast("Removed", "Product removed from your cart.");
}

function changeCartQuantity(productID, amount) {
    const item = cart.find(entry => Number(entry.productID) === Number(productID));
    const product = findProduct(productID);
    if (!item || !product) return;

    item.quantity += amount;

    if (item.quantity <= 0) return removeFromCart(productID);

    const stock = Number(product.stock || 0);
    if (item.quantity > stock) {
        item.quantity = stock;
        showToast("Stock limit reached", `Only ${plural(stock, "unit")} available.`, true);
    }

    saveCart();
    updateCartUI();
}

const getCartItemCount = () =>
    cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const getCartTotal = () =>
    cart.reduce((sum, item) => {
        const product = findProduct(item.productID);
        return product ? sum + Number(product.price) * Number(item.quantity) : sum;
    }, 0);

function updateCartUI() {
    renderCart();
    renderCartPreview();

    const count = getCartItemCount();
    const total = money(getCartTotal());

    $("cartCount").textContent = count;
    $("cartItemCount").textContent = count;
    $("cartSubtotal").textContent = total;
    $("cartTotal").textContent = total;
    $("cartCountBadge").textContent = plural(count, "item");
    $("checkoutButton").disabled = cart.length === 0;
    $("previewCheckout").disabled = cart.length === 0;

    updateDashboard();
}

function renderCart() {
    const container = $("cartItems");

    if (!cart.length) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon" aria-hidden="true">🛒</div>
                <strong>Your cart is empty</strong>
                <span>Add a product to get started.</span>
            </div>`;
        return;
    }

    container.innerHTML = cart.map(item => {
        const product = findProduct(item.productID);
        if (!product) return "";

        return `
            <div class="cart-item">
                <img src="${getProductImage(product.id)}" alt="${escapeHtml(product.name)}">
                <div class="cart-item-info">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span>${money(product.price)} each</span>
                    <div class="cart-item-controls">
                        <button type="button" aria-label="Decrease quantity" onclick="changeCartQuantity(${product.id}, -1)">−</button>
                        <strong>${item.quantity}</strong>
                        <button type="button" aria-label="Increase quantity" onclick="changeCartQuantity(${product.id}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-right">
                    <strong>${money(Number(product.price) * item.quantity)}</strong>
                    <button type="button" class="remove-cart-button" onclick="removeFromCart(${product.id})">Remove</button>
                </div>
            </div>`;
    }).join("");
}

function renderCartPreview() {
    const container = $("cartPreview");
    $("cartPreviewTotal").textContent = money(getCartTotal());

    if (!cart.length) {
        container.innerHTML = `<div class="empty-cart">Your cart is empty.<br>Add products to get started.</div>`;
        return;
    }

    container.innerHTML = cart.slice(0, 4).map(item => {
        const product = findProduct(item.productID);
        if (!product) return "";
        return `
            <div class="cart-preview-item">
                <img src="${getProductImage(product.id)}" alt="">
                <div>
                    <strong>${escapeHtml(product.name)}</strong>
                    <div class="cart-item-controls">
                        <button type="button" aria-label="Decrease quantity" onclick="changeCartQuantity(${product.id}, -1)">−</button>
                        <span>${item.quantity}</span>
                        <button type="button" aria-label="Increase quantity" onclick="changeCartQuantity(${product.id}, 1)">+</button>
                    </div>
                </div>
                <strong>${money(Number(product.price) * item.quantity)}</strong>
            </div>`;
    }).join("") + (cart.length > 4
        ? `<div class="empty-cart" style="min-height:auto;padding:6px">+ ${cart.length - 4} more</div>` : "");
}


/* =========================================================
   CHECKOUT
   The C engine accepts one product per order, so each cart
   line is submitted in sequence to keep FIFO ordering.
   ========================================================= */

async function checkoutCart() {

    if (!cart.length) {
        return showToast("Cart empty", "Add at least one product before checking out.", true);
    }

    const total = getCartTotal();
    const itemCount = getCartItemCount();

    const lines = cart.map(item => {
        const product = findProduct(item.productID);
        return product
            ? `<li><span>${escapeHtml(product.name)} × ${item.quantity}</span>
                   <strong>${money(Number(product.price) * item.quantity)}</strong></li>`
            : "";
    }).join("");

    const confirmed = await openDialog({
        title: "Place this order?",
        message: `${plural(itemCount, "item")} will be added to the order queue.`,
        bodyHtml: `<ul class="modal-lines">${lines}
                   <li class="modal-total"><span>Total</span><strong>${money(total)}</strong></li></ul>${PRIORITY_PICKER}`,
        confirmText: "Place order",
        cancelText: "Keep shopping"
    });

    if (!confirmed) return;

    const picked = document.querySelector('input[name="priority"]:checked');
    const priority = picked ? Number(picked.value) : 2;

    const button = $("checkoutButton");
    button.disabled = true;
    button.textContent = "Placing order…";

    try {
        const lineItems = cart.map(item => ({
            productID: Number(item.productID),
            quantity: Number(item.quantity),
            priority
        }));

        for (const item of lineItems) {
            const data = await apiRequest("/api/orders", {
                method: "POST",
                body: JSON.stringify(item)
            });
            if (data.success === false) {
                throw new Error(data.message || "One of the products could not be ordered.");
            }
        }

        cart = [];
        saveCart();
        await refreshAll(false);

        showToast("Order placed", `${plural(itemCount, "item")} worth ${money(total)} added to the queue.`);
        logActivity("placed", `Placed ${plural(itemCount, "item")} from your cart (${PRIORITY_NAMES[priority]})`, total);
        showSection("orders");

    } catch (error) {
        showToast("Order failed", error.message || "Could not place the order. Try again.", true);
        await refreshAll(false).catch(() => {});

    } finally {
        button.textContent = "Checkout →";
        button.disabled = cart.length === 0;
    }
}


/* =========================================================
   ORDERS
   ========================================================= */

async function loadOrders() {
    const data = await apiRequest("/api/orders");
    orders = Array.isArray(data.orders) ? data.orders : [];
    heapNodes = Array.isArray(data.heap) ? data.heap : [];
    renderOrders();
    renderQueue();
    renderHeap();
    renderDashboardOrders();
    updateDashboard();
}

function renderOrders() {
    const container = $("ordersTable");

    if (!orders.length) {
        container.innerHTML = `<div class="loading">No pending orders. Check out a cart to create one.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="order-row order-header">
            <div>ID</div><div>Product</div><div>Quantity</div><div>Amount</div><div>Priority</div><div>Actions</div>
        </div>` +
        orders.map(raw => {
            const o = readRecord(raw);
            return `
                <div class="order-row">
                    <div class="order-id">#${o.id}</div>
                    <div>${escapeHtml(o.name)}</div>
                    <div>${o.quantity}</div>
                    <div>${money(o.amount)}</div>
                    <div>${priorityBadge(o.priority)}</div>
                    <div class="action-buttons">
                        ${o.priority > 1 ? `<button type="button" class="small-button express" onclick="prioritizeOrder(${o.id})">⚡ Express</button>` : ""}
                        <button type="button" class="small-button" onclick="editOrder(${o.id}, ${o.quantity})">Edit</button>
                        <button type="button" class="small-button" onclick="cancelOrder(${o.id})">Cancel</button>
                    </div>
                </div>`;
        }).join("");
}

function renderQueue() {
    const track = $("queueTrack");

    if (!orders.length) {
        track.innerHTML = `<div class="empty-queue">Queue is empty</div>`;
        return;
    }

    track.innerHTML = orders.map((raw, index) => {
        const o = readRecord(raw);
        return `${index > 0 ? `<span class="queue-arrow" aria-hidden="true">→</span>` : ""}
            <div class="queue-box p${o.priority}">
                <strong>#${o.id}</strong>
                <small>${escapeHtml(o.name)}</small>
                ${priorityBadge(o.priority)}
            </div>`;
    }).join("");
}

function renderDashboardOrders() {
    const container = $("dashboardOrders");

    if (!orders.length) {
        container.innerHTML = `<div class="loading">No pending orders.</div>`;
        return;
    }

    container.innerHTML = orders.slice(0, 4).map(raw => {
        const o = readRecord(raw);
        return `
            <div class="order-row">
                <div class="order-id">#${o.id}</div>
                <div>${escapeHtml(o.name)}</div>
                <div>× ${o.quantity}</div>
                <div>${money(o.amount)}</div>
                <div>${priorityBadge(o.priority)}</div>
            </div>`;
    }).join("");
}

async function editOrder(orderID, currentQuantity) {

    const quantity = await openDialog({
        title: `Edit order #${orderID}`,
        message: "Change how many units this order contains.",
        input: { label: "Quantity", value: currentQuantity, min: 1 },
        confirmText: "Save changes"
    });

    if (quantity === null || quantity === Number(currentQuantity)) return;

    try {
        const data = await apiRequest(`/api/orders/${orderID}`, {
            method: "PUT",
            body: JSON.stringify({ quantity })
        });

        if (data.success === false) {
            return showToast("Update failed", data.message || "Could not update the order.", true);
        }

        showToast("Order updated", data.message || `Order #${orderID} now has ${plural(quantity, "unit")}.`);
        logActivity("edited", `Order #${orderID} changed to ${plural(quantity, "unit")}`);
        await refreshAll(false);

    } catch (error) {
        showToast("Update failed", error.message || "Could not update the order.", true);
    }
}

async function prioritizeOrder(orderID) {
    try {
        const data = await apiRequest(`/api/orders/${orderID}/priority`, {
            method: "PUT",
            body: JSON.stringify({ priority: 1 })
        });

        if (data.success === false) {
            return showToast("Priority not changed", data.message || "Could not change the priority.", true);
        }

        showToast("Moved to Express", `Order #${orderID} will be processed first.`);
        logActivity("edited", `Order #${orderID} upgraded to Express`);
        await refreshAll(false);

    } catch (error) {
        showToast("Priority not changed", error.message || "Could not change the priority.", true);
    }
}

async function cancelOrder(orderID) {

    const confirmed = await openDialog({
        title: `Cancel order #${orderID}?`,
        message: "The order is removed from the queue. Use “Undo last action” to bring it back.",
        confirmText: "Cancel order",
        cancelText: "Keep order",
        danger: true
    });

    if (!confirmed) return;

    try {
        const data = await apiRequest(`/api/orders/${orderID}`, { method: "DELETE" });

        if (data.success === false) {
            return showToast("Cancel failed", data.message || "Could not cancel the order.", true);
        }

        showToast("Order cancelled", data.message || `Order #${orderID} was cancelled.`);
        logActivity("cancelled", `Order #${orderID} cancelled`);
        await refreshAll(false);

    } catch (error) {
        showToast("Cancel failed", error.message || "Could not cancel the order.", true);
    }
}

/* Shared runner for process / undo (POST with no body) */
async function runAction(endpoint, okTitle, okFallback, failTitle) {
    try {
        const data = await apiRequest(endpoint, { method: "POST" });

        if (data.success === false) {
            return showToast(failTitle, data.message || "Nothing to do right now.", true);
        }

        showToast(okTitle, data.message || okFallback);
        await refreshAll(false);
        return true;

    } catch (error) {
        showToast(failTitle, error.message || "Something went wrong.", true);
    }
}

async function processNextOrder() {
    if (!orders.length) {
        return showToast("Queue empty", "There are no pending orders to process.", true);
    }
    const next = readRecord(orders[0]);
    const ok = await runAction("/api/orders/process", "Order processed", "The next order was processed.", "Processing failed");
    if (ok) logActivity("processed", `Order #${next.id} processed: ${next.name}`, next.amount);
}

async function undoLastAction() {
    const ok = await runAction("/api/undo", "Action undone", "The last action has been undone.", "Undo failed");
    if (ok) logActivity("undone", "Last action undone");
}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {
    const data = await apiRequest("/api/history");
    historyLog = extractList(data, ["orders", "history", "logs", "transactions"]);
    renderHistory();
    updateDashboard();
}

function actionBadge(action) {
    const a = String(action).toLowerCase();
    const cls = a.includes("cancel") ? "status-cancelled"
              : a.includes("process") || a.includes("complete") ? "status-processed"
              : "status-pending";
    return `<span class="status-badge ${cls}">${escapeHtml(action)}</span>`;
}

function renderHistory() {
    const container = $("historyTable");

    if (!historyLog.length) {
        container.innerHTML = `<div class="loading">No activity yet. Processed orders will appear here.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="history-row history-header">
            <div>Order</div><div>Action</div><div>Product</div><div>Quantity</div><div>Amount</div>
        </div>` +
        historyLog.map(raw => {
            const h = readRecord(raw);
            return `
                <div class="history-row">
                    <div class="order-id">#${h.id}</div>
                    <div>${actionBadge(h.action)}</div>
                    <div>${escapeHtml(h.name)}</div>
                    <div>${h.quantity}</div>
                    <div>${money(h.amount)}</div>
                </div>`;
        }).join("");
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function animateNumber(el, to) {
    const from = Number(el.dataset.value ?? NaN);
    el.dataset.value = to;
    if (!Number.isFinite(from) || from === to ||
        matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = to;
        return;
    }
    const start = performance.now();
    (function tick(now) {
        const t = Math.min((now - start) / 450, 1);
        el.textContent = Math.round(from + (to - from) * t);
        if (t < 1) requestAnimationFrame(tick);
    })(start);
}

function updateDashboard() {
    const processed = historyLog.filter(item => {
        const action = String(item.actionType || item.action || item.status || "").toLowerCase();
        return action.includes("process") || action.includes("complete");
    }).length;

    animateNumber($("productCount"), products.length);
    animateNumber($("pendingCount"), orders.length);
    animateNumber($("processedCount"), processed);
    $("sidebarOrderCount").textContent = orders.length;
    $("totalValue").textContent = money(getCartTotal());
}


/* =========================================================
   DASHBOARD EXTRAS: quick add, activity feed, links, auto-refresh
   ========================================================= */

function renderQuickAdd() {
    const row = $("quickAdd");
    if (!products.length) {
        row.innerHTML = `<div class="loading">No products yet.</div>`;
        return;
    }
    row.innerHTML = products.slice(0, 6).map(p => {
        const soldOut = Number(p.stock || 0) <= 0;
        return `
            <div class="quick-item">
                <img src="${getProductImage(p.id)}" alt="">
                <div><strong>${escapeHtml(p.name)}</strong><span>${money(p.price)}</span></div>
                <button type="button" class="small-button" onclick="addToCart(${Number(p.id)})" ${soldOut ? "disabled" : ""}>
                    ${soldOut ? "Sold out" : "+ Add"}
                </button>
            </div>`;
    }).join("");
}

let activity = [];

function loadActivity() {
    try { activity = JSON.parse(localStorage.getItem("shopflow_activity") || "[]"); } catch { activity = []; }
    if (!Array.isArray(activity)) activity = [];
}

function logActivity(type, text, amount = null) {
    activity.unshift({ type, text, amount, time: Date.now() });
    activity = activity.slice(0, 40);
    try { localStorage.setItem("shopflow_activity", JSON.stringify(activity)); } catch { /* ignore */ }
    renderActivity();
}

function timeAgo(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function renderActivity() {
    const html = list => list.length
        ? list.map(a => `
            <div class="activity-item">
                <span class="activity-dot ${a.type}"></span>
                <div><strong>${escapeHtml(a.text)}</strong><small>${timeAgo(a.time)}</small></div>
                ${a.amount != null ? `<span class="activity-amount">${money(a.amount)}</span>` : ""}
            </div>`).join("")
        : `<div class="loading">Nothing yet. Place, edit or process an order and it shows up here.</div>`;

    $("activityFeed").innerHTML = html(activity.slice(0, 5));
    $("sessionLog").innerHTML = html(activity);
}

function setupDashboardLinks() {
    document.querySelectorAll("[data-goto]").forEach(el => {
        el.addEventListener("click", () => showSection(el.dataset.goto));
        el.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showSection(el.dataset.goto); }
        });
    });
}

async function manualRefresh() {
    const icon = $("refreshIcon");
    icon.classList.add("spinning");
    try { await refreshAll(true); } catch { /* toast already shown */ }
    icon.classList.remove("spinning");
}

async function refreshHistory() {
    try {
        await loadHistory();
        showToast("History updated", `${plural(historyLog.length, "record")} loaded from the server.`);
    } catch (error) {
        showToast("Could not load history", error.message || "Server unreachable.", true);
    }
}

/* Keep the dashboard, queue and history live (skips the shop page so the grid doesn't jump) */
function startAutoRefresh() {
    setInterval(() => {
        if (document.hidden || !$("dialog").hidden) return;
        if (document.querySelector("#products.active-section")) return;
        refreshAll(false, true).catch(() => {});
    }, 15000);
    setInterval(renderActivity, 60000);
}


/* =========================================================
   LIVE DATA-STRUCTURE VISUALS (DSA page)
   ========================================================= */

async function loadSkipList() {
    try {
        const data = await apiRequest("/api/skiplist");
        skipLevels = Array.isArray(data.levels) ? data.levels : [];
        renderSkipLanes();
    } catch { /* the visual is optional */ }
}

function renderSkipLanes() {
    const box = $("skipLanes");
    if (!box) return;

    if (!skipLevels.length) {
        box.innerHTML = `<div class="loading">No data yet</div>`;
        return;
    }

    const keys = skipLevels[0];

    box.innerHTML = skipLevels
        .map((lane, level) => ({ lane, level }))
        .reverse()
        .map(({ lane, level }) => `
            <div class="skip-lane">
                <span class="skip-label">L${level}</span>
                <div class="skip-track">
                    ${keys.map(key => lane.includes(key)
                        ? `<span class="skip-node${key === highlightId ? " found" : ""}">${key}</span>`
                        : `<span class="skip-gap"></span>`).join("")}
                </div>
            </div>`)
        .join("");
}

function renderHeap() {
    const box = $("heapTree");
    if (!box) return;

    if (!heapNodes.length) {
        box.innerHTML = `<div class="loading">Queue is empty</div>`;
        return;
    }

    let html = "";
    let start = 0;
    let width = 1;

    while (start < heapNodes.length) {
        const row = heapNodes.slice(start, start + width);
        html += `<div class="heap-row">` + row.map((node, i) =>
            `<span class="heap-node p${node.priority}${start + i === 0 ? " root" : ""}"
                   title="${PRIORITY_NAMES[node.priority] || ""}">#${node.id}</span>`).join("") + `</div>`;
        start += width;
        width *= 2;
    }

    box.innerHTML = html;
}


/* =========================================================
   REFRESH & START-UP
   ========================================================= */

function setApiStatus(online) {
    const el = $("apiStatus");
    el.style.opacity = online ? "1" : ".75";
    el.querySelector(".status-dot").style.background = online ? "var(--accent)" : "var(--danger)";
    $("apiStatusText").textContent = online ? "API connected" : "API offline";
}

async function refreshAll(showRefreshToast = true, quiet = false) {
    try {
        await Promise.all([loadProducts(), loadOrders(), loadHistory(), loadSkipList()]);
        // orders/history names depend on products, so redraw once all are loaded
        renderOrders(); renderQueue(); renderDashboardOrders(); renderHistory();
        reconcileCart();
        updateCartUI();
        setApiStatus(true);
        if (showRefreshToast) showToast("Refreshed", "ShopFlow data is up to date.");

    } catch (error) {
        setApiStatus(false);
        if (!quiet) showToast("Refresh failed", error.message || "Could not reach the server.", true);
        throw error;
    }
}

function showConnectionProblem() {
    const message = `
        <div class="empty-cart">
            <strong>Can’t reach the server</strong>
            <span>Start the Node.js server on port 3000, then try again.</span>
            <button type="button" class="small-button" style="margin-top:12px" onclick="retryConnection()">Try again</button>
        </div>`;
    ["productGrid", "dashboardOrders", "ordersTable", "historyTable"].forEach(id => {
        $(id).innerHTML = message;
    });
}

async function retryConnection() {
    try {
        await refreshAll(false);
        showToast("Connected", "ShopFlow is back online.");
    } catch {
        showConnectionProblem();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setupTheme();
    setupNavigation();
    setupDashboardLinks();
    loadActivity();
    renderActivity();
    startAutoRefresh();
    $("pageTitle").textContent = greeting();
    loadCart();
    updateCartUI();

    try {
        await refreshAll(false);
    } catch {
        showConnectionProblem();
    }
});


/* =========================================================
   SHOPFLOW AI ASSISTANT (chat widget)
   Talks to POST /api/chat on the server. The OpenAI key stays
   on the server (backend/.env) and is never sent to the browser.
   Self-contained: it only uses the API constant defined above.
   ========================================================= */

(function setupAiAssistant() {

    const toggle = document.getElementById("aiToggle");
    const panel = document.getElementById("aiPanel");
    const list = document.getElementById("aiMessages");
    const form = document.getElementById("aiForm");
    const input = document.getElementById("aiInput");
    const sendButton = document.getElementById("aiSend");

    if (!toggle || !panel || !list || !form || !input || !sendButton) return;

    const WELCOME =
        "Hi! I'm the **ShopFlow AI Assistant**. I can explain how ShopFlow works: " +
        "products, ordering, priorities, undo and more. What would you like to know?";

    const SUGGESTIONS = [
        "How does ordering work?",
        "What is Express priority?",
        "How does undo work?"
    ];

    let conversation = [];     // earlier turns: [{ role: "user" | "assistant", content }]
    let busy = false;
    let started = false;
    let lastQuestion = "";
    let lastQuestionBubble = null;


    /* ---------- small helpers ---------- */

    const esc = text => String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    // Safe mini-formatter: escape first, then allow **bold**, `code` and "- " lists
    function format(text) {
        const inline = line => line
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/`([^`]+)`/g, "<code>$1</code>");

        let html = "";
        let inList = false;

        for (const line of esc(text).split("\n")) {
            const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);

            if (item) {
                if (!inList) { html += "<ul>"; inList = true; }
                html += `<li>${inline(item[1])}</li>`;
                continue;
            }

            if (inList) { html += "</ul>"; inList = false; }
            if (line.trim()) html += `<p>${inline(line)}</p>`;
        }

        if (inList) html += "</ul>";
        return html;
    }

    function addMessage(role, html) {
        const row = document.createElement("div");
        row.className = `ai-msg ai-${role}`;
        row.innerHTML = `<div class="ai-bubble">${html}</div>`;
        list.appendChild(row);
        list.scrollTop = list.scrollHeight;
        return row;
    }

    function showWelcome() {
        list.innerHTML = "";

        const chips = SUGGESTIONS
            .map(q => `<button type="button" class="ai-chip" data-q="${esc(q)}">${esc(q)}</button>`)
            .join("");

        addMessage("assistant", `${format(WELCOME)}<div class="ai-chips">${chips}</div>`);
    }

    function setBusy(value) {
        busy = value;
        sendButton.disabled = value;
        panel.setAttribute("aria-busy", String(value));
    }

    function autosize() {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
    }


    /* ---------- open / close ---------- */

    function openPanel() {
        panel.hidden = false;
        document.body.classList.add("ai-open");
        toggle.setAttribute("aria-expanded", "true");

        if (!started) {
            showWelcome();
            started = true;
        }

        input.focus();
    }

    function closePanel() {
        panel.hidden = true;
        document.body.classList.remove("ai-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    }


    /* ---------- sending a message ---------- */

    async function send(text) {
        text = (text || "").trim();
        if (!text || busy) return;

        lastQuestion = text;
        lastQuestionBubble = addMessage("user", esc(text).replace(/\n/g, "<br>"));

        input.value = "";
        autosize();
        setBusy(true);

        const thinking = addMessage(
            "assistant",
            `<span class="ai-typing" aria-hidden="true"><i></i><i></i><i></i></span>Thinking…`
        );

        try {
            const response = await fetch(API + "/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history: conversation.slice(-10) }),
                signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined
            });

            let data = {};
            try { data = await response.json(); } catch { /* the server did not send JSON */ }

            if (!response.ok || !data.reply) {
                throw new Error(
                    data.error || data.message ||
                    `The server answered with an error (${response.status}).`
                );
            }

            thinking.remove();
            addMessage("assistant", format(data.reply));

            conversation.push(
                { role: "user", content: text },
                { role: "assistant", content: data.reply }
            );
            conversation = conversation.slice(-20);

        } catch (error) {
            thinking.remove();

            const message =
                error.name === "TimeoutError"
                    ? "The assistant took too long to answer. Please try again."
                    : error instanceof TypeError
                        ? "Can't reach the ShopFlow server. Make sure it is running."
                        : error.message;

            const bubble = addMessage(
                "error",
                `${esc(message)} <button type="button" class="ai-retry">Retry</button>`
            );

            bubble.querySelector(".ai-retry").addEventListener("click", () => {
                bubble.remove();
                if (lastQuestionBubble) lastQuestionBubble.remove();
                send(lastQuestion);
            });

        } finally {
            setBusy(false);
            input.focus();
        }
    }


    /* ---------- events ---------- */

    toggle.addEventListener("click", openPanel);
    document.getElementById("aiClose").addEventListener("click", closePanel);

    document.getElementById("aiClear").addEventListener("click", () => {
        if (busy) return;
        conversation = [];
        showWelcome();
        input.focus();
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        send(input.value);
    });

    input.addEventListener("input", autosize);

    input.addEventListener("keydown", event => {
        // Enter sends, Shift+Enter makes a new line
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            send(input.value);
        }
    });

    list.addEventListener("click", event => {
        const chip = event.target.closest(".ai-chip");
        if (chip) send(chip.dataset.q);
    });

    document.addEventListener("keydown", event => {
        const dialogOpen = document.getElementById("dialog") && !document.getElementById("dialog").hidden;
        if (event.key === "Escape" && !panel.hidden && !dialogOpen) closePanel();
    });

})();