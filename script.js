/* WORLD VISION ELECTRONICS — shared localStorage application logic */
(() => {
  'use strict';

  const KEY = 'wve_shop_data_v1';
  const $ = id => document.getElementById(id);
  const val = id => $(id)?.value?.trim() ?? '';
  const num = value => Number.parseFloat(value) || 0;
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const money = value => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: data.settings?.currency || 'INR'
  }).format(num(value));

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const blank = () => ({
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    expenses: [],
    settings: {},
    nextInvoice: 1
  });

  function load() {
    try {
      return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return blank();
    }
  }

  let data = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function refreshFromStorage() {
    data = load();
    rerender();
    renderBillItems();
    renderPurchaseItems();
  }

  function toast(message) {
    let el = $('wve-toast');

    if (!el) {
      el = document.createElement('div');
      el.id = 'wve-toast';

      Object.assign(el.style, {
        position: 'fixed',
        right: '22px',
        bottom: '22px',
        zIndex: 99999,
        background: '#172b4d',
        color: '#fff',
        padding: '13px 18px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px #0002',
        fontSize: '14px',
        maxWidth: 'min(420px,90vw)'
      });

      document.body.appendChild(el);
    }

    el.textContent = message;
    el.style.display = 'block';

    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.display = 'none';
    }, 3000);
  }

  function set(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function dateText(date) {
    if (!date) return '—';

    const d = new Date(`${date}T00:00:00`);

    return Number.isNaN(+d)
      ? esc(date)
      : d.toLocaleDateString('en-IN');
  }

  function renderDate() {
    const d = new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    [
      'current-date',
      'expense-current-date',
      'report-current-date',
      'settings-current-date'
    ].forEach(id => {
      if ($(id)) $(id).textContent = d;
    });

    set('footer-year', new Date().getFullYear());
  }

  function tableEmpty(id, colspan, text) {
    const element = $(id);

    if (element) {
      element.innerHTML = `<tr><td colspan="${colspan}" class="${id.includes('expense') ? 'expense-empty' : 'report-empty'}">${esc(text)}</td></tr>`;
    }
  }

  function addOption(select, value, label) {
    if (!select || !value) return;

    if (![...select.options].some(option => option.value === String(value))) {
      select.add(new Option(label || value, value));
    }
  }

  function renderProductOptions() {
    ['bill-product'].forEach(id => {
      const select = $(id);
      if (!select) return;

      const old = select.value;

      select.innerHTML = '<option value="">Select product</option>';

      data.products.forEach(product => {
        select.add(new Option(
          `${product.name} (${num(product.quantity)} in stock)`,
          product.id
        ));
      });

      if ([...select.options].some(option => option.value === old)) {
        select.value = old;
      }
    });

    const supplierSelect = $('purchase-supplier');

    if (supplierSelect) {
      const old = supplierSelect.value;

      supplierSelect.innerHTML = '<option value="">Select supplier</option>';

      data.suppliers.forEach(supplier => {
        supplierSelect.add(new Option(supplier.name, supplier.id));
      });

      if ([...supplierSelect.options].some(option => option.value === old)) {
        supplierSelect.value = old;
      }
    }
  }

  function renderProducts() {
    const body = $('products-table-body');

    if (body) {
      const rows = data.products.filter(product => {
        const query = val('product-search').toLowerCase();
        const category = val('category-filter');
        const stock = val('stock-filter');

        return (
          (!query || [
            product.name,
            product.code,
            product.brand,
            product.category
          ].join(' ').toLowerCase().includes(query)) &&
          (!category || product.category === category) &&
          (!stock ||
            (stock === 'low' &&
              product.quantity > 0 &&
              product.quantity <= product.minStock) ||
            (stock === 'out' && product.quantity <= 0) ||
            (stock === 'available' && product.quantity > product.minStock) ||
            !['low', 'out', 'available'].includes(stock))
        );
      });

      body.innerHTML = rows.length
        ? rows.map(product => `
          <tr>
            <td>${esc(product.name)}</td>
            <td>${esc(product.code || '—')}</td>
            <td>${esc(product.category || '—')}</td>
            <td>${esc(product.brand || '—')}</td>
            <td>${money(product.cost)}</td>
            <td>${money(product.price)}</td>
            <td>${num(product.quantity)}</td>
            <td>${num(product.minStock)}</td>
            <td>
              <button type="button" data-edit-product="${esc(product.id)}">Edit</button>
              <button type="button" data-delete-product="${esc(product.id)}">Delete</button>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="9" class="empty-state">No products found.</td></tr>';

      set('product-record-count', `${rows.length} records`);
    }

    const totalQuantity = data.products.reduce(
      (sum, product) => sum + num(product.quantity),
      0
    );

    const lowStock = data.products.filter(
      product =>
        num(product.quantity) > 0 &&
        num(product.quantity) <= num(product.minStock)
    ).length;

    set('total-products', data.products.length);
    set('total-stock', totalQuantity);
    set('low-stock', lowStock);

    set(
      'stock-value',
      money(data.products.reduce(
        (sum, product) => sum + num(product.cost) * num(product.quantity),
        0
      ))
    );

    set('report-product-count', data.products.length);
    set('report-stock-units', totalQuantity);
    set('report-low-stock-count', lowStock);

    set(
      'report-out-of-stock-count',
      data.products.filter(product => num(product.quantity) <= 0).length
    );

    const alerts = $('low-stock-body');

    if (alerts) {
     alerts.innerHTML = data.products
  .filter(product =>
    num(product.quantity) <= num(product.minStock)
  )
  .map(product => `
    <tr>
      <td>${esc(product.name)}</td>
      <td>${esc(product.category || '—')}</td>
      <td>${num(product.quantity)}</td>
      <td>${num(product.quantity) <= 0
        ? 'Out of stock'
        : 'Low stock'}</td>
    </tr>
  `).join('') ||
  '<tr><td colspan="4">No stock alerts.</td></tr>';
    }

    renderProductOptions();
  }

  function renderCustomers() {
  const query = val('customer-search').toLowerCase();
  const type = val('customer-type-filter');

  const list = data.customers.filter(customer =>
    (!query || [
      customer.name,
      customer.phone,
      customer.email
    ].join(' ').toLowerCase().includes(query)) &&
    (!type || type === 'all' || customer.type === type)
  );

  const body = $('customers-table-body');

  if (body) {
    body.innerHTML = list.length
      ? list.map((customer, index) => {
          const totalPurchases = data.sales
            .filter(sale =>
              String(sale.customerId) === String(customer.id)
            )
            .reduce((sum, sale) => sum + num(sale.total), 0);

          return `
            <tr>
              <td>${index + 1}</td>
              <td>
                <strong>${esc(customer.name)}</strong>
                ${customer.address
                  ? `<div class="customer-address">${esc(customer.address)}</div>`
                  : ''}
              </td>
              <td>${esc(customer.phone || '—')}</td>
              <td>${esc(customer.email || '—')}</td>
              <td>${esc(customer.type || 'Regular')}</td>
              <td>${money(totalPurchases)}</td>
              <td>
                <button type="button"
                  data-edit-customer="${esc(customer.id)}">Edit</button>
                <button type="button"
                  data-delete-customer="${esc(customer.id)}">Delete</button>
              </td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="7" class="empty-state">No customers found.</td></tr>';
  }

  set('customer-record-count', `${list.length} customers`);
  set('total-customers', data.customers.length);

  set(
    'active-customers',
    data.customers.filter(c => c.status !== 'Inactive').length
  );

  set(
    'report-customers-served',
    new Set(data.sales.map(s => s.customerId).filter(Boolean)).size
  );

  set(
    'customer-sales-value',
    money(data.sales.reduce(
      (sum, sale) => sum + (sale.customerId ? num(sale.total) : 0),
      0
    ))
  );
}
  function renderSales() {
    const query = val('sales-search').toLowerCase();
    const day = val('sales-date-filter');
    const payment = val('sales-payment-filter');

    const list = data.sales.filter(sale =>
      (!query || [
        sale.invoice,
        sale.customer,
        sale.payment
      ].join(' ').toLowerCase().includes(query)) &&
      (!day || sale.date === day) &&
      (!payment || sale.payment === payment)
    ).sort((a, b) => b.createdAt - a.createdAt);

    const body = $('sales-table-body');

    if (body) {
      body.innerHTML = list.length
        ? list.map(sale => `
          <tr>
            <td>${esc(sale.invoice)}</td>
            <td>${dateText(sale.date)}</td>
            <td>${esc(sale.customer || 'Walk-in Customer')}</td>
            <td>${esc(sale.items)}</td>
            <td>${esc(sale.payment || 'Cash')}</td>
            <td>${money(sale.total)}</td>
            <td><button type="button" data-view-sale="${esc(sale.id)}">View</button></td>
          </tr>
        `).join('')
        : '<tr><td colspan="6">No sales recorded.</td></tr>';
    }

    set('sales-record-count', `Showing ${list.length} sales`);

    set(
      'sales-total-amount',
      money(data.sales.reduce((sum, sale) => sum + sale.total, 0))
    );

    set('sales-total-invoices', data.sales.length);

    set(
      'sales-cash-total',
      money(data.sales.filter(sale => sale.payment === 'Cash')
        .reduce((sum, sale) => sum + sale.total, 0))
    );

   set(
  'today-sales',
  money(
    data.sales
      .filter(sale => sale.date === today())
      .reduce((sum, sale) => sum + num(sale.total), 0)
  )
);

    const recent = $('recent-sales-body');

    if (recent) {
      recent.innerHTML = data.sales
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6)
        .map(sale => `
          <tr>
            <td>${esc(sale.invoice)}</td>
            <td>${esc(sale.customer || 'Walk-in Customer')}</td>
            <td>${money(sale.total)}</td>
          </tr>
        `).join('') || '<tr><td colspan="3">No sales yet.</td></tr>';
    }
  }

  function renderPurchases() {
    const body = $('purchase-history-body');

    if (!body) return;

    const search = val('purchase-search').toLowerCase();

    const purchases = data.purchases.filter(purchase =>
        [
            purchase.id,
            purchase.invoice,
            purchase.supplier,
            purchase.reference
        ].some(value =>
            String(value || '').toLowerCase().includes(search)
        )
    );

    body.innerHTML = purchases.length
        ? purchases.map(purchase => `
            <tr>
                <td>${esc(purchase.id || '-')}</td>
                <td>${esc(purchase.date || '-')}</td>
                <td>${esc(purchase.supplier || '-')}</td>
                <td>${esc(purchase.invoice || '-')}</td>
                <td>${money(purchase.total)}</td>
                <td>${esc(purchase.paymentStatus || 'Paid')}</td>
                <td>
                    <button type="button"
                        data-view-purchase="${esc(purchase.id)}">
                        View
                    </button>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="7">No purchases found.</td></tr>';

    set(
        'total-purchases',
        data.purchases.length
    );

    set(
        'total-purchase-value',
        money(data.purchases.reduce(
            (sum, purchase) => sum + num(purchase.total),
            0
        ))
    );

    set(
        'total-units-purchased',
        data.purchases.reduce(
            (sum, purchase) =>
                sum + (purchase.items || []).reduce(
                    (itemSum, item) =>
                        itemSum + num(item.quantity),
                    0
                ),
            0
        )
    );

    renderProductOptions();
}
  function renderExpenses() {
    const query = val('expense-search').toLowerCase();
    const category = val('expense-filter-category');
    const period = val('expense-filter-period');
    const now = new Date();

    const list = data.expenses.filter(expense => {
      const d = new Date(`${expense.date}T00:00:00`);
      let within = true;

      if (period === 'today') within = expense.date === today();

      if (period === 'week') {
        within = (now - d) / 86400000 <= 7 && (now - d) / 86400000 >= 0;
      }

      if (period === 'month') {
        within =
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      }

      return (
        (!query || [
          expense.title,
          expense.category,
          expense.notes
        ].join(' ').toLowerCase().includes(query)) &&
        (!category || expense.category === category) &&
        within
      );
    });

    const body = $('expenses-table-body');

    if (body) {
      body.innerHTML = list.length
        ? list.map(expense => `
          <tr>
            <td>${dateText(expense.date)}</td>
            <td>${esc(expense.title || '—')}</td>
            <td>${esc(expense.category || 'Other')}</td>
            <td>${money(expense.amount)}</td>
            <td>${esc(expense.paymentMethod || 'Cash')}</td>
            <td>
              <button type="button" data-edit-expense="${esc(expense.id)}">Edit</button>
              <button type="button" data-delete-expense="${esc(expense.id)}">Delete</button>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="6">No expenses found.</td></tr>';
    }

    set('expense-record-count', `${list.length} expenses`);

    set(
      'expense-total',
      money(list.reduce((sum, expense) => sum + num(expense.amount), 0))
    );

    set(
      'expense-month-total',
      money(data.expenses.filter(expense => {
        const d = new Date(`${expense.date}T00:00:00`);
        return d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      }).reduce((sum, expense) => sum + num(expense.amount), 0))
    );
  }

  let billItems = [];
  let purchaseItems = [];

  function billTotals() {
    const subtotal = billItems.reduce(
      (sum, item) => sum + num(item.quantity) * num(item.price),
      0
    );

    const discountInput = $('bill-discount');
    const taxInput = $('bill-tax-rate');

    const discountValue = num(discountInput?.value);
    const discount = discountValue > 0
      ? Math.min(discountValue, subtotal)
      : 0;

    const taxable = Math.max(0, subtotal - discount);
    const taxRate = num(taxInput?.value ?? data.settings.taxRate);
    const tax = taxable * taxRate / 100;
    const total = taxable + tax;

    return { subtotal, discount, tax, total };
  }

 function renderBillItems() {
    const body = $('billing-items-body') || $('bill-items-body');
    const totals = billTotals();

    if (body) {
      body.innerHTML = billItems.length
  ? billItems.map((item, index) => `
      <tr>
        <td>
          <div class="cart-item-name">${esc(item.name)}</div>
          <span class="cart-item-code">${esc(item.code || '—')}</span>
        </td>
        <td class="text-right">${money(item.price)}</td>
        <td class="text-center">${num(item.quantity)}</td>
        <td class="text-right">${money(num(item.quantity) * num(item.price))}</td>
        <td class="text-center">
          <button type="button"
            class="remove-item-btn"
            data-remove-bill-item="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('')
  : '<tr><td colspan="5" class="billing-empty-state">No products added yet.</td></tr>';
    }

        set('bill-subtotal', money(totals.subtotal));
set('bill-discount-amount', money(totals.discount));
set('bill-tax-amount', money(totals.tax));
set('bill-grand-total', money(totals.total));
 }
  function addBillItem() {
    const selectedId = val('bill-product');
    const product = data.products.find(
      item => String(item.id) === String(selectedId)
    );

    const quantity = Math.max(
      0.001,
      num(val('bill-quantity')) || 1
    );

    const priceInput = val('bill-price');
    const price = priceInput === ''
      ? num(product?.price)
      : num(priceInput);

    if (!selectedId || !product) {
      toast('Please select a product.');
      return;
    }

    if (price < 0 || quantity <= 0) {
      toast('Enter a valid price and quantity.');
      return;
    }

    const existing = billItems.find(
      item => String(item.productId) === String(product.id) &&
        num(item.price) === price
    );

    if (existing) {
      existing.quantity = num(existing.quantity) + quantity;
    } else {
      billItems.push({
        productId: product.id,
        name: product.name,
        code: product.code || '',
        price,
        quantity
      });
    }

    renderBillItems();

    if ($('bill-product')) $('bill-product').value = '';
    if ($('bill-quantity')) $('bill-quantity').value = '1';
    if ($('bill-price')) $('bill-price').value = '';
  }

  function prepareInvoice(sale) {
    if (!sale) return null;

    const items = sale.items || [];
    const subtotal = num(sale.subtotal);
    const discount = num(sale.discount);
    const tax = num(sale.tax);
    const total =Math.max(0, subtotal - discount + tax);

    const invoice = sale.invoice || '—';

    const map = {
      'invoice-shop-name': data.settings.shopName || 'WORLD VISION ELECTRONICS',
      'invoice-shop-address': data.settings.address || '',
      'invoice-shop-phone': data.settings.phone || '',
      'invoice-shop-email': data.settings.email || '',
      'invoice-gst-number': data.settings.gstNumber
        ? `GSTIN: ${data.settings.gstNumber}`
        : '',
      'invoice-number': invoice,
      'invoice-date': dateText(sale.date || today()),
      'invoice-customer-name': sale.customer || 'Walk-in Customer',
      'invoice-customer-phone': sale.phone || '',
      'invoice-customer-address': sale.address || '',
      'invoice-payment-method': sale.payment || 'Cash',
      'invoice-subtotal': money(subtotal),
      'invoice-discount': money(discount),
      'invoice-tax': money(tax),
      'invoice-grand-total': money(
    num(sale.subtotal) -
    num(sale.discount) +
    num(sale.tax)
),
      'invoice-shop-phone': data.settings.phone || '',
      'invoice-shop-email': data.settings.email || '',
      'invoice-seller-tax-details': data.settings.gstNumber
        ? `GSTIN: ${data.settings.gstNumber}`
        : ''
    };

    Object.entries(map).forEach(([id, value]) => set(id, value));

    const body = $('invoice-items-body');

    if (body) {
      body.innerHTML = items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${esc(item.name)}</td>
          <td>${esc(item.code || item.productCode || '—')}</td>
          <td class="right">${money(item.price)}</td>
          <td class="center">${num(item.quantity)}</td>
          <td class="right">${money(num(item.quantity) * num(item.price))}</td>
        </tr>
      `).join('') ||
        '<tr><td colspan="6" style="text-align:center">No invoice items.</td></tr>';
    }

    set('invoice-amount-words', `Total amount: ${money(total)}`);

    return invoice;
  }

  function completeSale() {
    if (!billItems.length) {
      toast('Add at least one product to the bill.');
      return null;
    }

    for (const item of billItems) {
      const product = data.products.find(
        p => String(p.id) === String(item.productId)
      );

      if (!product) {
        toast(`${item.name} no longer exists.`);
        return null;
      }

      const preventNegativeStock =
        $('settings-prevent-negative-stock')?.checked ??
        (data.settings.preventNegativeStock !== false);

      if (
        preventNegativeStock &&
        num(item.quantity) > num(product.quantity)
      ) {
        toast(`Insufficient stock for ${item.name}.`);
        return null;
      }
    }

    const totals = billTotals();

    if (totals.subtotal <= 0 || totals.total < 0) {
      toast('Please check the bill amounts.');
      return null;
    }

    const typedCustomer = val('bill-customer');
const typedPhone = val('bill-phone');
const typedAddress = val('bill-address');

let customer = null;

// Match an existing customer by phone number first.
if (typedPhone) {
  const normalizedPhone = typedPhone.replace(/\D/g, '');

  customer = data.customers.find(c =>
    c.phone &&
    c.phone.replace(/\D/g, '') === normalizedPhone
  );
}

// If no phone match, check whether a customer ID was selected.
if (!customer && typedCustomer) {
  customer = data.customers.find(c =>
    String(c.id) === typedCustomer
  );
}

// Register or update a customer only when a name is provided.
if (typedCustomer && !customer) {
  customer = {
    id: uid('customer'),
    name: typedCustomer,
    phone: typedPhone,
    address: typedAddress,
    email: '',
    type: 'Regular',
    status: 'Active',
    notes: '',
    createdAt: Date.now()
  };

  data.customers.push(customer);
} else if (customer) {
  // Preserve existing details when a field is left blank.
  if (typedCustomer && !data.customers.some(c =>
    String(c.id) === typedCustomer
  )) {
    customer.name = typedCustomer;
  }

  if (typedPhone) customer.phone = typedPhone;
  if (typedAddress) customer.address = typedAddress;
}

    const invoice =
      `${data.settings.invoicePrefix || 'WVE'}-${String(data.nextInvoice || 1).padStart(4, '0')}`;

    const sale = {
      id: uid('sale'),
      invoice,
      date: today(),
      createdAt: Date.now(),
      customer: customer?.name || typedCustomer || 'Walk-in Customer',
customerId: customer?.id || '',
phone: typedPhone,
address: typedAddress,
      payment:
        val('bill-payment-method') ||
        data.settings.defaultPayment ||
        'Cash',
      items: billItems.map(item => ({ ...item })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total
    };

    // Validate all items before changing any stock.
    billItems.forEach(item => {
      const product = data.products.find(
        p => String(p.id) === String(item.productId)
      );

      product.quantity = num(product.quantity) - num(item.quantity);
    });

    data.sales.unshift(sale);
    data.nextInvoice = Math.max(1, num(data.nextInvoice) || 1) + 1;

    save();
    prepareInvoice(sale);

    billItems = [];

    renderBillItems();
    rerender();

    toast(`Sale ${invoice} saved and stock updated.`);

    return sale;
  }

  function renderPurchaseItems() {
    const body = $('purchase-items-body');

    if (body) {
      body.innerHTML = purchaseItems.length
        ? purchaseItems.map((item, index) => `
          <tr>
            <td>${esc(item.name)}</td>
            <td>${num(item.quantity)}</td>
            <td>${money(item.cost)}</td>
            <td>${money(num(item.quantity) * num(item.cost))}</td>
            <td>
              <button type="button" data-remove-purchase-item="${index}">Remove</button>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="5">No purchase items added.</td></tr>';
    }

    const subtotal = purchaseItems.reduce(
      (sum, item) => sum + num(item.quantity) * num(item.cost),
      0
    );

    set('purchase-subtotal', money(subtotal));
    set('purchase-extra-cost-display', money(num(val('purchase-extra-cost'))));
    set(
      'purchase-grand-total',
      money(subtotal + num(val('purchase-extra-cost')))
    );
  }
function addPurchaseItem() {
    const productName = val('purchase-product').toLowerCase();

    if (!productName) {
        toast('Please enter a product name.');
        $('purchase-product')?.focus();
        return;
    }

    const product = data.products.find(
        item => String(item.name || '').trim().toLowerCase() === productName
    );

    if (!product) {
        toast('Product not found. Enter an existing product name.');
        $('purchase-product')?.focus();
        return;
    }

    const quantityText = val('purchase-quantity');
    const costText = val('purchase-cost');

    const quantity = quantityText === '' ? 1 : Number(quantityText);
    const cost = costText === '' ? NaN : Number(costText);

    if (!Number.isFinite(quantity) || quantity <= 0) {
        toast('Enter a valid quantity.');
        return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
        toast('Enter a valid unit cost.');
        return;
    }

    const existing = purchaseItems.find(
        item => String(item.productId) === String(product.id)
    );

    if (existing) {
        existing.quantity = num(existing.quantity) + quantity;
        existing.cost = cost;
    } else {
        purchaseItems.push({
            productId: product.id,
            name: product.name,
            quantity,
            cost
        });
    }

    renderPurchaseItems();

    $('purchase-product').value = '';
    $('purchase-quantity').value = '1';
    $('purchase-cost').value = '';

    $('purchase-product').focus();
}

  function savePurchase() {
    if (!purchaseItems.length) {
      toast('Add at least one purchase item.');
      return;
    }
    if (!val('purchase-supplier')) {
    toast('Please select a supplier.');
    $('purchase-supplier')?.focus();
    return;
}

    const supplier = data.suppliers.find(
      item => String(item.id) === val('purchase-supplier')
    );
    if (!supplier) {
    toast('Please select a supplier.');
    $('purchase-supplier')?.focus();
    return;
}

    purchaseItems.forEach(item => {
      const product = data.products.find(
        p => String(p.id) === String(item.productId)
      );

      if (product) {
        product.quantity = num(product.quantity) + num(item.quantity);
        product.cost = num(item.cost);
      }
    });

    const subtotal = purchaseItems.reduce(
      (sum, item) => sum + num(item.quantity) * num(item.cost),
      0
    );

    const extra = num(val('purchase-extra-cost'));

    data.purchases.unshift({
      id: uid('purchase'),
      invoice: val('purchase-invoice'),
      date: val('purchase-date') || today(),
      supplier: supplier?.name || val('purchase-supplier') || 'Supplier',
      supplierId: supplier?.id || '',
      paymentStatus: val('purchase-payment') || 'Paid',
paymentMethod: val('purchase-payment-method') || 'Cash',
reference: val('purchase-reference'),
      notes: val('purchase-notes'),
      items: purchaseItems.map(item => ({ ...item })),
      subtotal,
      extra,
      total: subtotal + extra,
      createdAt: Date.now()
    });

    save();

    purchaseItems = [];

    $('purchase-form')?.reset();

    renderPurchaseItems();
    rerender();

    toast('Purchase saved and stock quantities updated.');
  }

  function rerender() {
    renderDate();
    renderProducts();
    renderCustomers();
    if (typeof renderSuppliers === 'function') {
  renderSuppliers();
}
    renderSales();
    renderPurchases();
    renderExpenses();

    if (typeof renderReports === 'function') {
      renderReports();
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');

    if (!button) return;

    if (button.dataset.removeBillItem != null) {
      billItems.splice(Number(button.dataset.removeBillItem), 1);
      renderBillItems();
    }

    if (button.dataset.removePurchaseItem != null) {
      purchaseItems.splice(Number(button.dataset.removePurchaseItem), 1);
      renderPurchaseItems();
    }
  });

  let lastCompletedSale = null;

  $('complete-sale-btn')?.addEventListener('click', event => {
    event.preventDefault();
    lastCompletedSale = completeSale();
  });

 

$('print-bill-btn')?.addEventListener('click', event => {
    event.preventDefault();

    let sale = lastCompletedSale;

    if (billItems.length > 0) {
        sale = completeSale();
        if (!sale) return;
        lastCompletedSale = sale;
    }

    if (!sale) {
        toast('Please complete a sale before printing.');
        return;
    }

    prepareInvoice(sale);

    // Wait for the invoice to render before opening print.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.print();
        });
    });
});



  $('new-bill-btn')?.addEventListener('click', event => {
    event.preventDefault();

    billItems = [];
    lastCompletedSale = null;

    $('billing-item-form')?.reset();

    if ($('bill-quantity')) $('bill-quantity').value = '1';

    renderBillItems();
  });

  ['bill-discount', 'bill-tax-rate'].forEach(id => {
    $(id)?.addEventListener('input', renderBillItems);
  });

  $('purchase-item-form')?.addEventListener('submit', event => {
    event.preventDefault();
    addPurchaseItem();
});

  $('save-purchase-btn')?.addEventListener('click', event => {
    event.preventDefault();
    savePurchase();
  });

  $('purchase-extra-cost')?.addEventListener('input', renderPurchaseItems);

  $('bill-product')?.addEventListener('change', () => {
    const product = data.products.find(
      item => String(item.id) === val('bill-product')
    );

    if (product && $('bill-quantity')) {
      $('bill-quantity').value = '1';
    }

    if (product && $('bill-price')) {
      $('bill-price').value = product.price ?? '';
    }
  });

  [
    'product-search',
    'category-filter',
    'stock-filter'
  ].forEach(id => {
    $(id)?.addEventListener('input', renderProducts);
    $(id)?.addEventListener('change', renderProducts);
  });

  [
    'customer-search',
    'customer-type-filter'
  ].forEach(id => {
    $(id)?.addEventListener('input', renderCustomers);
    $(id)?.addEventListener('change', renderCustomers);
  });

  [
    'supplier-search',
    'supplier-status-filter'
  ].forEach(id => {
    $(id)?.addEventListener('input', renderSuppliers);
    $(id)?.addEventListener('change', renderSuppliers);
  });

  $('sales-search')?.addEventListener('input', renderSales);

  [
    'sales-date-filter',
    'sales-payment-filter'
  ].forEach(id => {
    $(id)?.addEventListener('change', renderSales);
  });

  $('purchase-search')?.addEventListener('input', renderPurchases);

  [
    'expense-search',
    'expense-filter-category',
    'expense-filter-period'
  ].forEach(id => {
    $(id)?.addEventListener('input', renderExpenses);
    $(id)?.addEventListener('change', renderExpenses);
  });

  $('report-period')?.addEventListener('change', () => {
    const custom = val('report-period') === 'custom';

    ['report-start-date', 'report-end-date'].forEach(id => {
      if ($(id)) $(id).disabled = !custom;
    });

    renderReports();
  });

  [
    'report-start-date',
    'report-end-date'
  ].forEach(id => {
    $(id)?.addEventListener('change', renderReports);
  });

  $('expense-reset-btn')?.addEventListener('click', () => {
    set('expense-form-title', 'Add New Expense');
    set('expense-save-btn', 'Save Expense');

    setTimeout(() => {
      if ($('expense-date')) $('expense-date').value = today();
    }, 0);
  });

  const settingMap = {
    'settings-shop-name': 'shopName',
    'settings-phone': 'phone',
    'settings-email': 'email',
    'settings-address': 'address',
    'settings-currency': 'currency',
    'settings-timezone': 'timezone',
    'settings-invoice-prefix': 'invoicePrefix',
    'settings-invoice-start': 'invoiceStart',
    'settings-default-payment': 'defaultPayment',
    'settings-tax-rate': 'taxRate',
    'settings-show-address': 'showAddress',
    'settings-show-datetime': 'showDateTime',
    'settings-show-customer': 'showCustomer',
    'settings-low-stock': 'lowStock',
    'settings-default-unit': 'defaultUnit',
    'settings-enable-low-stock': 'enableLowStock',
    'settings-zero-stock-warning': 'zeroStockWarning',
    'settings-prevent-negative-stock': 'preventNegativeStock',
    'settings-date-format': 'dateFormat',
    'settings-number-format': 'numberFormat',
    'settings-compact-tables': 'compactTables',
    'settings-confirm-delete': 'confirmDelete'
  };

  function loadSettings() {
    Object.entries(settingMap).forEach(([id, key]) => {
      const element = $(id);

      if (!element) return;

      const value = data.settings[key];

      if (value !== undefined) {
        if (element.type === 'checkbox') {
          element.checked = !!value;
        } else {
          element.value = value;
        }
      }
    });

    if ($('expense-date')) {
      $('expense-date').value = today();
    }
  }

  function saveSettingsForm(formId) {
    $(formId)?.addEventListener('submit', event => {
      event.preventDefault();

      Object.entries(settingMap).forEach(([id, key]) => {
        const element = $(id);

        if (element && element.closest('form') === event.target) {
          data.settings[key] = element.type === 'checkbox'
            ? element.checked
            : element.value;
        }
      });

      save();
      toast('Settings saved.');
    });
  }

  [
    'settings-shop-form',
    'settings-billing-form',
    'settings-inventory-form',
    'settings-appearance-form'
  ].forEach(saveSettingsForm);

  loadSettings();

  window.addEventListener('storage', event => {
    if (event.key === KEY) refreshFromStorage();
  });

  window.addEventListener('focus', refreshFromStorage);
  window.addEventListener('pageshow', refreshFromStorage);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromStorage();
  });

  if ($('bill-customer')) {
    $('bill-customer').addEventListener('change', () => {
      const customer = data.customers.find(
        item => String(item.id) === val('bill-customer')
      );

      if (customer) {
        if ($('bill-phone')) $('bill-phone').value = customer.phone || '';
        if ($('bill-address')) $('bill-address').value = customer.address || '';
      }
    });
  }

  // Save customer form
  $('customer-form')?.addEventListener('submit', event => {
    event.preventDefault();

    const id = val('customer-id');
    const name = val('customer-name');
    const phone = val('customer-phone');

    if (!name || !phone) {
      toast('Please enter the customer name and phone number.');
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, '');

    const duplicate = data.customers.find(customer =>
      customer.phone &&
      customer.phone.replace(/\D/g, '') === normalizedPhone &&
      String(customer.id) !== String(id)
    );

    if (duplicate) {
      toast('A customer with this phone number already exists.');
      return;
    }

    const existingIndex = data.customers.findIndex(
      customer => String(customer.id) === String(id)
    );

    const customer = {
      id: id || uid('customer'),
      name,
      phone,
      email: val('customer-email'),
      type: val('customer-type') || 'Regular',
      address: val('customer-address'),
      notes: val('customer-notes'),
      status: existingIndex >= 0
        ? (data.customers[existingIndex].status || 'Active')
        : 'Active',
      createdAt: existingIndex >= 0
        ? data.customers[existingIndex].createdAt || Date.now()
        : Date.now()
    };

    if (existingIndex >= 0) {
      data.customers[existingIndex] = customer;
    } else {
      data.customers.push(customer);
    }

    try {
      save();
    } catch (error) {
      toast('Could not save customer. Check browser storage.');
      return;
    }

    $('customer-form').reset();
    if ($('customer-id')) $('customer-id').value = '';
    set('customer-form-heading', 'Add Customer');
    set('save-customer-btn', 'Save Customer');

    rerender();
    toast(existingIndex >= 0
      ? 'Customer updated successfully.'
      : 'Customer saved successfully.');
  });

  // Clear the customer form and exit edit mode
  $('reset-customer-btn')?.addEventListener('click', () => {
    setTimeout(() => {
      if ($('customer-id')) $('customer-id').value = '';
      set('customer-form-heading', 'Add Customer');
      set('save-customer-btn', 'Save Customer');
    }, 0);
  });

  if ($('purchase-form')) {
    $('purchase-form').addEventListener('submit', event => {
      event.preventDefault();
      savePurchase();
    });
  }

  if ($('billing-item-form')) {
    $('billing-item-form').addEventListener('submit', event => {
      event.preventDefault();
      addBillItem();
    });
  }

  rerender();
  renderBillItems();
  renderPurchaseItems();
})();

