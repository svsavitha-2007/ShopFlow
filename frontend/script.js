const API = "http://localhost:3000";

let products = [];
let orders = [];
let history = [];


/* ==========================================
   API HELPER
   ========================================== */

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        API + endpoint,
        options
    );

    if (!response.ok) {
        throw new Error(
            `API error: ${response.status}`
        );
    }

    return response.json();
}


/* ==========================================
   INITIAL LOAD
   ========================================== */

async function initializeApp() {

    try {

        await loadProducts();
        await loadOrders();
        await loadHistory();

        updateDashboard();
        updateOrderPreview();

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        showToast(
            "Connection Error",
            "Make sure the Node.js server is running.",
            true
        );
    }
}


/* ==========================================
   PRODUCTS
   ========================================== */

async function loadProducts() {

    const data = await apiRequest(
        "/api/products"
    );

    products = data.products || [];

    renderProducts();
    populateProductSelect();
    updateDashboard();
}


function renderProducts() {

    const grid = document.getElementById(
        "productGrid"
    );

    if (!products.length) {

        grid.innerHTML = `
            <div class="loading">
                No products found.
            </div>
        `;

        return;
    }

    grid.innerHTML = products.map(
        product => {

            const stock = Number(
                product.stock || 0
            );

            let stockClass = "stock-good";

            if (stock <= 0) {
                stockClass = "stock-out";
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
        }
    ).join("");
}


function populateProductSelect() {

    const select = document.getElementById(
        "orderProduct"
    );

    select.innerHTML = `
        <option value="">
            Select product
        </option>
    `;

    products.forEach(
        product => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = product.id;

            option.textContent =
                `${product.name} — ₹${formatMoney(product.price)}`;

            select.appendChild(option);
        }
    );
}


/* ==========================================
   PRODUCT SEARCH
   ========================================== */

async function searchProduct() {

    const input = document.getElementById(
        "productSearch"
    );

    const id = Number(input.value);

    if (!Number.isInteger(id)) {

        showToast(
            "Search",
            "Enter a valid Product ID.",
            true
        );

        return;
    }

    try {

        const data = await apiRequest(
            `/api/products/${id}`
        );

        const result = document.getElementById(
            "searchResult"
        );

        if (
            data.success &&
            data.product
        ) {

            const product = data.product;

            result.innerHTML = `
                <div class="search-highlight">

                    ✓ BST Search Found:

                    <strong>
                        ${escapeHtml(product.name)}
                    </strong>

                    &nbsp; • &nbsp;

                    Product #${product.id}

                    &nbsp; • &nbsp;

                    ₹${formatMoney(product.price)}

                    &nbsp; • &nbsp;

                    ${product.stock} in stock

                </div>
            `;

        } else {

            result.innerHTML = `
                <div class="search-highlight">
                    No product found for ID ${id}.
                </div>
            `;
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Search Failed",
            "Could not search the product.",
            true
        );
    }
}


/* ==========================================
   ORDERS
   ========================================== */

async function loadOrders() {

    const data = await apiRequest(
        "/api/orders"
    );

    orders = data.orders || [];

    renderOrders();
    renderQueue();
    renderDashboardOrders();

    updateDashboard();
}


function renderOrders() {

    const container = document.getElementById(
        "ordersTable"
    );

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

    orders.forEach(
        order => {

            const product =
                products.find(
                    p =>
                        Number(p.id) ===
                        Number(order.productID)
                );

            const productName =
                product
                    ? product.name
                    : `Product ${order.productID}`;

            html += `

                <div class="order-row">

                    <div class="order-id">
                        #${order.orderID}
                    </div>

                    <div>
                        ${escapeHtml(productName)}
                    </div>

                    <div>
                        ${order.quantity}
                    </div>

                    <div>
                        ₹${formatMoney(getOrderAmount(order))}
                    </div>

                    <div class="action-buttons">

                        <button
                            class="small-button"
                            onclick="editOrder(
                                ${order.orderID},
                                ${order.quantity}
                            )"
                        >
                            Edit
                        </button>

                        <button
                            class="small-button"
                            onclick="cancelOrder(
                                ${order.orderID}
                            )"
                        >
                            Cancel
                        </button>

                    </div>

                </div>
            `;
        }
    );

    container.innerHTML = html;
}


