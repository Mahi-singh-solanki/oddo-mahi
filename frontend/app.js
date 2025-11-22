// CONFIGURATION
const API_BASE = "http://localhost:8080";
let currentToken = localStorage.getItem("token");
let currentUser = null;
let orderItemsBuffer = []; // Stores items temporarily for the Order Creation form
// === API HELPER ===
async function apiCall(endpoint, method = "GET", body = null) {
    const headers = {
        "Content-Type": "application/json"
    };
    if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
    }

    const config = {
        method,
        headers,
    };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || "API Error");
        }
        return data;
    } catch (error) {
        console.error("API Error:", error);
        alert(error.message);
        if (error.message.includes("expired") || error.message.includes("Access denied")) {
            logout();
        }
        throw error;
    }
}

// === AUTHENTICATION ===
function init() {
    if (currentToken) {
        // Validate token and get user
        apiCall("/auth/me")
            .then(user => {
                currentUser = user;
                document.getElementById("auth-section").style.display = "none";
                document.getElementById("app-section").style.display = "flex";
                document.getElementById("display-username").innerText = `${user.loginid} (${user.role})`;
                navTo('dashboard');
            })
            .catch(() => logout());
    } else {
        document.getElementById("auth-section").style.display = "flex";
        document.getElementById("app-section").style.display = "none";
    }
}

function logout() {
    localStorage.removeItem("token");
    currentToken = null;
    currentUser = null;
    location.reload();
}

// Toggle Login/Signup UI
let isLoginMode = true;
document.getElementById("auth-toggle").addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    const title = document.getElementById("auth-title");
    const emailInput = document.getElementById("auth-email");
    const btn = document.getElementById("auth-btn");
    const toggleText = document.querySelector("#auth-toggle span");

    if (isLoginMode) {
        title.innerText = "Stocker Login";
        emailInput.style.display = "none";
        btn.innerText = "Login";
        toggleText.innerText = "Sign Up";
    } else {
        title.innerText = "Create Account";
        emailInput.style.display = "block";
        btn.innerText = "Sign Up";
        toggleText.innerText = "Login";
    }
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginid = document.getElementById("auth-loginid").value;
    const password = document.getElementById("auth-password").value;
    const email = document.getElementById("auth-email").value;

    try {
        if (isLoginMode) {
            const res = await apiCall("/auth/login", "POST", { loginid, password });
            localStorage.setItem("token", res.token);
            currentToken = res.token;
            init();
        } else {
            await apiCall("/auth/signup", "POST", { loginid, password, email });
            alert("Account created! Please login.");
            location.reload();
        }
    } catch (err) {
        // Alert handled in apiCall
    }
});

// === NAVIGATION ===
function navTo(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Show selected view
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // Load Data based on view
    if (viewId === 'dashboard') loadDashboard();
    if (viewId === 'products') loadProducts();
    if (viewId === 'orders') loadOrders();
    if (viewId === 'deliveries') loadDeliveries();
    if (viewId === 'warehouses') loadWarehouses();
    if (viewId === 'transfers') loadTransfers();
}

// === VIEWS LOGIC ===

// 1. DASHBOARD
async function loadDashboard() {
    const pData = await apiCall("/products");
    const oData = await apiCall("/orders/receipt");
    const wData = await apiCall("/warehouses");

    document.getElementById("dash-prod-count").innerText = pData.count;
    document.getElementById("dash-order-count").innerText = oData.count;
    document.getElementById("dash-warehouse-count").innerText = wData.count;
}

// 2. PRODUCTS
// --- GLOBAL VARIABLE ---
let allProductsData = []; // Stores the full list from the API

// --- 1. FETCH PRODUCTS ---
async function loadProducts() {
    try {
        const data = await apiCall("/products");
        
        // Store the raw data globally
        allProductsData = data.products; 
        
        // Render the full list initially
        renderProductTable(allProductsData);
    } catch(err) {
        console.error("Error loading products", err);
    }
}

