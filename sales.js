
/* =========================================================
   WORLD VISION ELECTRONICS
   Sales Register — sales.js
   Uses existing localStorage data without modifying sales
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "wve_shop_data_v1";

    const $ = id => document.getElementById(id);

    function number(value) {
        const result = Number(value);
        return Number.isFinite(result) ? result : 0;
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
            maximumFractionDigits: 2
        }).format(number(value));
    }

    function getToday() {
        const date = new Date();

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatDate(value) {
        if (!value) return "—";

       const dateLabel = $('current-date');

if (dateLabel) {
  dateLabel.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}}

    function readSales() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );

            return Array.isArray(saved.sales)
                ? saved.sales
                : [];
        } catch (error) {
            console.error("Unable to read saved sales:", error);
            return [];
        }
    }

    function getItemName(item) {
        return item?.name || item?.productName || "Item";
    }

    function getItemQuantity(item) {
        return number(item?.quantity);
    }

    /* =========================
       SEARCH AND FILTERS
       ========================= */

    function getFilteredSales(allSales) {
        const search = (
            $("sales-search")?.value || ""
        ).trim().toLowerCase();

        const selectedDate =
            $("sales-date-filter")?.value || "";

        const selectedPayment =
            $("sales-payment-filter")?.value || "";

        return allSales.filter(sale => {
            const items = Array.isArray(sale.items)
                ? sale.items
                : [];

            const searchableText = [
                sale.invoice,
                sale.customer,
                sale.phone,
                sale.payment,
                ...items.map(getItemName)
            ].join(" ").toLowerCase();

            const matchesSearch =
                !search || searchableText.includes(search);

            const matchesDate =
                !selectedDate || sale.date === selectedDate;

            const matchesPayment =
                !selectedPayment ||
                String(sale.payment || "Cash").toLowerCase() ===
                selectedPayment.toLowerCase();

            return matchesSearch &&
                matchesDate &&
                matchesPayment;
        }).sort((a, b) => {
            const timeA = new Date(a.createdAt || a.date || 0).getTime();
            const timeB = new Date(b.createdAt || b.date || 0).getTime();

            return timeB - timeA;
        });
    }

    /* =========================
       SUMMARY CARDS
       ========================= */

    function renderSummary(sales) {
        const totalAmount = sales.reduce(
            (sum, sale) => sum + number(sale.total),
            0
        );

        const totalInvoices = sales.length;

        const cashTotal = sales
            .filter(sale =>
                String(sale.payment || "Cash").toLowerCase() === "cash"
            )
            .reduce(
                (sum, sale) => sum + number(sale.total),
                0
            );

        const todayTotal = sales
            .filter(sale => sale.date === getToday())
            .reduce(
                (sum, sale) => sum + number(sale.total),
                0
            );

        if ($("sales-total-amount")) {
            $("sales-total-amount").textContent =
                money(totalAmount);
        }

        if ($("sales-total-invoices")) {
            $("sales-total-invoices").textContent =
                totalInvoices;
        }

        if ($("sales-cash-total")) {
            $("sales-cash-total").textContent =
                money(cashTotal);
        }

        if ($("sales-today-total")) {
            $("sales-today-total").textContent =
                money(todayTotal);
        }

        if ($("sales-record-count")) {
            $("sales-record-count").textContent =
                `Showing ${getFilteredSales(sales).length} of ${sales.length} sales`;
        }
    }

    /* =========================
       SALES TABLE
       ========================= */

    function renderTable(allSales) {
        const tableBody = $("sales-table-body");

        if (!tableBody) return;

        const sales = getFilteredSales(allSales);

        if (sales.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="sales-empty">
                        <strong>${
                            allSales.length
                                ? "No matching sales found"
                                : "No sales recorded yet"
                        }</strong>

                        <p>${
                            allSales.length
                                ? "Try changing your search or filters."
                                : "Completed sales will appear here automatically."
                        }</p>
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML = sales.map(sale => {
            const items = Array.isArray(sale.items)
                ? sale.items
                : [];

            const itemSummary = items.map(item =>
                `${getItemName(item)} × ${getItemQuantity(item)}`
            ).join(", ") || "—";

            const invoice = sale.invoice || "—";
            const customer = sale.customer || "Walk-in Customer";
            const payment = sale.payment || "Cash";
            const id = sale.id ?? "";

            return `
                <tr>
                    <td>
                        <span class="sales-invoice">
                            ${escapeHTML(invoice)}
                        </span>
                    </td>

                    <td>${formatDate(sale.date)}</td>

                    <td>${escapeHTML(customer)}</td>

                    <td title="${escapeHTML(itemSummary)}">
                        ${escapeHTML(itemSummary)}
                    </td>

                    <td>
                        <span class="sales-payment">
                            ${escapeHTML(payment)}
                        </span>
                    </td>

                    <td>
                        <strong>${money(sale.total)}</strong>
                    </td>

                    <td>
                        <span class="sales-status">Completed</span>
                    </td>

                    <td>
                        <div class="sales-actions">
                            <button
                                type="button"
                                class="sales-action-btn"
                                data-sales-view="${escapeHTML(id)}"
                                title="View invoice"
                                aria-label="View invoice">

                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                type="button"
                                class="sales-action-btn"
                                data-sales-print="${escapeHTML(id)}"
                                title="Print invoice"
                                aria-label="Print invoice">

                                <i class="fa-solid fa-print"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* =========================
       REFRESH SALES PAGE
       ========================= */

    function renderSalesPage() {
        const sales = readSales();

        renderSummary(sales);
        renderTable(sales);
    }

    /* =========================
       VIEW INVOICE DETAILS
       ========================= */

    function viewSale(sale) {
        if (!sale) {
            alert("Sale record not found.");
            return;
        }

        const items = Array.isArray(sale.items)
            ? sale.items
            : [];

        const itemDetails = items.map(item =>
            `${getItemName(item)} × ${getItemQuantity(item)}`
        ).join("\n");

        alert(
            `WORLD VISION ELECTRONICS\n\n` +
            `Invoice: ${sale.invoice || "—"}\n` +
            `Date: ${sale.date || "—"}\n` +
            `Customer: ${sale.customer || "Walk-in Customer"}\n` +
            `Phone: ${sale.phone || "—"}\n` +
            `Payment: ${sale.payment || "Cash"}\n\n` +
            `ITEMS\n${itemDetails || "No item details saved"}\n\n` +
            `Subtotal: ${money(sale.subtotal)}\n` +
            `Discount: ${money(sale.discount)}\n` +
            `Tax: ${money(sale.tax)}\n` +
            `TOTAL: ${money(sale.total)}`
        );
    }

    /* =========================
       PRINT INVOICE
       ========================= */

    function printSale(sale) {
        if (!sale) {
            alert("Sale record not found.");
            return;
        }

        const items = Array.isArray(sale.items)
            ? sale.items
            : [];

        const rows = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(getItemName(item))}</td>
                <td>${getItemQuantity(item)}</td>
                <td>${money(item.price)}</td>
                <td>${money(number(item.price) * getItemQuantity(item))}</td>
            </tr>
        `).join("");

        const printWindow = window.open(
            "",
            "_blank",
            "width=800,height=700"
        );

        if (!printWindow) {
            alert("Please allow pop-ups to print the invoice.");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Invoice ${escapeHTML(sale.invoice || "")}</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #111;
                        padding: 30px;
                    }

                    h1 {
                        font-size: 23px;
                        margin-bottom: 5px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }

                    th, td {
                        border: 1px solid #ccc;
                        padding: 10px;
                        text-align: left;
                    }

                    th {
                        background: #f2f2f2;
                    }

                    .totals {
                        width: 270px;
                        margin: 20px 0 0 auto;
                    }

                    .totals p {
                        display: flex;
                        justify-content: space-between;
                    }

                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>

            <body>
                <h1>WORLD VISION ELECTRONICS</h1>
                <p>Cherupuzha, Kannur, Kerala – 670511</p>

                <hr>

                <h2>Sales Invoice</h2>

                <p><strong>Invoice:</strong>
                    ${escapeHTML(sale.invoice || "—")}
                </p>

                <p><strong>Date:</strong>
                    ${formatDate(sale.date)}
                </p>

                <p><strong>Customer:</strong>
                    ${escapeHTML(sale.customer || "Walk-in Customer")}
                </p>

                <p><strong>Phone:</strong>
                    ${escapeHTML(sale.phone || "—")}
                </p>

                <p><strong>Payment:</strong>
                    ${escapeHTML(sale.payment || "Cash")}
                </p>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows || `
                            <tr>
                                <td colspan="5">No items saved</td>
                            </tr>
                        `}
                    </tbody>
                </table>

                <div class="totals">
                    <p><span>Subtotal</span>
                        <strong>${money(sale.subtotal)}</strong>
                    </p>

                    <p><span>Discount</span>
                        <strong>${money(sale.discount)}</strong>
                    </p>

                    <p><span>Tax</span>
                        <strong>${money(sale.tax)}</strong>
                    </p>

                    <hr>

                    <p><span>Total</span>
                        <strong>${money(sale.total)}</strong>
                    </p>
                </div>

                <p>Thank you for your business.</p>

                <script>
                    window.onload = () => window.print();
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    /* =========================
       EXPORT CSV
       ========================= */

    function exportCSV() {
        const sales = getFilteredSales(readSales());

        if (!sales.length) {
            alert("There are no sales to export.");
            return;
        }

        function csvCell(value) {
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
        }

        const rows = [
            [
                "Invoice No.",
                "Date",
                "Customer",
                "Phone",
                "Items",
                "Payment",
                "Subtotal",
                "Discount",
                "Tax",
                "Amount",
                "Status"
            ],

            ...sales.map(sale => [
                sale.invoice || "",
                sale.date || "",
                sale.customer || "Walk-in Customer",
                sale.phone || "",

                (Array.isArray(sale.items) ? sale.items : [])
                    .map(item =>
                        `${getItemName(item)} x ${getItemQuantity(item)}`
                    )
                    .join("; "),

                sale.payment || "Cash",
                number(sale.subtotal),
                number(sale.discount),
                number(sale.tax),
                number(sale.total),
                "Completed"
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
        link.download = `WVE-Sales-${getToday()}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    /* =========================
       CONNECT PAGE CONTROLS
       ========================= */

    document.addEventListener("DOMContentLoaded", () => {
        [
            "sales-search",
            "sales-date-filter",
            "sales-payment-filter"
        ].forEach(id => {
            $(id)?.addEventListener("input", renderSalesPage);
            $(id)?.addEventListener("change", renderSalesPage);
        });

        $("sales-export-btn")?.addEventListener(
            "click",
            exportCSV
        );

        $("sales-table-body")?.addEventListener("click", event => {
            const button = event.target.closest("button");

            if (!button) return;

            const sales = readSales();

            if (button.dataset.salesView !== undefined) {
                const sale = sales.find(item =>
                    String(item.id ?? "") === button.dataset.salesView
                );

                viewSale(sale);
            }

            if (button.dataset.salesPrint !== undefined) {
                const sale = sales.find(item =>
                    String(item.id ?? "") === button.dataset.salesPrint
                );

                printSale(sale);
            }
        });

        // Refresh if another tab updates the saved shop data.
        window.addEventListener("storage", event => {
            if (event.key === STORAGE_KEY) {
                renderSalesPage();
            }
        });

        window.addEventListener("focus", renderSalesPage);
        window.addEventListener("pageshow", renderSalesPage);

        renderSalesPage();
    });
})();