function renderQueue() {

    const track = document.getElementById(
        "queueTrack"
    );

    if (!orders.length) {

        track.innerHTML = `
            <div class="empty-queue">
                Queue is empty
            </div>
        `;

        return;
    }

    track.innerHTML = orders.map(
        (order, index) => {

            const product =
                products.find(
                    p =>
                        Number(p.id) ===
                        Number(order.productID)
                );

            return `
                ${
                    index > 0
                        ? `<span class="queue-arrow">→</span>`
                        : ""
                }

                <div class="queue-box">

                    <strong>
                        #${order.orderID}
                    </strong>

                    <small>
                        ${
                            product
                                ? escapeHtml(product.name)
                                : "Product"
                        }
                    </small>

                </div>
            `;
        }
    ).join("");
}


function renderDashboardOrders() {

    const container =
        document.getElementById(
            "dashboardOrders"
        );

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
        recent.map(
            order => {

                const product =
                    products.find(
                        p =>
                            Number(p.id) ===
                            Number(order.productID)
                    );

                return `
                    <div class="order-row">

                        <div class="order-id">
                            #${order.orderID}
                        </div>

                        <div>
                            ${
                                product
                                    ? escapeHtml(product.name)
                                    : "Product"
                            }
                        </div>

                        <div>
                            ×${order.quantity}
                        </div>

                        <div>
                            ₹${formatMoney(
                                getOrderAmount(order)
                            )}
                        </div>

                        <div>
                            <span class="status-badge status-pending">
                                PENDING
                            </span>
                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* ==========================================
   PLACE ORDER
   ========================================== */

document
    .getElementById("orderForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const productID =
                Number(
                    document.getElementById(
                        "orderProduct"
                    ).value
                );

            const quantity =
                Number(
                    document.getElementById(
                        "orderQuantity"
                    ).value
                );

            if (
                !Number.isInteger(productID) ||
                productID <= 0 ||
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {

                showToast(
                    "Invalid Order",
                    "Select a product and enter a valid quantity.",
                    true
                );

                return;
            }

            const selectedProduct =
                products.find(
                    product =>
                        Number(product.id) ===
                        productID
                );

            if (!selectedProduct) {

                showToast(
                    "Invalid Product",
                    "The selected product could not be found.",
                    true
                );

                return;
            }

            const availableStock =
                Number(
                    selectedProduct.stock || 0
                );

            if (quantity > availableStock) {

                showToast(
                    "Insufficient Stock",
                    `Only ${availableStock} units are available.`,
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

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    productID,
                                    quantity
                                })
                        }
                    );

                if (!data.success) {

                    showToast(
                        "Order Failed",
                        data.message ||
                            "Unable to place order.",
                        true
                    );

                    return;
                }

                const createdOrder =
                    data.order || {};

                const createdOrderID =
                    createdOrder.id ??
                    createdOrder.orderID ??
                    "new";

                showToast(
                    "Order Placed",
                    `Order #${createdOrderID} added to the FIFO queue.`
                );

                document
                    .getElementById(
                        "orderForm"
                    )
                    .reset();

                document
                    .getElementById(
                        "orderQuantity"
                    )
                    .value = 1;

                await refreshAll();

            } catch (error) {

                console.error(
                    "Place order error:",
                    error
                );

                showToast(
                    "Order Failed",
                    "Could not connect to the API.",
                    true
                );
            }
        }
    );


/* ==========================================
   PROCESS ORDER
   ========================================== */