// --- 2. RENDER TABLE (Draws HTML based on any array passed to it) ---
function renderProductTable(productsArray) {
    const tbody = document.querySelector("#products-table tbody");
    tbody.innerHTML = "";

    if (productsArray.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px;'>No products found</td></tr>";
        return;
    }

    productsArray.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.name}</td>
            <td style="font-weight:bold;">${p.SKUcode}</td>
            <td>${p.category}</td>
            <td>${p.price}</td>
            <td style="font-weight:bold; color:#2563eb;">${p.stock} ${p.unit || ''}</td>
            <td>${p.location}</td>
            <td style="display:flex; gap:5px;">
                <button onclick="openUpdateModal('${p._id}', '${p.name}', ${p.stock})" class="secondary-btn" style="background:#eab308;">Update</button>
                <button onclick="openTransferModal('${p._id}', '${p.name}')" class="secondary-btn">Transfer</button>
                <button onclick="deleteProduct('${p._id}')" class="danger-btn">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 3. SEARCH LOGIC ---
document.getElementById("search-sku").addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    // Filter the global data
    const filteredProducts = allProductsData.filter(product => {
        // We check if the SKU includes the search term
        // (We also add Name check so it's more user friendly, remove if you ONLY want SKU)
        return product.SKUcode.toLowerCase().includes(searchTerm) || 
               product.name.toLowerCase().includes(searchTerm);
    });

    // Re-draw the table with only the filtered items
    renderProductTable(filteredProducts);
});

async function lowstock() {
    const data=await apiCall("/products");
    console.log(data.products)
    const div=document.querySelector("#view-dashboard");
    const newdiv=document.createElement("div");
    newdiv.innerHTML=`
    <h2 style="color:red;margintop:10px;">Alerts !</h2>
    `
    newdiv.classList.add("alertdiv")
    data.products.forEach(p=>{
        if(p.stock<5)
        {
            const alertdiv=document.createElement("div");
            alertdiv.innerHTML=`
            <h3 style=";padding:0px" >Stock of ${p.name} is less</h3>
            `;
            newdiv.appendChild(alertdiv)
        }
    })
    div.appendChild(newdiv)
} 
lowstock()
async function deleteProduct(id) {
    if(confirm("Are you sure?")) {
        await apiCall(`/products/${id}`, "DELETE");
        loadProducts();
    }
}

document.getElementById("form-add-product").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    await apiCall("/product", "POST", body);
    closeModal("modal-add-product");
    loadProducts();
});

// Transfer Logic
function openTransferModal(id, name) {
    document.getElementById("transfer-prod-id").value = id;
    document.getElementById("transfer-prod-name").innerText = name;
    openModal("modal-transfer-product");
}

document.getElementById("form-transfer-product").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("transfer-prod-id").value;
    const to = document.getElementById("transfer-to").value;
    await apiCall(`/products/${id}/transfer`, "POST", { to });
    closeModal("modal-transfer-product");
    loadProducts();
});

// 3. WAREHOUSES
async function loadWarehouses() {
    const data = await apiCall("/warehouses");
    const tbody = document.querySelector("#warehouses-table tbody");
    tbody.innerHTML = "";
    data.warehouses.forEach(w => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${w.name}</td><td>${w.shortcode}</td><td>${w.address}</td>`;
        tbody.appendChild(tr);
    });
}

document.getElementById("form-add-warehouse").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await apiCall("/warehouse", "POST", Object.fromEntries(formData.entries()));
    closeModal("modal-add-warehouse");
    loadWarehouses();
});

// 4. ORDERS
async function loadOrders() {
    const data = await apiCall("/orders/receipt");
    const tbody = document.querySelector("#orders-table tbody");
    tbody.innerHTML = "";
    data.receipts.forEach(o => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${o.order_no}</td>
            <td><span style="color:${o.order_type === 'received' ? 'green':'blue'}">${o.order_type.toUpperCase()}</span></td>
            <td>${o.supplier}</td>
            <td>${o.totalamount}</td>
            <td>${o.products.map(p => p.name).join(", ")}</td>
            <td>${new Date().toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Create Order Logic
function toggleDeliveryFields() {
    const type = document.getElementById("order-type").value;
    const fields = document.getElementById("delivery-fields");
    fields.style.display = type === "sent" ? "block" : "none";
}

function addOrderItem() {
    const sku = document.getElementById("item-sku").value;
    const name = document.getElementById("item-name").value;
    const cat = document.getElementById("item-category").value;
    const qty = document.getElementById("item-qty").value;
    const price = document.getElementById("item-price").value;

    if(!sku || !qty || !price) {
        alert("SKU, Quantity and Price are required");
        return;
    }

    const item = {
        SKUcode: sku,
        name: name,
        category: cat,
        quantity: parseInt(qty),
        unitPrice: parseFloat(price)
    };

    orderItemsBuffer.push(item);
    renderOrderBuffer();
    
    // Clear inputs
    document.getElementById("item-sku").value = "";
    document.getElementById("item-name").value = "";
    document.getElementById("item-category").value = "";
    document.getElementById("item-qty").value = "";
    document.getElementById("item-price").value = "";
}

function renderOrderBuffer() {
    const list = document.getElementById("order-items-list");
    list.innerHTML = "";
    orderItemsBuffer.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.SKUcode} (x${item.quantity})</span> <span style="color:red; cursor:pointer;" onclick="removeBufferItem(${index})">X</span>`;
        list.appendChild(li);
    });
}

