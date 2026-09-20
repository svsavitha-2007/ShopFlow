const API = "http://localhost:3000";

let products = [];
let orders = [];
let history = [];


/* ==========================================
   API HELPER
   ========================================== */

async function apiRequest(
    endpoint,
    options = {}
) {
    const response =
        await fetch(
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

    const data =
        await apiRequest(
            "/api/products"
        );

    products =
        data.products || [];

    renderProducts();

    populateProductSelect();
}


function renderProducts() {

    const grid =
        document.getElementById(
            "productGrid"
        );

    if (!products.length) {

        grid.innerHTML =
            `<div class="loading">
                No products found.
            </div>`;

        return;
    }


    grid.innerHTML =
        products.map(
            product => {

                const stockClass =
                    product.stock > 5
                        ? "stock-good"
                        : "";

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
                                ${product.stock} units
                            </strong>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


function populateProductSelect() {

    const select =
        document.getElementById(
            "orderProduct"
        );

    select.innerHTML =
        `<option value="">
            Select product
        </option>`;


    products.forEach(
        product => {

            const option =
                document.createElement(
                    "option"
                );

            /*
             * IMPORTANT:
             * Product API uses "id"
             */
            option.value =
                product.id;

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

    const input =
        document.getElementById(
            "productSearch"
        );

    const id =
        Number(input.value);


    if (!Number.isInteger(id)) {

        showToast(
            "Search",
            "Enter a valid Product ID.",
            true
        );

        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/products/${id}`
            );

        const result =
            document.getElementById(
                "searchResult"
            );


        if (
            data.success &&
            data.product
        ) {

            const product =
                data.product;

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

    const data =
        await apiRequest(
            "/api/orders"
        );

    orders =
        data.orders || [];

    renderOrders();

    renderQueue();

    renderDashboardOrders();

    updateDashboard();
}


function renderOrders() {

    const container =
        document.getElementById(
            "ordersTable"
        );


    if (!orders.length) {

        container.innerHTML =
            `<div class="loading">
                No pending orders.
            </div>`;

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
                        p.id ===
                        order.productID
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
                        ₹${formatMoney(order.totalAmount)}
                    </div>

                    <div class="action-buttons">

                        <button
                            class="small-button"
                            onclick="editOrder(${order.orderID}, ${order.quantity})"
                        >
                            Edit
                        </button>

                        <button
                            class="small-button"
                            onclick="cancelOrder(${order.orderID})"
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

    const track =
        document.getElementById(
            "queueTrack"
        );


    if (!orders.length) {

        track.innerHTML =
            `<div class="empty-queue">
                Queue is empty
            </div>`;

        return;
    }


    track.innerHTML =
        orders.map(
            (order, index) => {

                const product =
                    products.find(
                        p =>
                            p.id ===
                            order.productID
                    );


                return `
                    ${index > 0
                        ? `<span class="queue-arrow">→</span>`
                        : ""
                    }

                    <div class="queue-box">

                        <strong>
                            #${order.orderID}
                        </strong>

                        <small>
                            ${product
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

        container.innerHTML =
            `<div class="loading">
                No pending orders.
            </div>`;

        return;
    }


    container.innerHTML =
        recent.map(
            order => {

                const product =
                    products.find(
                        p =>
                            p.id ===
                            order.productID
                    );


                return `
                    <div class="order-row">

                        <div class="order-id">
                            #${order.orderID}
                        </div>

                        <div>
                            ${product
                                ? escapeHtml(product.name)
                                : "Product"
                            }
                        </div>

                        <div>
                            ×${order.quantity}
                        </div>

                        <div>
                            ₹${formatMoney(order.totalAmount)}
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


            /*
             * Make sure the selected product
             * actually exists.
             */
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


            /*
             * Optional frontend stock check.
             */
            if (
                quantity >
                Number(selectedProduct.stock)
            ) {

                showToast(
                    "Insufficient Stock",
                    `Only ${selectedProduct.stock} units are available.`,
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


                showToast(
                    "Order Placed",
                    `Order #${data.order.id} added to the FIFO queue.`
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
                data.message,
                true
            );

            return;
        }


        showToast(
            "Order Processed",
            `Order #${data.order.id} completed successfully.`
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
                data.message,
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
                data.message,
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
                data.message,
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

        container.innerHTML =
            `<div class="loading">
                No processed orders yet.
            </div>`;

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
                        p.id ===
                        order.productID
                );


            html += `

                <div class="history-row">

                    <div class="order-id">
                        #${order.orderID}
                    </div>

                    <div>
                        ${product
                            ? escapeHtml(product.name)
                            : `Product ${order.productID}`
                        }
                    </div>

                    <div>
                        ${order.quantity}
                    </div>

                    <div>
                        ₹${formatMoney(order.totalAmount)}
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
   DASHBOARD STATS
   ========================================== */

function updateDashboard() {

    document.getElementById(
        "productCount"
    ).textContent =
        products.length;


    document.getElementById(
        "pendingCount"
    ).textContent =
        orders.length;


    document.getElementById(
        "processedCount"
    ).textContent =
        history.length;


    const total =
        history.reduce(
            (sum, order) =>
                sum +
                Number(
                    order.totalAmount || 0
                ),
            0
        );


    document.getElementById(
        "totalValue"
    ).textContent =
        `₹${formatMoney(total)}`;
}


/* ==========================================
   ORDER PREVIEW
   ========================================== */

document
    .getElementById(
        "orderProduct"
    )
    .addEventListener(
        "change",
        updateOrderPreview
    );


document
    .getElementById(
        "orderQuantity"
    )
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


    /*
     * IMPORTANT:
     * Product API uses "id", not "productID".
     */
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


    preview.innerHTML =
        `
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
        .querySelectorAll(
            ".nav-item"
        )
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
        .querySelectorAll(
            ".page-section"
        )
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


    document.getElementById(
        "pageTitle"
    ).textContent =
        titles[section] ||
        "ShopFlow";
}


/* ==========================================
   REFRESH EVERYTHING
   ========================================== */

async function refreshAll() {

    await loadProducts();

    await loadOrders();

    await loadHistory();

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


    document.getElementById(
        "toastTitle"
    ).textContent =
        title;


    document.getElementById(
        "toastMessage"
    ).textContent =
        message;


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
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================
   START
   ========================================== */

initializeApp();