async function processNextOrder() {

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

        if (!data.success) {

            showToast(
                "Processing Failed",
                data.message ||
                    "Could not process the order.",
                true
            );

            return;
        }

        const processedOrder =
            data.order || {};

        const processedID =
            processedOrder.id ??
            processedOrder.orderID ??
            "";

        showToast(
            "Order Processed",
            processedID
                ? `Order #${processedID} completed successfully.`
                : "Order completed successfully."
        );

        await refreshAll();

    } catch (error) {

        console.error(error);

        showToast(
            "Processing Failed",
            "Could not process the order.",
            true
        );
    }
}


/* ==========================================
   EDIT ORDER
   ========================================== */

async function editOrder(
    orderID,
    currentQuantity
) {

    const newQuantity =
        Number(
            prompt(
                `Enter new quantity for Order #${orderID}:`,
                currentQuantity
            )
        );

    if (
        !Number.isInteger(newQuantity) ||
        newQuantity < 1
    ) {
        return;
    }

    try {

        const data =
            await apiRequest(
                `/api/orders/${orderID}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            quantity:
                                newQuantity
                        })
                }
            );

        if (!data.success) {

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
            `Order #${orderID} quantity changed.`
        );

        await refreshAll();

    } catch (error) {

        console.error(error);

        showToast(
            "Edit Failed",
            "Could not update the order.",
            true
        );
    }
}


/* ==========================================
   CANCEL ORDER
   ========================================== */

async function cancelOrder(orderID) {

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

        if (!data.success) {

            showToast(
                "Cancellation Failed",
                data.message ||
                    "Could not cancel the order.",
                true
            );

            return;
        }

        showToast(
            "Order Cancelled",
            `Order #${orderID} cancelled. You can undo this action.`
        );

        await refreshAll();

    } catch (error) {

        console.error(error);

        showToast(
            "Cancellation Failed",
            "Could not cancel the order.",
            true
        );
    }
}


/* ==========================================
   UNDO
   ========================================== */

async function undoLastAction() {

    try {

        const data =
            await apiRequest(
                "/api/undo",
                {
                    method: "POST"
                }
            );

        if (!data.success) {

            showToast(
                "Nothing to Undo",
                data.message ||
                    "There is no action to undo.",
                true
            );

            return;
        }

        showToast(
            "Undo Successful",
            "The previous action was reversed."
        );

        await refreshAll();

    } catch (error) {

        console.error(error);

        showToast(
            "Undo Failed",
            "Could not undo the action.",
            true
        );
    }
}


/* ==========================================
   HISTORY
   ========================================== */

async function loadHistory() {

    const data =
        await apiRequest(
            "/api/history"
        );

    history =
        data.history || [];

    renderHistory();
    updateDashboard();
}


function renderHistory() {

    const container =
        document.getElementById(
            "historyTable"
        );

    if (!history.length) {

        container.innerHTML = `
            <div class="loading">
                No processed orders yet.
            </div>
        `;

        return;
    }

    let html = `

        <div class="history-row history-header">

            <div>ID</div>
            <div>Product</div>
            <div>Quantity</div>
            <div>Amount</div>
            <div>Status</div>

        </div>
    `;

    history.forEach(
        order => {

            const product =
                products.find(
                    p =>
                        Number(p.id) ===
                        Number(order.productID)
                );

            html += `

                <div class="history-row">

                    <div class="order-id">
                        #${order.orderID}
                    </div>

                    <div>
                        ${
                            product
                                ? escapeHtml(product.name)
                                : `Product ${order.productID}`
                        }
                    </div>

                    <div>
                        ${order.quantity}
                    </div>

                    <div>
                        ₹${formatMoney(
                            getOrderAmount(order)
                        )}
                    </div>

                    <div>

                        <span class="status-badge status-processed">
                            PROCESSED
                        </span>

                    </div>

                </div>
            `;
        }
    );

    container.innerHTML = html;
}


/* ==========================================
   DASHBOARD
   ========================================== */