function removeBufferItem(index) {
    orderItemsBuffer.splice(index, 1);
    renderOrderBuffer();
}

document.getElementById("form-create-order").addEventListener("submit", async (e) => {
    e.preventDefault();
    if(orderItemsBuffer.length === 0) return alert("Add at least one product");

    const body = {
        order_no: document.getElementById("order-no").value,
        supplier: document.getElementById("order-supplier").value,
        order_type: document.getElementById("order-type").value,
        products: orderItemsBuffer
    };

    if(body.order_type === "sent") {
        body.recipientName = document.getElementById("order-recipient").value;
        body.shippingAddress = document.getElementById("order-address").value;
        if(!body.recipientName || !body.shippingAddress) return alert("Recipient info required for sent orders");
    }

    await apiCall("/orders/receipt", "POST", body);
    orderItemsBuffer = [];
    renderOrderBuffer();
    e.target.reset();
    closeModal("modal-create-order");
    loadOrders();
});

// 5. DELIVERIES
async function loadDeliveries() {
    const data = await apiCall("/orders/delivery");
    const tbody = document.querySelector("#deliveries-table tbody");
    tbody.innerHTML = "";
    data.deliveryorders.forEach(d => {
        const tr = document.createElement("tr");
        const statuses = ['Pending', 'Processing', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'];
        
        // Create select options for status
        let options = statuses.map(s => `<option value="${s}" ${d.deliveryStatus === s ? 'selected' : ''}>${s}</option>`).join('');

        tr.innerHTML = `
            <td>${d.orderNumber}</td>
            <td>${d.recipientName}</td>
            <td>${d.shippingAddress}</td>
            <td>
                <select onchange="updateDelivery('${d._id}', this.value)" style="padding:5px;">
                    ${options}
                </select>
            </td>
            <td>${new Date(d.createdAt).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateDelivery(id, status) {
    await apiCall(`/delivery/${id}`, "PUT", { deliveryStatus: status });
    alert("Status Updated");
}

// 6. TRANSFERS
async function loadTransfers() {
    const data = await apiCall("/transfers");
    const tbody = document.querySelector("#transfers-table tbody");
    tbody.innerHTML = "";
    data.transfers.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${t.productId}</td>
            <td>${t.from}</td>
            <td>${t.to}</td>
            <td>${new Date(t.createdAt).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// === MODAL UTILS ===
function openModal(id) {
    document.getElementById(id).style.display = "block";
}
function closeModal(id) {
    document.getElementById(id).style.display = "none";
}
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}
// === UPDATE STOCK LOGIC ===

// 1. Open the modal and pre-fill values
function openUpdateModal(id, name, currentStock) {
    document.getElementById("update-id").value = id;
    document.getElementById("update-name").innerText = name;
    document.getElementById("update-stock-qty").value = currentStock;
    openModal("modal-update-stock");
}

// 2. Handle the Form Submission
document.getElementById("form-update-stock").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const id = document.getElementById("update-id").value;
    const newStock = document.getElementById("update-stock-qty").value;

    // Backend expects { stock: Number }
    const body = {
        stock: parseInt(newStock)
    };

    try {
        // Call the PUT route defined in your backend
        await apiCall(`/products/${id}`, "PUT", body);
        
        closeModal("modal-update-stock");
        loadProducts(); // Refresh the table to show new stock
        alert("Stock updated successfully!");
    } catch (err) {
        console.error(err);
        alert("Failed to update stock.");
    }
});
// Initialize
init();