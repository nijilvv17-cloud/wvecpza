
(() => {
    "use strict";

    const STORAGE_KEY = "wve_shop_data_v1";

    const $ = (id) => document.getElementById(id);

    const elements = {
        currentDate: $("current-date"),
        footerYear: $("footer-year"),

        totalCustomers: $("total-customers"),
        activeCustomers: $("active-customers"),
        customerSalesValue: $("customer-sales-value"),

        form: $("customer-form"),
        customerId: $("customer-id"),
        customerName: $("customer-name"),
        customerPhone: $("customer-phone"),
        customerEmail: $("customer-email"),
        customerType: $("customer-type"),
        customerAddress: $("customer-address"),
        customerNotes: $("customer-notes"),

        formHeading: $("customer-form-heading"),
        saveButton: $("save-customer-btn"),
        resetButton: $("reset-customer-btn"),

        search: $("customer-search"),
        typeFilter: $("customer-type-filter"),

        tableBody: $("customers-table-body"),
        recordCount: $("customer-record-count"),
        exportButton: $("export-customers-btn")
    };

    let data = loadData();

    // --------------------------------------------------
    // DATABASE
    // --------------------------------------------------

    function loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                return {
                    products: [],
                    customers: [],
                    suppliers: [],
                    sales: [],
                    purchases: [],
                    expenses: [],
                    settings: {},
                    nextInvoice: 1
                };
            }

            const parsed = JSON.parse(stored);

            return {
                ...parsed,
                products: Array.isArray(parsed.products) ? parsed.products : [],
                customers: Array.isArray(parsed.customers) ? parsed.customers : [],
                sales: Array.isArray(parsed.sales) ? parsed.sales : [],
                settings: parsed.settings || {}
            };
        } catch (error) {
            console.error("Unable to load shop data:", error);
            return {
                products: [],
                customers: [],
                suppliers: [],
                sales: [],
                purchases: [],
                expenses: [],
                settings: {},
                nextInvoice: 1
            };
        }
    }

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Unable to save shop data:", error);
            alert(
                "Could not save customer data. Check your browser storage."
            );
            return false;
        }
    }

    function refreshData() {
        data = loadData();
        renderCustomers();
    }

    // --------------------------------------------------
    // UTILITIES
    // --------------------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function normalizePhone(value) {
        return String(value ?? "").replace(/\D/g, "");
    }

    function number(value) {
        const result = Number(value);
        return Number.isFinite(result) ? result : 0;
    }

    function money(value) {
        const currency = data.settings?.currency || "INR";

        try {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency,
                maximumFractionDigits: 2
            }).format(number(value));
        } catch {
            return "₹" + number(value).toFixed(2);
        }
    }

    function getCustomerSales(customer) {
        const customerPhone = normalizePhone(customer.phone);
        const customerName = String(customer.name || "")
            .trim()
            .toLowerCase();

        return data.sales.filter((sale) => {
            // Prefer the permanent customer ID.
            if (sale.customerId && customer.id) {
                return String(sale.customerId) === String(customer.id);
            }

            // Compatibility with older sales without customerId.
            const salePhone = normalizePhone(sale.phone);

            if (customerPhone && salePhone) {
                return customerPhone === salePhone;
            }

            return Boolean(
                customerName &&
                String(sale.customer || "").trim().toLowerCase() ===
                    customerName
            );
        });
    }

    function getCustomerTotal(customer) {
        return getCustomerSales(customer).reduce(
            (total, sale) => total + number(sale.total),
            0
        );
    }

    function showMessage(message) {
        alert(message);
    }

    // --------------------------------------------------
    // DATE AND PAGE INITIALIZATION
    // --------------------------------------------------

    function initializePage() {
        if (elements.currentDate) {
            elements.currentDate.textContent =
                new Date().toLocaleDateString("en-IN", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
        }

        if (elements.footerYear) {
            elements.footerYear.textContent =
                new Date().getFullYear();
        }

        bindEvents();
        renderCustomers();
    }

    // --------------------------------------------------
    // CUSTOMER TABLE AND SUMMARY
    // --------------------------------------------------

    function renderCustomers() {
        const searchTerm = String(elements.search?.value || "")
            .trim()
            .toLowerCase();

        const selectedType = elements.typeFilter?.value || "all";

        const customers = data.customers.filter((customer) => {
            const searchableText = [
                customer.name,
                customer.phone,
                customer.email
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);

            const matchesType =
                selectedType === "all" ||
                customer.type === selectedType;

            return matchesSearch && matchesType;
        });

        if (elements.totalCustomers) {
            elements.totalCustomers.textContent =
                data.customers.length;
        }

        if (elements.activeCustomers) {
            elements.activeCustomers.textContent =
                data.customers.filter(
                    (customer) => customer.status !== "Inactive"
                ).length;
        }

        if (elements.customerSalesValue) {
            const totalSales = data.sales.reduce(
                (total, sale) => total + number(sale.total),
                0
            );

            elements.customerSalesValue.textContent =
                money(totalSales);
        }

        if (elements.recordCount) {
            elements.recordCount.textContent =
                `${customers.length} customer${customers.length === 1 ? "" : "s"}`;
        }

        if (!elements.tableBody) return;

        if (customers.length === 0) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:24px;">
                        No customers found.
                    </td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = customers.map((customer) => {
            const totalPurchases = getCustomerTotal(customer);
            const customerStatus = customer.status || "Active";

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(customer.name || "Unnamed")}</strong>
                        ${
                            customer.notes
                                ? `<br><small>${escapeHTML(customer.notes)}</small>`
                                : ""
                        }
                    </td>

                    <td>${escapeHTML(customer.phone || "—")}</td>

                    <td>${escapeHTML(customer.email || "—")}</td>

                    <td>${escapeHTML(customer.type || "Regular")}</td>

                    <td>${escapeHTML(customer.address || "—")}</td>

                    <td>
                        <strong>${money(totalPurchases)}</strong>
                        <br>
                        <small>
                            ${getCustomerSales(customer).length} sale(s)
                        </small>
                    </td>

                    <td>
                        <span class="status-badge ${
                            customerStatus === "Inactive"
                                ? "inactive"
                                : "active"
                        }">
                            ${escapeHTML(customerStatus)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            data-edit-customer="${escapeHTML(customer.id)}"
                            class="btn btn-sm btn-primary">
                            Edit
                        </button>

                        <button
                            type="button"
                            data-delete-customer="${escapeHTML(customer.id)}"
                            class="btn btn-sm btn-danger">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // --------------------------------------------------
    // FORM RESET AND EDIT
    // --------------------------------------------------

    function resetForm() {
        elements.form?.reset();

        if (elements.customerId) {
            elements.customerId.value = "";
        }

        if (elements.formHeading) {
            elements.formHeading.textContent = "Add New Customer";
        }

        if (elements.saveButton) {
            elements.saveButton.textContent = "Save Customer";
        }
    }

    function editCustomer(id) {
        const customer = data.customers.find(
            (item) => String(item.id) === String(id)
        );

        if (!customer) {
            showMessage("Customer not found. Please refresh the page.");
            refreshData();
            return;
        }

        elements.customerId.value = customer.id ?? "";
        elements.customerName.value = customer.name ?? "";
        elements.customerPhone.value = customer.phone ?? "";
        elements.customerEmail.value = customer.email ?? "";
        elements.customerType.value = customer.type || "Regular";
        elements.customerAddress.value = customer.address ?? "";
        elements.customerNotes.value = customer.notes ?? "";

        if (elements.formHeading) {
            elements.formHeading.textContent = "Edit Customer";
        }

        if (elements.saveButton) {
            elements.saveButton.textContent = "Update Customer";
        }

        elements.form?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        elements.customerName?.focus();
    }

    // --------------------------------------------------
    // ADD AND UPDATE CUSTOMER
    // --------------------------------------------------

    function handleFormSubmit(event) {
        event.preventDefault();

        // Load the latest database before making changes.
        data = loadData();

        const id = String(elements.customerId?.value || "").trim();
        const name = String(elements.customerName?.value || "").trim();
        const phone = String(elements.customerPhone?.value || "").trim();
        const email = String(elements.customerEmail?.value || "").trim();
        const type = elements.customerType?.value || "Regular";
        const address = String(elements.customerAddress?.value || "").trim();
        const notes = String(elements.customerNotes?.value || "").trim();

        if (!name) {
            showMessage("Please enter the customer name.");
            elements.customerName?.focus();
            return;
        }

        if (!phone) {
            showMessage("Please enter the customer phone number.");
            elements.customerPhone?.focus();
            return;
        }

        const normalizedPhone = normalizePhone(phone);

        if (!normalizedPhone) {
            showMessage("Please enter a valid phone number.");
            elements.customerPhone?.focus();
            return;
        }

        const duplicate = data.customers.find((customer) => {
            if (String(customer.id) === id && id) return false;

            return normalizePhone(customer.phone) === normalizedPhone;
        });

        if (duplicate) {
            showMessage(
                `This phone number already belongs to ${duplicate.name}.`
            );
            elements.customerPhone?.focus();
            return;
        }

        if (id) {
            const index = data.customers.findIndex(
                (customer) => String(customer.id) === id
            );

            if (index === -1) {
                showMessage(
                    "This customer no longer exists. Please refresh and try again."
                );
                refreshData();
                resetForm();
                return;
            }

            const existing = data.customers[index];

            data.customers[index] = {
                ...existing,
                name,
                phone,
                email,
                type,
                address,
                notes
            };

            if (!saveData()) return;

            showMessage("Customer updated successfully.");
        } else {
            const customer = {
                id: createId(),
                name,
                phone,
                email,
                type,
                address,
                notes,
                status: "Active",
                createdAt: Date.now()
            };

            data.customers.push(customer);

            if (!saveData()) return;

            showMessage("Customer added successfully.");
        }

        resetForm();
        renderCustomers();
    }

    function createId() {
        return "CUS-" +
            Date.now().toString(36).toUpperCase() +
            "-" +
            Math.random().toString(36).slice(2, 7).toUpperCase();
    }

    // --------------------------------------------------
    // DELETE CUSTOMER
    // --------------------------------------------------

    function deleteCustomer(id) {
        data = loadData();

        const customer = data.customers.find(
            (item) => String(item.id) === String(id)
        );

        if (!customer) {
            showMessage("Customer not found.");
            renderCustomers();
            return;
        }

        const linkedSales = getCustomerSales(customer);

        let message =
            `Delete customer "${customer.name}"?\n\n` +'';

        if (linkedSales.length > 0) {
            message +=
                "Customer profile will no longer be available.";
        }

        if (!confirm(message)) return;

        data.customers = data.customers.filter(
            (item) => String(item.id) !== String(id)
        );

        if (!saveData()) return;

        if (String(elements.customerId?.value || "") === String(id)) {
            resetForm();
        }

        renderCustomers();
        showMessage("Customer profile deleted.");
    }

    // --------------------------------------------------
    // EXPORT CUSTOMERS TO CSV
    // --------------------------------------------------

    function exportCustomers() {
        data = loadData();

        if (data.customers.length === 0) {
            showMessage("There are no customers to export.");
            return;
        }

        const headers = [
            "Customer ID",
            "Name",
            "Phone",
            "Email",
            "Type",
            "Address",
            "Notes",
            "Status",
            "Total Purchases",
            "Number of Sales",
            "Created At"
        ];

        const rows = data.customers.map((customer) => [
            customer.id,
            customer.name,
            customer.phone,
            customer.email,
            customer.type,
            customer.address,
            customer.notes,
            customer.status || "Active",
            getCustomerTotal(customer).toFixed(2),
            getCustomerSales(customer).length,
            customer.createdAt
                ? new Date(customer.createdAt).toLocaleString("en-IN")
                : ""
        ]);

        function csvCell(value) {
            let text = String(value ?? "");

            // Reduce risk of spreadsheet formula injection.
            if (/^[=+\-@\t\r]/.test(text)) {
                text = "'" + text;
            }

            return '"' + text.replace(/"/g, '""') + '"';
        }

        const csv = [headers, ...rows]
            .map((row) => row.map(csvCell).join(","))
            .join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "world-vision-electronics-customers.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // --------------------------------------------------
    // EVENT LISTENERS
    // --------------------------------------------------

    function bindEvents() {
        elements.form?.addEventListener("submit", handleFormSubmit);

        elements.resetButton?.addEventListener("click", (event) => {
            event.preventDefault();
            resetForm();
        });

        elements.search?.addEventListener("input", renderCustomers);

        elements.typeFilter?.addEventListener("change", renderCustomers);

        elements.exportButton?.addEventListener("click", exportCustomers);

        // Event delegation supports table rows rendered dynamically.
        elements.tableBody?.addEventListener("click", (event) => {
            const button = event.target.closest("button");

            if (!button) return;

            if (button.hasAttribute("data-edit-customer")) {
                editCustomer(button.getAttribute("data-edit-customer"));
            }

            if (button.hasAttribute("data-delete-customer")) {
                deleteCustomer(button.getAttribute("data-delete-customer"));
            }
        });

        // Billing may register a customer in another page.
        window.addEventListener("storage", (event) => {
            if (event.key === STORAGE_KEY) {
                refreshData();
            }
        });

        window.addEventListener("focus", refreshData);
        window.addEventListener("pageshow", refreshData);
    }

    initializePage();
})();