function updateDashboard() {

    /* ----------------------------------------
       Basic statistics
       ---------------------------------------- */

    setText(
        "productCount",
        products.length
    );

    setText(
        "pendingCount",
        orders.length
    );

    setText(
        "processedCount",
        history.length
    );


    /* ----------------------------------------
       Processed sales
       ---------------------------------------- */

    const processedValue =
        history.reduce(
            (sum, order) =>
                sum +
                getOrderAmount(order),
            0
        );


    setText(
        "totalValue",
        `₹${formatMoney(processedValue)}`
    );


    /* ----------------------------------------
       Pending order value
       ---------------------------------------- */

    const pendingValue =
        orders.reduce(
            (sum, order) =>
                sum +
                getOrderAmount(order),
            0
        );


    setText(
        "pendingOrderValue",
        `₹${formatMoney(pendingValue)}`
    );


    /* ----------------------------------------
       Average processed order value
       ---------------------------------------- */

    const averageOrderValue =
        history.length > 0
            ? processedValue / history.length
            : 0;


    setText(
        "averageOrderValue",
        `₹${formatMoney(averageOrderValue)}`
    );


    /* ----------------------------------------
       Total inventory units
       ---------------------------------------- */

    const inventoryUnits =
        products.reduce(
            (sum, product) =>
                sum +
                Number(product.stock || 0),
            0
        );


    setText(
        "inventoryUnits",
        inventoryUnits
    );


    /* ----------------------------------------
       Low stock
       ---------------------------------------- */

    const lowStockProducts =
        products.filter(
            product =>
                Number(product.stock || 0) <= 5
        );


    setText(
        "lowStockCount",
        lowStockProducts.length
    );


    /* ----------------------------------------
       Sales overview
       ---------------------------------------- */

    setText(
        "dashboardSales",
        `₹${formatMoney(processedValue)}`
    );


    /* ----------------------------------------
       Queue progress
       ---------------------------------------- */

    const totalOrders =
        orders.length +
        history.length;

    const processedPercentage =
        totalOrders > 0
            ? Math.round(
                (history.length /
                    totalOrders) *
                100
            )
            : 0;


    const progress =
        document.getElementById(
            "queueProgress"
        );

    if (progress) {

        progress.style.width =
            `${processedPercentage}%`;
    }


    setText(
        "queueProgressText",
        `${processedPercentage}% processed`
    );


    /* ----------------------------------------
       Stock alerts
       ---------------------------------------- */

    renderStockAlerts(
        lowStockProducts
    );
}


/* ==========================================
   STOCK ALERTS
   ========================================== */

function renderStockAlerts(
    lowStockProducts
) {

    const container =
        document.getElementById(
            "stockAlerts"
        );

    if (!container) {
        return;
    }


    if (!lowStockProducts.length) {

        container.innerHTML = `

            <div class="stock-safe">

                <div class="stock-safe-icon">
                    ✓
                </div>

                <strong>
                    Inventory looks healthy
                </strong>

                <span>
                    No products are low on stock.
                </span>

            </div>

        `;

        return;
    }


    const sortedProducts =
        [...lowStockProducts]
            .sort(
                (a, b) =>
                    Number(a.stock || 0) -
                    Number(b.stock || 0)
            )
            .slice(0, 6);


    container.innerHTML =
        sortedProducts.map(
            product => {

                const stock =
                    Number(
                        product.stock || 0
                    );

                return `

                    <div class="stock-alert">

                        <div class="stock-alert-info">

                            <strong>
                                ${escapeHtml(
                                    product.name
                                )}
                            </strong>

                            <span>
                                Product #${product.id}
                            </span>

                        </div>

                        <div class="stock-alert-count">
                            ${stock} left
                        </div>

                    </div>

                `;
            }
        ).join("");
}


/* ==========================================
   ORDER PREVIEW
   ========================================== */

document
    .getElementById("orderProduct")
    .addEventListener(
        "change",
        updateOrderPreview
    );


