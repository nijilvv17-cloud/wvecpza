
/* =========================================================
   WORLD VISION ELECTRONICS
   Reports & Analytics — reports.js
   Reads existing shop data without modifying records.
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "wve_shop_data_v1";

    const $ = id => document.getElementById(id);

    let activeRange = null;

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function money(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number(value));
    }

    function localDate(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        if (!value) return null;

        const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const date = parseDate(value);

        return date
            ? date.toLocaleDateString("en-IN")
            : "—";
    }

    function readData() {
        const empty = {
            products: [],
            customers: [],
            suppliers: [],
            sales: [],
            purchases: [],
            expenses: [],
            settings: {}
        };

        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );

            return {
                ...empty,
                ...saved,
                products: Array.isArray(saved.products)
                    ? saved.products : [],
                customers: Array.isArray(saved.customers)
                    ? saved.customers : [],
                suppliers: Array.isArray(saved.suppliers)
                    ? saved.suppliers : [],
                sales: Array.isArray(saved.sales)
                    ? saved.sales : [],
                purchases: Array.isArray(saved.purchases)
                    ? saved.purchases : [],
                expenses: Array.isArray(saved.expenses)
                    ? saved.expenses : [],
                settings: saved.settings || {}
            };
        } catch (error) {
            console.error("Unable to read shop data:", error);
            return empty;
        }
    }

    function getRecordDate(record) {
        return String(
            record?.date ||
            record?.purchaseDate ||
            record?.expenseDate ||
            ""
        ).slice(0, 10);
    }

    function getSaleTotal(sale) {
        return number(sale?.total);
    }

    function getPurchaseTotal(purchase) {
        // Supports common purchase amount field names.
        return number(
            purchase?.total ??
            purchase?.grandTotal ??
            purchase?.amount ??
            purchase?.totalAmount ??
            purchase?.netAmount
        );
    }

    function getExpenseTotal(expense) {
        return number(
            expense?.amount ??
            expense?.total ??
            expense?.totalAmount
        );
    }

    function getItems(record) {
        return Array.isArray(record?.items)
            ? record.items
            : [];
    }

    function getQuantity(item) {
        return number(
            item?.quantity ??
            item?.qty
        );
    }

    function getPeriodRange() {
        const period = $("report-period")?.value || "month";
        const today = localDate();
        const now = new Date();
        let start = "";
        let end = today;

        if (period === "today") {
            start = today;
        } else if (period === "week") {
            const date = new Date(now);
            date.setDate(date.getDate() - 6);
            start = localDate(date);
        } else if (period === "month") {
            start = `${today.slice(0, 7)}-01`;
        } else if (period === "year") {
            start = `${today.slice(0, 4)}-01-01`;
        } else if (period === "custom") {
            start = $("report-start-date")?.value || "";
            end = $("report-end-date")?.value || "";
        } else if (period === "all") {
            start = "";
            end = "";
        }

        return { start, end, period };
    }

    function isInRange(record, range) {
        const date = getRecordDate(record);

        // Records without dates cannot be assigned to a period.
        if (!date) return false;

        if (range.start && date < range.start) return false;
        if (range.end && date > range.end) return false;

        return true;
    }

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = String(value);
    }

    function setMoney(id, value) {
        setText(id, money(value));
    }

    /* =========================
       REPORT SUMMARY
       ========================= */

    function renderSummary(data, sales, purchases, expenses) {
        const totalSales = sales.reduce(
            (sum, sale) => sum + getSaleTotal(sale),
            0
        );

        const totalPurchases = purchases.reduce(
            (sum, purchase) => sum + getPurchaseTotal(purchase),
            0
        );

        const totalExpenses = expenses.reduce(
            (sum, expense) => sum + getExpenseTotal(expense),
            0
        );

        setMoney("report-total-sales", totalSales);
        setMoney("report-total-purchases", totalPurchases);
        setMoney("report-total-expenses", totalExpenses);

        setMoney(
            "report-net-balance",
            totalSales - totalPurchases - totalExpenses
        );

        // Sales summary
        setText("report-invoice-count", sales.length);

        setMoney(
            "report-average-bill",
            sales.length ? totalSales / sales.length : 0
        );

        const itemsSold = sales.reduce(
            (sum, sale) => sum + getItems(sale).reduce(
                (itemSum, item) => itemSum + getQuantity(item),
                0
            ),
            0
        );

        setText("report-items-sold", itemsSold);

        const customersServed = new Set(
            sales.map(sale =>
                sale.customerId ||
                String(sale.customer || "").trim().toLowerCase()
            ).filter(Boolean)
        );

        setText("report-customers-served", customersServed.size);

        // Purchase summary
        setText("report-purchase-count", purchases.length);

        const suppliersInvolved = new Set(
            purchases.map(purchase =>
                purchase.supplierId ||
                String(
                    purchase.supplier ||
                    purchase.supplierName ||
                    ""
                ).trim().toLowerCase()
            ).filter(Boolean)
        );

        setText("report-suppliers-count", suppliersInvolved.size);

        const itemsPurchased = purchases.reduce(
            (sum, purchase) => sum + getItems(purchase).reduce(
                (itemSum, item) => itemSum + getQuantity(item),
                0
            ),
            0
        );

        setText("report-items-purchased", itemsPurchased);
        setMoney("report-purchase-amount", totalPurchases);
    }

    /* =========================
       PAYMENT BREAKDOWN
       ========================= */

    function renderPayments(sales) {
        const totals = {
            cash: 0,
            upi: 0,
            card: 0,
            other: 0
        };

        sales.forEach(sale => {
            const method = String(sale.payment || "Cash")
                .trim()
                .toLowerCase();

            const amount = getSaleTotal(sale);

            if (method.includes("cash")) {
                totals.cash += amount;
            } else if (
                method.includes("upi") ||
                method.includes("gpay") ||
                method.includes("google pay") ||
                method.includes("phonepe") ||
                method.includes("paytm")
            ) {
                totals.upi += amount;
            } else if (
                method.includes("card") ||
                method.includes("debit") ||
                method.includes("credit")
            ) {
                totals.card += amount;
            } else {
                totals.other += amount;
            }
        });

        const total = Object.values(totals).reduce(
            (sum, amount) => sum + amount,
            0
        );

        [
            ["cash", totals.cash],
            ["upi", totals.upi],
            ["card", totals.card],
            ["other", totals.other]
        ].forEach(([key, amount]) => {
            setMoney(`report-${key}-amount`, amount);

            const bar = $(`report-${key}-bar`);

            if (bar) {
                const percentage = total > 0
                    ? (amount / total) * 100
                    : 0;

                bar.style.width = `${percentage}%`;
                bar.title = `${percentage.toFixed(1)}%`;
            }
        });
    }

    /* =========================
       INVENTORY OVERVIEW
       Uses current stock, regardless
       of selected reporting period.
       ========================= */

    function renderInventory(products) {
        const productCount = products.length;

        const stockOf = product => number(
            product.stock ??
            product.quantity ??
            product.currentStock ??
            product.stockQuantity
        );

        const totalStock = products.reduce(
            (sum, product) => sum + stockOf(product),
            0
        );

        const outOfStock = products.filter(
            product => stockOf(product) <= 0
        ).length;

        const lowStock = products.filter(product => {
            const stock = stockOf(product);
            const threshold = number(
                product.minStock ??
                product.lowStockLimit ??
                product.reorderLevel ??
                product.minQuantity ??
                5
            );

            return stock > 0 && stock <= threshold;
        }).length;

        setText("report-product-count", productCount);
        setText("report-stock-units", totalStock);
        setText("report-low-stock-count", lowStock);
        setText("report-out-of-stock-count", outOfStock);
    }

    /* =========================
       RECENT SALES TABLE
       ========================= */

    function renderSalesTable(sales) {
        const tbody = $("report-sales-table-body");
        if (!tbody) return;

        const sorted = [...sales].sort((a, b) => {
            const dateA = new Date(
                a.createdAt || a.date || 0
            ).getTime();

            const dateB = new Date(
                b.createdAt || b.date || 0
            ).getTime();

            return dateB - dateA;
        });

        if (!sorted.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="report-empty">
                        No sales found for the selected period.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sorted.slice(0, 100).map(sale => `
            <tr>
                <td>${escapeHTML(sale.invoice || "—")}</td>
                <td>${formatDate(sale.date)}</td>
                <td>${escapeHTML(
                    sale.customer || "Walk-in Customer"
                )}</td>
                <td>${escapeHTML(sale.payment || "Cash")}</td>
                <td class="amount">${money(sale.total)}</td>
                <td><span class="report-status">Completed</span></td>
            </tr>
        `).join("");
    }

    /* =========================
       MAIN RENDER
       ========================= */

    function renderReports() {
        const data = readData();
        const range = activeRange || getPeriodRange();

        const sales = data.sales.filter(
            sale => isInRange(sale, range)
        );

        const purchases = data.purchases.filter(
            purchase => isInRange(purchase, range)
        );

        const expenses = data.expenses.filter(
            expense => isInRange(expense, range)
        );

        renderSummary(data, sales, purchases, expenses);
        renderPayments(sales);
        renderInventory(data.products);
        renderSalesTable(sales);
const dateLabel = $("current-date");

if (dateLabel) {
    dateLabel.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
    }

    /* =========================
       FILTER CONTROLS
       ========================= */

    function updateCustomDateControls() {
        const custom =
            $("report-period")?.value === "custom";

        const start = $("report-start-date");
        const end = $("report-end-date");

        if (start) start.disabled = !custom;
        if (end) end.disabled = !custom;
    }

    function applyFilters() {
        const range = getPeriodRange();

        if (range.period === "custom") {
            if (!range.start || !range.end) {
                alert("Please select both the start date and end date.");
                return;
            }

            if (range.start > range.end) {
                alert("Start date cannot be after end date.");
                return;
            }
        }

        activeRange = range;
        renderReports();
    }

    function exportReportCSV() {
        const data = readData();
        const range = activeRange || getPeriodRange();

        const sales = data.sales
            .filter(sale => isInRange(sale, range))
            .sort((a, b) =>
                String(b.date || "").localeCompare(String(a.date || ""))
            );

        if (!sales.length) {
            alert("There are no sales in this reporting period to export.");
            return;
        }

        const csvCell = value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = [
            [
                "Invoice No.",
                "Date",
                "Customer",
                "Payment Method",
                "Subtotal",
                "Discount",
                "Tax",
                "Total"
            ],

            ...sales.map(sale => [
                sale.invoice || "",
                sale.date || "",
                sale.customer || "Walk-in Customer",
                sale.payment || "Cash",
                number(sale.subtotal),
                number(sale.discount),
                number(sale.tax),
                getSaleTotal(sale)
            ])
        ];

        const csv = "\uFEFF" + rows
            .map(row => row.map(csvCell).join(","))
            .join("\r\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `WVE-Report-${localDate()}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    /* =========================
       INITIALIZE
       ========================= */

    document.addEventListener("DOMContentLoaded", () => {
        $("report-period")?.addEventListener("change", () => {
            updateCustomDateControls();
            activeRange = null;
        });

        $("report-apply-btn")?.addEventListener(
            "click",
            applyFilters
        );

        $("report-refresh-btn")?.addEventListener("click", () => {
            activeRange = getPeriodRange();
            renderReports();
        });

        $("report-print-btn")?.addEventListener("click", () => {
            window.print();
        });

        // Optional CSV export button if you add one to the HTML.
        $("report-export-btn")?.addEventListener(
            "click",
            exportReportCSV
        );

        // Refresh reports if another tab changes saved shop data.
        window.addEventListener("storage", event => {
            if (event.key === STORAGE_KEY) {
                renderReports();
            }
        });

        window.addEventListener("focus", renderReports);
        window.addEventListener("pageshow", renderReports);

        updateCustomDateControls();

        activeRange = getPeriodRange();
        renderReports();
    });
})();
