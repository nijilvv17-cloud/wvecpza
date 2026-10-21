
/* WORLD VISION ELECTRONICS — Dashboard only */
(() => {
    'use strict';

    const KEY = 'wve_shop_data_v1';

    const $ = id => document.getElementById(id);
    const num = value => Number.parseFloat(value) || 0;

    function loadData() {
        const empty = {
            products: [],
            customers: [],
            sales: [],
            settings: {}
        };

        try {
            const stored = JSON.parse(
                localStorage.getItem(KEY) || '{}'
            );

            if (!stored || typeof stored !== 'object' ||
                Array.isArray(stored)) {
                return empty;
            }

            return {
                ...empty,
                ...stored,
                products: Array.isArray(stored.products)
                    ? stored.products : [],
                customers: Array.isArray(stored.customers)
                    ? stored.customers : [],
                sales: Array.isArray(stored.sales)
                    ? stored.sales : [],
                settings: stored.settings &&
                    typeof stored.settings === 'object'
                    ? stored.settings : {}
            };
        } catch (error) {
            console.error('Dashboard data could not be loaded:', error);

            return empty;
        }
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }

    function formatMoney(value, currency) {
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: currency || 'INR'
            }).format(num(value));
        } catch {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(num(value));
        }
    }

    function getToday() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function formatDate(value) {
        if (!value) return '—';

        const date = new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return escapeHTML(value);
        }

        return date.toLocaleDateString('en-IN');
    }

    function getSaleTime(sale) {
        const createdAt = Number(sale.createdAt);

        if (Number.isFinite(createdAt) && createdAt > 0) {
            return createdAt;
        }

        const date = new Date(
            `${sale.date || '1970-01-01'}T00:00:00`
        ).getTime();

        return Number.isFinite(date) ? date : 0;
    }

    function renderDashboard() {
        const data = loadData();

        // Only active products are included in inventory statistics.
        const activeProducts = data.products.filter(
            product => product.archived !== true
        );

        const lowStockProducts = activeProducts.filter(product =>
            num(product.quantity) > 0 &&
            num(product.quantity) <= num(product.minStock)
        );

        // Dashboard date and footer.
        setText(
            'current-date',
            new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        );

        setText('footer-year', new Date().getFullYear());

        // Business overview.
        setText('total-products', activeProducts.length);
        setText('total-customers', data.customers.length);
        setText('low-stock', lowStockProducts.length);

        // Today's sales.
        const today = getToday();

        const todaySales = data.sales
            .filter(sale => sale.date === today)
            .reduce((sum, sale) => sum + num(sale.total), 0);

        setText(
            'today-sales',
            formatMoney(todaySales, data.settings.currency)
        );

        // Inventory alerts include low-stock and out-of-stock products.
        const alerts = $('low-stock-body');

        if (alerts) {
            const alertProducts = activeProducts.filter(product =>
                num(product.quantity) <= num(product.minStock)
            );

            alerts.innerHTML = alertProducts.length
                ? alertProducts.map(product => `
                    <tr>
                        <td>${escapeHTML(product.name || 'Unnamed product')}</td>
                        <td>${escapeHTML(product.category || '—')}</td>
                        <td>${num(product.quantity)}</td>
                        <td>${num(product.quantity) <= 0
                            ? 'Out of stock'
                            : 'Low stock'}</td>
                    </tr>
                `).join('')
                : `
                    <tr>
                        <td colspan="4" class="empty-state">
                            No stock alerts.
                        </td>
                    </tr>
                `;
        }

        // Latest six sales, using the five columns in index.html.
        const recentBody = $('recent-sales-body');

        if (recentBody) {
            const recentSales = [...data.sales]
                .sort((a, b) => getSaleTime(b) - getSaleTime(a))
                .slice(0, 6);

            recentBody.innerHTML = recentSales.length
                ? recentSales.map(sale => `
                    <tr>
                        <td>${escapeHTML(sale.invoice || '—')}</td>
                        <td>${formatDate(sale.date)}</td>
                        <td>${escapeHTML(
                            sale.customer || 'Walk-in Customer'
                        )}</td>
                        <td>${formatMoney(
                            sale.total,
                            data.settings.currency
                        )}</td>
                        <td>${escapeHTML(
                            sale.status || 'Completed'
                        )}</td>
                    </tr>
                `).join('')
                : `
                    <tr>
                        <td colspan="5" class="empty-state">
                            No sales recorded yet.
                            <a href="billing.html">
                                Create your first bill
                            </a>.
                        </td>
                    </tr>
                `;
        }
    }

    // Initial dashboard render.
    renderDashboard();

    // Refresh when data changes in another browser tab.
    window.addEventListener('storage', event => {
        if (event.key === KEY || event.key === null) {
            renderDashboard();
        }
    });

    // Refresh when returning to the dashboard.
    window.addEventListener('focus', renderDashboard);
    window.addEventListener('pageshow', renderDashboard);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            renderDashboard();
        }
    });
})();