document
    .getElementById("orderQuantity")
    .addEventListener(
        "input",
        updateOrderPreview
    );


function updateOrderPreview() {

    const productID =
        Number(
            document.getElementById(
                "orderProduct"
            ).value
        );

    const quantity =
        Number(
            document.getElementById(
                "orderQuantity"
            ).value
        ) || 1;


    const product =
        products.find(
            p =>
                Number(p.id) ===
                productID
        );


    const preview =
        document.getElementById(
            "orderPreview"
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
        ${escapeHtml(product.name)}
        × ${quantity}

        <strong
            style="
                margin-left:auto;
                color:#57d6b4;
            "
        >
            ₹${formatMoney(total)}
        </strong>
    `;
}


function changeQuantity(amount) {

    const input =
        document.getElementById(
            "orderQuantity"
        );

    let value =
        Number(input.value) || 1;

    value += amount;

    if (value < 1) {
        value = 1;
    }

    input.value = value;

    updateOrderPreview();
}


/* ==========================================
   NAVIGATION
   ========================================== */

document
    .querySelectorAll(".nav-item")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const section =
                        button.dataset.section;

                    showSection(section);
                }
            );
        }
    );


function showSection(section) {

    document
        .querySelectorAll(".nav-item")
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.section ===
                        section
                );
            }
        );


    document
        .querySelectorAll(".page-section")
        .forEach(
            page => {

                page.classList.toggle(
                    "active-section",
                    page.id === section
                );
            }
        );


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


    setText(
        "pageTitle",
        titles[section] ||
            "ShopFlow"
    );
}


/* ==========================================
   REFRESH EVERYTHING
   ========================================== */

async function refreshAll() {

    await loadProducts();

    await loadOrders();

    await loadHistory();

    updateDashboard();

    updateOrderPreview();
}


/* ==========================================
   TOAST
   ========================================== */

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


    setText(
        "toastTitle",
        title
    );

    setText(
        "toastMessage",
        message
    );


    icon.textContent =
        error
            ? "!"
            : "✓";


    icon.style.color =
        error
            ? "#ff7657"
            : "#57d6b4";


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


/* ==========================================
   HELPERS
   ========================================== */

function getOrderAmount(order) {

    return Number(
        order?.totalAmount ??
        order?.amount ??
        0
    );
}


function setText(
    elementID,
    value
) {

    const element =
        document.getElementById(
            elementID
        );

    if (element) {
        element.textContent = value;
    }
}


function formatMoney(value) {

    return Number(value || 0)
        .toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        );
}


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
   SHOPFLOW — FINAL UI MICRO-INTERACTIONS
   Visual only — does NOT modify API/order logic
   ========================================================= */

const dashboardAnimatedValues = {
    productCount: 0,
    pendingCount: 0,
    processedCount: 0,
    lowStockCount: 0,
    totalValue: 0,
    averageOrderValue: 0,
    pendingOrderValue: 0,
    inventoryUnits: 0
};

function animateDashboardNumber(elementId, targetValue, formatter, duration = 700) {
    const element = document.getElementById(elementId);

    if (!element) return;

    const target = Number(targetValue) || 0;
    const start = Number(dashboardAnimatedValues[elementId]) || 0;

    if (start === target) {
        element.textContent = formatter(target);
        return;
    }

    const startTime = performance.now();

    function animate(currentTime) {
        const progress = Math.min(
            (currentTime - startTime) / duration,
            1
        );

        // Smooth ease-out
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentValue =
            start + (target - start) * eased;

        element.textContent = formatter(currentValue);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = formatter(target);
            dashboardAnimatedValues[elementId] = target;
        }
    }

    requestAnimationFrame(animate);
}

function animateDashboardStats() {
    animateDashboardNumber(
        "productCount",
        products.length,
        value => Math.round(value).toLocaleString("en-IN")
    );

    animateDashboardNumber(
        "pendingCount",
        orders.length,
        value => Math.round(value).toLocaleString("en-IN")
    );

    animateDashboardNumber(
        "processedCount",
        history.length,
        value => Math.round(value).toLocaleString("en-IN")
    );

    const totalValue = history.reduce(
        (sum, order) => sum + getOrderAmount(order),
        0
    );

    const pendingValue = orders.reduce(
        (sum, order) => sum + getOrderAmount(order),
        0
    );

    const averageValue =
        history.length > 0
            ? totalValue / history.length
            : 0;

    const inventoryUnits = products.reduce(
        (sum, product) => sum + Number(product.stock || 0),
        0
    );

    const lowStockCount = products.filter(
        product => Number(product.stock || 0) <= 5
    ).length;

    animateDashboardNumber(
        "lowStockCount",
        lowStockCount,
        value => Math.round(value).toLocaleString("en-IN")
    );

    animateDashboardNumber(
        "totalValue",
        totalValue,
        value => formatMoney(value)
    );

    animateDashboardNumber(
        "pendingOrderValue",
        pendingValue,
        value => formatMoney(value)
    );

    animateDashboardNumber(
        "averageOrderValue",
        averageValue,
        value => formatMoney(value)
    );

    animateDashboardNumber(
        "inventoryUnits",
        inventoryUnits,
        value => Math.round(value).toLocaleString("en-IN")
    );
}


/* ---------------------------------------------------------
   Smooth queue progress animation
   --------------------------------------------------------- */

function animateQueueProgress() {
    const progressBar = document.getElementById("queueProgress");

    if (!progressBar) return;

    const pending = orders.length;
    const processed = history.length;
    const total = pending + processed;

    const percentage =
        total > 0
            ? Math.round((processed / total) * 100)
            : 0;

    requestAnimationFrame(() => {
        progressBar.style.width = `${percentage}%`;
    });
}


/* ---------------------------------------------------------
   Dashboard refresh pulse
   --------------------------------------------------------- */

function pulseDashboard() {
    const dashboard = document.getElementById("dashboard");

    if (!dashboard) return;

    dashboard.classList.remove("dashboard-refresh");

    // Force browser to restart animation
    void dashboard.offsetWidth;

    dashboard.classList.add("dashboard-refresh");

    setTimeout(() => {
        dashboard.classList.remove("dashboard-refresh");
    }, 500);
}


/* ---------------------------------------------------------
   Button click feedback
   --------------------------------------------------------- */

document.addEventListener("click", event => {
    const button = event.target.closest(
        "button, .nav-item, .action-btn, .text-btn"
    );

    if (!button) return;

    button.classList.remove("ui-click");

    void button.offsetWidth;

    button.classList.add("ui-click");

    setTimeout(() => {
        button.classList.remove("ui-click");
    }, 220);
});


/* ---------------------------------------------------------
   Card hover polish
   --------------------------------------------------------- */

document.addEventListener("mouseenter", event => {
    const card = event.target.closest(
        ".stat-card, .product-card, .panel, .queue-box, .stock-alert"
    );

    if (!card) return;

    card.classList.add("ui-hover");
}, true);

document.addEventListener("mouseleave", event => {
    const card = event.target.closest(
        ".stat-card, .product-card, .panel, .queue-box, .stock-alert"
    );

    if (!card) return;

    card.classList.remove("ui-hover");
}, true);


/* ---------------------------------------------------------
   Run visual animations after data updates
   --------------------------------------------------------- */

function runFinalUIAnimations() {
    animateDashboardStats();
    animateQueueProgress();
    pulseDashboard();
}


/* ---------------------------------------------------------
   Small delay so the existing app finishes its first render
   --------------------------------------------------------- */

window.addEventListener("load", () => {
    setTimeout(() => {
        runFinalUIAnimations();
    }, 350);
});


/* ==========================================
   START
   ========================================== */

initializeApp();