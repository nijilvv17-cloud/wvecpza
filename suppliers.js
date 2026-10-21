
/* =========================================================
   WORLD VISION ELECTRONICS — SUPPLIERS.JS
   Supplier management for suppliers.html
   Storage key: wve_shop_data_v1
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "wve_shop_data_v1";

    const $ = (id) => document.getElementById(id);

    const money = (amount) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR"
        }).format(Number(amount) || 0);

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    const makeId = () =>
        "supplier-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8);

    function loadData() {
        try {
            const stored = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );

            return {
                products: [],
                customers: [],
                suppliers: [],
                sales: [],
                purchases: [],
                expenses: [],
                settings: {},
                nextInvoice: 1,
                ...stored
            };
        } catch (error) {
            console.error("Could not read shop data:", error);

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

    /*
      Re-read the latest stored data before every change.
      This helps preserve products, sales, purchases and other records.
    */
    function saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Could not save supplier data:", error);
            alert("Unable to save. Please check browser storage.");
            return false;
        }
    }

    function getField(id) {
        return $(id)?.value?.trim() || "";
    }

    function showToast(message) {
        let toast = $("supplier-toast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "supplier-toast";

            Object.assign(toast.style, {
                position: "fixed",
                right: "22px",
                bottom: "22px",
                zIndex: "99999",
                background: "#172b4d",
                color: "#fff",
                padding: "13px 18px",
                borderRadius: "10px",
                boxShadow: "0 8px 24px #0002",
                fontSize: "13px",
                maxWidth: "90vw"
            });

            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.display = "block";

        clearTimeout(toast.timer);

        toast.timer = setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    }

    function getSupplierPurchaseTotal(data, supplier) {
        return (data.purchases || []).reduce((total, purchase) => {
            const sameSupplier =
                purchase.supplierId
                    ? purchase.supplierId === supplier.id
                    : purchase.supplier === supplier.name;

            return sameSupplier
                ? total + (Number(purchase.total) || 0)
                : total;
        }, 0);
    }

    function renderSuppliers() {
        const data = loadData();

        const suppliers = Array.isArray(data.suppliers)
            ? data.suppliers
            : [];

        const search = getField("supplier-search").toLowerCase();
        const statusFilter = getField("supplier-status-filter");

        const filtered = suppliers.filter((supplier) => {
            const searchable = [
                supplier.name,
                supplier.contactPerson,
                supplier.phone,
                supplier.email,
                supplier.category,
                supplier.address
            ].join(" ").toLowerCase();

            const matchesSearch =
                !search || searchable.includes(search);

            const matchesStatus =
                !statusFilter || supplier.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        const tbody = $("suppliers-table-body");

        if (tbody) {
            if (!filtered.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="supplier-empty-state">
                            <i class="fa-solid fa-truck-field"></i>
                            <strong>
                                ${suppliers.length
                                    ? "No matching suppliers found"
                                    : "No suppliers added yet"}
                            </strong>
                            <span>
                                ${suppliers.length
                                    ? "Try changing your search or filter."
                                    : "Use the form above to add your first supplier."}
                            </span>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = filtered.map((supplier) => {
                    const purchaseTotal =
                        getSupplierPurchaseTotal(data, supplier);

                    const status =
                        supplier.status === "Inactive"
                            ? "Inactive"
                            : "Active";

                    return `
                        <tr>
                            <td>
                                <strong>${escapeHTML(supplier.name)}</strong>
                                ${
                                    supplier.contactPerson
                                        ? `<br><small>${escapeHTML(supplier.contactPerson)}</small>`
                                        : ""
                                }
                            </td>

                            <td>${escapeHTML(supplier.phone || "—")}</td>

                            <td>${escapeHTML(supplier.category || "—")}</td>

                            <td>
                                <span class="supplier-status ${
                                    status.toLowerCase()
                                }">
                                    ${status}
                                </span>
                            </td>

                            <td>${money(purchaseTotal)}</td>

                            <td>
                                <button
                                    type="button"
                                    class="supplier-btn"
                                    data-edit-supplier="${escapeHTML(supplier.id)}"
                                    title="Edit supplier">
                                    <i class="fa-solid fa-pen"></i> Edit
                                </button>

                                <button
                                    type="button"
                                    class="supplier-btn"
                                    data-delete-supplier="${escapeHTML(supplier.id)}"
                                    title="Delete supplier">
                                    <i class="fa-solid fa-trash"></i> Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("");
            }
        }

        if ($("total-suppliers")) {
            $("total-suppliers").textContent = suppliers.length;
        }

        if ($("active-suppliers")) {
            $("active-suppliers").textContent =
                suppliers.filter((supplier) =>
                    supplier.status !== "Inactive"
                ).length;
        }

        if ($("supplier-purchase-value")) {
            $("supplier-purchase-value").textContent =
                money(
                    (data.purchases || []).reduce(
                        (total, purchase) =>
                            total + (Number(purchase.total) || 0),
                        0
                    )
                );
        }

        if ($("supplier-record-count")) {
            $("supplier-record-count").textContent =
                `${filtered.length} supplier${filtered.length === 1 ? "" : "s"}`;
        }
    }

    function resetSupplierForm() {
        $("supplier-form")?.reset();

        if ($("supplier-id")) {
            $("supplier-id").value = "";
        }

        if ($("supplier-status")) {
            $("supplier-status").value = "Active";
        }

        if ($("supplier-form-heading")) {
            $("supplier-form-heading").textContent = "Add New Supplier";
        }

        if ($("save-supplier-btn")) {
            $("save-supplier-btn").innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Supplier';
        }
    }

    function saveSupplier(event) {
        event.preventDefault();

        const name = getField("supplier-name");

        if (!name) {
            showToast("Please enter the supplier name.");
            $("supplier-name")?.focus();
            return;
        }

        const data = loadData();

        if (!Array.isArray(data.suppliers)) {
            data.suppliers = [];
        }

        const id = getField("supplier-id");

        const duplicate = data.suppliers.some((supplier) =>
            supplier.name.toLowerCase() === name.toLowerCase() &&
            supplier.id !== id
        );

        if (duplicate) {
            showToast("A supplier with this name already exists.");
            return;
        }

        const existingIndex = data.suppliers.findIndex(
            (supplier) => supplier.id === id
        );

        const existing =
            existingIndex >= 0 ? data.suppliers[existingIndex] : null;

        const supplier = {
            id: existing?.id || makeId(),
            name,
            contactPerson: getField("supplier-contact-person"),
            phone: getField("supplier-phone"),
            email: getField("supplier-email"),
            category: getField("supplier-category"),
            status: getField("supplier-status") || "Active",
            address: getField("supplier-address"),
            notes: getField("supplier-notes"),
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now()
        };

        if (existingIndex >= 0) {
            data.suppliers[existingIndex] = supplier;
        } else {
            data.suppliers.unshift(supplier);
        }

        if (!saveData(data)) return;

        resetSupplierForm();
        renderSuppliers();

        showToast(
            existingIndex >= 0
                ? "Supplier updated successfully."
                : "Supplier added successfully."
        );

        /*
          Notify other same-page scripts if they support this event.
          The supplier data is already saved before dispatching.
        */
        window.dispatchEvent(new Event("wve:data-updated"));
    }

    function editSupplier(id) {
        const data = loadData();

        const supplier = data.suppliers.find(
            (item) => item.id === id
        );

        if (!supplier) {
            showToast("Supplier not found.");
            return;
        }

        const fields = {
            "supplier-id": supplier.id,
            "supplier-name": supplier.name,
            "supplier-contact-person": supplier.contactPerson,
            "supplier-phone": supplier.phone,
            "supplier-email": supplier.email,
            "supplier-category": supplier.category,
            "supplier-status": supplier.status || "Active",
            "supplier-address": supplier.address,
            "supplier-notes": supplier.notes
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            if ($(fieldId)) {
                $(fieldId).value = value ?? "";
            }
        });

        if ($("supplier-form-heading")) {
            $("supplier-form-heading").textContent = "Edit Supplier";
        }

        if ($("save-supplier-btn")) {
            $("save-supplier-btn").innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Update Supplier';
        }

        $("supplier-form")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        $("supplier-name")?.focus();
    }

    function deleteSupplier(id) {
        const data = loadData();

        const supplier = data.suppliers.find(
            (item) => item.id === id
        );

        if (!supplier) {
            showToast("Supplier not found.");
            return;
        }

        const hasPurchases = (data.purchases || []).some((purchase) =>
            purchase.supplierId
                ? purchase.supplierId === supplier.id
                : purchase.supplier === supplier.name
        );

        if (hasPurchases) {
            alert(
                "This supplier has purchase records and cannot be deleted.\n\n" +
                "To preserve purchase history, edit the supplier or change its status to Inactive."
            );
            return;
        }

        if (!confirm(`Delete supplier "${supplier.name}"?`)) {
            return;
        }

        data.suppliers = data.suppliers.filter(
            (item) => item.id !== id
        );

        if (!saveData(data)) return;

        if (getField("supplier-id") === id) {
            resetSupplierForm();
        }

        renderSuppliers();
        showToast("Supplier deleted successfully.");

        window.dispatchEvent(new Event("wve:data-updated"));
    }

    function exportSuppliers() {
        const data = loadData();

        const suppliers = data.suppliers || [];

        if (!suppliers.length) {
            showToast("There are no suppliers to export.");
            return;
        }

        const headers = [
            "Supplier Name",
            "Contact Person",
            "Phone",
            "Email",
            "Category",
            "Status",
            "Address",
            "Notes",
            "Total Purchases"
        ];

        const rows = suppliers.map((supplier) => [
            supplier.name,
            supplier.contactPerson,
            supplier.phone,
            supplier.email,
            supplier.category,
            supplier.status || "Active",
            supplier.address,
            supplier.notes,
            getSupplierPurchaseTotal(data, supplier).toFixed(2)
        ]);

        const csvCell = (value) => {
            let text = String(value ?? "");

            // Reduce the risk of spreadsheet formula injection.
            if (/^[\s]*[=+\-@]/.test(text)) {
                text = "'" + text;
            }

            return '"' + text.replace(/"/g, '""') + '"';
        };

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
        link.download =
            "WORLD_VISION_ELECTRONICS_Suppliers_" +
            new Date().toISOString().slice(0, 10) +
            ".csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast("Supplier CSV exported successfully.");
    }

    function initialiseSuppliers() {
        const form = $("supplier-form");

        if (form) {
            form.addEventListener("submit", saveSupplier);
        }

        $("reset-supplier-btn")?.addEventListener("click", (event) => {
            event.preventDefault();
            resetSupplierForm();
        });

        $("supplier-search")?.addEventListener(
            "input",
            renderSuppliers
        );

        $("supplier-status-filter")?.addEventListener(
            "change",
            renderSuppliers
        );

        $("export-suppliers-btn")?.addEventListener(
            "click",
            exportSuppliers
        );

        $("suppliers-table-body")?.addEventListener("click", (event) => {
            const editButton = event.target.closest(
                "[data-edit-supplier]"
            );

            const deleteButton = event.target.closest(
                "[data-delete-supplier]"
            );

            if (editButton) {
                editSupplier(editButton.dataset.editSupplier);
            }

            if (deleteButton) {
                deleteSupplier(deleteButton.dataset.deleteSupplier);
            }
        });

        if ($("current-date")) {
            $("current-date").textContent =
                new Date().toLocaleDateString("en-IN", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
        }

        if ($("footer-year")) {
            $("footer-year").textContent = new Date().getFullYear();
        }

        renderSuppliers();

        // Refresh if this page becomes visible again.
        window.addEventListener("focus", renderSuppliers);

        window.addEventListener("storage", (event) => {
            if (!event.key || event.key === STORAGE_KEY) {
                renderSuppliers();
            }
        });

        window.addEventListener("pageshow", renderSuppliers);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseSuppliers
        );
    } else {
        initialiseSuppliers();
    }
})();
