
/* WORLD VISION ELECTRONICS
   Products & Inventory — Billing-compatible logic
*/
(() => {
    "use strict";

    const STORAGE_KEY = "wve_shop_data_v1";

    const $ = (id) => document.getElementById(id);

    const num = (value) => {
        const result = Number(value);
        return Number.isFinite(result) ? result : 0;
    };

    const money = (value) => {
        const currency = data.settings?.currency || "INR";

        try {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num(value));
        } catch {
            return "₹" + num(value).toFixed(2);
        }
    };

    const esc = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);

    const uid = () =>
        `product-${Date.now().toString(36)}-${Math.random()
            .toString(36).slice(2, 8)}`;

    const blankData = () => ({
        products: [],
        customers: [],
        suppliers: [],
        sales: [],
        purchases: [],
        expenses: [],
        settings: {},
        nextInvoice: 1
    });

    // --------------------------------------------------
    // SHARED DATABASE
    // --------------------------------------------------

    function loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) return blankData();

            const parsed = JSON.parse(saved);

            if (!parsed || typeof parsed !== "object" ||
                Array.isArray(parsed)) {
                throw new Error("Invalid shop database.");
            }

            return {
                ...blankData(),
                ...parsed,
                products: Array.isArray(parsed.products)
                    ? parsed.products : [],
                customers: Array.isArray(parsed.customers)
                    ? parsed.customers : [],
                suppliers: Array.isArray(parsed.suppliers)
                    ? parsed.suppliers : [],
                sales: Array.isArray(parsed.sales)
                    ? parsed.sales : [],
                purchases: Array.isArray(parsed.purchases)
                    ? parsed.purchases : [],
                expenses: Array.isArray(parsed.expenses)
                    ? parsed.expenses : [],
                settings: parsed.settings &&
                    typeof parsed.settings === "object"
                    ? parsed.settings : {}
            };
        } catch (error) {
            console.error("Could not read shop database:", error);
            alert(
                "The shop database could not be read. " +
                "Please check your existing data before continuing."
            );

            return blankData();
        }
    }

    let data = loadData();

    function saveData() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );

            return true;
        } catch (error) {
            console.error("Could not save shop database:", error);

            alert(
                "Unable to save changes. Your browser storage may be full. " +
                "Please check your storage and try again."
            );

            return false;
        }
    }

    function refreshData() {
        data = loadData();
        renderPage();
    }

    // --------------------------------------------------
    // NOTIFICATIONS
    // --------------------------------------------------

    function toast(message) {
        let element = $("wve-toast");

        if (!element) {
            element = document.createElement("div");
            element.id = "wve-toast";

            Object.assign(element.style, {
                position: "fixed",
                right: "22px",
                bottom: "22px",
                zIndex: "99999",
                background: "#172b4d",
                color: "#fff",
                padding: "13px 18px",
                borderRadius: "10px",
                boxShadow: "0 8px 24px #0002",
                fontSize: "14px",
                maxWidth: "min(420px, 90vw)"
            });

            document.body.appendChild(element);
        }

        element.textContent = message;
        element.style.display = "block";

        clearTimeout(element._timer);

        element._timer = setTimeout(() => {
            element.style.display = "none";
        }, 3000);
    }

    // --------------------------------------------------
    // PAGE DATE
    // --------------------------------------------------

    function renderDate() {
        const dateElement = $("current-date");
        const yearElement = $("footer-year");

        if (dateElement) {
            dateElement.textContent =
                new Date().toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });
        }

        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    // --------------------------------------------------
    // STOCK STATUS
    // --------------------------------------------------

    function stockStatus(product) {
        const quantity = num(product.quantity);
        const minimum = num(product.minStock);

        if (quantity <= 0) {
            return {
                label: "Out of Stock",
                className: "out-of-stock"
            };
        }

        if (quantity <= minimum) {
            return {
                label: "Low Stock",
                className: "low-stock"
            };
        }

        return {
            label: "In Stock",
            className: "in-stock"
        };
    }

    // --------------------------------------------------
    // SUMMARY CARDS
    // --------------------------------------------------

    function renderSummary() {
       const activeProducts = data.products.filter(
    product => product.archived !== true
);

const totalProducts = activeProducts.length;

        const totalStock = data.products
    .filter(product => product.archived !== true)
    .reduce(
        (sum, product) => sum + num(product.quantity),
        0
        );

        const lowStockCount = data.products.filter(
            (product) =>
                num(product.quantity) > 0 &&
                num(product.quantity) <= num(product.minStock)
        ).length;

        const stockValue = data.products.reduce(
            (sum, product) =>
                sum + num(product.cost) * num(product.quantity),
            0
        );

        if ($("total-products")) {
            $("total-products").textContent = totalProducts;
        }

        if ($("total-stock")) {
            $("total-stock").textContent = totalStock;
        }

        if ($("low-stock-count")) {
            $("low-stock-count").textContent = lowStockCount;
        }

        if ($("stock-value")) {
            $("stock-value").textContent = money(stockValue);
        }
    }

    // --------------------------------------------------
    // PRODUCT TABLE
    // --------------------------------------------------

    function renderProducts() {
        const body = $("products-table-body");
        if (!body) return;

        const query = ($("product-search")?.value || "")
            .trim().toLowerCase();

        const category = $("category-filter")?.value || "";
        const stockFilter = $("stock-filter")?.value || "";

      const products = data.products.filter((product) => {
    if (product.archived === true) return false;
            const searchableText = [
                product.name,
                product.code,
                product.brand,
                product.category,
                product.supplier,
                product.description
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(query);

            const matchesCategory =
                !category || product.category === category;

            const status = stockStatus(product);

            let matchesStock = true;

            if (stockFilter === "in-stock") {
                matchesStock = status.label === "In Stock";
            } else if (stockFilter === "low-stock") {
                matchesStock = status.label === "Low Stock";
            } else if (stockFilter === "out-of-stock") {
                matchesStock = status.label === "Out of Stock";
            }

            return matchesSearch &&
                matchesCategory &&
                matchesStock;
        });

        if (products.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        No products found.
                    </td>
                </tr>
            `;
        } else {
            body.innerHTML = products.map((product) => {
                const status = stockStatus(product);

                return `
                    <tr>
                        <td>
                            <strong>${esc(product.name || "Unnamed Product")}</strong>
                            ${
                                product.brand
                                    ? `<br><small>${esc(product.brand)}</small>`
                                    : ""
                            }
                        </td>

                        <td>${esc(product.code || "—")}</td>

                        <td>${esc(product.category || "—")}</td>

                        <td>${money(product.cost)}</td>

                        <td>${money(product.price)}</td>

                        <td>${num(product.quantity)}</td>

                        <td>
                            <span class="stock-status ${status.className}">
                                ${status.label}
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="btn btn-secondary"
                                data-edit-product="${esc(product.id)}">
                                <i class="fa-solid fa-pen"></i>
                                Edit
                            </button>

                            <button
                                type="button"
                                class="btn btn-danger"
                                data-delete-product="${esc(product.id)}">
                                <i class="fa-solid fa-trash"></i>
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        const recordCount = $("product-record-count");

        if (recordCount) {
            recordCount.textContent =
                `${products.length} record${products.length === 1 ? "" : "s"}`;
        }
    }

    // --------------------------------------------------
    // STOCK ALERTS
    // --------------------------------------------------

    function renderStockAlerts() {
        const body = $("inventory-alerts-body");
        if (!body) return;
const alerts = data.products.filter(
    (product) =>
        product.archived !== true &&
        num(product.quantity) <= num(product.minStock)
        );

        if (alerts.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fa-solid fa-circle-check"></i>
                        <strong>No stock alerts</strong>
                        <span>All products are above their minimum stock levels.</span>
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = alerts.map((product) => {
            const status = stockStatus(product);

            return `
                <tr>
                    <td>${esc(product.name || "Unnamed Product")}</td>
                    <td>${esc(product.code || "—")}</td>
                    <td>${num(product.quantity)}</td>
                    <td>${num(product.minStock)}</td>
                    <td>
                        <span class="stock-status ${status.className}">
                            ${status.label}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // --------------------------------------------------
    // FORM RESET
    // --------------------------------------------------

    function resetProductForm() {
        $("product-form")?.reset();

        if ($("product-id")) {
            $("product-id").value = "";
        }

        if ($("product-min-stock")) {
            $("product-min-stock").value = "5";
        }

        if ($("product-form-title")) {
            $("product-form-title").textContent = "Add New Product";
        }

        if ($("save-product-btn")) {
            $("save-product-btn").innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Product';
        }
    }

    // --------------------------------------------------
    // EDIT PRODUCT
    // --------------------------------------------------

    function editProduct(id) {
        data = loadData();

        const product = data.products.find(
            (item) => String(item.id) === String(id)
        );

        if (!product) {
            toast("Product not found. Refreshing inventory.");
            renderPage();
            return;
        }

        $("product-id").value = product.id ?? "";
        $("product-name").value = product.name ?? "";
        $("product-code").value = product.code ?? "";
        $("product-category").value = product.category ?? "";
        $("product-brand").value = product.brand ?? "";
        $("product-cost").value = product.cost ?? 0;
        $("product-price").value = product.price ?? 0;
        $("product-quantity").value = product.quantity ?? 0;
        $("product-min-stock").value = product.minStock ?? 5;
        $("product-supplier").value = product.supplier ?? "";
        $("product-description").value = product.description ?? "";

        if ($("product-form-title")) {
            $("product-form-title").textContent = "Edit Product";
        }

        if ($("save-product-btn")) {
            $("save-product-btn").innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Update Product';
        }

        $("product-form-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        $("product-name")?.focus({
            preventScroll: true
        });
    }

    // --------------------------------------------------
    // ADD / UPDATE PRODUCT
    // --------------------------------------------------

    function handleProductSubmit(event) {
        event.preventDefault();

        // Read the latest shared database before modifying it.
        data = loadData();

        const id = $("product-id")?.value?.trim() || "";
        const name = $("product-name")?.value?.trim() || "";
        const code = $("product-code")?.value?.trim() || "";
        const category = $("product-category")?.value || "";
        const brand = $("product-brand")?.value?.trim() || "";
        const supplier = $("product-supplier")?.value?.trim() || "";
        const description =
            $("product-description")?.value?.trim() || "";

        const costText = $("product-cost")?.value ?? "";
        const priceText = $("product-price")?.value ?? "";
        const quantityText = $("product-quantity")?.value ?? "";
        const minimumText = $("product-min-stock")?.value ?? "";

        const cost = Number(costText);
        const price = Number(priceText);
        const quantity = Number(quantityText);
        const minStock = minimumText === "" ? 5 : Number(minimumText);

        if (!name) {
            toast("Please enter the product name.");
            $("product-name")?.focus();
            return;
        }

        if (!category) {
            toast("Please select a product category.");
            $("product-category")?.focus();
            return;
        }

        if (
            costText === "" ||
            !Number.isFinite(cost) ||
            cost < 0
        ) {
            toast("Enter a valid purchase price.");
            $("product-cost")?.focus();
            return;
        }

        if (
            priceText === "" ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            toast("Enter a valid selling price.");
            $("product-price")?.focus();
            return;
        }

        if (
            quantityText === "" ||
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            toast("Opening stock must be a whole number of zero or more.");
            $("product-quantity")?.focus();
            return;
        }

        if (
            !Number.isInteger(minStock) ||
            minStock < 0
        ) {
            toast("Minimum stock must be a whole number of zero or more.");
            $("product-min-stock")?.focus();
            return;
        }

        const duplicateCode = code
            ? data.products.find((product) =>
                String(product.code || "").trim().toLowerCase() ===
                    code.toLowerCase() &&
                String(product.id) !== id
            )
            : null;

        if (duplicateCode) {
            toast("This product code is already in use.");
            $("product-code")?.focus();
            return;
        }

        const existingIndex = data.products.findIndex(
            (product) => String(product.id) === id
        );

        if (id && existingIndex === -1) {
            toast("This product no longer exists. Refresh and try again.");
            resetProductForm();
            renderPage();
            return;
        }

        let product;

        if (existingIndex >= 0) {
            const existing = data.products[existingIndex];

            // Preserve ID and any additional existing properties.
            product = {
                ...existing,
                name,
                code,
                category,
                brand,
                cost,
                price,
                quantity,
                minStock,
                supplier,
                description
            };

            data.products[existingIndex] = product;
        } else {
            product = {
                id: uid(),
                name,
                code,
                category,
                brand,
                cost,
                price,
                quantity,
                minStock,
                supplier,
                description,
                createdAt: Date.now()
            };

            data.products.push(product);
        }

        if (!saveData()) return;

        resetProductForm();
        renderPage();

        toast(
            existingIndex >= 0
                ? "Product updated successfully."
                : "Product added successfully."
        );
    }

    // --------------------------------------------------
    // DELETE PRODUCT
    // --------------------------------------------------

function deleteProduct(id) {
    data = loadData();

    const product = data.products.find(
        item => String(item.id) === String(id)
    );

    if (!product) {
        toast("Product not found.");
        renderPage();
        return;
    }

    const usedInSales = data.sales.some(sale =>
        (sale.items || []).some(item =>
            String(item.productId) === String(product.id)
        )
    );

    const usedInPurchases = data.purchases.some(purchase =>
        (purchase.items || []).some(item =>
            String(item.productId) === String(product.id)
        )
    );

    if (usedInSales || usedInPurchases) {
        const confirmed = confirm(
            `"${product.name}" has historical records.\n\n` +
            "Archive this product instead of permanently deleting it?\n\n" +
            "Old sales and purchase history will be preserved."
        );

        if (!confirmed) return;

        data.products = data.products.map(item =>
            String(item.id) === String(product.id)
                ? { ...item, archived: true }
                : item
        );

        if (!saveData()) return;

        if (String($("product-id")?.value || "") === String(id)) {
            resetProductForm();
        }

        renderPage();
        toast("Product archived. Historical records preserved.");
        return;
    }

    const confirmed = confirm(
        `Permanently delete "${product.name}" from inventory?`
    );

    if (!confirmed) return;

    data.products = data.products.filter(
        item => String(item.id) !== String(product.id)
    );

    if (!saveData()) return;

    if (String($("product-id")?.value || "") === String(id)) {
        resetProductForm();
    }

    renderPage();
    toast("Product deleted successfully.");
}


    function bindEvents() {
        $("product-form")?.addEventListener(
            "submit",
            handleProductSubmit
        );

        $("reset-product-btn")?.addEventListener("click", () => {
            // Allow the native reset first, then restore the defaults.
            setTimeout(resetProductForm, 0);
        });

        ["product-search", "category-filter", "stock-filter"]
            .forEach((id) => {
                $(id)?.addEventListener("input", renderProducts);
                $(id)?.addEventListener("change", renderProducts);
            });

        $("products-table-body")?.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (!button) return;

            if (button.hasAttribute("data-edit-product")) {
                editProduct(button.getAttribute("data-edit-product"));
            } else if (button.hasAttribute("data-delete-product")) {
                deleteProduct(button.getAttribute("data-delete-product"));
            }
        });

        // Keep the inventory view updated when Billing or Purchases
        // changes the shared database in another browser tab.
        window.addEventListener("storage", (event) => {
            if (event.key === STORAGE_KEY) {
                refreshData();
            }
        });

        window.addEventListener("focus", refreshData);
        window.addEventListener("pageshow", refreshData);

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) refreshData();
        });
    }

    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    function renderPage() {
        renderDate();
        renderSummary();
        renderProducts();
        renderStockAlerts();
    }

    bindEvents();
    renderPage();
})();
