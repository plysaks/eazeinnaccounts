// === JavaScript Start (script.js) ===
document.addEventListener('DOMContentLoaded', () => {
    // Check if jsPDF and autoTable are loaded correctly
     if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error("FATAL: jsPDF core library not loaded!");
        alert("Error: Core PDF library failed to load. PDF functionality will be disabled.");
    } else if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
        console.error("FATAL: jsPDF AutoTable plugin not loaded!");
        alert("Error: PDF table plugin failed to load. PDF functionality may be impaired.");
    } else {
         console.log("jsPDF and autoTable plugin loaded successfully.");
    }
    const { jsPDF } = window.jspdf; // Access jsPDF from the window object


    // --- Globals ---
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('#main-nav button[data-screen]');
    const mainApp = document.querySelector('.main-app');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Invoice Form Elements
    const invoiceForm = document.getElementById('invoice-form');
    const createEditInvoiceSection = document.getElementById('create-edit-invoice-section');
    const showCreateInvoiceButton = document.getElementById('show-create-invoice-button');
    const cancelInvoiceButton = document.getElementById('cancel-invoice-button');
    const invoiceItemsContainer = document.getElementById('invoice-items-container');
    const addInvoiceItemButton = document.getElementById('add-invoice-item-button');
    const invoiceTotalSpan = document.getElementById('invoice-total');
    const invoiceMessage = document.getElementById('invoice-message');
    const invoiceTypeSelect = document.getElementById('invoice-type');
    const invoicePartyLabel = document.getElementById('invoice-party-label');
    const supplierFields = document.querySelectorAll('.supplier-field');
    const customerFields = document.querySelectorAll('.customer-field');
    const invoiceListFilter = document.getElementById('invoice-list-filter');
    const invoiceImagePathSpan = document.getElementById('invoice-image-path');

    // Inventory Elements
    const inventoryMessage = document.getElementById('inventory-message');
    const inventorySearchInput = document.getElementById('inventory-search');
    const exportInventoryJsonButton = document.getElementById('export-inventory-json');
    const exportInventoryCsvButton = document.getElementById('export-inventory-csv');
    const showAddItemButton = document.getElementById('show-add-item-button');
    const addItemSection = document.getElementById('add-item-section');
    const addItemForm = document.getElementById('add-item-form');
    const cancelItemButton = document.getElementById('cancel-item-button');
    const itemNameList = document.getElementById('item-name-list'); // Changed from itemCodeList
    const partyNameListInvoice = document.getElementById('party-name-list-invoice');
    const partyNameListStatement = document.getElementById('party-name-list'); // Datalist for statement/payment
    const inventoryListBody = document.getElementById('inventory-list');
    const lowStockSection = document.getElementById('low-stock-section');
    const lowStockListBody = document.getElementById('low-stock-list-body');
    const downloadLowStockPdfButton = document.getElementById('download-low-stock-pdf');
    // Removed generatedItemCodeMessage related variable


    // Payments Elements
    const paymentForm = document.getElementById('payment-form');
    const paymentsMessage = document.getElementById('payments-message');
    const clearPaymentButton = document.getElementById('clear-payment-button');
    const paymentInvoiceLinkCheck = document.getElementById('payment-link-invoice-check');
    const paymentInvoiceLinkRow = document.getElementById('payment-invoice-link-row');
    const paymentInvoiceSelect = document.getElementById('payment-invoice-id');
    const paymentPartyRow = document.getElementById('payment-party-row');
    const paymentPartyType = document.getElementById('payment-party-type');
    const paymentPartyNameInput = document.getElementById('payment-party-name');
    const invoiceBalanceInfoSpan = document.getElementById('invoice-balance-info');
    const dueInvoicesListBody = document.getElementById('due-invoices-list');
    const paymentsListBody = document.getElementById('payments-list');

    // Statement Elements
    const statementForm = document.getElementById('statement-form');
    const statementMessage = document.getElementById('statement-message');
    const statementResultsSection = document.getElementById('statement-results-section');
    const statementResultsTitle = document.getElementById('statement-results-title').querySelector('span');
    const statementListBody = document.getElementById('statement-list-body');
    const finalBalanceAmountSpan = document.getElementById('final-balance-amount');
    const finalBalanceTypeSpan = document.getElementById('final-balance-type');
    const downloadStatementPdfButton = document.getElementById('download-statement-pdf');

    // Settings Elements
    const companySettingsForm = document.getElementById('company-settings-form');
    const companySettingsMessage = document.getElementById('company-settings-message');
    const settingCompanyNameInput = document.getElementById('setting-company-name');
    const settingAddress1Input = document.getElementById('setting-address1');
    const settingAddress2Input = document.getElementById('setting-address2');
    const settingPhoneInput = document.getElementById('setting-phone');
    const settingEmailInput = document.getElementById('setting-email');
    const settingPaymentQrImageInput = document.getElementById('setting-payment-qr-image');
    const qrCodePreview = document.getElementById('qr-code-preview');
    const removeQrImageButton = document.getElementById('remove-qr-image-button');

    // Backup/Restore Elements
    const backupButton = document.getElementById('backup-button');
    const restoreFileInput = document.getElementById('restore-file-input');
    const restoreButton = document.getElementById('restore-button');
    const backupRestoreMessage = document.getElementById('backup-restore-message');

    // Chart Variables
    let monthlySalesChartInstance = null;
    let annualSalesChartInstance = null;
    let stockCategoryChartInstance = null;

    // --- Data Storage ---
    let invoices = [];
    // Inventory: Array of objects { name, category, description } - NAME is the unique key now
    let inventory = [];
    // StockLevels: Object where key is itemName { quantity, unitCost, lastUpdated, revenue, cost }
    let stockLevels = {};
    let payments = [];
    let settings = { // Default settings
        companyName: '',
        address1: '',
        address2: '',
        phone: '',
        email: '',
        paymentQrImageData: null // Store as base64 data URL
    };
    let nextInvoiceId = 1;
    let nextPaymentId = 1;
    // No item code prefix needed


    // --- Utility Functions ---
    const showLoading = () => loadingIndicator.classList.remove('hidden');
    const hideLoading = () => loadingIndicator.classList.add('hidden');

    const showMessage = (element, message, type = 'info') => {
        if (!element) {
             console.warn("Attempted to show message on a null element.");
             return;
        }
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        // Auto-hide after 5 seconds for success/info
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (element.textContent === message) { // Only hide if the message hasn't changed
                     element.style.display = 'none';
                     element.textContent = '';
                }
            }, 5000);
        }
    };

    const hideMessage = (element) => {
         if (!element) return;
        element.style.display = 'none';
        element.textContent = '';
    };

    const formatCurrency = (amount) => {
        const num = parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            if (dateString.includes('T')) {
                dateString = dateString.split('T')[0];
            }
            const date = new Date(dateString + 'T00:00:00');
             if (isNaN(date.getTime())) {
                throw new Error("Invalid date value");
             }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const getCurrentTimestamp = () => new Date().toISOString();

    // Function to save data to localStorage
    const saveData = () => {
        try {
            showLoading();
            // IMPORTANT: Check for duplicate item names before saving inventory array
            const itemNames = inventory.map(item => item.name.toLowerCase());
            const hasDuplicates = itemNames.some((name, index) => itemNames.indexOf(name) !== index);
            if (hasDuplicates) {
                throw new Error("Duplicate item names found in inventory array. Cannot save.");
            }

            // IMPORTANT: Ensure stockLevels keys match inventory names
            const validStockLevels = {};
            inventory.forEach(item => {
                if (stockLevels[item.name]) {
                    validStockLevels[item.name] = stockLevels[item.name];
                } else {
                    // If missing, initialize it here before saving
                    console.warn(`Initializing missing stockLevel for '${item.name}' during save.`);
                    validStockLevels[item.name] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                }
            });
            stockLevels = validStockLevels; // Assign the validated/cleaned object

            localStorage.setItem('invoices', JSON.stringify(invoices));
            localStorage.setItem('inventory', JSON.stringify(inventory));
            localStorage.setItem('stockLevels', JSON.stringify(stockLevels));
            localStorage.setItem('payments', JSON.stringify(payments));
            localStorage.setItem('settings', JSON.stringify(settings));
            localStorage.setItem('nextInvoiceId', nextInvoiceId.toString());
            localStorage.setItem('nextPaymentId', nextPaymentId.toString());
            console.log("Data saved successfully.");
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
            showMessage(backupRestoreMessage, `Error saving data: ${e.message}. Storage might be full or data is inconsistent.`, "error");
        } finally {
             setTimeout(hideLoading, 100);
        }
    };

    // Function to load data from localStorage
    const loadData = () => {
        try {
            showLoading();
            const loadedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
            const loadedInventory = JSON.parse(localStorage.getItem('inventory') || '[]'); // Still load inventory definitions
            const loadedStockLevels = JSON.parse(localStorage.getItem('stockLevels') || '{}'); // Stock levels keyed by name
            const loadedPayments = JSON.parse(localStorage.getItem('payments') || '[]');
            const loadedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
            const loadedNextInvoiceId = parseInt(localStorage.getItem('nextInvoiceId') || '1', 10);
            const loadedNextPaymentId = parseInt(localStorage.getItem('nextPaymentId') || '1', 10);

            // Basic validation
            invoices = Array.isArray(loadedInvoices) ? loadedInvoices : [];
            inventory = Array.isArray(loadedInventory) ? loadedInventory : [];
            stockLevels = typeof loadedStockLevels === 'object' && loadedStockLevels !== null ? loadedStockLevels : {};
            payments = Array.isArray(loadedPayments) ? loadedPayments : [];
            settings = {
                 companyName: '', address1: '', address2: '', phone: '', email: '', paymentQrImageData: null,
                 ...loadedSettings
            };
            nextInvoiceId = !isNaN(loadedNextInvoiceId) && loadedNextInvoiceId > 0 ? loadedNextInvoiceId : 1;
            nextPaymentId = !isNaN(loadedNextPaymentId) && loadedNextPaymentId > 0 ? loadedNextPaymentId : 1;

            // ** CRITICAL **: Ensure stockLevels exist for every item in inventory, using NAME as key
            // Also, remove stockLevel entries for items no longer in the inventory array
            const currentInventoryNames = new Set(inventory.map(item => item.name));
            const validatedStockLevels = {};

            inventory.forEach(item => {
                if (!item.name) {
                    console.error("Inventory item found with missing name:", item);
                    return; // Skip items without names
                }
                const itemNameKey = item.name; // Use name as the key
                if (stockLevels[itemNameKey]) {
                    // Validate existing entry
                    const stock = stockLevels[itemNameKey];
                    validatedStockLevels[itemNameKey] = {
                        quantity: (typeof stock.quantity === 'number' && !isNaN(stock.quantity)) ? stock.quantity : 0,
                        unitCost: (typeof stock.unitCost === 'number' && !isNaN(stock.unitCost)) ? stock.unitCost : 0,
                        revenue: (typeof stock.revenue === 'number' && !isNaN(stock.revenue)) ? stock.revenue : 0,
                        cost: (typeof stock.cost === 'number' && !isNaN(stock.cost)) ? stock.cost : 0,
                        lastUpdated: stock.lastUpdated || null // Keep null if never updated
                    };
                } else {
                    // Initialize missing entry
                    console.log(`Initializing stock level for missing item: '${itemNameKey}'`);
                    validatedStockLevels[itemNameKey] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                }
            });
            stockLevels = validatedStockLevels; // Replace with validated object

            console.log("Data loaded successfully.");
            applySettings();
            populateDatalists();
            renderAllLists();

        } catch (e) {
            console.error("Error loading data from localStorage:", e);
            showMessage(backupRestoreMessage, "Error loading data. Starting with defaults.", "error");
            invoices = [];
            inventory = [];
            stockLevels = {};
            payments = [];
            settings = { companyName: '', address1: '', address2: '', phone: '', email: '', paymentQrImageData: null };
            nextInvoiceId = 1;
            nextPaymentId = 1;
            saveData(); // Save the defaults (this will hide loading)
        } finally {
             hideLoading(); // Ensure hidden even if already hidden by saveData
        }
    };

    // --- Navigation ---
    const showScreen = (screenId) => {
        if (!document.getElementById(`${screenId}-screen`)) {
            console.error(`Screen element ${screenId}-screen not found during showScreen.`);
            return;
        }
        screens.forEach(screen => screen.classList.remove('active'));
        navButtons.forEach(button => button.classList.remove('active'));

        const activeScreen = document.getElementById(`${screenId}-screen`);
        const activeButton = document.querySelector(`#main-nav button[data-screen="${screenId}"]`);

        activeScreen?.classList.add('active');
        activeButton?.classList.add('active');

        // Hide forms/specific sections
        createEditInvoiceSection?.classList.add('hidden');
        addItemSection?.classList.add('hidden');
        statementResultsSection?.classList.add('hidden');
        hideMessage(invoiceMessage);
        hideMessage(inventoryMessage);
        hideMessage(paymentsMessage);
        hideMessage(statementMessage);
        hideMessage(companySettingsMessage);
        hideMessage(backupRestoreMessage);
        // hideMessage(generatedItemCodeMessage); // Element removed

        // Actions for specific screens
        if (screenId === 'invoices') {
            renderInvoiceList();
            renderDuePaymentsList();
            populateInvoicePaymentSelect();
        } else if (screenId === 'inventory') {
            renderInventoryList();
            renderLowStockList();
            populateItemNameDatalist(); // Ensure item name list is up-to-date
        } else if (screenId === 'payments') {
            renderDuePaymentsList();
            renderPaymentsList();
            populateInvoicePaymentSelect();
        } else if (screenId === 'statement') {
            populatePartyDatalist(partyNameListStatement);
        } else if (screenId === 'dashboard') {
            setTimeout(renderDashboardCharts, 50);
        } else if (screenId === 'settings') {
            loadSettingsIntoForm();
        }
    };

    // --- Datalist Population ---
    const populateDatalists = () => {
        populateItemNameDatalist(); // Changed function name
        populatePartyDatalist(partyNameListInvoice);
        populatePartyDatalist(partyNameListStatement);
    };

    // Renamed function - populates based on item names
    const populateItemNameDatalist = () => {
        if (!itemNameList) return;
        itemNameList.innerHTML = ''; // Clear existing options
        [...inventory].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
            const option = document.createElement('option');
            option.value = item.name; // Value is the name
            option.textContent = `${item.category}`; // Show category in text part
            itemNameList.appendChild(option);
        });
    };

    const populatePartyDatalist = (datalistElement) => {
        if (!datalistElement) return;
        datalistElement.innerHTML = '';
        const partyNames = new Set();
        invoices.forEach(inv => partyNames.add(inv.partyName));
        payments.forEach(pay => { if (pay.partyName) partyNames.add(pay.partyName); });
        Array.from(partyNames).sort().forEach(name => {
             if (name && name.trim() !== '') {
                const option = document.createElement('option');
                option.value = name;
                datalistElement.appendChild(option);
             }
        });
    };

     const populateInvoicePaymentSelect = () => {
        if (!paymentInvoiceSelect || !invoiceBalanceInfoSpan) return;
        paymentInvoiceSelect.innerHTML = '<option value="">-- Select Invoice --</option>';
        invoiceBalanceInfoSpan.textContent = '';

        const dueInvoices = invoices.filter(inv =>
            inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        dueInvoices.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            const amountDue = calculateInvoiceBalance(inv.id);
            option.textContent = `Inv #${inv.id} - ${inv.partyName} (Due: ${formatCurrency(amountDue)})`;
            option.dataset.balance = amountDue;
            option.dataset.partyName = inv.partyName;
            paymentInvoiceSelect.appendChild(option);
        });
    };


    // --- Chart Rendering (No changes needed here) ---
    const prepareChartData = () => {
        const monthlySales = {};
        const annualSales = {};
        const stockByCategory = {};
        const currentYear = new Date().getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        invoices.forEach(inv => {
            if (inv.type === 'customer') {
                try {
                     if (!inv.date || isNaN(new Date(inv.date).getTime())) return;
                    const date = new Date(inv.date);
                    const year = date.getFullYear();
                    const month = date.getMonth();
                    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
                    const amount = parseFloat(inv.totalAmount || 0);
                    if (year === currentYear) monthlySales[yearMonth] = (monthlySales[yearMonth] || 0) + amount;
                    annualSales[year] = (annualSales[year] || 0) + amount;
                } catch (e) { console.error("Error processing invoice date for charts:", inv, e); }
            }
        });

        inventory.forEach(item => {
            const stockInfo = stockLevels[item.name]; // Use item NAME as key
            const category = item.category || 'Uncategorized';
             if (stockInfo && typeof stockInfo.quantity === 'number' && !isNaN(stockInfo.quantity) && stockInfo.quantity > 0 && !['Accommodation', 'Service'].includes(category)) {
                 stockByCategory[category] = (stockByCategory[category] || 0) + stockInfo.quantity;
             }
        });

        const monthlyLabels = monthNames;
        const monthlyData = Array(12).fill(0);
        Object.entries(monthlySales).forEach(([yearMonth, amount]) => {
            try {
                const monthIndex = parseInt(yearMonth.split('-')[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) monthlyData[monthIndex] = amount;
            } catch (e) { console.error("Error parsing yearMonth:", yearMonth, e); }
        });

        const sortedYears = Object.keys(annualSales).sort();
        const annualLabels = sortedYears;
        const annualData = sortedYears.map(year => annualSales[year]);

        const categoryLabels = Object.keys(stockByCategory).filter(cat => stockByCategory[cat] > 0);
        const categoryData = categoryLabels.map(cat => stockByCategory[cat]);

        return { monthly: { labels: monthlyLabels, data: monthlyData }, annual: { labels: annualLabels, data: annualData }, stock: { labels: categoryLabels, data: categoryData } };
    };
    const renderDashboardCharts = () => {
         const monthlyCanvas = document.getElementById('monthlySalesChart');
         const annualCanvas = document.getElementById('annualSalesChart');
         const stockCanvas = document.getElementById('stockCategoryChart');
         if (!monthlyCanvas || !annualCanvas || !stockCanvas) return;
         if (typeof Chart === 'undefined') {
             showMessage(document.getElementById('monthlySalesChartMsg'), "Charting library not loaded.", "error"); return;
         }
         try {
             const chartData = prepareChartData();
             renderMonthlySalesChart(chartData.monthly);
             renderAnnualSalesChart(chartData.annual);
             renderStockCategoryChart(chartData.stock);
         } catch (error) { console.error("Error rendering charts:", error); }
    };
    const renderMonthlySalesChart = ({ labels, data }) => { /* ... no change ... */
        const canvas = document.getElementById('monthlySalesChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const msgElement = document.getElementById('monthlySalesChartMsg'); hideMessage(msgElement); if (monthlySalesChartInstance) monthlySalesChartInstance.destroy(); if (data.every(val => val === 0)) { showMessage(msgElement, "No sales data for current year.", "info"); return; } monthlySalesChartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Monthly Sales', data: data, backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label || ''}: ${formatCurrency(c.parsed.y)}` } }, legend: { display: false } } } }); };
     const renderAnnualSalesChart = ({ labels, data }) => { /* ... no change ... */
        const canvas = document.getElementById('annualSalesChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const msgElement = document.getElementById('annualSalesChartMsg'); hideMessage(msgElement); if (annualSalesChartInstance) annualSalesChartInstance.destroy(); if (data.length === 0) { showMessage(msgElement, "No sales data available.", "info"); return; } annualSalesChartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Annual Sales', data: data, backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label || ''}: ${formatCurrency(c.parsed.y)}` } }, legend: { display: false } } } }); };
     const renderStockCategoryChart = ({ labels, data }) => { /* ... no change ... */
        const canvas = document.getElementById('stockCategoryChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const msgElement = document.getElementById('stockCategoryChartMsg'); hideMessage(msgElement); if (stockCategoryChartInstance) stockCategoryChartInstance.destroy(); if (data.length === 0) { showMessage(msgElement, "No stock data available.", "info"); return; } const backgroundColors = ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(100, 180, 120, 0.7)', 'rgba(210, 110, 190, 0.7)']; const borderColors = backgroundColors.map(c => c.replace('0.7', '1')); stockCategoryChartInstance = new Chart(ctx, { type: 'pie', data: { labels: labels, datasets: [{ label: 'Stock Quantity', data: data, backgroundColor: backgroundColors.slice(0, data.length), borderColor: borderColors.slice(0, data.length), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (c) => { let l = c.label || ''; let v = c.parsed || 0; let t = c.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); let p = t > 0 ? ((v / t) * 100).toFixed(1) + '%' : '0%'; return `${l}: ${v} (${p})`; } } } } } }); };


    // --- Invoice Management ---
    const clearInvoiceForm = () => {
        invoiceForm.reset();
        document.getElementById('invoice-id').value = '';
        invoiceItemsContainer.innerHTML = '';
        invoiceTotalSpan.textContent = '0.00';
        document.getElementById('invoice-payment-status').value = 'Unpaid';
        document.getElementById('invoice-payment-status-supplier').value = 'Unpaid';
         try { document.getElementById('invoice-date').valueAsDate = new Date(); } catch (e) { document.getElementById('invoice-date').value = formatDate(new Date().toISOString()); }
        document.getElementById('invoice-due-date').value = '';
        invoiceImagePathSpan.textContent = '';
        document.getElementById('invoice-image').value = null;
        addInvoiceItemRow(); // Add one empty row
        updateInvoiceTotal();
        hideMessage(invoiceMessage);
        invoiceTypeSelect.dispatchEvent(new Event('change'));
        document.getElementById('invoice-form-title').textContent = 'Create New Invoice';
    };

    // Modified to use Item Name instead of Item Code
    const addInvoiceItemRow = (item = { itemName: '', quantity: 1, unitPrice: '' }) => {
        const itemRow = document.createElement('div');
        itemRow.classList.add('invoice-item-row');

        // Find item details from inventory based on name
        const inventoryItem = inventory.find(i => i.name === item.itemName);
        const description = inventoryItem ? inventoryItem.description : ''; // Get description if item exists

        itemRow.innerHTML = `
            <input type="text" list="item-name-list" class="item-name" placeholder="Item Name" value="${item.itemName || ''}" required>
            <input type="number" class="item-quantity" placeholder="Qty" value="${item.quantity || 1}" min="0.001" step="any" required>
            <input type="number" class="item-unit-price" placeholder="Unit Price" value="${item.unitPrice || ''}" min="0" step="0.01" required>
            <span class="item-description hidden">${description || ''}</span> <!-- Store description hidden -->
            <span>Subtotal: <span class="item-subtotal">0.00</span></span>
            <button type="button" class="remove-item-button">X</button>
        `;

        itemRow.querySelector('.remove-item-button').addEventListener('click', () => {
             if (invoiceItemsContainer.children.length > 1) {
                 itemRow.remove();
                 updateInvoiceTotal();
             } else {
                 // Clear the fields of the last row
                 itemRow.querySelector('.item-name').value = '';
                 itemRow.querySelector('.item-quantity').value = 1;
                 itemRow.querySelector('.item-unit-price').value = '';
                 itemRow.querySelector('.item-subtotal').textContent = '0.00';
                 updateInvoiceTotal();
             }
        });

        // Update description (hidden) when item name changes
        itemRow.querySelector('.item-name').addEventListener('change', (e) => {
            const selectedName = e.target.value;
            const descriptionSpan = itemRow.querySelector('.item-description');
            const inventoryItem = inventory.find(i => i.name === selectedName);
            if (inventoryItem && descriptionSpan) {
                descriptionSpan.textContent = inventoryItem.description || '';
            } else if (descriptionSpan) {
                 descriptionSpan.textContent = '';
            }
            updateItemSubtotal(itemRow);
            updateInvoiceTotal();
        });

        // Update subtotal when quantity or price changes
        itemRow.querySelector('.item-quantity').addEventListener('input', () => {
            updateItemSubtotal(itemRow);
            updateInvoiceTotal();
        });
        itemRow.querySelector('.item-unit-price').addEventListener('input', () => {
            updateItemSubtotal(itemRow);
            updateInvoiceTotal();
        });

        invoiceItemsContainer.appendChild(itemRow);
        updateItemSubtotal(itemRow);
    };

    const updateItemSubtotal = (itemRow) => {
         const quantityInput = itemRow.querySelector('.item-quantity');
         const unitPriceInput = itemRow.querySelector('.item-unit-price');
         const subtotalSpan = itemRow.querySelector('.item-subtotal');
         const quantity = parseFloat(quantityInput.value) || 0;
         const unitPrice = parseFloat(unitPriceInput.value) || 0;
         subtotalSpan.textContent = formatCurrency(quantity * unitPrice);
    };

    const updateInvoiceTotal = () => {
        let total = 0;
        invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
            total += quantity * unitPrice;
        });
        invoiceTotalSpan.textContent = formatCurrency(total);
    };

    // Modified to validate Item Name
     const validateInvoiceItems = () => {
         let isValid = true;
         let firstInvalidRow = null;
         const itemRows = invoiceItemsContainer.querySelectorAll('.invoice-item-row');

         if (itemRows.length === 0) {
             isValid = false;
             showMessage(invoiceMessage, 'Invoice must contain at least one item.', 'error');
             return isValid;
         }

         itemRows.forEach(row => {
             const nameInput = row.querySelector('.item-name'); // Changed from codeInput
             const qtyInput = row.querySelector('.item-quantity');
             const priceInput = row.querySelector('.item-unit-price');
             row.style.border = 'none'; // Reset border style

             const quantity = parseFloat(qtyInput.value);
             const price = parseFloat(priceInput.value);

             let rowIsValid = true;

             if (!nameInput.value.trim()) { rowIsValid = false; nameInput.style.borderColor = 'red'; } else { nameInput.style.borderColor = ''; } // Check name
             if (isNaN(quantity) || quantity <= 0) { rowIsValid = false; qtyInput.style.borderColor = 'red'; } else { qtyInput.style.borderColor = ''; }
             if (isNaN(price) || price < 0) { rowIsValid = false; priceInput.style.borderColor = 'red'; } else { priceInput.style.borderColor = ''; }

             // Optional: Check if item name actually exists in inventory
             const itemNameExists = inventory.some(invItem => invItem.name.toLowerCase() === nameInput.value.trim().toLowerCase());
             if (!itemNameExists && nameInput.value.trim()) {
                  rowIsValid = false;
                  nameInput.style.borderColor = 'orange'; // Use different color for "not found" warning
                  console.warn(`Item name '${nameInput.value}' not found in inventory.`);
                   // Optionally change the message below based on this specific error
             } else if (rowIsValid) { // Reset border if valid and found
                  nameInput.style.borderColor = '';
             }


             if (!rowIsValid) {
                  isValid = false;
                  row.style.border = '1px solid red'; // Highlight invalid row
                  if (!firstInvalidRow) firstInvalidRow = row;
             }
         });

          if (!isValid && firstInvalidRow) {
              firstInvalidRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
               showMessage(invoiceMessage, 'Please fill required fields (Item Name, positive Qty, Price >= 0) for highlighted item(s). Orange border means item name not found in inventory.', 'error');
           } else if (isValid) {
               hideMessage(invoiceMessage);
           }
         return isValid;
     };

    // Modified to extract Item Name
    const handleInvoiceFormSubmit = async (e) => {
        e.preventDefault();
        if (!validateInvoiceItems()) return;
        showLoading();

        const invoiceId = document.getElementById('invoice-id').value;
        const invoiceType = invoiceTypeSelect.value;
        const partyName = document.getElementById('invoice-party-name').value.trim();
        const date = document.getElementById('invoice-date').value;
        const dueDate = document.getElementById('invoice-due-date').value;
        const supplierInvoiceNumber = document.getElementById('invoice-number-supplier').value.trim();
        const imageFile = document.getElementById('invoice-image').files[0];
        const transactionType = document.getElementById('invoice-transaction-type').value;

        let imageDataUrl = null;
        if (imageFile) { /* ... image handling code (no change) ... */
             try { if (imageFile.size > 5 * 1024 * 1024) throw new Error("Image file size exceeds 5MB limit."); imageDataUrl = await readFileAsDataURL(imageFile); } catch (error) { console.error("Error reading image file:", error); showMessage(invoiceMessage, `Error processing image file: ${error.message}`, 'error'); hideLoading(); return; }
        } else if (invoiceId) { const existingInvoice = invoices.find(inv => inv.id === parseInt(invoiceId, 10)); if (existingInvoice && existingInvoice.imageDataUrl) imageDataUrl = existingInvoice.imageDataUrl; }

        const items = [];
        invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
            const itemName = row.querySelector('.item-name').value.trim(); // Get name instead of code
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
            const description = row.querySelector('.item-description')?.textContent || ''; // Get hidden description

            // Ensure item name exists in inventory before adding
             const inventoryItemExists = inventory.some(invItem => invItem.name === itemName);

            if (itemName && inventoryItemExists && quantity > 0 && unitPrice >= 0) {
                items.push({ itemName, description, quantity, unitPrice }); // Store itemName
            } else {
                 console.warn(`Skipping invalid or non-existent item row during save: Name=${itemName}, Qty=${quantity}, Price=${unitPrice}`);
                 // Optionally inform user about skipped items?
            }
        });

         if (items.length === 0) {
            showMessage(invoiceMessage, 'Invoice must contain at least one valid item found in inventory.', 'error');
            hideLoading();
            return;
         }

        const totalAmount = parseFloat(invoiceTotalSpan.textContent) || 0;
        const existingInvoice = invoiceId ? invoices.find(inv => inv.id === parseInt(invoiceId, 10)) : null;

        const invoiceData = {
            id: existingInvoice ? existingInvoice.id : nextInvoiceId,
            type: invoiceType, partyName, date, totalAmount, items,
            paymentStatus: existingInvoice ? document.getElementById(invoiceType === 'customer' ? 'invoice-payment-status' : 'invoice-payment-status-supplier').value : 'Unpaid',
            imageDataUrl, lastUpdated: getCurrentTimestamp()
        };

         if (invoiceType === 'customer') {
             invoiceData.dueDate = dueDate;
             invoiceData.defaultTransactionType = transactionType;
         } else {
             invoiceData.supplierInvoiceNumber = supplierInvoiceNumber;
         }

        // Update or add invoice
        if (existingInvoice) {
            const index = invoices.findIndex(inv => inv.id === existingInvoice.id);
            if (index > -1) {
                 const previousItems = Array.isArray(invoices[index].items) ? invoices[index].items : [];
                 invoices[index] = invoiceData;
                 updateStockOnInvoiceEdit(previousItems, invoiceData.items, invoiceData.type); // Pass item objects
                 console.log(`Invoice ${invoiceData.id} updated. Stock adjustment initiated.`);
            }
        } else {
            invoices.push(invoiceData);
            nextInvoiceId++;
            updateStockOnInvoiceSave(invoiceData.items, invoiceData.type); // Pass item objects
            console.log(`Invoice ${invoiceData.id} created. Stock adjustment initiated.`);
        }

        saveData();
        showMessage(invoiceMessage, `Invoice ${existingInvoice ? 'updated' : 'created'} successfully!`, 'success');
        createEditInvoiceSection.classList.add('hidden');
        renderInvoiceList();
        renderInventoryList();
        renderDuePaymentsList();
        populateDatalists();
        populateInvoicePaymentSelect();
        clearInvoiceForm();
    };

    // Modified to populate Item Name
    const editInvoice = (id) => {
        showLoading();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) { showMessage(invoiceMessage, `Invoice ${id} not found.`, 'error'); hideLoading(); return; }

        document.getElementById('invoice-id').value = invoice.id;
        invoiceTypeSelect.value = invoice.type;
        document.getElementById('invoice-party-name').value = invoice.partyName;
        document.getElementById('invoice-date').value = formatDate(invoice.date);
        document.getElementById('invoice-total').textContent = formatCurrency(invoice.totalAmount);
        invoiceImagePathSpan.textContent = invoice.imageDataUrl ? 'Image previously uploaded' : '';
        document.getElementById('invoice-image').value = null;

        invoiceTypeSelect.dispatchEvent(new Event('change'));
         if (invoice.type === 'customer') {
             document.getElementById('invoice-due-date').value = formatDate(invoice.dueDate);
             document.getElementById('invoice-payment-status').value = invoice.paymentStatus || 'Unpaid';
             document.getElementById('invoice-transaction-type').value = invoice.defaultTransactionType || 'Cash';
         } else {
             document.getElementById('invoice-number-supplier').value = invoice.supplierInvoiceNumber || '';
             document.getElementById('invoice-payment-status-supplier').value = invoice.paymentStatus || 'Unpaid';
         }

        invoiceItemsContainer.innerHTML = '';
        if (Array.isArray(invoice.items)) {
             invoice.items.forEach(item => addInvoiceItemRow(item)); // addInvoiceItemRow expects {itemName, quantity, unitPrice}
        } else {
            addInvoiceItemRow();
        }
        updateInvoiceTotal();

        document.getElementById('invoice-form-title').textContent = `Edit Invoice #${invoice.id}`;
        createEditInvoiceSection.classList.remove('hidden');
        createEditInvoiceSection.scrollIntoView({ behavior: 'smooth' });
        hideLoading();
    };

    // Uses Item Name now
    const deleteInvoice = (id) => {
        const invoiceIndex = invoices.findIndex(inv => inv.id === id);
         if (invoiceIndex === -1) { showMessage(invoiceMessage, `Invoice #${id} not found.`, 'error'); return; }
         if (!confirm(`Delete Invoice #${id}? Stock changes will be reversed.`)) return;
         showLoading();

        const invoiceToDelete = invoices[invoiceIndex];
        const itemsToReverse = Array.isArray(invoiceToDelete.items) ? invoiceToDelete.items : [];

        reverseStockOnInvoiceDelete(itemsToReverse, invoiceToDelete.type); // Pass item objects
        console.log(`Invoice ${id} deletion: Stock reversal initiated.`);

        invoices.splice(invoiceIndex, 1);
        let paymentsChanged = false;
        payments.forEach(p => {
            if (p.linkedInvoiceId === id) {
                p.linkedInvoiceId = null;
                p.notes = (p.notes ? p.notes + ' ' : '') + `(Unlinked from deleted Inv #${id})`;
                paymentsChanged = true;
            }
        });

        saveData();
        showMessage(invoiceMessage, `Invoice #${id} deleted.`, 'success');
        renderInvoiceList();
        renderInventoryList();
        if (paymentsChanged) renderPaymentsList();
        renderDuePaymentsList();
        populateInvoicePaymentSelect();
        // saveData hides loading
    };

    // --- Stock Level Adjustments (Using Item Name) ---

    // Uses item.itemName
    const updateStockOnInvoiceSave = (items, invoiceType) => {
        let stockUpdated = false;
        items.forEach(item => {
             const itemNameKey = item.itemName; // Use name as the key
             const stockItem = stockLevels[itemNameKey];

            if (!stockItem) {
                 console.error(`!!! Stock level item NOT FOUND for name: '${itemNameKey}' during NEW invoice save. Cannot update stock.`);
                 return;
            }

            const quantityChange = parseFloat(item.quantity || 0);
            if (isNaN(quantityChange) || quantityChange <= 0) {
                console.warn(`Invalid quantity (${item.quantity}) for item '${itemNameKey}' in new invoice. Skipping stock update.`);
                return;
            }

            const unitPrice = parseFloat(item.unitPrice || 0);
            const amountChange = quantityChange * unitPrice;
            const oldQty = stockItem.quantity;

            console.log(`   Processing item: ${itemNameKey}, Qty Change: ${quantityChange}, Type: ${invoiceType}`);

            if (invoiceType === 'customer') {
                stockItem.quantity -= quantityChange;
                stockItem.revenue = (stockItem.revenue || 0) + amountChange;
                 console.log(`   -> Customer Sale: Qty ${oldQty} -> ${stockItem.quantity}. Revenue +${formatCurrency(amountChange)}`);
            } else if (invoiceType === 'supplier') {
                stockItem.quantity += quantityChange;
                stockItem.cost = (stockItem.cost || 0) + amountChange;
                stockItem.unitCost = stockItem.quantity > 0 ? ((stockItem.cost || 0) / stockItem.quantity) : 0;
                 console.log(`   -> Supplier Purchase: Qty ${oldQty} -> ${stockItem.quantity}. Cost +${formatCurrency(amountChange)}. New Unit Cost: ${formatCurrency(stockItem.unitCost)}`);
            }
            stockItem.lastUpdated = getCurrentTimestamp();
            stockUpdated = true;
        });
        if (stockUpdated) renderLowStockList();
    };

     // Uses item.itemName
     const updateStockOnInvoiceEdit = (previousItems, currentItems, invoiceType) => {
         let stockUpdated = false;
         const prevItemMap = new Map(previousItems.map(item => [item.itemName, item])); // Key by name
         const currentItemMap = new Map(currentItems.map(item => [item.itemName, item])); // Key by name
         const allItemNames = new Set([...previousItems.map(i => i.itemName), ...currentItems.map(i => i.itemName)]);

         allItemNames.forEach(itemNameKey => {
             const prevItem = prevItemMap.get(itemNameKey);
             const currentItem = currentItemMap.get(itemNameKey);
             const stockItem = stockLevels[itemNameKey]; // Use name as key

             if (!stockItem) {
                  console.error(`!!! Stock level item NOT FOUND for name: '${itemNameKey}' during invoice EDIT. Cannot update stock.`);
                 return;
             }

             const prevQuantity = prevItem ? (parseFloat(prevItem.quantity || 0) || 0) : 0;
             const currentQuantity = currentItem ? (parseFloat(currentItem.quantity || 0) || 0) : 0;
             const quantityDifference = currentQuantity - prevQuantity;

             if (Math.abs(quantityDifference) > 0.0001) stockUpdated = true;

             const prevUnitPrice = prevItem ? (parseFloat(prevItem.unitPrice || 0) || 0) : 0;
             const currentUnitPrice = currentItem ? (parseFloat(currentItem.unitPrice || 0) || 0) : 0;
             const prevAmount = prevQuantity * prevUnitPrice;
             const currentAmount = currentQuantity * currentUnitPrice;
             const amountDifference = currentAmount - prevAmount;
             const oldQty = stockItem.quantity;

             console.log(`   Editing item: ${itemNameKey}, PrevQty: ${prevQuantity}, CurrQty: ${currentQuantity}, QtyDiff: ${quantityDifference}, AmountDiff: ${amountDifference}, Type: ${invoiceType}`);

             if (invoiceType === 'customer') {
                 stockItem.quantity -= quantityDifference;
                 stockItem.revenue = (stockItem.revenue || 0) + amountDifference;
                  console.log(`   -> Customer Edit: Qty ${oldQty} -> ${stockItem.quantity}. Revenue change: ${formatCurrency(amountDifference)}`);
             } else if (invoiceType === 'supplier') {
                 stockItem.quantity += quantityDifference;
                 stockItem.cost = (stockItem.cost || 0) + amountDifference;
                 stockItem.unitCost = stockItem.quantity > 0 ? ((stockItem.cost || 0) / stockItem.quantity) : 0;
                  console.log(`   -> Supplier Edit: Qty ${oldQty} -> ${stockItem.quantity}. Cost change: ${formatCurrency(amountDifference)}. New Unit Cost: ${formatCurrency(stockItem.unitCost)}`);
             }
             stockItem.lastUpdated = getCurrentTimestamp();
         });
          if (stockUpdated) renderLowStockList();
     };

    // Uses item.itemName
     const reverseStockOnInvoiceDelete = (items, invoiceType) => {
         let stockUpdated = false;
         items.forEach(item => {
             const itemNameKey = item.itemName; // Use name as key
             const stockItem = stockLevels[itemNameKey];
             if (!stockItem) {
                 console.error(`!!! Stock level item NOT FOUND for name: '${itemNameKey}' during invoice DELETE reversal. Cannot reverse stock.`);
                 return;
             }

             const quantityChange = parseFloat(item.quantity || 0);
             if (isNaN(quantityChange) || quantityChange <= 0) {
                 console.warn(`Invalid quantity (${item.quantity}) for item '${itemNameKey}' in deleted invoice. Skipping reversal.`);
                 return;
             }

             const amountChange = quantityChange * (parseFloat(item.unitPrice || 0) || 0);
             const oldQty = stockItem.quantity;
             console.log(`   Reversing item: ${itemNameKey}, Qty Change: ${quantityChange}, Type: ${invoiceType}`);

             if (invoiceType === 'customer') {
                 stockItem.quantity += quantityChange;
                 stockItem.revenue = (stockItem.revenue || 0) - amountChange;
                 console.log(`   -> Customer Delete Reversal: Qty ${oldQty} -> ${stockItem.quantity}. Revenue -${formatCurrency(amountChange)}`);
             } else if (invoiceType === 'supplier') {
                 stockItem.quantity -= quantityChange;
                 stockItem.cost = (stockItem.cost || 0) - amountChange;
                 stockItem.unitCost = stockItem.quantity > 0 ? ((stockItem.cost || 0) / stockItem.quantity) : 0;
                 console.log(`   -> Supplier Delete Reversal: Qty ${oldQty} -> ${stockItem.quantity}. Cost -${formatCurrency(amountChange)}. New Unit Cost: ${formatCurrency(stockItem.unitCost)}`);
             }
             stockItem.lastUpdated = getCurrentTimestamp();

             if (stockItem.revenue < -0.001) { console.warn(`Revenue for ${itemNameKey} negative.`); stockItem.revenue = 0; }
             if (stockItem.cost < -0.001) { console.warn(`Cost for ${itemNameKey} negative.`); stockItem.cost = 0; }
             if (stockItem.quantity < -0.001) console.warn(`Stock quantity for ${itemNameKey} negative.`);

             stockUpdated = true;
         });
          if (stockUpdated) renderLowStockList();
     };


    // --- Invoice List Rendering (No changes needed here) ---
    const renderInvoiceList = () => { /* ... no change ... */
        const invoiceListBody = document.getElementById('invoices-list'); if (!invoiceListBody) return; invoiceListBody.innerHTML = ''; showLoading(); const filter = invoiceListFilter.value; let filteredInvoices = invoices; if (filter === 'customer') filteredInvoices = invoices.filter(inv => inv.type === 'customer'); else if (filter === 'supplier') filteredInvoices = invoices.filter(inv => inv.type === 'supplier'); else if (filter === 'unpaid_partial') filteredInvoices = invoices.filter(inv => inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')); filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date)); if (filteredInvoices.length === 0) { invoiceListBody.innerHTML = `<tr class="no-results"><td colspan="7">No invoices found matching filter '${filter}'.</td></tr>`; hideLoading(); return; } filteredInvoices.forEach(invoice => { const row = invoiceListBody.insertRow(); let statusClass = ''; switch (invoice.paymentStatus) { case 'Paid': statusClass = 'status-paid'; break; case 'Partial': statusClass = 'status-partial'; break; case 'Unpaid': statusClass = 'status-unpaid'; break; default: statusClass = ''; } row.innerHTML = `<td>${invoice.id}</td><td>${invoice.type.charAt(0).toUpperCase() + invoice.type.slice(1)}</td><td>${invoice.partyName || 'N/A'}</td><td>${formatDate(invoice.date)}</td><td>${formatCurrency(invoice.totalAmount)}</td><td class="${statusClass}">${invoice.paymentStatus || 'N/A'}</td><td><button class="edit-invoice-button" data-id="${invoice.id}" title="Edit Invoice">Edit</button><button class="delete-invoice-button" data-id="${invoice.id}" title="Delete Invoice">Delete</button><button class="pdf-invoice-button" data-id="${invoice.id}" title="Download PDF Invoice">PDF</button>${invoice.type === 'customer' ? `<button class="receipt-print-button" data-id="${invoice.id}" title="Print 58mm Receipt">Receipt</button>` : ''}${invoice.type === 'customer' && (invoice.paymentStatus === 'Unpaid' || invoice.paymentStatus === 'Partial') ? `<button class="pay-now-button" data-id="${invoice.id}" title="Record Payment for this Invoice">Pay Now</button>` : ''}</td>`; row.querySelector('.edit-invoice-button')?.addEventListener('click', (e) => editInvoice(parseInt(e.target.dataset.id))); row.querySelector('.delete-invoice-button')?.addEventListener('click', (e) => deleteInvoice(parseInt(e.target.dataset.id))); row.querySelector('.pdf-invoice-button')?.addEventListener('click', (e) => generateInvoicePDF(parseInt(e.target.dataset.id))); row.querySelector('.receipt-print-button')?.addEventListener('click', (e) => generateReceipt(parseInt(e.target.dataset.id), 'print')); row.querySelector('.pay-now-button')?.addEventListener('click', (e) => triggerPayNow(parseInt(e.target.dataset.id))); }); hideLoading(); };
    const triggerPayNow = (invoiceId) => { /* ... no change ... */
        const invoice = invoices.find(inv => inv.id === invoiceId); if (!invoice) return; showScreen('payments'); clearPaymentForm(); try { document.getElementById('payment-date').valueAsDate = new Date(); } catch(e) {} paymentInvoiceLinkCheck.checked = true; paymentInvoiceLinkRow.classList.remove('hidden'); paymentPartyRow.classList.add('hidden'); paymentInvoiceSelect.value = invoiceId; paymentInvoiceSelect.dispatchEvent(new Event('change')); const amountDue = calculateInvoiceBalance(invoiceId); document.getElementById('payment-amount').value = formatCurrency(amountDue > 0 ? amountDue : 0); document.getElementById('payment-amount').focus(); document.getElementById('payment-amount').select(); document.getElementById('payment-entry-section').scrollIntoView({ behavior: 'smooth' }); };


    // --- Inventory Management ---

    // Modified - No item code generation, check for unique name
    const handleAddItemFormSubmit = (e) => {
        e.preventDefault();
        showLoading();

        const name = document.getElementById('item-name-new').value.trim();
        const category = document.getElementById('item-category-new').value;
        const description = document.getElementById('item-description-new').value.trim();

        if (!name || !category) {
            showMessage(inventoryMessage, 'Item Name and Category are required.', 'error');
             hideLoading();
            return;
        }

        // Check if item *name* already exists (case-insensitive check)
        const nameLower = name.toLowerCase();
        if (inventory.some(item => item.name.toLowerCase() === nameLower)) {
             showMessage(inventoryMessage, `An item named "${name}" already exists. Item names must be unique.`, 'error');
             hideLoading();
             return;
        }


        const newItem = {
            // code: No code property anymore
            name: name,
            category: category,
            description: description
        };

        inventory.push(newItem);
         // Initialize stock level for the new item using NAME as key
         stockLevels[name] = { quantity: 0, unitCost: 0, lastUpdated: getCurrentTimestamp(), revenue: 0, cost: 0 };
          console.log(`Added new item: '${name}'. Initialized stock level.`);

        saveData();
         showMessage(inventoryMessage, `Item type "${name}" added successfully.`, 'success'); // No code to show

        addItemForm.reset();
        addItemSection.classList.add('hidden');
        populateItemNameDatalist(); // Update name datalist
        renderInventoryList();
        renderLowStockList();
        // saveData hides loading
    };

    // --- Inventory List Rendering (Uses Item Name) ---
    const renderInventoryList = (searchTerm = '') => {
        if (!inventoryListBody) return;
        inventoryListBody.innerHTML = '';
        showLoading();
        const lowerSearchTerm = searchTerm.toLowerCase();

        const filteredInventory = inventory.filter(item =>
            item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.category.toLowerCase().includes(lowerSearchTerm)
        );
        filteredInventory.sort((a, b) => a.name.localeCompare(b.name));

        if (filteredInventory.length === 0 && !searchTerm) {
             inventoryListBody.innerHTML = '<tr class="no-results"><td colspan="7">No inventory items defined. Add items using the button above.</td></tr>'; // Colspan is 7 now
        } else if (filteredInventory.length === 0 && searchTerm) {
             inventoryListBody.innerHTML = `<tr class="no-results"><td colspan="7">No items found matching "${searchTerm}".</td></tr>`;
        } else {
            filteredInventory.forEach(item => {
                const itemNameKey = item.name; // Use name as key
                 if (!stockLevels[itemNameKey]) {
                      console.warn(`Creating missing stock level entry for '${itemNameKey}' during render.`);
                     stockLevels[itemNameKey] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                 }
                 const stock = stockLevels[itemNameKey];
                 const revenue = stock.revenue || 0;
                 const cost = stock.cost || 0;
                 const quantity = stock.quantity || 0;
                 const unitCost = stock.unitCost || 0;

                 const profitLoss = revenue - cost;
                 let profitLossClass = 'profit-zero';
                 let profitLossText = formatCurrency(profitLoss);
                 let quantityDisplay = formatCurrency(quantity);
                 let qtyStyle = '';

                 if (['Accommodation', 'Service'].includes(item.category)) {
                     profitLossClass = 'profit-na'; profitLossText = 'N/A'; quantityDisplay = 'N/A';
                 } else {
                     if (profitLoss > 0.001) profitLossClass = 'profit-positive';
                     else if (profitLoss < -0.001) profitLossClass = 'profit-negative';
                     if (quantity <= 0) qtyStyle = 'color: red; font-weight: bold;';
                 }

                 const row = inventoryListBody.insertRow();
                 row.innerHTML = `
                    <td>${item.name} ${item.description ? '<small>(' + item.description + ')</small>' : ''} <br><small><em>${item.category}</em></small></td>
                    <td style="${qtyStyle}">${quantityDisplay}</td>
                    <td>${['Accommodation', 'Service'].includes(item.category) ? 'N/A' : formatCurrency(unitCost)}</td>
                    <td>${formatCurrency(revenue)}</td>
                    <td>${formatCurrency(cost)}</td>
                    <td class="${profitLossClass}">${profitLossText}</td>
                    <td>${stock.lastUpdated ? formatDate(stock.lastUpdated) : 'N/A'}</td>
                 `;
            });
        }
        hideLoading();
    };

     // --- Low Stock List (Uses Item Name) ---
     const renderLowStockList = () => {
         if (!lowStockListBody || !lowStockSection || !downloadLowStockPdfButton) return;
         lowStockListBody.innerHTML = '';
         let lowStockItems = [];

         inventory.forEach(item => {
             if (['Accommodation', 'Service'].includes(item.category)) return;
             const itemNameKey = item.name; // Use name as key
             const stock = stockLevels[itemNameKey];
             if (stock && typeof stock.quantity === 'number' && !isNaN(stock.quantity) && stock.quantity <= 0) {
                  lowStockItems.push({ name: item.name, quantity: stock.quantity });
             }
         });
         lowStockItems.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));

         if (lowStockItems.length > 0) {
             lowStockItems.forEach(item => {
                 const row = lowStockListBody.insertRow();
                 row.innerHTML = `
                     <td>${item.name}</td>
                     <td>${formatCurrency(item.quantity)}</td>
                 `;
             });
             lowStockSection.classList.remove('hidden');
             downloadLowStockPdfButton.classList.remove('hidden');
         } else {
             lowStockSection.classList.add('hidden');
             downloadLowStockPdfButton.classList.add('hidden');
         }
     };

    // --- Export Inventory (Uses Item Name) ---
    const exportInventory = (format) => {
        showLoading();
        try {
            const dataToExport = inventory.map(item => {
                 const itemNameKey = item.name; // Use name as key
                 const stock = stockLevels[itemNameKey] || { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                 const revenue = stock.revenue || 0;
                 const cost = stock.cost || 0;
                 return {
                    // ItemCode removed
                    ItemName: item.name,
                    Category: item.category,
                    Description: item.description || '',
                    QuantityOnHand: stock.quantity || 0,
                    UnitCost: stock.unitCost || 0,
                    TotalRevenue: revenue,
                    TotalCost: cost,
                    ProfitLoss: revenue - cost,
                    LastUpdated: stock.lastUpdated ? formatDate(stock.lastUpdated) : ''
                 };
            });

             if (dataToExport.length === 0) { showMessage(inventoryMessage, "No inventory data to export.", "info"); hideLoading(); return; }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filenameBase = `inventory_export_${timestamp}`;

            if (format === 'json') { /* ... no change in JSON logic ... */
                const jsonString = JSON.stringify(dataToExport, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); triggerDownload(blob, `${filenameBase}.json`); showMessage(inventoryMessage, "Inventory exported as JSON.", "success");
            } else if (format === 'csv') { /* ... no change in CSV logic ... */
                 if (dataToExport.length === 0) throw new Error("No data to export"); const headers = Object.keys(dataToExport[0]); const csvRows = [headers.join(',')]; dataToExport.forEach(row => { const values = headers.map(header => { const value = row[header] === null || row[header] === undefined ? '' : row[header]; const escaped = ('' + value).replace(/"/g, '""'); return `"${escaped}"`; }); csvRows.push(values.join(',')); }); const csvString = csvRows.join('\r\n'); const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); triggerDownload(blob, `${filenameBase}.csv`); showMessage(inventoryMessage, "Inventory exported as CSV.", "success");
            }
        } catch (error) { console.error("Error exporting inventory:", error); showMessage(inventoryMessage, `Error exporting inventory: ${error.message}`, "error"); } finally { hideLoading(); }
    };
     const triggerDownload = (blob, filename) => { /* ... no change ... */
        try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { console.error("Error triggering download:", e); } };


    // --- Payment Management (No changes needed conceptually, links to invoice ID) ---
    const clearPaymentForm = () => { /* ... no change ... */
        paymentForm.reset(); document.getElementById('payment-id').value = ''; try { document.getElementById('payment-date').valueAsDate = new Date(); } catch(e) { document.getElementById('payment-date').value = formatDate(new Date().toISOString()); } paymentInvoiceLinkCheck.checked = false; paymentInvoiceLinkRow?.classList.add('hidden'); paymentPartyRow?.classList.remove('hidden'); if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = ''; if(paymentInvoiceSelect) paymentInvoiceSelect.value = ''; hideMessage(paymentsMessage); };
    const calculateInvoiceBalance = (invoiceId) => { /* ... no change ... */
        const invoice = invoices.find(inv => inv.id === invoiceId); if (!invoice) return 0; const totalPaid = payments.filter(p => p.linkedInvoiceId === invoiceId).reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0); const totalAmount = parseFloat(invoice.totalAmount || 0) || 0; return (totalAmount - totalPaid); };
    const updateInvoicePaymentStatus = (invoiceId) => { /* ... no change ... */
        const invoice = invoices.find(inv => inv.id === invoiceId); if (!invoice || invoice.type !== 'customer') return false; const totalPaid = payments.filter(p => p.linkedInvoiceId === invoiceId).reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0); const totalAmount = parseFloat(invoice.totalAmount || 0) || 0; const oldStatus = invoice.paymentStatus; let newStatus; const tolerance = 0.001; if (totalPaid <= tolerance) newStatus = 'Unpaid'; else if (totalPaid < totalAmount - tolerance) newStatus = 'Partial'; else newStatus = 'Paid'; if (oldStatus !== newStatus) { invoice.paymentStatus = newStatus; invoice.lastUpdated = getCurrentTimestamp(); console.log(`Updated status for Invoice #${invoiceId} to ${invoice.paymentStatus}`); return true; } return false; };
    const updateSupplierInvoicePaymentStatus = (invoiceId) => { /* ... no change ... */
        const invoice = invoices.find(inv => inv.id === invoiceId); if (!invoice || invoice.type !== 'supplier') return false; const totalPaid = payments.filter(p => p.linkedInvoiceId === invoiceId).reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0); const oldStatus = invoice.paymentStatus; const newStatus = totalPaid > 0 ? 'Paid' : 'Unpaid'; if (oldStatus !== newStatus) { invoice.paymentStatus = newStatus; invoice.lastUpdated = getCurrentTimestamp(); console.log(`Updated status for Supplier Invoice #${invoiceId} to ${invoice.paymentStatus}`); return true; } return false; };
    const handlePaymentFormSubmit = (e) => { /* ... no change ... */
        e.preventDefault(); showLoading(); const paymentId = document.getElementById('payment-id').value; const date = document.getElementById('payment-date').value; const amount = parseFloat(document.getElementById('payment-amount').value); const method = document.getElementById('payment-method').value; const linkToInvoice = paymentInvoiceLinkCheck.checked; const linkedInvoiceId = linkToInvoice ? parseInt(paymentInvoiceSelect.value, 10) : null; if (!date) { showMessage(paymentsMessage, 'Please select a payment date.', 'error'); hideLoading(); return; } if (isNaN(amount) || amount <= 0) { showMessage(paymentsMessage, 'Please enter a valid positive payment amount.', 'error'); hideLoading(); return; } let partyName = ''; let partyType = 'customer'; if (linkToInvoice) { if (!linkedInvoiceId || isNaN(linkedInvoiceId)) { showMessage(paymentsMessage, 'Please select a valid invoice.', 'error'); hideLoading(); return; } const selectedOption = paymentInvoiceSelect.options[paymentInvoiceSelect.selectedIndex]; partyName = selectedOption ? selectedOption.dataset.partyName : ''; partyType = 'customer'; } else { partyName = document.getElementById('payment-party-name').value.trim(); partyType = paymentPartyType.value; if (!partyName) { showMessage(paymentsMessage, 'Please enter Name if not linking.', 'error'); hideLoading(); return; } } const reference = document.getElementById('payment-reference').value.trim(); const notes = document.getElementById('payment-notes').value.trim(); let associatedInvoice = null; if (linkToInvoice && linkedInvoiceId) { associatedInvoice = invoices.find(inv => inv.id === linkedInvoiceId); if (associatedInvoice && associatedInvoice.type === 'customer') { const currentPaid = payments.filter(p => p.linkedInvoiceId === linkedInvoiceId && (!paymentId || p.id !== parseInt(paymentId, 10))).reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0); const invoiceTotal = parseFloat(associatedInvoice.totalAmount || 0) || 0; const invoiceBalance = invoiceTotal - currentPaid; const overpaymentTolerance = 0.01; if (amount > invoiceBalance + overpaymentTolerance) { if (!confirm(`Warning: Payment (${formatCurrency(amount)}) exceeds balance (${formatCurrency(invoiceBalance)}) for Invoice #${linkedInvoiceId}. Proceed?`)) { hideLoading(); return; } } } else if (!associatedInvoice) { showMessage(paymentsMessage, `Invoice #${linkedInvoiceId} not found.`, 'error'); hideLoading(); return; } } const paymentData = { id: paymentId ? parseInt(paymentId, 10) : nextPaymentId, date, amount, method, linkedInvoiceId: (linkToInvoice && linkedInvoiceId) ? linkedInvoiceId : null, partyType, partyName, reference, notes, lastUpdated: getCurrentTimestamp() }; let invoiceStatusNeedsUpdate = false; let previousLinkedInvoiceId = null; if (paymentId) { const index = payments.findIndex(p => p.id === parseInt(paymentId, 10)); if (index > -1) { previousLinkedInvoiceId = payments[index].linkedInvoiceId; payments[index] = paymentData; console.log(`Payment ${paymentData.id} updated.`); } else { console.error(`Payment ID ${paymentId} not found for update.`); paymentData.id = nextPaymentId++; payments.push(paymentData); } } else { payments.push(paymentData); nextPaymentId++; console.log(`Payment ${paymentData.id} created.`); } if (paymentData.linkedInvoiceId) { const currentInvoice = invoices.find(inv => inv.id === paymentData.linkedInvoiceId); if (currentInvoice) { const changed = currentInvoice.type === 'customer' ? updateInvoicePaymentStatus(paymentData.linkedInvoiceId) : updateSupplierInvoicePaymentStatus(paymentData.linkedInvoiceId); if (changed) invoiceStatusNeedsUpdate = true; } } if (paymentId && previousLinkedInvoiceId && previousLinkedInvoiceId !== paymentData.linkedInvoiceId) { const prevInvoice = invoices.find(inv => inv.id === previousLinkedInvoiceId); if (prevInvoice) { const changed = prevInvoice.type === 'customer' ? updateInvoicePaymentStatus(previousLinkedInvoiceId) : updateSupplierInvoicePaymentStatus(previousLinkedInvoiceId); if (changed) invoiceStatusNeedsUpdate = true; } } saveData(); showMessage(paymentsMessage, `Payment ${paymentId ? 'updated' : 'recorded'} successfully!`, 'success'); clearPaymentForm(); renderPaymentsList(); if (invoiceStatusNeedsUpdate) { renderInvoiceList(); renderDuePaymentsList(); } populatePartyDatalist(partyNameListStatement); populateInvoicePaymentSelect(); };
    const editPayment = (id) => { /* ... no change ... */
        showLoading(); const payment = payments.find(p => p.id === id); if (!payment) { showMessage(paymentsMessage, `Payment ${id} not found.`, 'error'); hideLoading(); return; } document.getElementById('payment-id').value = payment.id; document.getElementById('payment-date').value = formatDate(payment.date); document.getElementById('payment-amount').value = payment.amount; document.getElementById('payment-method').value = payment.method; document.getElementById('payment-reference').value = payment.reference || ''; document.getElementById('payment-notes').value = payment.notes || ''; populateInvoicePaymentSelect(); if (payment.linkedInvoiceId) { paymentInvoiceLinkCheck.checked = true; paymentInvoiceLinkRow?.classList.remove('hidden'); paymentPartyRow?.classList.add('hidden'); paymentInvoiceSelect.value = payment.linkedInvoiceId; paymentInvoiceSelect.dispatchEvent(new Event('change')); } else { paymentInvoiceLinkCheck.checked = false; paymentInvoiceLinkRow?.classList.add('hidden'); paymentPartyRow?.classList.remove('hidden'); paymentPartyType.value = payment.partyType || 'customer'; document.getElementById('payment-party-name').value = payment.partyName || ''; if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = ''; paymentInvoiceSelect.value = ''; } document.getElementById('payment-entry-section').scrollIntoView({ behavior: 'smooth' }); hideLoading(); };
    const deletePayment = (id) => { /* ... no change ... */
        const paymentIndex = payments.findIndex(p => p.id === id); if (paymentIndex === -1) { showMessage(paymentsMessage, `Payment #${id} not found.`, 'error'); return; } if (!confirm(`Delete Payment #${id}?`)) return; showLoading(); const deletedPayment = payments[paymentIndex]; const linkedInvoiceId = deletedPayment.linkedInvoiceId; payments.splice(paymentIndex, 1); console.log(`Payment ${id} deleted.`); let invoiceStatusNeedsUpdate = false; if (linkedInvoiceId) { const invoice = invoices.find(inv => inv.id === linkedInvoiceId); if (invoice) { const changed = invoice.type === 'customer' ? updateInvoicePaymentStatus(linkedInvoiceId) : updateSupplierInvoicePaymentStatus(linkedInvoiceId); if (changed) invoiceStatusNeedsUpdate = true; } } saveData(); showMessage(paymentsMessage, `Payment #${id} deleted.`, 'success'); renderPaymentsList(); if (invoiceStatusNeedsUpdate) { renderInvoiceList(); renderDuePaymentsList(); } populateInvoicePaymentSelect(); };


    // --- Payments List Rendering (No changes needed here) ---
    const renderPaymentsList = () => { /* ... no change ... */
        if (!paymentsListBody) return; paymentsListBody.innerHTML = ''; showLoading(); const sortedPayments = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date)); if (sortedPayments.length === 0) { paymentsListBody.innerHTML = '<tr class="no-results"><td colspan="8">No payments recorded yet.</td></tr>'; hideLoading(); return; } sortedPayments.forEach(payment => { const row = paymentsListBody.insertRow(); const partyDisplay = payment.partyName ? `${payment.partyName} <small>(${payment.partyType})</small>` : 'N/A'; const notesDisplay = `${payment.notes || ''} ${payment.reference ? '<br><small>Ref: ' + payment.reference + '</small>' : ''}`; row.innerHTML = `<td>${payment.id}</td><td>${formatDate(payment.date)}</td><td>${formatCurrency(payment.amount)}</td><td>${payment.method}</td><td>${payment.linkedInvoiceId ? `<a href="#" onclick="event.preventDefault(); viewInvoiceFromPayment(${payment.linkedInvoiceId});" title="View Invoice #${payment.linkedInvoiceId}">${'#' + payment.linkedInvoiceId}</a>` : 'N/A'}</td><td>${partyDisplay}</td><td>${notesDisplay.trim()}</td><td><button class="edit-payment-button" data-id="${payment.id}" title="Edit Payment">Edit</button><button class="delete-payment-button" data-id="${payment.id}" title="Delete Payment">Delete</button><button class="pdf-payment-button" data-id="${payment.id}" title="Download Payment Receipt">Receipt</button></td>`; row.querySelector('.edit-payment-button')?.addEventListener('click', (e) => editPayment(parseInt(e.target.dataset.id))); row.querySelector('.delete-payment-button')?.addEventListener('click', (e) => deletePayment(parseInt(e.target.dataset.id))); row.querySelector('.pdf-payment-button')?.addEventListener('click', (e) => generatePaymentReceiptPDF(parseInt(e.target.dataset.id))); }); hideLoading(); };
    window.viewInvoiceFromPayment = (invoiceId) => { /* ... no change ... */ editInvoice(invoiceId); showScreen('invoices'); setTimeout(() => { document.getElementById('create-edit-invoice-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100); };
    const renderDuePaymentsList = () => { /* ... no change ... */
         if (!dueInvoicesListBody) return; dueInvoicesListBody.innerHTML = ''; showLoading(); const today = new Date(); today.setHours(0, 0, 0, 0); const dueInvoices = invoices.filter(inv => inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')); dueInvoices.sort((a, b) => { const dateA = a.dueDate && !isNaN(new Date(a.dueDate).getTime()) ? new Date(a.dueDate) : new Date('9999-12-31'); const dateB = b.dueDate && !isNaN(new Date(b.dueDate).getTime()) ? new Date(b.dueDate) : new Date('9999-12-31'); dateA.setHours(0,0,0,0); dateB.setHours(0,0,0,0); return dateA - dateB; }); if (dueInvoices.length === 0) { dueInvoicesListBody.innerHTML = '<tr class="no-results"><td colspan="6">No outstanding customer invoices.</td></tr>'; hideLoading(); return; } let hasVisibleDueInvoices = false; dueInvoices.forEach(invoice => { const amountDue = calculateInvoiceBalance(invoice.id); if (amountDue <= 0.001) return; hasVisibleDueInvoices = true; let dueDateObj = null; let isOverdue = false; let overdueTag = ''; if (invoice.dueDate && !isNaN(new Date(invoice.dueDate).getTime())) { dueDateObj = new Date(invoice.dueDate); dueDateObj.setHours(0,0,0,0); if (dueDateObj < today) { isOverdue = true; overdueTag = ' <span class="overdue-tag">(Overdue)</span>'; } } const row = dueInvoicesListBody.insertRow(); row.className = isOverdue ? 'overdue' : ''; row.innerHTML = `<td>${invoice.id}</td><td>${invoice.partyName}</td><td>${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'} ${overdueTag}</td><td>${formatCurrency(invoice.totalAmount)}</td><td>${formatCurrency(amountDue)}</td><td><button class="pay-now-button" data-id="${invoice.id}" title="Record Payment">Record Pymt</button><button class="view-invoice-button" data-id="${invoice.id}" title="View Invoice Details">View Inv.</button></td>`; row.querySelector('.pay-now-button')?.addEventListener('click', (e) => triggerPayNow(parseInt(e.target.dataset.id))); row.querySelector('.view-invoice-button')?.addEventListener('click', (e) => { editInvoice(parseInt(e.target.dataset.id)); showScreen('invoices'); setTimeout(() => { document.getElementById('create-edit-invoice-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100); }); }); if (!hasVisibleDueInvoices) { dueInvoicesListBody.innerHTML = '<tr class="no-results"><td colspan="6">No outstanding customer invoices found.</td></tr>'; } hideLoading(); };

    // --- Account Statement (No changes needed here) ---
    const generateStatement = (partyName) => { /* ... no change ... */
        if (!statementListBody || !statementResultsSection || !statementResultsTitle || !downloadStatementPdfButton) return; statementListBody.innerHTML = ''; statementResultsSection.classList.remove('hidden'); statementResultsTitle.textContent = partyName; downloadStatementPdfButton.classList.add('hidden'); showLoading(); let balance = 0; const statementEntries = []; invoices.forEach(inv => { if (inv.partyName === partyName) { let transactionType = ''; let reference = `Inv #${inv.id}`; let debit = 0; let credit = 0; const amount = parseFloat(inv.totalAmount || 0) || 0; if (inv.type === 'customer') { transactionType = 'Invoice Issued'; debit = amount; if (inv.dueDate) reference += ` (Due: ${formatDate(inv.dueDate)})`; } else { transactionType = 'Bill Received'; credit = amount; if (inv.supplierInvoiceNumber) reference += ` / Supp Ref: ${inv.supplierInvoiceNumber}`; } statementEntries.push({ date: inv.date, type: transactionType, reference: reference, debit: debit, credit: credit }); } }); payments.forEach(pay => { if (pay.partyName === partyName) { let transactionType = ''; let reference = `Pay ID #${pay.id}`; let debit = 0; let credit = 0; const amount = parseFloat(pay.amount || 0) || 0; if (pay.partyType === 'customer') { transactionType = 'Payment Received'; credit = amount; } else { transactionType = 'Payment Made'; debit = amount; } if (pay.method) reference += ` (${pay.method})`; if (pay.reference) reference += ` Ref: ${pay.reference}`; if (pay.linkedInvoiceId) reference += ` (For Inv #${pay.linkedInvoiceId})`; statementEntries.push({ date: pay.date, type: transactionType, reference: reference, debit: debit, credit: credit }); } }); statementEntries.sort((a, b) => { const dateDiff = new Date(a.date) - new Date(b.date); if (dateDiff !== 0) return dateDiff; const typeA = a.type.toLowerCase(); const typeB = b.type.toLowerCase(); if ((typeA.includes('invoice') || typeA.includes('bill')) && !(typeB.includes('invoice') || typeB.includes('bill'))) return -1; if (!(typeA.includes('invoice') || typeA.includes('bill')) && (typeB.includes('invoice') || typeB.includes('bill'))) return 1; return 0; }); if (statementEntries.length === 0) { statementListBody.innerHTML = '<tr class="no-results"><td colspan="6">No transactions found for this party.</td></tr>'; finalBalanceAmountSpan.textContent = '0.00'; finalBalanceTypeSpan.textContent = ''; finalBalanceAmountSpan.className = 'final-balance-amount'; hideLoading(); return; } balance = 0; statementEntries.forEach(entry => { const debitAmount = parseFloat(entry.debit || 0); const creditAmount = parseFloat(entry.credit || 0); balance += (debitAmount - creditAmount); const row = statementListBody.insertRow(); const balanceClass = balance > 0.001 ? 'positive-balance' : (balance < -0.001 ? 'negative-balance' : ''); row.innerHTML = `<td>${formatDate(entry.date)}</td><td>${entry.type}</td><td>${entry.reference}</td><td class="amount">${debitAmount > 0 ? formatCurrency(debitAmount) : ''}</td><td class="amount">${creditAmount > 0 ? formatCurrency(creditAmount) : ''}</td><td class="amount ${balanceClass}">${formatCurrency(balance)}</td>`; }); const finalBalance = balance; finalBalanceAmountSpan.textContent = formatCurrency(Math.abs(finalBalance)); finalBalanceAmountSpan.className = `final-balance-amount ${finalBalance > 0.001 ? 'positive-balance' : (finalBalance < -0.001 ? 'negative-balance' : '')}`; finalBalanceTypeSpan.textContent = finalBalance > 0.001 ? '(Due by Customer/Payable to Us)' : (finalBalance < -0.001 ? '(Due to Supplier/Receivable by Us)' : '(Settled)'); downloadStatementPdfButton.classList.remove('hidden'); hideLoading(); statementResultsSection.scrollIntoView({behavior: 'smooth'}); };


    // --- Settings Management (No changes needed here) ---
    const applySettings = () => { /* ... no change ... */
        if (settings.paymentQrImageData) { qrCodePreview.src = settings.paymentQrImageData; qrCodePreview.style.display = 'block'; removeQrImageButton.style.display = 'inline-block'; } else { qrCodePreview.src = '#'; qrCodePreview.style.display = 'none'; removeQrImageButton.style.display = 'none'; } console.log("Settings applied."); };
    const loadSettingsIntoForm = () => { /* ... no change ... */
        settingCompanyNameInput.value = settings.companyName || ''; settingAddress1Input.value = settings.address1 || ''; settingAddress2Input.value = settings.address2 || ''; settingPhoneInput.value = settings.phone || ''; settingEmailInput.value = settings.email || ''; settingPaymentQrImageInput.value = null; applySettings(); };
    const readFileAsDataURL = (file) => { /* ... no change ... */
        return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = (error) => reject(error); reader.readAsDataURL(file); }); };
    const handleCompanySettingsSubmit = async (e) => { /* ... no change ... */
        e.preventDefault(); showLoading(); try { settings.companyName = settingCompanyNameInput.value.trim(); settings.address1 = settingAddress1Input.value.trim(); settings.address2 = settingAddress2Input.value.trim(); settings.phone = settingPhoneInput.value.trim(); settings.email = settingEmailInput.value.trim(); const qrImageFile = settingPaymentQrImageInput.files[0]; if (qrImageFile) { if (qrImageFile.size > 2 * 1024 * 1024) throw new Error("Image file size exceeds 2MB limit."); if (!['image/png', 'image/jpeg', 'image/gif'].includes(qrImageFile.type)) throw new Error("Invalid image file type."); settings.paymentQrImageData = await readFileAsDataURL(qrImageFile); console.log("QR Code image updated."); } saveData(); applySettings(); showMessage(companySettingsMessage, 'Settings saved successfully.', 'success'); } catch (error) { console.error("Error saving settings:", error); showMessage(companySettingsMessage, `Error saving settings: ${error.message}`, 'error'); } finally { /* saveData hides loading */ } };


    // --- Backup & Restore (Modified to handle new inventory/stockLevel structure) ---
    const handleBackup = () => {
        showLoading();
        try {
            // Ensure consistency before backup
            const itemNames = inventory.map(item => item.name.toLowerCase());
            const hasDuplicates = itemNames.some((name, index) => itemNames.indexOf(name) !== index);
            if (hasDuplicates) throw new Error("Duplicate item names detected. Please fix before backing up.");

            const dataToBackup = {
                invoices,
                inventory, // Contains { name, category, description }
                stockLevels, // Keyed by item name
                payments,
                settings,
                nextInvoiceId,
                nextPaymentId,
                backupTimestamp: getCurrentTimestamp(),
                appVersion: '1.2.0-no-code' // Indicate version without code
            };
            const jsonString = JSON.stringify(dataToBackup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `eaze_inn_accounts_backup_nocode_${timestamp}.json`; // Adjusted filename
            triggerDownload(blob, filename);
            showMessage(backupRestoreMessage, 'Data backup successful!', 'success');
        } catch (e) { console.error("Backup failed:", e); showMessage(backupRestoreMessage, `Backup failed: ${e.message}`, 'error'); } finally { hideLoading(); }
    };
    const handleRestore = (event) => {
        const file = event.target.files[0];
        if (!file) { showMessage(backupRestoreMessage, 'No file selected.', 'error'); restoreButton.disabled = true; return; }
        if (!file.name.toLowerCase().endsWith('.json')) { showMessage(backupRestoreMessage, 'Invalid file type. Select .json backup.', 'error'); restoreFileInput.value = ''; restoreButton.disabled = true; return; }
        if (!confirm('WARNING: Restoring data will overwrite all current information. Proceed?')) { restoreFileInput.value = ''; restoreButton.disabled = true; return; }

        showLoading();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredData = JSON.parse(e.target.result);

                // --- Data Validation (Updated for no-code structure) ---
                 if (!restoredData || typeof restoredData !== 'object') throw new Error("Invalid backup file format.");
                 if (!Array.isArray(restoredData.invoices)) throw new Error("Missing/invalid 'invoices'.");
                 if (!Array.isArray(restoredData.inventory)) throw new Error("Missing/invalid 'inventory'.");
                 // Check if inventory items have names and no codes (or handle migration if needed)
                 if (restoredData.inventory.some(item => !item.name || item.code !== undefined)) {
                      throw new Error("Inventory data format mismatch (expected name, no code). Cannot restore this backup.");
                 }
                 // Check for duplicate names in restored inventory
                const restoredNames = restoredData.inventory.map(item => item.name.toLowerCase());
                if (restoredNames.some((name, index) => restoredNames.indexOf(name) !== index)) {
                    throw new Error("Backup contains duplicate item names. Cannot restore.");
                }

                 if (typeof restoredData.stockLevels !== 'object' || restoredData.stockLevels === null) throw new Error("Missing/invalid 'stockLevels'.");
                 // Ensure stockLevel keys are strings (item names)
                 if (Object.keys(restoredData.stockLevels).some(key => typeof key !== 'string')) {
                     throw new Error("Invalid stockLevel keys (must be item names).");
                 }

                 if (!Array.isArray(restoredData.payments)) throw new Error("Missing/invalid 'payments'.");
                 if (typeof restoredData.settings !== 'object' || restoredData.settings === null) throw new Error("Missing/invalid 'settings'.");
                 if (typeof restoredData.nextInvoiceId !== 'number' || restoredData.nextInvoiceId < 1 || !Number.isInteger(restoredData.nextInvoiceId)) throw new Error("Invalid 'nextInvoiceId'.");
                 if (typeof restoredData.nextPaymentId !== 'number' || restoredData.nextPaymentId < 1 || !Number.isInteger(restoredData.nextPaymentId)) throw new Error("Invalid 'nextPaymentId'.");
                 console.log("Backup file basic structure validated (no-code).");

                 // --- Apply Restored Data ---
                 invoices = restoredData.invoices;
                 inventory = restoredData.inventory;
                 stockLevels = restoredData.stockLevels; // Keyed by name
                 payments = restoredData.payments;
                  settings = { companyName: '', address1: '', address2:'', phone: '', email: '', paymentQrImageData: null, ...restoredData.settings };
                 nextInvoiceId = restoredData.nextInvoiceId;
                 nextPaymentId = restoredData.nextPaymentId;

                 // --- Post-Restore Actions ---
                 // Re-validate loaded data (using name as key)
                 const currentInventoryNames = new Set(inventory.map(item => item.name));
                 const validatedStockLevels = {};
                 inventory.forEach(item => {
                     const itemNameKey = item.name;
                     if (stockLevels[itemNameKey]) {
                         const stock = stockLevels[itemNameKey];
                         validatedStockLevels[itemNameKey] = {
                             quantity: (typeof stock.quantity === 'number' && !isNaN(stock.quantity)) ? stock.quantity : 0,
                             unitCost: (typeof stock.unitCost === 'number' && !isNaN(stock.unitCost)) ? stock.unitCost : 0,
                             revenue: (typeof stock.revenue === 'number' && !isNaN(stock.revenue)) ? stock.revenue : 0,
                             cost: (typeof stock.cost === 'number' && !isNaN(stock.cost)) ? stock.cost : 0,
                             lastUpdated: stock.lastUpdated || null
                         };
                     } else {
                         validatedStockLevels[itemNameKey] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                     }
                 });
                 // Remove stock levels for items not in the restored inventory
                 Object.keys(stockLevels).forEach(key => {
                     if (!currentInventoryNames.has(key)) {
                         console.warn(`Removing orphaned stockLevel key: '${key}'`);
                         delete stockLevels[key];
                     }
                 });
                 stockLevels = validatedStockLevels; // Use validated levels
                 console.log("Post-restore data validation complete.");

                 saveData();
                 applySettings();
                 populateDatalists();
                 renderAllLists();
                 showScreen('dashboard');
                 showMessage(backupRestoreMessage, 'Data restored successfully!', 'success');
                 restoreFileInput.value = '';
                 restoreButton.disabled = true;

            } catch (err) { console.error("Restore failed:", err); showMessage(backupRestoreMessage, `Restore failed: ${err.message}. Data not changed.`, 'error'); restoreFileInput.value = ''; restoreButton.disabled = true; } finally { /* saveData hides loading */ }
        };
        reader.onerror = (err) => { console.error("File reading error:", err); showMessage(backupRestoreMessage, 'Error reading file.', 'error'); hideLoading(); restoreFileInput.value = ''; restoreButton.disabled = true; };
        reader.readAsText(file);
    };

    // --- PDF Generation (Updated for No Item Code) ---
    const cleanFilename = (name) => (name || 'document').replace(/[\s\\/:*?"<>|]+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const getBasePdf = (title) => { /* ... no change ... */
        const doc = new jsPDF(); const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight(); const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth(); let y = 15; doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text(settings.companyName || 'Eaze Inn Accounts', pageWidth / 2, y, { align: 'center' }); y += 6; doc.setFontSize(10); doc.setFont(undefined, 'normal'); if (settings.address1) { doc.text(settings.address1, pageWidth / 2, y, { align: 'center' }); y += 5; } if (settings.address2) { doc.text(settings.address2, pageWidth / 2, y, { align: 'center' }); y += 5; } if (settings.phone) { doc.text(`Phone: ${settings.phone}`, pageWidth / 2, y, { align: 'center' }); y += 5; } if (settings.email) { doc.text(`Email: ${settings.email}`, pageWidth / 2, y, { align: 'center' }); y += 5; } y += 5; doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text(title, pageWidth / 2, y, { align: 'center' }); y += 10; const addFooter = () => { try { const pageCount = doc.internal.getNumberOfPages(); doc.setFontSize(8); doc.setFont(undefined, 'italic'); const pageNum = doc.internal.getCurrentPageInfo().pageNumber; doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' }); doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, pageHeight - 10); } catch (footerError) { console.error("Error adding PDF footer:", footerError); } }; return { doc, y, pageWidth, pageHeight, addFooter };
    };

    // PDF - Invoice (No Item Code)
     const generateInvoicePDF = (invoiceId) => {
         showLoading();
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice) { showMessage(invoiceMessage, `Invoice #${invoiceId} not found.`, 'error'); hideLoading(); return; }

         try {
             const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(invoice.type === 'customer' ? 'Tax Invoice' : 'Bill Record');
             let y = startY;

             // Invoice Details (no change)
             doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(`Invoice ID:`, 15, y); doc.setFont(undefined, 'normal'); doc.text(`${invoice.id}`, 55, y); doc.setFont(undefined, 'bold'); doc.text(`Date Issued:`, pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${formatDate(invoice.date)}`, pageWidth / 2 + 30, y); y += 7; doc.setFont(undefined, 'bold'); doc.text(invoice.type === 'customer' ? 'Customer:' : 'Supplier:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${invoice.partyName}`, 55, y); if (invoice.type === 'customer' && invoice.dueDate) { doc.setFont(undefined, 'bold'); doc.text(`Due Date:`, pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${formatDate(invoice.dueDate)}`, pageWidth / 2 + 30, y); } else if (invoice.type === 'supplier' && invoice.supplierInvoiceNumber) { doc.setFont(undefined, 'bold'); doc.text(`Supplier Ref #:`, pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${invoice.supplierInvoiceNumber}`, pageWidth / 2 + 35, y); } y += 10;

             // Items Table - REMOVED Item Code column
             const head = [['Item Name', 'Qty', 'Unit Price', 'Subtotal']]; // Removed Item Code
             const body = (Array.isArray(invoice.items) ? invoice.items : []).map(item => ([
                 item.itemName, // Use itemName
                 // item.description, // Optional: Add description back if needed
                 formatCurrency(item.quantity),
                 formatCurrency(item.unitPrice),
                 formatCurrency(item.quantity * item.unitPrice)
             ]));

             if (body.length === 0) { doc.text("No items found.", 15, y); y += 10; }
             else {
                 doc.autoTable({
                     startY: y,
                     head: head,
                     body: body,
                     theme: 'grid',
                     headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
                     columnStyles: { // Adjust column indices
                         0: { cellWidth: 'auto' }, // Item Name
                         1: { halign: 'right', cellWidth: 20 }, // Qty
                         2: { halign: 'right', cellWidth: 30 }, // Unit Price
                         3: { halign: 'right', cellWidth: 30 }  // Subtotal
                     },
                     didDrawPage: addFooter
                 });
                 y = doc.lastAutoTable.finalY + 10;
             }

             // Totals & Payment Section (no change needed)
             const totalYStart = y > pageHeight - 70 ? 20 : y; if (totalYStart === 20 && doc.lastAutoTable.finalY > 10) { doc.addPage(); addFooter(); } y = totalYStart; doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text('Total Amount:', pageWidth - 60, y, { align: 'left' }); doc.setFont(undefined, 'normal'); doc.text(`${formatCurrency(invoice.totalAmount)}`, pageWidth - 15, y, { align: 'right' }); y += 7; if (invoice.type === 'customer') { const paymentsForInvoice = payments.filter(p => p.linkedInvoiceId === invoiceId); const totalPaid = paymentsForInvoice.reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0); const amountDue = calculateInvoiceBalance(invoice.id); doc.setFont(undefined, 'bold'); doc.text('Payment Status:', pageWidth - 60, y, { align: 'left' }); doc.setFont(undefined, invoice.paymentStatus === 'Paid' ? 'bold' : 'normal'); doc.setTextColor(invoice.paymentStatus === 'Paid' ? '#28a745' : (invoice.paymentStatus === 'Partial' ? '#fd7e14' : '#dc3545')); doc.text(`${invoice.paymentStatus}`, pageWidth - 15, y, { align: 'right' }); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'normal'); y += 7; doc.setFont(undefined, 'bold'); doc.text('Total Paid:', pageWidth - 60, y, { align: 'left' }); doc.setFont(undefined, 'normal'); doc.text(`${formatCurrency(totalPaid)}`, pageWidth - 15, y, { align: 'right' }); y += 7; doc.setFont(undefined, 'bold'); doc.text('Amount Due:', pageWidth - 60, y, { align: 'left' }); doc.setFont(undefined, 'bold'); doc.text(`${formatCurrency(amountDue)}`, pageWidth - 15, y, { align: 'right' }); doc.setFont(undefined, 'normal'); y += 10; if (paymentsForInvoice.length > 0) { if (y > pageHeight - 40) { doc.addPage(); y = 20; addFooter(); } y += 5; doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Payments Received:', 15, y); y += 6; doc.setFont(undefined, 'normal'); paymentsForInvoice.forEach(p => { if (y > pageHeight - 25) { doc.addPage(); y = 20; addFooter(); } doc.text(`- ${formatDate(p.date)}: ${formatCurrency(p.amount)} (${p.method || 'N/A'}${p.reference ? ', Ref: ' + p.reference : ''})`, 20, y); y += 5; }); } } else { doc.setFont(undefined, 'bold'); doc.text('Payment Status:', pageWidth - 60, y, { align: 'left' }); doc.setFont(undefined, invoice.paymentStatus === 'Paid' ? 'bold' : 'normal'); doc.setTextColor(invoice.paymentStatus === 'Paid' ? '#28a745' : '#dc3545'); doc.text(`${invoice.paymentStatus}`, pageWidth - 15, y, { align: 'right' }); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'normal'); y += 7; }


             addFooter();
             const safePartyName = cleanFilename(invoice.partyName);
             const filename = `Invoice_${invoice.id}_${safePartyName}.pdf`;
             doc.save(filename);
             showMessage(invoiceMessage, `PDF generated: ${filename}`, 'success');

         } catch (error) { console.error("Error generating Invoice PDF:", error); showMessage(invoiceMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); }
     };
    // PDF - Payment Receipt (no change needed)
    const generatePaymentReceiptPDF = (paymentId) => { /* ... no change ... */ showLoading(); const payment = payments.find(p => p.id === paymentId); if (!payment) { showMessage(paymentsMessage, `Payment #${paymentId} not found.`, 'error'); hideLoading(); return; } try { const title = payment.partyType === 'customer' ? 'Payment Receipt' : 'Payment Confirmation'; const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(title); let y = startY; const linkedInvoice = payment.linkedInvoiceId ? invoices.find(inv => inv.id === payment.linkedInvoiceId) : null; doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text('Receipt ID:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.id}`, 55, y); doc.setFont(undefined, 'bold'); doc.text('Payment Date:', pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${formatDate(payment.date)}`, pageWidth / 2 + 35, y); y += 8; doc.setFont(undefined, 'bold'); doc.text(payment.partyType === 'customer' ? 'Received From:' : 'Paid To:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.partyName || 'N/A'}`, 55, y); y += 8; doc.setFont(undefined, 'bold'); doc.text('Payment Method:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.method}`, 55, y); if (payment.reference) { doc.setFont(undefined, 'bold'); doc.text('Reference:', pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.reference}`, pageWidth / 2 + 35, y); } y += 8; doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Amount:', 15, y); doc.text(`${formatCurrency(payment.amount)}`, 55, y); y += 12; if (linkedInvoice) { if (y > pageHeight - 60) { doc.addPage(); y = 20; addFooter(); } doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Related Invoice Information:', 15, y); y += 7; doc.setFont(undefined, 'normal'); doc.text(`Invoice ID: ${linkedInvoice.id}`, 20, y); doc.text(`Invoice Date: ${formatDate(linkedInvoice.date)}`, pageWidth / 2, y); y += 6; doc.text(`Invoice Total: ${formatCurrency(linkedInvoice.totalAmount)}`, 20, y); if (linkedInvoice.type === 'customer') { const balanceAfterPayment = calculateInvoiceBalance(linkedInvoice.id); doc.text(`Balance After This Payment: ${formatCurrency(balanceAfterPayment)}`, pageWidth / 2, y); } y += 8; } if (payment.notes) { if (y > pageHeight - 40) { doc.addPage(); y = 20; addFooter(); } doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Notes:', 15, y); y += 5; doc.setFont(undefined, 'normal'); const splitNotes = doc.splitTextToSize(payment.notes, pageWidth - 30); doc.text(splitNotes, 15, y); y += (splitNotes.length * 5); } addFooter(); const safePartyName = cleanFilename(payment.partyName); const filename = `PaymentReceipt_${payment.id}_${safePartyName}.pdf`; doc.save(filename); showMessage(paymentsMessage, `PDF generated: ${filename}`, 'success'); } catch (error) { console.error("Error generating Payment Receipt PDF:", error); showMessage(paymentsMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); } };
    // PDF - Statement (no change needed)
    const generateStatementPDF = () => { /* ... no change ... */ showLoading(); const partyName = statementResultsTitle.textContent; if (!partyName) { showMessage(statementMessage, 'Cannot generate PDF: No party selected.', 'error'); hideLoading(); return; } try { const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(`Account Statement for ${partyName}`); let y = startY; const head = [['Date', 'Transaction Type', 'Reference', 'Debit', 'Credit', 'Balance']]; const body = []; const tableRows = statementListBody.querySelectorAll('tr'); if (tableRows.length === 0 || (tableRows.length === 1 && tableRows[0].classList.contains('no-results'))) { showMessage(statementMessage, 'No statement data to generate PDF.', 'info'); hideLoading(); return; } tableRows.forEach(tr => { const cells = tr.querySelectorAll('td'); if (cells.length === 6) { body.push([ cells[0].textContent, cells[1].textContent, cells[2].textContent, cells[3].textContent, cells[4].textContent, cells[5].textContent ]); } }); doc.autoTable({ startY: y, head: head, body: body, theme: 'grid', headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 3: { halign: 'right', cellWidth: 25 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'right', cellWidth: 30 } }, willDrawCell: (data) => { if (data.column.index === 5 && data.cell.section === 'body') { const cellText = data.cell.text[0]; const balanceValue = parseFloat(cellText.replace(/[^0-9.-]+/g,"")); if (!isNaN(balanceValue)) { if (balanceValue < -0.001) doc.setTextColor(114, 28, 36); else if (balanceValue > 0.001) doc.setTextColor(21, 87, 36); else doc.setTextColor(108, 117, 125); } } }, didParseCell: (data) => { doc.setTextColor(0, 0, 0); }, didDrawPage: (data) => { addFooter(); } }); y = doc.lastAutoTable.finalY + 10; if (y > pageHeight - 25) { doc.addPage(); y = 20; addFooter(); } const finalBalanceValueText = finalBalanceAmountSpan.textContent; const finalBalanceTypeText = finalBalanceTypeSpan.textContent; const finalBalanceCombined = `Final Balance: ${finalBalanceValueText} ${finalBalanceTypeText}`; if (finalBalanceAmountSpan.classList.contains('negative-balance')) doc.setTextColor(114, 28, 36); else if (finalBalanceAmountSpan.classList.contains('positive-balance')) doc.setTextColor(21, 87, 36); else doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(finalBalanceCombined, pageWidth - 15, y, { align: 'right' }); doc.setTextColor(0,0,0); addFooter(); const safePartyName = cleanFilename(partyName); const filename = `AccountStatement_${safePartyName}_${formatDate(new Date().toISOString())}.pdf`; doc.save(filename); showMessage(statementMessage, `PDF generated: ${filename}`, 'success'); } catch (error) { console.error("Error generating Statement PDF:", error); showMessage(statementMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); } };
    // PDF - Low Stock (No Item Code)
    const generateLowStockPDF = () => {
        showLoading();
        try {
            const lowStockItems = [];
            lowStockListBody.querySelectorAll('tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length === 2) { // Now only 2 columns: Name, Quantity
                    lowStockItems.push({ name: cells[0].textContent, quantity: cells[1].textContent });
                }
            });
            if (lowStockItems.length === 0) { showMessage(inventoryMessage, 'No low stock items to generate PDF.', 'info'); hideLoading(); return; }

            const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(`Low Stock Report`);
            let y = startY;
            doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, y); y += 10;

            // Table Header - REMOVED Item Code
            const head = [['Item Name', 'Quantity on Hand']];
            const body = lowStockItems.map(item => [item.name, item.quantity]);

            doc.autoTable({
                startY: y, head: head, body: body, theme: 'grid',
                headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } }, // Quantity is index 1 now
                 willDrawCell: (data) => {
                     if (data.column.index === 1 && data.cell.section === 'body') { // Index 1 is Qty
                         doc.setTextColor(220, 53, 69); doc.setFont(undefined, 'bold');
                     }
                 },
                 didParseCell: (data) => { doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'normal'); },
                didDrawPage: addFooter
            });

            addFooter();
            const filename = `LowStockReport_${formatDate(new Date().toISOString())}.pdf`;
            doc.save(filename);
            showMessage(inventoryMessage, `PDF generated: ${filename}`, 'success');
        } catch (error) { console.error("Error generating Low Stock PDF:", error); showMessage(inventoryMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); }
    };

    // --- 58mm Thermal Receipt Generation (No Item Code) ---
    const generateReceipt = (invoiceId, outputType = 'print') => {
        showLoading();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice || invoice.type !== 'customer') { showMessage(invoiceMessage, 'Cannot generate receipt for this invoice type.', 'error'); hideLoading(); return; }

        try {
            const companyName = settings.companyName || 'Eaze Inn';
            const address1 = settings.address1 || '';
            const address2 = settings.address2 || '';
            const phone = settings.phone || '';
            const email = settings.email || '';
            const qrImageData = settings.paymentQrImageData;
            let receiptContent = '';
            const lineLength = 32;
            const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
            const centerText = (text) => { const safeText = escapeHtml(text); const padding = Math.max(0, Math.floor((lineLength - safeText.length) / 2)); return ' '.repeat(padding) + safeText; };
            const leftAlignText = (text) => { const safeText = escapeHtml(text); let lines = []; let currentLine = ''; safeText.split(' ').forEach(word => { if ((currentLine + word).length <= lineLength) { currentLine += (currentLine ? ' ' : '') + word; } else { lines.push(currentLine.padEnd(lineLength)); currentLine = word; } }); lines.push(currentLine.padEnd(lineLength)); return lines.join('\n'); }
            const alignLeftRight = (leftText, rightText) => { const safeLeft = escapeHtml(leftText); const safeRight = escapeHtml(rightText); const spaceNeeded = lineLength - safeLeft.length - safeRight.length; const spaces = Math.max(1, spaceNeeded); return safeLeft + ' '.repeat(spaces) + safeRight; };

            receiptContent += centerText(companyName) + '\n';
            if (address1) receiptContent += centerText(address1) + '\n';
            if (address2) receiptContent += centerText(address2) + '\n';
            if (phone) receiptContent += centerText(`Tel: ${phone}`) + '\n';
            if (email) receiptContent += centerText(`Email: ${email}`) + '\n';
            receiptContent += '-'.repeat(lineLength) + '\n';
            receiptContent += centerText('CUSTOMER RECEIPT') + '\n';
            receiptContent += '-'.repeat(lineLength) + '\n';
            receiptContent += alignLeftRight(`Inv #: ${invoice.id}`, `Date: ${formatDate(invoice.date)}`) + '\n';
            receiptContent += leftAlignText(`Customer: ${invoice.partyName}`) + '\n';
            if (invoice.dueDate) receiptContent += `Due Date: ${formatDate(invoice.dueDate)}\n`;
            receiptContent += '-'.repeat(lineLength) + '\n';
            // Updated Item Header - More space for Name
            receiptContent += 'Item Name        Qty Price   Total\n';
            receiptContent += '-'.repeat(lineLength) + '\n';

            (Array.isArray(invoice.items) ? invoice.items : []).forEach(item => {
                // Adjust padding: Give more space to name, slightly less to others if needed
                const nameStr = escapeHtml(item.itemName).substring(0, 15).padEnd(15); // Name takes more space
                const qtyStr = String(item.quantity).padStart(4);
                const priceStr = formatCurrency(item.unitPrice).padStart(6);
                const subtotalStr = formatCurrency(item.quantity * item.unitPrice).padStart(7);
                receiptContent += `${nameStr}${qtyStr}${priceStr}${subtotalStr}\n`;
            });

            receiptContent += '='.repeat(lineLength) + '\n';
            receiptContent += alignLeftRight('TOTAL AMOUNT:', formatCurrency(invoice.totalAmount).padStart(10)) + '\n';
            const paymentsForInvoice = payments.filter(p => p.linkedInvoiceId === invoiceId);
            const totalPaid = paymentsForInvoice.reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);
            const amountDue = calculateInvoiceBalance(invoice.id);
            receiptContent += alignLeftRight('TOTAL PAID:', formatCurrency(totalPaid).padStart(10)) + '\n';
            receiptContent += '-'.repeat(lineLength) + '\n';
            receiptContent += alignLeftRight('BALANCE DUE:', formatCurrency(amountDue).padStart(10)) + '\n';
            receiptContent += '='.repeat(lineLength) + '\n';
            if (invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'Partial') { receiptContent += `Status: ${escapeHtml(invoice.paymentStatus)}\n`; if (paymentsForInvoice.length > 0) { const lastPayment = [...paymentsForInvoice].sort((a, b) => new Date(b.date) - new Date(a.date))[0]; receiptContent += `Last Pymt Method: ${escapeHtml(lastPayment.method)}\n`; if (lastPayment.reference) receiptContent += `Ref: ${escapeHtml(lastPayment.reference)}\n`; } receiptContent += '-'.repeat(lineLength) + '\n'; }
            receiptContent += centerText('Thank you!') + '\n\n';
            if (qrImageData) receiptContent += '[QR_CODE_PLACEHOLDER]\n\n';

            if (outputType === 'print') { printThermalReceipt(receiptContent, qrImageData); }
            else { console.log("--- Receipt Content ---\n", receiptContent.replace('[QR_CODE_PLACEHOLDER]', qrImageData ? '(QR Code)' : ''), "\n--- End Receipt ---"); alert("Receipt content logged to console."); }
        } catch (error) { console.error("Error generating Receipt:", error); showMessage(invoiceMessage, `Error generating receipt: ${error.message}`, 'error'); } finally { hideLoading(); }
    };
    const printThermalReceipt = (textContent, qrImageDataUrl = null) => { /* ... no change needed in printing logic itself ... */ const textToPrint = textContent.replace('[QR_CODE_PLACEHOLDER]', ''); let printContents = `<html><head><title>Receipt</title><style>@media print { @page { margin: 0mm 0mm 0mm 0mm; size: 58mm auto; } html, body { margin: 0 !important; padding: 0 !important; background-color: #fff; } } body { font-family: 'Courier New', Courier, monospace; font-size: 9pt; line-height: 1.2; margin: 2mm; padding: 0; width: calc(58mm - 4mm); overflow: hidden; background-color: #fff; color: #000; } pre { margin: 0; padding: 0; white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: inherit; line-height: inherit; color: inherit; } img.qr-code { display: block; margin: 3mm auto 3mm auto; max-width: 80%; height: auto; image-rendering: pixelated; }</style></head><body><pre>${textToPrint}</pre>`; if (qrImageDataUrl) { printContents += `<img src="${qrImageDataUrl}" class="qr-code" alt="Payment QR Code">`; } printContents += `</body></html>`; const printWindow = window.open('', '_blank', 'width=300,height=500'); if (!printWindow) { alert("Please allow popups for this site to print receipts."); return; } printWindow.document.write(printContents); printWindow.document.close(); printWindow.focus(); printWindow.onload = () => { console.log("Print window loaded..."); try { printWindow.print(); setTimeout(() => { try { printWindow.close(); } catch (closeErr) { console.warn("Could not close print window:", closeErr); } }, 1500); } catch (e) { console.error("Printing failed:", e); try { printWindow.close(); } catch (closeErr) {} alert("Could not initiate printing."); } }; setTimeout(() => { if (!printWindow.closed && !printWindow.document.readyState.includes('complete')) { console.warn("Print window onload did not fire, using timeout fallback."); try { printWindow.print(); setTimeout(() => { try { printWindow.close(); } catch (closeErr) {} }, 1500); } catch (e) { console.error("Printing failed (timeout fallback):", e); try { printWindow.close(); } catch (closeErr) {} alert("Could not initiate printing (timeout)."); } } }, 1000); };


    // --- Event Listeners (Updated) ---
    const setupEventListeners = () => {
         navButtons.forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screen)));

         // Invoice
         showCreateInvoiceButton?.addEventListener('click', () => { clearInvoiceForm(); createEditInvoiceSection?.classList.remove('hidden'); createEditInvoiceSection?.scrollIntoView({ behavior: 'smooth' }); });
         cancelInvoiceButton?.addEventListener('click', () => { clearInvoiceForm(); createEditInvoiceSection?.classList.add('hidden'); });
         addInvoiceItemButton?.addEventListener('click', () => addInvoiceItemRow());
         invoiceForm?.addEventListener('submit', handleInvoiceFormSubmit);
         invoiceListFilter?.addEventListener('change', renderInvoiceList);
         invoiceTypeSelect?.addEventListener('change', () => { /* ... no change ... */ const isCustomer = invoiceTypeSelect.value === 'customer'; if(invoicePartyLabel) invoicePartyLabel.textContent = isCustomer ? 'Customer Name:' : 'Supplier Name:'; supplierFields.forEach(el => el.classList.toggle('hidden', isCustomer)); customerFields.forEach(el => el.classList.toggle('hidden', !isCustomer)); if (isCustomer) { if(document.getElementById('invoice-number-supplier')) document.getElementById('invoice-number-supplier').value = ''; } else { if(document.getElementById('invoice-due-date')) document.getElementById('invoice-due-date').value = ''; } });
         invoiceItemsContainer?.addEventListener('input', (e) => {
             if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-unit-price')) {
                 const row = e.target.closest('.invoice-item-row'); if (row) { updateItemSubtotal(row); updateInvoiceTotal(); }
             }
             // Logic for when item name changes (e.g., fill description)
             if (e.target.classList.contains('item-name')) {
                  const row = e.target.closest('.invoice-item-row');
                  const name = e.target.value;
                  const descSpan = row?.querySelector('.item-description');
                  if (row && descSpan) {
                       const inventoryItem = inventory.find(i => i.name === name);
                       descSpan.textContent = inventoryItem ? (inventoryItem.description || '') : '';
                  }
                  if(row) updateItemSubtotal(row); // Recalculate subtotal on name change too
                  updateInvoiceTotal();
             }
         });
         document.getElementById('invoice-image')?.addEventListener('change', (e) => { /* ... no change ... */ const fileInput = e.target; const pathSpan = invoiceImagePathSpan; if (!pathSpan) return; if (!fileInput.files || fileInput.files.length === 0) pathSpan.textContent = ''; else pathSpan.textContent = `File: ${fileInput.files[0].name}`; });

         // Inventory
         showAddItemButton?.addEventListener('click', () => { addItemForm?.reset(); hideMessage(inventoryMessage); addItemSection?.classList.remove('hidden'); addItemSection?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('item-name-new')?.focus(); });
         cancelItemButton?.addEventListener('click', () => { addItemForm?.reset(); hideMessage(inventoryMessage); addItemSection?.classList.add('hidden'); });
         addItemForm?.addEventListener('submit', handleAddItemFormSubmit);
         inventorySearchInput?.addEventListener('input', (e) => renderInventoryList(e.target.value));
         exportInventoryJsonButton?.addEventListener('click', () => exportInventory('json'));
         exportInventoryCsvButton?.addEventListener('click', () => exportInventory('csv'));
         downloadLowStockPdfButton?.addEventListener('click', generateLowStockPDF);

         // Payments
         paymentForm?.addEventListener('submit', handlePaymentFormSubmit);
         clearPaymentButton?.addEventListener('click', clearPaymentForm);
         paymentInvoiceLinkCheck?.addEventListener('change', () => { /* ... no change ... */ const isChecked = paymentInvoiceLinkCheck.checked; paymentInvoiceLinkRow?.classList.toggle('hidden', !isChecked); paymentPartyRow?.classList.toggle('hidden', isChecked); if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = ''; if (!isChecked) { if(paymentInvoiceSelect) paymentInvoiceSelect.value = ''; if(paymentPartyNameInput) paymentPartyNameInput.value = ''; } else { populateInvoicePaymentSelect(); paymentInvoiceSelect?.focus(); } });
         paymentInvoiceSelect?.addEventListener('change', (e) => { /* ... no change ... */ const selectedOption = e.target.options[e.target.selectedIndex]; if (selectedOption && selectedOption.value) { const balance = selectedOption.dataset.balance; const partyName = selectedOption.dataset.partyName; if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = `(Bal: ${formatCurrency(balance)})`; if(paymentPartyType) paymentPartyType.value = 'customer'; if(paymentPartyNameInput) paymentPartyNameInput.value = partyName || ''; } else { if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = ''; if(paymentPartyNameInput) paymentPartyNameInput.value = ''; } });

         // Statement
         statementForm?.addEventListener('submit', (e) => { /* ... no change ... */ e.preventDefault(); const partyName = document.getElementById('statement-party-name')?.value.trim(); if (partyName) generateStatement(partyName); else { showMessage(statementMessage, 'Please select or enter a name.', 'error'); statementResultsSection?.classList.add('hidden'); } });
         downloadStatementPdfButton?.addEventListener('click', generateStatementPDF);

         // Settings
         companySettingsForm?.addEventListener('submit', handleCompanySettingsSubmit);
         removeQrImageButton?.addEventListener('click', () => { /* ... no change ... */ if (confirm("Remove QR code image?")) { settings.paymentQrImageData = null; if(settingPaymentQrImageInput) settingPaymentQrImageInput.value = null; saveData(); applySettings(); showMessage(companySettingsMessage, 'QR Code image removed.', 'info'); } });

         // Backup/Restore
         backupButton?.addEventListener('click', handleBackup);
         restoreFileInput?.addEventListener('change', (e) => { /* ... no change ... */ if (restoreButton) restoreButton.disabled = !e.target.files || e.target.files.length === 0; if (e.target.files && e.target.files.length > 0 && !e.target.files[0].name.toLowerCase().endsWith('.json')) { showMessage(backupRestoreMessage, 'Invalid file type. Select .json backup.', 'error'); restoreFileInput.value = ''; restoreButton.disabled = true; } else { hideMessage(backupRestoreMessage); } });
         restoreButton?.addEventListener('click', () => handleRestore({ target: restoreFileInput }));
     };


    // --- Initialization ---
    const initializeApp = () => {
        console.log("Initializing Eaze Inn Accounts (No Item Code Version)...");
        loadData();
        setupEventListeners();
        showScreen('dashboard');
        console.log("App Initialized.");
    };

     const renderAllLists = () => {
         console.log("Rendering all lists...");
         renderInvoiceList();
         renderInventoryList();
         renderLowStockList();
         renderPaymentsList();
         renderDuePaymentsList();
         console.log("List rendering complete.");
     };

    // --- Start Application ---
    initializeApp();

});
// === JavaScript End ===
