
/* =========================================================
   WORLD VISION ELECTRONICS
   Settings — settings.js
   Uses the existing wve_shop_data_v1 storage key.
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "wve_shop_data_v1";
    const $ = id => document.getElementById(id);

    const DEFAULT_SETTINGS = {
        shopName: "WORLD VISION ELECTRONICS",
        phone: "",
        email: "",
        address: "Cherupuzha, Kannur, Kerala - 670511",
        currency: "INR",
        timezone: "Asia/Kolkata",

        invoicePrefix: "WVE",
        invoiceStart: 1,
        defaultPayment: "Cash",
        taxRate: 0,
        showAddress: true,
        showDateTime: true,
        showCustomer: true,

        lowStock: 5,
        defaultUnit: "Piece",
        enableLowStock: true,
        zeroStockWarning: true,
        preventNegativeStock: true,

        dateFormat: "DD/MM/YYYY",
        numberFormat: "2",
        compactTables: false,
        confirmDelete: true
    };

    function readData() {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );
        } catch (error) {
            console.error("Could not read shop data:", error);
            return {};
        }
    }

    function writeData(data) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );
            return true;
        } catch (error) {
            console.error("Could not save shop data:", error);
            alert(
                "Unable to save data. Your browser storage may be full or unavailable."
            );
            return false;
        }
    }

    function getSettings() {
        const data = readData();

        return {
            ...DEFAULT_SETTINGS,
            ...(data.settings || {})
        };
    }

    function saveSettings(updates) {
        const data = readData();

        data.settings = {
            ...DEFAULT_SETTINGS,
            ...(data.settings || {}),
            ...updates
        };

        return writeData(data);
    }

    function showMessage(message) {
        alert(message);
    }

    function setValue(id, value) {
        const element = $(id);
        if (element && value !== undefined && value !== null) {
            element.value = String(value);
        }
    }

    function setChecked(id, value) {
        const element = $(id);
        if (element) {
            element.checked = Boolean(value);
        }
    }

    function readValue(id) {
        return $(id)?.value ?? "";
    }

    function readNumber(id, fallback = 0) {
        const value = Number(readValue(id));

        return Number.isFinite(value) ? value : fallback;
    }

    function readChecked(id) {
        return Boolean($(id)?.checked);
    }

    /* =========================
       SETTINGS TABS
       ========================= */

    function initializeTabs() {
        document.querySelectorAll("[data-settings-tab]").forEach(button => {
            button.addEventListener("click", () => {
                const tab = button.dataset.settingsTab;

                document.querySelectorAll("[data-settings-tab]")
                    .forEach(item => item.classList.remove("active"));

                document.querySelectorAll(".settings-section")
                    .forEach(section => section.classList.remove("active"));

                button.classList.add("active");

                const section = $(`settings-section-${tab}`);

                if (section) {
                    section.classList.add("active");
                }
            });
        });
    }

    /* =========================
       LOAD SAVED SETTINGS
       ========================= */

    function loadSettings() {
        const settings = getSettings();

        setValue("settings-shop-name", settings.shopName);
        setValue("settings-phone", settings.phone);
        setValue("settings-email", settings.email);
        setValue("settings-address", settings.address);
        setValue("settings-currency", settings.currency);
        setValue("settings-timezone", settings.timezone);

        setValue("settings-invoice-prefix", settings.invoicePrefix);
        setValue("settings-invoice-start", settings.invoiceStart);
        setValue("settings-default-payment", settings.defaultPayment);
        setValue("settings-tax-rate", settings.taxRate);

        setChecked("settings-show-address", settings.showAddress);
        setChecked("settings-show-datetime", settings.showDateTime);
        setChecked("settings-show-customer", settings.showCustomer);

        setValue("settings-low-stock", settings.lowStock);
        setValue("settings-default-unit", settings.defaultUnit);

        setChecked("settings-enable-low-stock", settings.enableLowStock);
        setChecked("settings-zero-stock-warning", settings.zeroStockWarning);
        setChecked(
            "settings-prevent-negative-stock",
            settings.preventNegativeStock
        );

        setValue("settings-date-format", settings.dateFormat);
        setValue("settings-number-format", settings.numberFormat);

        setChecked("settings-compact-tables", settings.compactTables);
        setChecked("settings-confirm-delete", settings.confirmDelete);

        updateCurrentDate();
    }

    function updateCurrentDate() {
        const element = $("settings-current-date");

        if (element) {
            element.textContent =
                `System Settings • ${new Date().toLocaleDateString("en-IN")}`;
        }
    }

    /* =========================
       SHOP INFORMATION
       ========================= */

    function saveShopForm(event) {
        event.preventDefault();

        const name = readValue("settings-shop-name").trim();

        if (!name) {
            showMessage("Please enter the shop name.");
            return;
        }

        const success = saveSettings({
            shopName: name,
            phone: readValue("settings-phone").trim(),
            email: readValue("settings-email").trim(),
            address: readValue("settings-address").trim(),
            currency: readValue("settings-currency"),
            timezone: readValue("settings-timezone")
        });

        if (success) {
            showMessage("Shop information saved successfully.");
        }
    }

    /* =========================
       BILLING SETTINGS
       ========================= */

    function saveBillingForm(event) {
        event.preventDefault();

        const prefix = readValue("settings-invoice-prefix").trim();
        const invoiceStart = readNumber("settings-invoice-start", 1);
        const taxRate = readNumber("settings-tax-rate", 0);

        if (invoiceStart < 1) {
            showMessage("Starting invoice number must be at least 1.");
            return;
        }

        if (taxRate < 0 || taxRate > 100) {
            showMessage("Tax rate must be between 0 and 100.");
            return;
        }

        const success = saveSettings({
            invoicePrefix: prefix,
            invoiceStart: Math.floor(invoiceStart),
            defaultPayment: readValue("settings-default-payment"),
            taxRate,
            showAddress: readChecked("settings-show-address"),
            showDateTime: readChecked("settings-show-datetime"),
            showCustomer: readChecked("settings-show-customer")
        });

        if (success) {
            showMessage(
                "Billing settings saved successfully.\n\n" +
                "These preferences are saved. Existing billing code must read " +
                "the relevant settings for them to affect invoice generation."
            );
        }
    }

    /* =========================
       INVENTORY SETTINGS
       ========================= */

    function saveInventoryForm(event) {
        event.preventDefault();

        const lowStock = readNumber("settings-low-stock", 5);

        if (lowStock < 0) {
            showMessage("Low-stock warning level cannot be negative.");
            return;
        }

        const success = saveSettings({
            lowStock,
            defaultUnit: readValue("settings-default-unit"),
            enableLowStock: readChecked("settings-enable-low-stock"),
            zeroStockWarning: readChecked("settings-zero-stock-warning"),
            preventNegativeStock: readChecked(
                "settings-prevent-negative-stock"
            )
        });

        if (success) {
            showMessage(
                "Inventory settings saved successfully."
            );
        }
    }

    /* =========================
       DISPLAY PREFERENCES
       ========================= */

    function applyDisplayPreferences() {
        const settings = getSettings();

        document.body.classList.toggle(
            "compact-tables",
            Boolean(settings.compactTables)
        );
    }

    function saveAppearanceForm(event) {
        event.preventDefault();

        const success = saveSettings({
            dateFormat: readValue("settings-date-format"),
            numberFormat: readValue("settings-number-format"),
            compactTables: readChecked("settings-compact-tables"),
            confirmDelete: readChecked("settings-confirm-delete")
        });

        if (success) {
            applyDisplayPreferences();

            showMessage(
                "Display preferences saved successfully."
            );
        }
    }

    /* =========================
       RESET BUTTONS ON FORMS
       Restore saved values after
       the browser resets a form.
       ========================= */

    function initializeFormResets() {
        document.querySelectorAll(".settings-form").forEach(form => {
            form.addEventListener("reset", () => {
                setTimeout(() => {
                    loadSettings();
                }, 0);
            });
        });
    }

    /* =========================
       EXPORT COMPLETE BACKUP
       ========================= */

    function exportData() {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            showMessage("No saved shop data was found to export.");
            return;
        }

        let data;

        try {
            data = JSON.parse(raw);
        } catch (error) {
            showMessage("The saved shop data could not be read.");
            return;
        }

        const backup = {
            backupType: "WORLD_VISION_ELECTRONICS",
            backupVersion: 1,
            exportedAt: new Date().toISOString(),
            storageKey: STORAGE_KEY,
            data
        };

        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            `WVE-Backup-${new Date().toISOString().slice(0, 10)}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /* =========================
       IMPORT BACKUP
       Validate before replacing
       any saved data.
       ========================= */

    function initializeImport() {
        const trigger = $("settings-import-trigger");
        const fileInput = $("settings-import-file");

        trigger?.addEventListener("click", () => {
            if (fileInput) {
                fileInput.click();
            }
        });

        fileInput?.addEventListener("change", async () => {
            const file = fileInput.files?.[0];

            if (!file) return;

            try {
                const text = await file.text();
                const imported = JSON.parse(text);

                let importedData;

                if (
                    imported &&
                    imported.backupType === "WORLD_VISION_ELECTRONICS" &&
                    imported.data &&
                    typeof imported.data === "object"
                ) {
                    importedData = imported.data;
                } else if (
                    imported &&
                    typeof imported === "object" &&
                    (
                        Array.isArray(imported.products) ||
                        Array.isArray(imported.sales) ||
                        Array.isArray(imported.customers) ||
                        Array.isArray(imported.purchases)
                    )
                ) {
                    // Also accept a direct export of the saved data object.
                    importedData = imported;
                } else {
                    showMessage(
                        "This file does not appear to be a compatible shop backup."
                    );
                    return;
                }

                const validArrays = [
                    "products",
                    "customers",
                    "suppliers",
                    "sales",
                    "purchases",
                    "expenses"
                ];

                for (const key of validArrays) {
                    if (
                        importedData[key] !== undefined &&
                        !Array.isArray(importedData[key])
                    ) {
                        showMessage(
                            `The backup contains invalid "${key}" data. Nothing was imported.`
                        );
                        return;
                    }
                }

                const confirmed = confirm(
                    "Importing this backup will replace the shop data currently " +
                    "saved in this browser.\n\n" +
                    "Export a backup of your current data first if you need it.\n\n" +
                    "Do you want to continue?"
                );

                if (!confirmed) return;

                if (writeData(importedData)) {
                    loadSettings();

                    showMessage(
                        "Backup imported successfully. The page will now reload."
                    );

                    window.location.reload();
                }
            } catch (error) {
                console.error("Backup import failed:", error);
                showMessage(
                    "Could not import this file. Please choose a valid JSON backup."
                );
            } finally {
                fileInput.value = "";
            }
        });
    }

    /* =========================
       RESET SHOP DATA
       ========================= */

    function resetData() {
        const confirmed = confirm(
            "WARNING: This will permanently remove all saved shop records " +
            "from this browser, including products, customers, suppliers, " +
            "sales, purchases, expenses and settings.\n\n" +
            "Export a backup before continuing.\n\n" +
            "Do you really want to reset all shop data?"
        );

        if (!confirmed) return;

        const secondConfirmation = prompt(
            'To confirm the reset, type RESET in capital letters.'
        );

        if (secondConfirmation !== "RESET") {
            showMessage("Reset cancelled. Saved data is unchanged.");
            return;
        }

        try {
            localStorage.removeItem(STORAGE_KEY);

            showMessage(
                "Shop data has been reset."
            );

            window.location.reload();
        } catch (error) {
            console.error("Could not reset shop data:", error);
            showMessage("Unable to reset the saved shop data.");
        }
    }

    /* =========================
       INITIALIZE
       ========================= */

    document.addEventListener("DOMContentLoaded", () => {
        initializeTabs();
        loadSettings();
        initializeFormResets();

        $("settings-shop-form")?.addEventListener(
            "submit",
            saveShopForm
        );

        $("settings-billing-form")?.addEventListener(
            "submit",
            saveBillingForm
        );

        $("settings-inventory-form")?.addEventListener(
            "submit",
            saveInventoryForm
        );

        $("settings-appearance-form")?.addEventListener(
            "submit",
            saveAppearanceForm
        );

        $("settings-export-data")?.addEventListener(
            "click",
            exportData
        );

        $("settings-reset-data")?.addEventListener(
            "click",
            resetData
        );

        initializeImport();
        applyDisplayPreferences();
    });
})();
