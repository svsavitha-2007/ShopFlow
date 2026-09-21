const API = "http://localhost:3000";

let products = [];
let orders = [];
let history = [];


/* =========================================================
   API HELPER
   ========================================================= */

async function apiRequest(endpoint, options = {}) {

    try {

        const response = await fetch(
            API + endpoint,
            {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            }
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                `Server returned invalid JSON (${response.status})`
            );
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                `API error: ${response.status}`
            );
        }

        return data;

    } catch (error) {

        console.error(
            `API request failed: ${endpoint}`,
            error
        );

        throw error;
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeApp() {

    console.log("ShopFlow initializing...");

    try {

        await loadProducts();

        await loadOrders();

        await loadHistory();

        updateDashboard();

        updateOrderPreview();

        setupNavigation();

        console.log("ShopFlow initialized successfully.");

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        showToast(
            "Connection Error",
            "Make sure the Node.js server is running on port 3000.",
            true
        );
    }
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {

    const data = await apiRequest(
        "/api/products"
    );

    products =
        Array.isArray(data.products)
            ? data.products
            : [];

    renderProducts();

    populateProductSelect();

    updateDashboard();
}


/* =========================================================
   PRODUCT RENDERING
   ========================================================= */

function renderProducts() {

    const grid =
        document.getElementById(
            "productGrid"
        );

    if (!grid) {
        console.warn(
            "productGrid not found."
        );
        return;
    }

    if (!products.length) {

        grid.innerHTML = `
            <div class="loading">
                No products found.
            </div>
        `;

        return;
    }

    grid.innerHTML =
        products
            .map(product => {

                const stock =
                    Number(product.stock || 0);

                let stockClass = "stock-good";

                if (stock <= 0) {
                    stockClass = "stock-empty";
                } else if (stock <= 5) {
                    stockClass = "stock-low";
                }

                return `
                    <div class="product-card">

                        <span class="product-id">
                            PRODUCT #${product.id}
                        </span>

                        <h3>
                            ${escapeHtml(product.name)}
                        </h3>

                        <div class="product-price">
                            ₹${formatMoney(product.price)}
                        </div>

                        <div class="product-stock">

                            <span>
                                Available stock
                            </span>

                            <strong class="${stockClass}">
                                ${stock} units
                            </strong>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   PRODUCT SELECT
   ========================================================= */

function populateProductSelect() {

    const select =
        document.getElementById(
            "orderProduct"
        );

    if (!select) {
        console.warn(
            "orderProduct select not found."
        );
        return;
    }

    select.innerHTML = `
        <option value="">
            Select product
        </option>
    `;

    products.forEach(product => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            product.id;

        option.textContent =
            `${product.name} — ₹${formatMoney(product.price)}`;

        select.appendChild(option);
    });
}


/* =========================================================
   PRODUCT SEARCH
   ========================================================= */

async function searchProduct() {

    const input =
        document.getElementById(
            "productSearch"
        );

    const result =
        document.getElementById(
            "searchResult"
        );

    if (!input) {

        showToast(
            "Search Error",
            "Product search field was not found.",
            true
        );

        return;
    }

    const id =
        Number(input.value);

    if (!Number.isInteger(id)) {

        if (result) {

            result.innerHTML = `
                <div class="search-highlight">
                    Enter a valid Product ID.
                </div>
            `;
        }

        showToast(
            "Invalid Product ID",
            "Please enter a valid numeric Product ID.",
            true
        );

        return;
    }

    try {

        const data =
            await apiRequest(
                `/api/products/${id}`
            );

        if (
            data.success &&
            data.product
        ) {

            const product =
                data.product;

            if (result) {

                result.innerHTML = `
                    <div class="search-highlight">

                        ✓ BST Search Found

                        <strong>
                            ${escapeHtml(product.name)}
                        </strong>

                        <span>
                            Product #${product.id}
                        </span>

                        <span>
                            ₹${formatMoney(product.price)}
                        </span>

                        <span>
                            ${product.stock} in stock
                        </span>

                    </div>
                `;
            }

        } else {

            if (result) {

                result.innerHTML = `
                    <div class="search-highlight">
                        No product found for ID ${id}.
                    </div>
                `;
            }
        }

    } catch (error) {

        console.error(
            "Product search failed:",
            error
        );

        showToast(
            "Search Failed",
            error.message ||
            "Could not search the product.",
            true
        );
    }
}


/* =========================================================
   ORDERS
   ========================================================= */

async function loadOrders() {

    const data =
        await apiRequest(
            "/api/orders"
        );

    orders =
        Array.isArray(data.orders)
            ? data.orders
            : [];

    renderOrders();

    renderQueue();

    renderDashboardOrders();

    updateDashboard();

    updateOrderPreview();
}


/* =========================================================
   ORDER ID HELPER
   ========================================================= */

function getOrderId(order) {

    return Number(
        order.orderID ??
        order.id ??
        0
    );
}


/* =========================================================
   ORDER PRODUCT ID HELPER
   ========================================================= */

function getOrderProductId(order) {

    return Number(
        order.productID ??
        order.productId ??
        0
    );
}


/* =========================================================
   ORDER AMOUNT HELPER
   ========================================================= */

function getOrderAmount(order) {

    return Number(
        order.totalAmount ??
        order.amount ??
        0
    );
}


/* =========================================================
   ORDER TABLE
   ========================================================= */

function renderOrders() {

    const container =
        document.getElementById(
            "ordersTable"
        );

    if (!container) {
        console.warn(
            "ordersTable not found."
        );
        return;
    }

    if (!orders.length) {

        container.innerHTML = `
            <div class="loading">
                No pending orders.
            </div>
        `;

        return;
    }

    let html = `

        <div class="order-row order-header">

            <div>ID</div>

            <div>Product</div>

            <div>Quantity</div>

            <div>Amount</div>

            <div>Actions</div>

        </div>
    `;

    orders.forEach(order => {

        const orderID =
            getOrderId(order);

        const productID =
            getOrderProductId(order);

        const quantity =
            Number(order.quantity || 0);

        const amount =
            getOrderAmount(order);

        const product =
            products.find(
                p =>
                    Number(p.id) ===
                    productID
            );

        const productName =
            product
                ? product.name
                : `Product ${productID}`;

        html += `

            <div class="order-row">

                <div class="order-id">
                    #${orderID}
                </div>

                <div>
                    ${escapeHtml(productName)}
                </div>

                <div>
                    ${quantity}
                </div>

                <div>
                    ₹${formatMoney(amount)}
                </div>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="small-button"
                        onclick="editOrder(${orderID}, ${quantity})"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="small-button"
                        onclick="cancelOrder(${orderID})"
                    >
                        Cancel
                    </button>

                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}


/* =========================================================
   QUEUE
   ========================================================= */

function renderQueue() {

    const track =
        document.getElementById(
            "queueTrack"
        );

    if (!track) {
        console.warn(
            "queueTrack not found."
        );
        return;
    }

    if (!orders.length) {

        track.innerHTML = `
            <div class="empty-queue">
                Queue is empty
            </div>
        `;

        return;
    }

    track.innerHTML =
        orders
            .map((order, index) => {

                const orderID =
                    getOrderId(order);

                const productID =
                    getOrderProductId(order);

                const product =
                    products.find(
                        p =>
                            Number(p.id) ===
                            productID
                    );

                return `

                    ${
                        index > 0
                            ? `<span class="queue-arrow">→</span>`
                            : ""
                    }

                    <div class="queue-box">

                        <strong>
                            #${orderID}
                        </strong>

                        <small>
                            ${
                                product
                                    ? escapeHtml(product.name)
                                    : `Product ${productID}`
                            }
                        </small>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   DASHBOARD ORDER PREVIEW
   ========================================================= */

function renderDashboardOrders() {

    const container =
        document.getElementById(
            "dashboardOrders"
        );

    if (!container) {
        return;
    }

    const recent =
        orders.slice(0, 4);

    if (!recent.length) {

        container.innerHTML = `
            <div class="loading">
                No pending orders.
            </div>
        `;

        return;
    }

    container.innerHTML =
        recent
            .map(order => {

                const orderID =
                    getOrderId(order);

                const productID =
                    getOrderProductId(order);

                const amount =
                    getOrderAmount(order);

                const product =
                    products.find(
                        p =>
                            Number(p.id) ===
                            productID
                    );

                return `

                    <div class="order-row">

                        <div class="order-id">
                            #${orderID}
                        </div>

                        <div>
                            ${
                                product
                                    ? escapeHtml(product.name)
                                    : `Product ${productID}`
                            }
                        </div>

                        <div>
                            ×${Number(order.quantity || 0)}
                        </div>

                        <div>
                            ₹${formatMoney(amount)}
                        </div>

                        <div>

                            <span class="status-badge status-pending">
                                PENDING
                            </span>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   PLACE ORDER
   ========================================================= */

async function placeOrder(event) {

    if (event) {
        event.preventDefault();
    }

    const productSelect =
        document.getElementById(
            "orderProduct"
        );

    const quantityInput =
        document.getElementById(
            "orderQuantity"
        );

    if (!productSelect || !quantityInput) {

        showToast(
            "Order Error",
            "Order form elements were not found.",
            true
        );

        return;
    }

    const productID =
        Number(productSelect.value);

    const quantity =
        Number(quantityInput.value);

    if (
        !Number.isInteger(productID) ||
        productID <= 0
    ) {

        showToast(
            "Select Product",
            "Please select a product.",
            true
        );

        return;
    }

    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {

        showToast(
            "Invalid Quantity",
            "Quantity must be at least 1.",
            true
        );

        return;
    }

    try {

        const data =
            await apiRequest(
                "/api/orders",
                {
                    method: "POST",

                    body: JSON.stringify({
                        productID,
                        quantity
                    })
                }
            );

        if (data.success === false) {

            showToast(
                "Order Failed",
                data.message ||
                "Could not place order.",
                true
            );

            return;
        }

        showToast(
            "Order Placed",
            data.message ||
            "Your order was added to the queue."
        );

        quantityInput.value = 1;

        await refreshAll();

    } catch (error) {

        console.error(
            "Place order failed:",
            error
        );

        showToast(
            "Order Failed",
            error.message ||
            "Could not place the order.",
            true
        );
    }
}


/* =========================================================
   EDIT ORDER
   ========================================================= */

async function editOrder(
    orderID,
    currentQuantity
) {

    console.log(
        "Edit order clicked:",
        orderID,
        currentQuantity
    );

    const newQuantity =
        prompt(
            `Enter new quantity for Order #${orderID}:`,
            currentQuantity
        );

    if (newQuantity === null) {
        return;
    }

    const quantity =
        Number(newQuantity);

    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {

        showToast(
            "Invalid Quantity",
            "Please enter a positive whole number.",
            true
        );

        return;
    }

    try {

        const data =
            await apiRequest(
                `/api/orders/${orderID}`,
                {
                    method: "PUT",

                    body: JSON.stringify({
                        quantity
                    })
                }
            );

        console.log(
            "Edit response:",
            data
        );

        if (data.success === false) {

            showToast(
                "Edit Failed",
                data.message ||
                "Could not update the order.",
                true
            );

            return;
        }

        showToast(
            "Order Updated",
            data.message ||
            "Order quantity updated successfully."
        );

        await refreshAll();

    } catch (error) {

        console.error(
            "Edit order failed:",
            error
        );

        showToast(
            "Edit Failed",
            error.message ||
            "Could not update the order.",
            true
        );
    }
}


/* =========================================================
   CANCEL ORDER
   ========================================================= */

async function cancelOrder(orderID) {

    console.log(
        "Cancel order clicked:",
        orderID
    );

    const confirmed =
        confirm(
            `Cancel Order #${orderID}?`
        );

    if (!confirmed) {
        return;
    }

    try {

        const data =
            await apiRequest(
                `/api/orders/${orderID}`,
                {
                    method: "DELETE"
                }
            );

        console.log(
            "Cancel response:",
            data
        );

        if (data.success === false) {

            showToast(
                "Cancel Failed",
                data.message ||
                "Could not cancel the order.",
                true
            );

            return;
        }

        showToast(
            "Order Cancelled",
            data.message ||
            "Order cancelled successfully."
        );

        await refreshAll();

    } catch (error) {

        console.error(
            "Cancel order failed:",
            error
        );

        showToast(
            "Cancel Failed",
            error.message ||
            "Could not cancel the order.",
            true
        );
    }
}


/* =========================================================
   PROCESS NEXT ORDER
   ========================================================= */

async function processNextOrder() {

    console.log(
        "Process Next Order clicked."
    );

    if (!orders.length) {

        showToast(
            "Queue Empty",
            "There are no pending orders to process.",
            true
        );

        return;
    }

    try {

        const data =
            await apiRequest(
                "/api/orders/process",
                {
                    method: "POST"
                }
            );

        console.log(
            "Process response:",
            data
        );

        if (data.success === false) {

            showToast(
                "Processing Failed",
                data.message ||
                "Could not process the order.",
                true
            );

            return;
        }

        showToast(
            "Order Processed",
            data.message ||
            "The next order was processed."
        );

        await refreshAll();

    } catch (error) {

        console.error(
            "Process order failed:",
            error
        );

        showToast(
            "Processing Failed",
            error.message ||
            "Could not process the order.",
            true
        );
    }
}


/* =========================================================
   UNDO
   ========================================================= */

async function undoLastAction() {

    console.log(
        "Undo clicked."
    );

    try {

        const data =
            await apiRequest(
                "/api/undo",
                {
                    method: "POST"
                }
            );

        console.log(
            "Undo response:",
            data
        );

        if (data.success === false) {

            showToast(
                "Undo Failed",
                data.message ||
                "Nothing could be undone.",
                true
            );

            return;
        }

        showToast(
            "Action Undone",
            data.message ||
            "The last action has been undone."
        );

        await refreshAll();

    } catch (error) {

        console.error(
            "Undo failed:",
            error
        );

        showToast(
            "Undo Failed",
            error.message ||
            "Could not undo the last action.",
            true
        );
    }
}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {

    const data =
        await apiRequest(
            "/api/history"
        );

    history =
        Array.isArray(data.history)
            ? data.history
            : [];

    renderHistory();

    updateDashboard();
}


function renderHistory() {

    const container =
        document.getElementById(
            "historyTable"
        );

    if (!container) {
        console.warn(
            "historyTable not found."
        );
        return;
    }

    if (!history.length) {

        container.innerHTML = `
            <div class="loading">
                No order history yet.
            </div>
        `;

        return;
    }

    let html = `

        <div class="history-row history-header">

            <div>Order</div>

            <div>Action</div>

            <div>Product</div>

            <div>Quantity</div>

            <div>Amount</div>

        </div>
    `;

    history.forEach(item => {

        const orderID =
            Number(
                item.orderID ??
                item.id ??
                0
            );

        const productID =
            Number(
                item.productID ??
                item.productId ??
                0
            );

        const quantity =
            Number(
                item.quantity ??
                item.newQuantity ??
                0
            );

        const amount =
            Number(
                item.totalAmount ??
                item.amount ??
                item.newAmount ??
                0
            );

        const action =
            item.actionType ||
            item.action ||
            item.status ||
            "Processed";

        const product =
            products.find(
                p =>
                    Number(p.id) ===
                    productID
            );

        const productName =
            product
                ? product.name
                : `Product ${productID}`;

        html += `

            <div class="history-row">

                <div>
                    #${orderID}
                </div>

                <div>
                    ${escapeHtml(action)}
                </div>

                <div>
                    ${escapeHtml(productName)}
                </div>

                <div>
                    ${quantity}
                </div>

                <div>
                    ₹${formatMoney(amount)}
                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const productCount =
        document.getElementById(
            "productCount"
        );

    const pendingCount =
        document.getElementById(
            "pendingCount"
        );

    const processedCount =
        document.getElementById(
            "processedCount"
        );

    const totalValue =
        document.getElementById(
            "totalValue"
        );

    if (productCount) {

        productCount.textContent =
            products.length;
    }

    if (pendingCount) {

        pendingCount.textContent =
            orders.length;
    }

    if (processedCount) {

        const processed =
            history.filter(item => {

                const action =
                    String(
                        item.actionType ||
                        item.action ||
                        item.status ||
                        ""
                    ).toLowerCase();

                return (
                    action.includes("process") ||
                    action.includes("complete")
                );
            }).length;

        processedCount.textContent =
            processed;
    }

    if (totalValue) {

        const total =
            orders.reduce(
                (sum, order) => {

                    return (
                        sum +
                        getOrderAmount(order)
                    );

                },
                0
            );

        totalValue.textContent =
            `₹${formatMoney(total)}`;
    }
}


/* =========================================================
   ORDER PREVIEW
   ========================================================= */

function updateOrderPreview() {

    const select =
        document.getElementById(
            "orderProduct"
        );

    const quantityInput =
        document.getElementById(
            "orderQuantity"
        );

    const preview =
        document.getElementById(
            "orderPreview"
        );

    if (
        !select ||
        !quantityInput ||
        !preview
    ) {
        return;
    }

    const productID =
        Number(select.value);

    const quantity =
        Number(quantityInput.value);

    const product =
        products.find(
            p =>
                Number(p.id) ===
                productID
        );

    if (!product) {

        preview.textContent =
            "Select a product";

        return;
    }

    const total =
        Number(product.price) *
        quantity;

    preview.innerHTML = `
        <strong>
            ${escapeHtml(product.name)}
        </strong>

        <span>
            ${quantity} × ₹${formatMoney(product.price)}
        </span>

        <strong>
            Total: ₹${formatMoney(total)}
        </strong>
    `;
}


/* =========================================================
   QUANTITY
   ========================================================= */

function changeQuantity(amount) {

    const input =
        document.getElementById(
            "orderQuantity"
        );

    if (!input) {
        return;
    }

    let value =
        Number(input.value) || 1;

    value += amount;

    if (value < 1) {
        value = 1;
    }

    input.value = value;

    updateOrderPreview();
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(section) {

    console.log(
        "Showing section:",
        section
    );

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section ===
                section
            );
        });

    document
        .querySelectorAll(
            ".page-section"
        )
        .forEach(page => {

            page.classList.toggle(
                "active-section",
                page.id === section
            );
        });

    const titles = {

        dashboard:
            "Good day 👋",

        products:
            "Product Explorer",

        orders:
            "Order Queue",

        dsa:
            "DSA Engine",

        history:
            "Order History"
    };

    const pageTitle =
        document.getElementById(
            "pageTitle"
        );

    if (pageTitle) {

        pageTitle.textContent =
            titles[section] ||
            "ShopFlow";
    }
}


/* Make it available to inline HTML onclick="" */
window.showSection =
    showSection;


/* =========================================================
   NAVIGATION SETUP
   ========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            function() {

                const section =
                    this.dataset.section;

                if (section) {

                    showSection(
                        section
                    );
                }
            }
        );
    });

    console.log(
        `Navigation initialized: ${navItems.length} items`
    );
}


/* =========================================================
   REFRESH EVERYTHING
   ========================================================= */

async function refreshAll() {

    console.log(
        "Refreshing ShopFlow..."
    );

    try {

        await loadProducts();

        await loadOrders();

        await loadHistory();

        updateDashboard();

        updateOrderPreview();

        showToast(
            "Refreshed",
            "ShopFlow data has been updated."
        );

    } catch (error) {

        console.error(
            "Refresh failed:",
            error
        );

        showToast(
            "Refresh Failed",
            error.message ||
            "Could not refresh the application.",
            true
        );
    }
}


/* =========================================================
   ORDER FORM EVENT
   ========================================================= */

function setupOrderForm() {

    const form =
        document.getElementById(
            "orderForm"
        );

    if (!form) {

        console.warn(
            "orderForm not found."
        );

        return;
    }

    form.addEventListener(
        "submit",
        placeOrder
    );

    console.log(
        "Order form initialized."
    );
}


/* =========================================================
   PRODUCT SELECT EVENTS
   ========================================================= */

function setupProductEvents() {

    const select =
        document.getElementById(
            "orderProduct"
        );

    const quantity =
        document.getElementById(
            "orderQuantity"
        );

    if (select) {

        select.addEventListener(
            "change",
            updateOrderPreview
        );
    }

    if (quantity) {

        quantity.addEventListener(
            "input",
            updateOrderPreview
        );
    }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    title,
    message,
    error = false
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const icon =
        document.getElementById(
            "toastIcon"
        );

    const toastTitle =
        document.getElementById(
            "toastTitle"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    if (!toast) {

        console.log(
            title,
            message
        );

        return;
    }

    if (toastTitle) {

        toastTitle.textContent =
            title;
    }

    if (toastMessage) {

        toastMessage.textContent =
            message;
    }

    if (icon) {

        icon.textContent =
            error
                ? "!"
                : "✓";

        icon.style.color =
            error
                ? "#ff7657"
                : "#57d6b4";
    }

    toast.classList.add(
        "show"
    );

    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3500
    );
}


/* =========================================================
   FORMAT MONEY
   ========================================================= */

function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.searchProduct =
    searchProduct;

window.changeQuantity =
    changeQuantity;

window.processNextOrder =
    processNextOrder;

window.editOrder =
    editOrder;

window.cancelOrder =
    cancelOrder;

window.undoLastAction =
    undoLastAction;

window.refreshAll =
    refreshAll;

window.placeOrder =
    placeOrder;


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "DOM loaded."
        );

        setupNavigation();

        setupOrderForm();

        setupProductEvents();

        await initializeApp();
    }
);