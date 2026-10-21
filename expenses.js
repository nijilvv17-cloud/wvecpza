
/* WORLD VISION ELECTRONICS — Expenses Page */
(() => {
  'use strict';

  const KEY = 'wve_shop_data_v1';

  const $ = id => document.getElementById(id);
  const value = id => $(id)?.value?.trim() || '';
  const number = value => Number.parseFloat(value) || 0;

  const today = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000)
      .toISOString().slice(0, 10);
  };

  const uid = () =>
    `expense-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        ...saved,
        expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
        settings: saved.settings || {}
      };
    } catch {
      return { expenses: [], settings: {} };
    }
  }

  let data = loadData();

  function saveData() {
    try {
      // Preserve products, sales, customers, and every other saved section.
      const current = loadData();
      data = { ...current, ...data };

      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Expense save failed:', error);
      toast('Unable to save. Check browser storage.');
      return false;
    }
  }

  function money(amount) {
    const currency = data.settings?.currency || 'INR';

    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency
      }).format(number(amount));
    } catch {
      return `₹${number(amount).toFixed(2)}`;
    }
  }

  function formatDate(date) {
    if (!date) return '—';

    const parsed = new Date(`${date}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? escapeHTML(date)
      : parsed.toLocaleDateString('en-IN');
  }

  function toast(message) {
    let element = $('wve-toast');

    if (!element) {
      element = document.createElement('div');
      element.id = 'wve-toast';

      Object.assign(element.style, {
        position: 'fixed',
        right: '22px',
        bottom: '22px',
        zIndex: '99999',
        background: '#172b4d',
        color: '#fff',
        padding: '13px 18px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px #0002',
        fontSize: '14px',
        maxWidth: 'min(420px,90vw)'
      });

      document.body.appendChild(element);
    }

    element.textContent = message;
    element.style.display = 'block';

    clearTimeout(element._timer);
    element._timer = setTimeout(() => {
      element.style.display = 'none';
    }, 2800);
  }

  function setText(id, text) {
    if ($(id)) $(id).textContent = text;
  }

  function resetForm() {
    $('expense-form')?.reset();

    if ($('expense-id')) $('expense-id').value = '';
    if ($('expense-date')) $('expense-date').value = today();

    setText('expense-form-title', 'Add New Expense');
    setText('expense-save-btn', 'Save Expense');
  }

  function isSameMonth(date, current) {
    const d = new Date(`${date}T00:00:00`);

    return !Number.isNaN(d.getTime()) &&
      d.getMonth() === current.getMonth() &&
      d.getFullYear() === current.getFullYear();
  }

  function matchesPeriod(expense, period, now) {
    const date = expense.date;

    if (!date) return false;

    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return false;

    if (period === 'today') return date === today();

    if (period === 'week') {
      const days = (new Date(
        `${today()}T00:00:00`
      ) - d) / 86400000;

      return days >= 0 && days < 7;
    }

    if (period === 'month') {
      return isSameMonth(date, now);
    }

    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }

    return true;
  }

  function getFilteredExpenses() {
    const query = value('expense-search').toLowerCase();
    const category = value('expense-filter-category');
    const period = value('expense-filter-period');
    const now = new Date();

    return data.expenses
      .filter(expense => {
        const searchable = [
          expense.title,
          expense.category,
          expense.notes,
          expense.reference,
          expense.paymentMethod
        ].join(' ').toLowerCase();

        return (
          (!query || searchable.includes(query)) &&
          (!category || category === 'all' ||
            expense.category === category) &&
          matchesPeriod(expense, period, now)
        );
      })
      .sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || '')) ||
        number(b.createdAt) - number(a.createdAt)
      );
  }

  function renderSummary() {
    const now = new Date();
    const all = data.expenses;

    const todayTotal = all
      .filter(expense => expense.date === today())
      .reduce((sum, expense) => sum + number(expense.amount), 0);

    const monthTotal = all
      .filter(expense => isSameMonth(expense.date, now))
      .reduce((sum, expense) => sum + number(expense.amount), 0);

    const allTotal = all.reduce(
      (sum, expense) => sum + number(expense.amount), 0
    );

    setText('expense-today-total', money(todayTotal));
    setText('expense-month-total', money(monthTotal));
    setText('expense-all-total', money(allTotal));
    setText('expense-record-count', `${all.length} expenses`);
  }

  function renderTable() {
    const body = $('expense-table-body');
    const list = getFilteredExpenses();

    if (body) {
      body.innerHTML = list.length
        ? list.map(expense => `
          <tr>
            <td>${formatDate(expense.date)}</td>
            <td>${escapeHTML(expense.title || '—')}</td>
            <td>${escapeHTML(expense.category || 'Other')}</td>
            <td>${money(expense.amount)}</td>
            <td>${escapeHTML(expense.paymentMethod || 'Cash')}</td>
            <td>${escapeHTML(expense.reference || '—')}</td>
            <td>
              <button type="button"
                data-edit-expense="${escapeHTML(expense.id)}">
                Edit
              </button>
              <button type="button"
                data-delete-expense="${escapeHTML(expense.id)}">
                Delete
              </button>
            </td>
          </tr>
        `).join('')
        : `<tr><td colspan="7" class="expense-empty">
            No expenses found.
          </td></tr>`;
    }

    setText('expense-table-count', `${list.length} records`);
    setText(
      'expense-filtered-total',
      money(list.reduce((sum, expense) =>
        sum + number(expense.amount), 0))
    );
  }

  function render() {
    data = loadData();
    renderSummary();
    renderTable();

   const dateLabel = $('current-date');

if (dateLabel) {
  dateLabel.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
  }

  function saveExpense(event) {
    event.preventDefault();

    const id = value('expense-id');
    const title = value('expense-title');
    const amountText = value('expense-amount');
    const amount = Number(amountText);
    const date = value('expense-date');
    const category = value('expense-category');

    if (!title) {
      toast('Please enter an expense title.');
      $('expense-title')?.focus();
      return;
    }

    if (amountText === '' || !Number.isFinite(amount) || amount <= 0) {
      toast('Enter a valid expense amount.');
      $('expense-amount')?.focus();
      return;
    }

    if (!date || !category) {
      toast('Please select the date and category.');
      return;
    }

    data = loadData();

    const existingIndex = data.expenses.findIndex(
      expense => String(expense.id) === String(id)
    );

    const previous = existingIndex >= 0
      ? data.expenses[existingIndex]
      : null;

    const expense = {
      id: previous?.id || uid(),
      title,
      amount,
      date,
      category,
      paymentMethod: value('expense-payment') || 'Cash',
      reference: value('expense-reference'),
      notes: value('expense-notes'),
      createdAt: previous?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
      data.expenses[existingIndex] = expense;
    } else {
      data.expenses.unshift(expense);
    }

    if (!saveData()) return;

    resetForm();
    render();

    toast(existingIndex >= 0
      ? 'Expense updated successfully.'
      : 'Expense saved successfully.');
  }

  function editExpense(id) {
    const expense = data.expenses.find(
      item => String(item.id) === String(id)
    );

    if (!expense) {
      toast('Expense not found.');
      return;
    }

    $('expense-id').value = expense.id;
    $('expense-title').value = expense.title || '';
    $('expense-amount').value = expense.amount ?? '';
    $('expense-date').value = expense.date || today();
    $('expense-category').value = expense.category || '';
    $('expense-payment').value = expense.paymentMethod || 'Cash';
    $('expense-reference').value = expense.reference || '';
    $('expense-notes').value = expense.notes || '';

    setText('expense-form-title', 'Edit Expense');
    setText('expense-save-btn', 'Update Expense');

    $('expense-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    $('expense-title')?.focus();
  }

  function deleteExpense(id) {
    const expense = data.expenses.find(
      item => String(item.id) === String(id)
    );

    if (!expense) {
      toast('Expense not found.');
      return;
    }

    if (!confirm(`Delete expense "${expense.title}"?`)) return;

    data = loadData();
    data.expenses = data.expenses.filter(
      item => String(item.id) !== String(id)
    );

    if (!saveData()) return;

    if (String(value('expense-id')) === String(id)) resetForm();

    render();
    toast('Expense deleted.');
  }

  function exportCSV() {
    const list = getFilteredExpenses();

    if (!list.length) {
      toast('No expenses to export.');
      return;
    }

    const columns = [
      ['Date', 'date'],
      ['Title', 'title'],
      ['Category', 'category'],
      ['Amount', 'amount'],
      ['Payment Method', 'paymentMethod'],
      ['Reference', 'reference'],
      ['Notes', 'notes']
    ];

    const csvCell = value => {
      let text = String(value ?? '');

      // Prevent spreadsheet formula execution for text values.
      if (/^[=+\-@]/.test(text)) text = `'${text}`;

      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      columns.map(column => csvCell(column[0])).join(','),
      ...list.map(expense =>
        columns.map(([, key]) => csvCell(expense[key])).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `WVE-Expenses-${today()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    toast('Expense CSV exported.');
  }

  $('expense-form')?.addEventListener('submit', saveExpense);

  $('expense-reset-btn')?.addEventListener('click', () => {
    setTimeout(resetForm, 0);
  });

  ['expense-search', 'expense-filter-category', 'expense-filter-period']
    .forEach(id => {
      $(id)?.addEventListener('input', renderTable);
      $(id)?.addEventListener('change', renderTable);
    });

  $('expense-export-btn')?.addEventListener('click', exportCSV);

  $('expense-print-btn')?.addEventListener('click', () => {
    window.print();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.editExpense) {
      editExpense(button.dataset.editExpense);
    }

    if (button.dataset.deleteExpense) {
      deleteExpense(button.dataset.deleteExpense);
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === KEY) render();
  });

  window.addEventListener('focus', render);
  window.addEventListener('pageshow', render);

  if (!value('expense-date')) {
    $('expense-date').value = today();
  }

  render();
})();
