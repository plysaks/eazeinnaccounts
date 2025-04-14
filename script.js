document.addEventListener('DOMContentLoaded', () => {
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
    const exportInventoryCsvButton = document.getElementById('export-inventory-csv'); // CSV Export Button
    const showAddItemButton = document.getElementById('show-add-item-button');
    const addItemSection = document.getElementById('add-item-section');
    const addItemForm = document.getElementById('add-item-form');
    const cancelItemButton = document.getElementById('cancel-item-button');
    const itemCodeList = document.getElementById('item-code-list');
    const partyNameListInvoice = document.getElementById('party-name-list-invoice');
    const partyNameListStatement = document.getElementById('party-name-list'); // Datalist for statement/payment
    const inventoryListBody = document.getElementById('inventory-list');
    const lowStockSection = document.getElementById('low-stock-section');
    const lowStockListBody = document.getElementById('low-stock-list-body');
    const downloadLowStockPdfButton = document.getElementById('download-low-stock-pdf');
    const generatedItemCodeMessage = document.getElementById('generated-item-code-message');


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
    let inventory = []; // Holds item types { code, name, category, description }
    let stockLevels = {}; // Holds current stock { itemCode: { quantity, unitCost, lastUpdated, revenue, cost } }
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
    let nextItemCodePrefix = 'ITM'; // Prefix for auto-generated item codes

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
        // Basic formatting, adjust locale and options as needed
        return parseFloat(amount || 0).toFixed(2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            // Try parsing ISO format first (more reliable)
            if (dateString.includes('T')) {
                dateString = dateString.split('T')[0];
            }
            const date = new Date(dateString + 'T00:00:00'); // Assume local time if no T
             if (isNaN(date.getTime())) { // Check if date is valid
                throw new Error("Invalid date value");
             }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Return original if parsing fails
        }
    };


    const getCurrentTimestamp = () => new Date().toISOString();

    // Function to save data to localStorage
    const saveData = () => {
        try {
            showLoading();
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
            showMessage(backupRestoreMessage, "Error saving data. Storage might be full.", "error");
        } finally {
            // Ensure loading is hidden even if save fails, but maybe delay slightly
             setTimeout(hideLoading, 100); // Short delay
        }
    };

    // Function to load data from localStorage
    const loadData = () => {
        try {
            showLoading();
            const loadedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
            const loadedInventory = JSON.parse(localStorage.getItem('inventory') || '[]');
            const loadedStockLevels = JSON.parse(localStorage.getItem('stockLevels') || '{}');
            const loadedPayments = JSON.parse(localStorage.getItem('payments') || '[]');
            const loadedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
            const loadedNextInvoiceId = parseInt(localStorage.getItem('nextInvoiceId') || '1', 10);
            const loadedNextPaymentId = parseInt(localStorage.getItem('nextPaymentId') || '1', 10);

            // Basic validation/migration if needed in the future
            invoices = Array.isArray(loadedInvoices) ? loadedInvoices : [];
            inventory = Array.isArray(loadedInventory) ? loadedInventory : [];
            stockLevels = typeof loadedStockLevels === 'object' && loadedStockLevels !== null ? loadedStockLevels : {};
            payments = Array.isArray(loadedPayments) ? loadedPayments : [];
            settings = { // Start with defaults
                 companyName: '', address1: '', address2: '', phone: '', email: '', paymentQrImageData: null,
                 ...loadedSettings // Overwrite with loaded values
            };
            nextInvoiceId = !isNaN(loadedNextInvoiceId) && loadedNextInvoiceId > 0 ? loadedNextInvoiceId : 1;
            nextPaymentId = !isNaN(loadedNextPaymentId) && loadedNextPaymentId > 0 ? loadedNextPaymentId : 1;

             // Ensure stockLevels has entries for all inventory items & ensure properties exist
             inventory.forEach(item => {
                if (!stockLevels[item.code]) {
                    stockLevels[item.code] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                } else {
                     // Ensure necessary props exist on loaded data
                     if (stockLevels[item.code].quantity === undefined) stockLevels[item.code].quantity = 0;
                     if (stockLevels[item.code].unitCost === undefined) stockLevels[item.code].unitCost = 0;
                     if (stockLevels[item.code].revenue === undefined) stockLevels[item.code].revenue = 0;
                     if (stockLevels[item.code].cost === undefined) stockLevels[item.code].cost = 0;
                     if (stockLevels[item.code].lastUpdated === undefined) stockLevels[item.code].lastUpdated = null;
                }
            });


            console.log("Data loaded successfully.");
            applySettings(); // Apply loaded settings to the UI
            populateDatalists(); // Populate datalists after loading data
            renderAllLists(); // Render lists with loaded data

        } catch (e) {
            console.error("Error loading data from localStorage:", e);
            showMessage(backupRestoreMessage, "Error loading data. Starting with defaults.", "error");
            // Reset to defaults if loading fails catastrophically
            invoices = [];
            inventory = [];
            stockLevels = {};
            payments = [];
             settings = { companyName: '', address1: '', address2: '', phone: '', email: '', paymentQrImageData: null };
            nextInvoiceId = 1;
            nextPaymentId = 1;
            saveData(); // Save the defaults
        } finally {
             hideLoading();
        }
    };

    // --- Navigation ---
    const showScreen = (screenId) => {
        // Ensure DOM is ready
        if (!document.getElementById(`${screenId}-screen`)) {
            console.error(`Screen element ${screenId}-screen not found during showScreen.`);
            return; // Prevent errors if called too early or with bad ID
        }

        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        navButtons.forEach(button => {
            button.classList.remove('active');
        });

        const activeScreen = document.getElementById(`${screenId}-screen`);
        const activeButton = document.querySelector(`#main-nav button[data-screen="${screenId}"]`);

        if (activeScreen) {
            activeScreen.classList.add('active');
        } else {
            console.warn(`Screen with id ${screenId}-screen not found. Defaulting to dashboard.`);
            document.getElementById('dashboard-screen')?.classList.add('active'); // Use optional chaining
            document.querySelector('#main-nav button[data-screen="dashboard"]')?.classList.add('active');
        }
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Hide forms/specific sections when switching screens
        createEditInvoiceSection?.classList.add('hidden');
        addItemSection?.classList.add('hidden');
        statementResultsSection?.classList.add('hidden');
        hideMessage(invoiceMessage);
        hideMessage(inventoryMessage);
        hideMessage(paymentsMessage);
        hideMessage(statementMessage);
        hideMessage(companySettingsMessage);
        hideMessage(backupRestoreMessage);
        hideMessage(generatedItemCodeMessage);


        // Special actions for specific screens
        if (screenId === 'invoices') {
            renderInvoiceList();
            renderDuePaymentsList(); // Refresh due payments when viewing invoices too
            populateInvoicePaymentSelect(); // Refresh payment invoice dropdown
        } else if (screenId === 'inventory') {
            renderInventoryList();
            renderLowStockList();
        } else if (screenId === 'payments') {
            renderDuePaymentsList();
            renderPaymentsList();
            populateInvoicePaymentSelect(); // Refresh payment invoice dropdown
        } else if (screenId === 'statement') {
            populatePartyDatalist(partyNameListStatement);
        } else if (screenId === 'dashboard') {
            // Defer chart rendering slightly to ensure canvas is visible
            setTimeout(renderDashboardCharts, 50);
        } else if (screenId === 'settings') {
            loadSettingsIntoForm(); // Load current settings into the form
        }
    };

    // --- Datalist Population ---
    const populateDatalists = () => {
        populateItemCodeDatalist();
        populatePartyDatalist(partyNameListInvoice);
        populatePartyDatalist(partyNameListStatement);
    };

    const populateItemCodeDatalist = () => {
        if (!itemCodeList) return;
        itemCodeList.innerHTML = ''; // Clear existing options
        inventory.forEach(item => {
            const option = document.createElement('option');
            option.value = item.code;
            option.textContent = `${item.name} (${item.category})`;
            itemCodeList.appendChild(option);
        });
    };

    const populatePartyDatalist = (datalistElement) => {
        if (!datalistElement) return;
        datalistElement.innerHTML = ''; // Clear existing
        const partyNames = new Set();

        invoices.forEach(inv => partyNames.add(inv.partyName));
        payments.forEach(pay => {
            if (pay.partyName) partyNames.add(pay.partyName);
        });

        Array.from(partyNames).sort().forEach(name => {
             if (name && name.trim() !== '') { // Avoid adding empty names
                const option = document.createElement('option');
                option.value = name;
                datalistElement.appendChild(option);
             }
        });
    };

     // Populate the select dropdown for linking payments to invoices
     const populateInvoicePaymentSelect = () => {
        if (!paymentInvoiceSelect || !invoiceBalanceInfoSpan) return;
        paymentInvoiceSelect.innerHTML = '<option value="">-- Select Invoice --</option>'; // Clear and add default
        invoiceBalanceInfoSpan.textContent = ''; // Clear balance info

        // Get unpaid or partially paid CUSTOMER invoices only
        const dueInvoices = invoices.filter(inv =>
            inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')
        ).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort recent first

        dueInvoices.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            const amountDue = calculateInvoiceBalance(inv.id);
            option.textContent = `Inv #${inv.id} - ${inv.partyName} (Due: ${formatCurrency(amountDue)})`;
            option.dataset.balance = amountDue; // Store balance for easy access
             option.dataset.partyName = inv.partyName; // Store party name
            paymentInvoiceSelect.appendChild(option);
        });
    };


    // --- Chart Rendering ---
    const prepareChartData = () => {
        const monthlySales = {}; // { 'YYYY-MM': amount }
        const annualSales = {}; // { 'YYYY': amount }
        const stockByCategory = {}; // { 'Category': quantity }
        const currentYear = new Date().getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Process Invoices for Sales Data
        invoices.forEach(inv => {
            if (inv.type === 'customer') { // Only count customer invoices for sales
                try {
                     if (!inv.date || isNaN(new Date(inv.date).getTime())) {
                         console.warn(`Invalid date found in invoice #${inv.id}, skipping for charts.`);
                         return; // Skip this invoice
                     }
                    const date = new Date(inv.date);
                    const year = date.getFullYear();
                    const month = date.getMonth(); // 0-11
                    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
                    const amount = parseFloat(inv.totalAmount || 0);

                    // Monthly Sales (Current Year Only)
                    if (year === currentYear) {
                        monthlySales[yearMonth] = (monthlySales[yearMonth] || 0) + amount;
                    }

                    // Annual Sales
                    annualSales[year] = (annualSales[year] || 0) + amount;

                } catch (e) {
                    console.error("Error processing invoice date for charts:", inv, e);
                }
            }
        });

        // Process Stock Levels for Category Data
        inventory.forEach(item => {
            const stockInfo = stockLevels[item.code];
             const category = item.category || 'Uncategorized';
             // Ensure stockInfo exists and quantity is a valid number
             if (stockInfo && typeof stockInfo.quantity === 'number' && !isNaN(stockInfo.quantity) && stockInfo.quantity > 0) {
                 stockByCategory[category] = (stockByCategory[category] || 0) + stockInfo.quantity;
             } else if (!stockInfo && item.code) {
                  console.warn(`Stock level data missing for inventory item: ${item.code} (${item.name})`);
             }
        });

        // Prepare Monthly Sales Chart Data
        const monthlyLabels = monthNames;
        const monthlyData = Array(12).fill(0);
        Object.entries(monthlySales).forEach(([yearMonth, amount]) => {
            try {
                const monthIndex = parseInt(yearMonth.split('-')[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    monthlyData[monthIndex] = amount;
                }
            } catch (e) { console.error("Error parsing yearMonth:", yearMonth, e); }
        });

        // Prepare Annual Sales Chart Data
        const sortedYears = Object.keys(annualSales).sort();
        const annualLabels = sortedYears;
        const annualData = sortedYears.map(year => annualSales[year]);

         // Prepare Stock Category Chart Data
         const categoryLabels = Object.keys(stockByCategory).filter(cat => stockByCategory[cat] > 0); // Only show categories with stock > 0
         const categoryData = categoryLabels.map(cat => stockByCategory[cat]);

        return {
            monthly: { labels: monthlyLabels, data: monthlyData },
            annual: { labels: annualLabels, data: annualData },
            stock: { labels: categoryLabels, data: categoryData }
        };
    };

    const renderDashboardCharts = () => {
         const monthlyCanvas = document.getElementById('monthlySalesChart');
         const annualCanvas = document.getElementById('annualSalesChart');
         const stockCanvas = document.getElementById('stockCategoryChart');

         if (!monthlyCanvas || !annualCanvas || !stockCanvas) {
             console.error("One or more chart canvas elements not found.");
             return;
         }

         if (typeof Chart === 'undefined') {
             console.error("Chart.js is not loaded!");
             showMessage(document.getElementById('monthlySalesChartMsg'), "Charting library not loaded.", "error");
             showMessage(document.getElementById('annualSalesChartMsg'), "Charting library not loaded.", "error");
             showMessage(document.getElementById('stockCategoryChartMsg'), "Charting library not loaded.", "error");
             return;
         }

         try {
             const chartData = prepareChartData();
             renderMonthlySalesChart(chartData.monthly);
             renderAnnualSalesChart(chartData.annual);
             renderStockCategoryChart(chartData.stock);
         } catch (error) {
              console.error("Error preparing or rendering charts:", error);
              showMessage(document.getElementById('monthlySalesChartMsg'), "Error displaying chart data.", "error");
              showMessage(document.getElementById('annualSalesChartMsg'), "Error displaying chart data.", "error");
              showMessage(document.getElementById('stockCategoryChartMsg'), "Error displaying chart data.", "error");
         }
    };

    const renderMonthlySalesChart = ({ labels, data }) => {
        const canvas = document.getElementById('monthlySalesChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const msgElement = document.getElementById('monthlySalesChartMsg');
        hideMessage(msgElement); // Clear previous messages

        if (monthlySalesChartInstance) {
            monthlySalesChartInstance.destroy(); // Destroy existing chart before creating new
        }

        if (data.every(val => val === 0)) {
            showMessage(msgElement, "No sales data available for the current year.", "info");
            return;
        }


        monthlySalesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Sales',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                 responsive: true,
                 maintainAspectRatio: false, // Allow chart to fill container better
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return formatCurrency(value); }
                        }
                    }
                },
                 plugins: {
                    tooltip: {
                        callbacks: {
                             label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                             }
                        }
                    },
                    legend: { display: false } // Hide legend for single dataset
                }
            }
        });
    };

     const renderAnnualSalesChart = ({ labels, data }) => {
         const canvas = document.getElementById('annualSalesChart');
         if (!canvas) return;
        const ctx = canvas.getContext('2d');
         const msgElement = document.getElementById('annualSalesChartMsg');
         hideMessage(msgElement);

        if (annualSalesChartInstance) {
            annualSalesChartInstance.destroy();
        }

         if (data.length === 0) {
            showMessage(msgElement, "No sales data available.", "info");
            return;
        }

        annualSalesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Annual Sales',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)', // Teal
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                 responsive: true,
                 maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                         ticks: {
                            callback: function(value) { return formatCurrency(value); }
                        }
                    }
                },
                plugins: {
                     tooltip: {
                        callbacks: {
                             label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                             }
                        }
                    },
                    legend: { display: false }
                }
            }
        });
    };

     const renderStockCategoryChart = ({ labels, data }) => {
         const canvas = document.getElementById('stockCategoryChart');
         if (!canvas) return;
        const ctx = canvas.getContext('2d');
         const msgElement = document.getElementById('stockCategoryChartMsg');
         hideMessage(msgElement);


        if (stockCategoryChartInstance) {
            stockCategoryChartInstance.destroy();
        }

         if (data.length === 0) {
            showMessage(msgElement, "No stock data available.", "info");
            return;
        }

         // Define more colors if needed
         const backgroundColors = [
             'rgba(255, 99, 132, 0.7)', // Red
             'rgba(54, 162, 235, 0.7)', // Blue
             'rgba(255, 206, 86, 0.7)', // Yellow
             'rgba(75, 192, 192, 0.7)', // Teal
             'rgba(153, 102, 255, 0.7)', // Purple
             'rgba(255, 159, 64, 0.7)',  // Orange
             'rgba(100, 180, 120, 0.7)', // Greenish
             'rgba(210, 110, 190, 0.7)'  // Pinkish
         ];
          const borderColors = backgroundColors.map(color => color.replace('0.7', '1')); // Darker border

        stockCategoryChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Stock Quantity',
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length),
                    borderColor: borderColors.slice(0, data.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                         callbacks: {
                             label: function(context) {
                                let label = context.label || '';
                                let value = context.parsed || 0;
                                let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                let percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                return `${label}: ${value} (${percentage})`;
                             }
                        }
                    }
                }
            }
        });
    };


    // --- Invoice Management ---
    const clearInvoiceForm = () => {
        invoiceForm.reset();
        document.getElementById('invoice-id').value = '';
        invoiceItemsContainer.innerHTML = '';
        invoiceTotalSpan.textContent = '0.00';
        document.getElementById('invoice-payment-status').value = 'Unpaid'; // Reset status
         document.getElementById('invoice-payment-status-supplier').value = 'Unpaid';
         try {
             document.getElementById('invoice-date').valueAsDate = new Date(); // Default to today
         } catch (e) {
              document.getElementById('invoice-date').value = formatDate(new Date().toISOString());
         }
        document.getElementById('invoice-due-date').value = '';
        invoiceImagePathSpan.textContent = ''; // Clear image path display
        document.getElementById('invoice-image').value = null; // Clear file input

        // Add one empty item row to start
        addInvoiceItemRow();
        updateInvoiceTotal();
        hideMessage(invoiceMessage);
        // Reset type specific fields
        invoiceTypeSelect.dispatchEvent(new Event('change')); // Trigger change to reset visibility
        document.getElementById('invoice-form-title').textContent = 'Create New Invoice';
    };

    const addInvoiceItemRow = (item = { itemCode: '', description: '', quantity: 1, unitPrice: '' }) => {
        const itemRow = document.createElement('div');
        itemRow.classList.add('invoice-item-row');

        // Find item name and default price from inventory based on itemCode
        let itemName = item.description || ''; // Default to existing description
        let defaultPrice = item.unitPrice || '';
        if (item.itemCode) {
            const inventoryItem = inventory.find(i => i.code === item.itemCode);
             if (inventoryItem) {
                 // If description is empty or matches the item code, use the item name
                 if (!itemName || itemName === item.itemCode) {
                     itemName = inventoryItem.name || '';
                 }
             }
        }


        itemRow.innerHTML = `
            <input type="text" list="item-code-list" class="item-code" placeholder="Item Code" value="${item.itemCode || ''}" required>
            <input type="text" class="item-description" placeholder="Description" value="${itemName}" required>
            <input type="number" class="item-quantity" placeholder="Qty" value="${item.quantity || 1}" min="0" step="any" required>
            <input type="number" class="item-unit-price" placeholder="Unit Price" value="${item.unitPrice || ''}" min="0" step="0.01" required>
            <span>Subtotal: <span class="item-subtotal">0.00</span></span>
            <button type="button" class="remove-item-button">X</button>
        `;

        itemRow.querySelector('.remove-item-button').addEventListener('click', () => {
             if (invoiceItemsContainer.children.length > 1) { // Prevent removing the last row
                 itemRow.remove();
                 updateInvoiceTotal();
             } else {
                 // Clear the fields of the last row instead of removing it
                 itemRow.querySelector('.item-code').value = '';
                 itemRow.querySelector('.item-description').value = '';
                 itemRow.querySelector('.item-quantity').value = 1;
                 itemRow.querySelector('.item-unit-price').value = '';
                 itemRow.querySelector('.item-subtotal').textContent = '0.00';
                 updateInvoiceTotal();
             }
        });

        // Update description and potentially price when item code changes
        itemRow.querySelector('.item-code').addEventListener('change', (e) => {
            const selectedCode = e.target.value;
            const descriptionInput = itemRow.querySelector('.item-description');
            const inventoryItem = inventory.find(i => i.code === selectedCode);
            if (inventoryItem) {
                descriptionInput.value = inventoryItem.name || ''; // Update description
            }
            updateItemSubtotal(itemRow); // Update subtotal even if no price changes
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
        updateItemSubtotal(itemRow); // Calculate initial subtotal
    };

    const updateItemSubtotal = (itemRow) => {
         const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(itemRow.querySelector('.item-unit-price').value) || 0;
        const subtotalSpan = itemRow.querySelector('.item-subtotal');
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

    // Validate invoice items before saving
     const validateInvoiceItems = () => {
         let isValid = true;
         let firstInvalidRow = null;
         invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
             const codeInput = row.querySelector('.item-code');
             const descInput = row.querySelector('.item-description');
             const qtyInput = row.querySelector('.item-quantity');
             const priceInput = row.querySelector('.item-unit-price');
             row.style.border = 'none'; // Reset border

             const quantity = parseFloat(qtyInput.value);
             const price = parseFloat(priceInput.value);


             // Check if required fields are filled and numbers are valid
             if (!codeInput.value.trim() || !descInput.value.trim() ||
                 isNaN(quantity) || quantity <= 0 || // Ensure quantity is positive
                 isNaN(price) || price < 0) // Allow zero price, but not negative
             {
                 isValid = false;
                  row.style.border = '1px solid red'; // Highlight invalid row
                  if (!firstInvalidRow) firstInvalidRow = row;
             }
         });
          if (!isValid && firstInvalidRow) {
              firstInvalidRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
               showMessage(invoiceMessage, 'Please fill in all fields correctly for each invoice item (Code, Description, valid positive Qty, valid Price).', 'error');
           } else if (invoiceItemsContainer.children.length === 0) {
               isValid = false;
               showMessage(invoiceMessage, 'Invoice must contain at least one item.', 'error');
           }
           else {
               hideMessage(invoiceMessage); // Clear message if now valid
           }
         return isValid;
     };


    const handleInvoiceFormSubmit = async (e) => {
        e.preventDefault();


        if (!validateInvoiceItems()) {
            return; // Stop submission if items are invalid
        }
         showLoading(); // Show loading only after validation passes

        const invoiceId = document.getElementById('invoice-id').value;
        const invoiceType = invoiceTypeSelect.value;
        const partyName = document.getElementById('invoice-party-name').value.trim();
        const date = document.getElementById('invoice-date').value;
        const dueDate = document.getElementById('invoice-due-date').value; // Might be empty for supplier
        const supplierInvoiceNumber = document.getElementById('invoice-number-supplier').value.trim(); // Supplier specific
        const imageFile = document.getElementById('invoice-image').files[0];
        const transactionType = document.getElementById('invoice-transaction-type').value; // Customer default


        let imageDataUrl = null;
        if (imageFile) {
             try {
                imageDataUrl = await readFileAsDataURL(imageFile);
            } catch (error) {
                console.error("Error reading image file:", error);
                showMessage(invoiceMessage, 'Error processing image file.', 'error');
                hideLoading();
                return;
            }
        } else {
             // If editing, check if there was an existing image data and retain it if no new file uploaded
              if (invoiceId) {
                   const existingInvoice = invoices.find(inv => inv.id === parseInt(invoiceId, 10));
                   if (existingInvoice && existingInvoice.imageDataUrl) {
                       imageDataUrl = existingInvoice.imageDataUrl;
                   }
              }
         }


        const items = [];
        invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
            const itemCode = row.querySelector('.item-code').value.trim();
             const description = row.querySelector('.item-description').value.trim(); // Get description
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
             // Re-validate just in case, although validateInvoiceItems should catch this
             if (itemCode && description && quantity > 0 && unitPrice >= 0) {
                items.push({ itemCode, description, quantity, unitPrice });
             }
        });

         if (items.length === 0) {
            showMessage(invoiceMessage, 'Invoice must contain at least one valid item.', 'error');
            hideLoading();
            return;
         }

        const totalAmount = parseFloat(invoiceTotalSpan.textContent) || 0;

        // Find existing invoice data if editing
         const existingInvoice = invoiceId ? invoices.find(inv => inv.id === parseInt(invoiceId, 10)) : null;

        const invoiceData = {
            id: existingInvoice ? existingInvoice.id : nextInvoiceId,
            type: invoiceType,
            partyName: partyName,
            date: date,
            totalAmount: totalAmount,
            items: items,
             // Preserve existing status/payments if editing, set defaults if new
            paymentStatus: existingInvoice ? existingInvoice.paymentStatus : (invoiceType === 'customer' ? 'Unpaid' : 'Unpaid'),
             payments: existingInvoice ? existingInvoice.payments || [] : [],
            imageDataUrl: imageDataUrl, // Add image data
            lastUpdated: getCurrentTimestamp()
        };

         // Add type-specific fields
         if (invoiceType === 'customer') {
             invoiceData.dueDate = dueDate;
             invoiceData.defaultTransactionType = transactionType;
             // Make sure payment status is set correctly even if editing (it's disabled, so read it)
             if (existingInvoice) invoiceData.paymentStatus = document.getElementById('invoice-payment-status').value;


         } else { // Supplier
             invoiceData.supplierInvoiceNumber = supplierInvoiceNumber;
             // Make sure payment status is set correctly even if editing (it's disabled, so read it)
              if (existingInvoice) invoiceData.paymentStatus = document.getElementById('invoice-payment-status-supplier').value;
         }


        // Update or add invoice
        if (existingInvoice) {
            // Update existing invoice
            const index = invoices.findIndex(inv => inv.id === existingInvoice.id);
            if (index > -1) {
                 const previousItems = invoices[index].items; // Get previous items *before* overwriting
                invoices[index] = invoiceData; // Overwrite with new data
                 // Update stock levels based on changes
                 updateStockOnInvoiceEdit(previousItems, invoiceData.items, invoiceData.type);
            }
        } else {
            // Add new invoice
            invoices.push(invoiceData);
            nextInvoiceId++;
            // Update stock levels for the new invoice
            updateStockOnInvoiceSave(invoiceData.items, invoiceData.type);
        }

        saveData(); // Save data after stock updates
        showMessage(invoiceMessage, `Invoice ${existingInvoice ? 'updated' : 'created'} successfully!`, 'success');
        createEditInvoiceSection.classList.add('hidden');
        renderInvoiceList();
        renderInventoryList(); // Update inventory list as stock might change
        renderDuePaymentsList(); // Update due payments list
        populateDatalists(); // Update party names datalist
         populateInvoicePaymentSelect(); // Update payment link dropdown
        hideLoading();
        clearInvoiceForm(); // Clear form after successful save
    };

    const editInvoice = (id) => {
        showLoading();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) {
            showMessage(invoiceMessage, `Invoice with ID ${id} not found.`, 'error');
            hideLoading();
            return;
        }

        document.getElementById('invoice-id').value = invoice.id;
        invoiceTypeSelect.value = invoice.type;
        document.getElementById('invoice-party-name').value = invoice.partyName;
        document.getElementById('invoice-date').value = formatDate(invoice.date); // Use formatDate
        document.getElementById('invoice-total').textContent = formatCurrency(invoice.totalAmount);
         // Display existing image info
         invoiceImagePathSpan.textContent = invoice.imageDataUrl ? 'Image previously uploaded' : '';
         document.getElementById('invoice-image').value = null; // Clear file input selector

        // Set type-specific fields
         invoiceTypeSelect.dispatchEvent(new Event('change')); // Trigger change to show/hide fields
         if (invoice.type === 'customer') {
             document.getElementById('invoice-due-date').value = formatDate(invoice.dueDate); // Use formatDate
             document.getElementById('invoice-payment-status').value = invoice.paymentStatus || 'Unpaid';
             document.getElementById('invoice-transaction-type').value = invoice.defaultTransactionType || 'Cash';
         } else {
             document.getElementById('invoice-number-supplier').value = invoice.supplierInvoiceNumber || '';
             document.getElementById('invoice-payment-status-supplier').value = invoice.paymentStatus || 'Unpaid';
         }


        invoiceItemsContainer.innerHTML = ''; // Clear existing items
        invoice.items.forEach(item => addInvoiceItemRow(item));
        updateInvoiceTotal(); // Recalculate total based on loaded items


        document.getElementById('invoice-form-title').textContent = `Edit Invoice #${invoice.id}`;
        createEditInvoiceSection.classList.remove('hidden');
         createEditInvoiceSection.scrollIntoView({ behavior: 'smooth' });
        hideLoading();
    };

    const deleteInvoice = (id) => {
        const invoiceIndex = invoices.findIndex(inv => inv.id === id);
         if (invoiceIndex === -1) {
             showMessage(invoiceMessage, `Invoice #${id} not found.`, 'error');
             return; // Exit if not found
         }

        if (!confirm(`Are you sure you want to delete Invoice #${id}? This will also attempt to reverse associated stock changes and unlink payments.`)) {
            return;
        }
        showLoading();

            const invoiceToDelete = invoices[invoiceIndex];

            // Reverse stock changes before deleting
            reverseStockOnInvoiceDelete(invoiceToDelete.items, invoiceToDelete.type);

            invoices.splice(invoiceIndex, 1);

             // Unlink related payments
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
            renderInventoryList(); // Update inventory list as stock changed
             if (paymentsChanged) renderPaymentsList(); // Update payments if they were unlinked
             renderDuePaymentsList(); // Update due payments
             populateInvoicePaymentSelect(); // Update payment link dropdown
        hideLoading();
    };

    // --- Stock Level Adjustments based on Invoices ---

    // Called when a NEW invoice is SAVED
    const updateStockOnInvoiceSave = (items, invoiceType) => {
        items.forEach(item => {
             const stockItem = stockLevels[item.code];
            if (stockItem) {
                 const quantityChange = parseFloat(item.quantity || 0);
                 const unitPrice = parseFloat(item.unitPrice || 0); // Price from the invoice item
                 const amountChange = quantityChange * unitPrice;

                if (invoiceType === 'customer') {
                    stockItem.quantity -= quantityChange; // Decrease stock for sales
                     stockItem.revenue = (stockItem.revenue || 0) + amountChange;
                } else if (invoiceType === 'supplier') {
                     stockItem.quantity += quantityChange; // Increase stock for purchases
                      stockItem.cost = (stockItem.cost || 0) + amountChange; // Add cost based on this purchase price
                     // Recalculate average unit cost
                      stockItem.unitCost = stockItem.quantity > 0 ? (stockItem.cost / stockItem.quantity) : 0;
                }
                 stockItem.lastUpdated = getCurrentTimestamp();
            } else {
                console.warn(`Stock item ${item.itemCode} not found during invoice save.`);
            }
        });
        renderLowStockList(); // Update low stock list after changes
    };

     // Called when an EXISTING invoice is EDITED and SAVED
     const updateStockOnInvoiceEdit = (previousItems, currentItems, invoiceType) => {
         // Create maps for easy lookup { itemCode: itemObject }
         const prevItemMap = new Map(previousItems.map(item => [item.itemCode, item]));
         const currentItemMap = new Map(currentItems.map(item => [item.itemCode, item]));

         // Get all unique item codes involved in the change
         const allItemCodes = new Set([...previousItems.map(i => i.itemCode), ...currentItems.map(i => i.itemCode)]);

         allItemCodes.forEach(itemCode => {
             const prevItem = prevItemMap.get(itemCode);
             const currentItem = currentItemMap.get(itemCode);
             const stockItem = stockLevels[itemCode];

             if (!stockItem) {
                 console.warn(`Stock item ${itemCode} not found during invoice edit.`);
                 return; // Skip if stock definition is missing
             }

             const prevQuantity = prevItem ? parseFloat(prevItem.quantity || 0) : 0;
             const currentQuantity = currentItem ? parseFloat(currentItem.quantity || 0) : 0;
              const quantityDifference = currentQuantity - prevQuantity; // Positive if qty increased, negative if decreased

             const prevUnitPrice = prevItem ? parseFloat(prevItem.unitPrice || 0) : 0;
             const currentUnitPrice = currentItem ? parseFloat(currentItem.unitPrice || 0) : 0;

              const prevAmount = prevQuantity * prevUnitPrice;
              const currentAmount = currentQuantity * currentUnitPrice;
              const amountDifference = currentAmount - prevAmount;


             if (invoiceType === 'customer') {
                  // Adjust Quantity: Stock decreases with sales.
                  // If quantityDifference is positive (more sold), decrease stock more.
                  // If quantityDifference is negative (less sold), increase stock.
                 stockItem.quantity -= quantityDifference;

                  // Adjust Revenue: Add the difference in total amount for this item.
                 stockItem.revenue = (stockItem.revenue || 0) + amountDifference;

             } else if (invoiceType === 'supplier') {
                 // Adjust Quantity: Stock increases with purchases.
                  // If quantityDifference is positive (more bought), increase stock more.
                  // If quantityDifference is negative (less bought), decrease stock.
                 stockItem.quantity += quantityDifference;

                  // Adjust Cost: Add the difference in total amount for this item.
                 stockItem.cost = (stockItem.cost || 0) + amountDifference;

                  // Recalculate average unit cost based on new total cost and quantity
                 stockItem.unitCost = stockItem.quantity > 0 ? (stockItem.cost / stockItem.quantity) : 0;
             }
             stockItem.lastUpdated = getCurrentTimestamp();
         });
          renderLowStockList(); // Update low stock list after changes
     };


    // Called when an invoice is DELETED
     const reverseStockOnInvoiceDelete = (items, invoiceType) => {
         items.forEach(item => {
             const stockItem = stockLevels[item.code];
             if (stockItem) {
                 const quantityChange = parseFloat(item.quantity || 0);
                  const amountChange = quantityChange * parseFloat(item.unitPrice || 0);

                 if (invoiceType === 'customer') {
                     stockItem.quantity += quantityChange; // Add back stock from sale reversal
                      stockItem.revenue = (stockItem.revenue || 0) - amountChange; // Remove revenue
                 } else if (invoiceType === 'supplier') {
                     stockItem.quantity -= quantityChange; // Remove stock from purchase reversal
                      stockItem.cost = (stockItem.cost || 0) - amountChange; // Remove cost
                     // Recalculate average unit cost after removing cost and quantity
                      stockItem.unitCost = stockItem.quantity > 0 ? (stockItem.cost / stockItem.quantity) : 0;
                 }
                  stockItem.lastUpdated = getCurrentTimestamp();
                  // Ensure values don't go unexpectedly negative due to reversal issues
                  if (stockItem.revenue < 0) stockItem.revenue = 0;
                   if (stockItem.cost < 0) stockItem.cost = 0;
                   if (stockItem.quantity < 0 && invoiceType === 'supplier') {
                        console.warn(`Stock quantity for ${item.code} went negative after supplier invoice delete reversal.`);
                        // Optional: Clamp to 0? stockItem.quantity = 0;
                   }

             } else {
                 console.warn(`Stock item ${item.itemCode} not found during invoice delete reversal.`);
             }
         });
          renderLowStockList(); // Update low stock list after changes
     };


    // --- Invoice List Rendering ---
    const renderInvoiceList = () => {
        const invoiceListBody = document.getElementById('invoices-list');
        if (!invoiceListBody) return;
        invoiceListBody.innerHTML = ''; // Clear list
        showLoading();

         const filter = invoiceListFilter.value;
         let filteredInvoices = invoices;

         if (filter === 'customer') {
             filteredInvoices = invoices.filter(inv => inv.type === 'customer');
         } else if (filter === 'supplier') {
             filteredInvoices = invoices.filter(inv => inv.type === 'supplier');
         } else if (filter === 'unpaid_partial') {
             filteredInvoices = invoices.filter(inv => inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial'));
         }
         // else 'all' - no filtering

        // Sort by date descending (most recent first)
         filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredInvoices.length === 0) {
            invoiceListBody.innerHTML = '<tr class="no-results"><td colspan="7">No invoices found.</td></tr>';
            hideLoading();
            return;
        }

        filteredInvoices.forEach(invoice => {
            const row = invoiceListBody.insertRow();
             let statusClass = '';
             switch (invoice.paymentStatus) {
                 case 'Paid': statusClass = 'status-paid'; break;
                 case 'Partial': statusClass = 'status-partial'; break;
                 case 'Unpaid': statusClass = 'status-unpaid'; break;
                 default: statusClass = ''; // Handle potential null/undefined status
             }

            row.innerHTML = `
                <td>${invoice.id}</td>
                <td>${invoice.type.charAt(0).toUpperCase() + invoice.type.slice(1)}</td>
                <td>${invoice.partyName || 'N/A'}</td>
                <td>${formatDate(invoice.date)}</td>
                <td>${formatCurrency(invoice.totalAmount)}</td>
                <td class="${statusClass}">${invoice.paymentStatus || 'N/A'}</td>
                <td>
                    <button class="edit-invoice-button" data-id="${invoice.id}">Edit</button>
                    <button class="delete-invoice-button" data-id="${invoice.id}">Delete</button>
                    <button class="pdf-invoice-button" data-id="${invoice.id}">PDF</button>
                    ${invoice.type === 'customer' ? `<button class="receipt-print-button" data-id="${invoice.id}">Receipt</button>` : ''}
                     ${invoice.type === 'customer' && (invoice.paymentStatus === 'Unpaid' || invoice.paymentStatus === 'Partial') ? `<button class="pay-now-button" data-id="${invoice.id}">Pay Now</button>` : ''}
                </td>
            `;

            // Add event listeners to buttons in the row
             row.querySelector('.edit-invoice-button')?.addEventListener('click', (e) => editInvoice(parseInt(e.target.dataset.id)));
            row.querySelector('.delete-invoice-button')?.addEventListener('click', (e) => deleteInvoice(parseInt(e.target.dataset.id)));
            row.querySelector('.pdf-invoice-button')?.addEventListener('click', (e) => generateInvoicePDF(parseInt(e.target.dataset.id)));
             row.querySelector('.receipt-print-button')?.addEventListener('click', (e) => generateReceipt(parseInt(e.target.dataset.id), 'print')); // Add receipt print
             row.querySelector('.pay-now-button')?.addEventListener('click', (e) => triggerPayNow(parseInt(e.target.dataset.id))); // Add pay now
        });
        hideLoading();
    };

     // Function to trigger the "Pay Now" action - switch to payment screen and prefill
     const triggerPayNow = (invoiceId) => {
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice) return;

         // Switch to Payments screen
         showScreen('payments');

         // Pre-fill the payment form
         clearPaymentForm(); // Clear previous entries first
         document.getElementById('payment-date').valueAsDate = new Date();
         paymentInvoiceLinkCheck.checked = true; // Check the link invoice box
         paymentInvoiceLinkRow.classList.remove('hidden'); // Show the dropdown row
         paymentPartyRow.classList.add('hidden'); // Hide the manual party row

         // Select the correct invoice in the dropdown
         paymentInvoiceSelect.value = invoiceId;
         // Trigger change event to update balance info and potentially party name
         paymentInvoiceSelect.dispatchEvent(new Event('change'));

         // Prefill amount with remaining balance
         const amountDue = calculateInvoiceBalance(invoiceId);
          document.getElementById('payment-amount').value = formatCurrency(amountDue > 0 ? amountDue : 0); // Don't prefill negative


         // Optional: Focus on the amount field
         document.getElementById('payment-amount').focus();
          document.getElementById('payment-amount').select(); // Select text for easy replacement

         // Scroll payment form into view
          document.getElementById('payment-entry-section').scrollIntoView({ behavior: 'smooth' });

     };


    // --- Inventory Management ---
    const generateItemCode = (itemName, category) => {
        const namePart = (itemName || 'XXX').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
        const catPart = (category || 'XX').substring(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, 'X');;
        let counter = 1;
        let potentialCode;
        do {
            potentialCode = `${namePart}${catPart}${String(counter).padStart(3, '0')}`;
            counter++;
            // Add a safety break for extremely unlikely infinite loops
            if (counter > 9999) {
                 potentialCode = `ERR${Date.now()}`; // Fallback code
                 console.error("Could not generate unique item code, using fallback.");
                 break;
            }
        } while (inventory.some(item => item.code === potentialCode) || stockLevels[potentialCode]); // Check both inventory defs and stock levels

        return potentialCode;
    };

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

        // Generate unique item code
        const newItemCode = generateItemCode(name, category);

        // Check if item *name* already exists (optional, for user convenience)
        if (inventory.some(item => item.name.toLowerCase() === name.toLowerCase())) {
             if (!confirm(`An item named "${name}" already exists. Do you want to add another one with code ${newItemCode}?`)) {
                 hideLoading();
                 return;
             }
        }


        const newItem = {
            code: newItemCode,
            name: name,
            category: category,
            description: description
        };

        inventory.push(newItem);
         // Initialize stock level for the new item
         stockLevels[newItemCode] = { quantity: 0, unitCost: 0, lastUpdated: getCurrentTimestamp(), revenue: 0, cost: 0 };

        saveData();
         showMessage(generatedItemCodeMessage, `Item type "${name}" added successfully with code: ${newItemCode}`, 'success');
         generatedItemCodeMessage.style.display = 'block'; // Ensure message is visible

        addItemForm.reset(); // Clear the form
        addItemSection.classList.add('hidden'); // Hide the form
        populateItemCodeDatalist(); // Update datalist for invoices
        renderInventoryList(); // Refresh the main inventory list
         renderLowStockList(); // Update low stock just in case (though new item is 0)
        hideLoading();
    };

    // --- Inventory List Rendering ---
    const renderInventoryList = (searchTerm = '') => {
        if (!inventoryListBody) return;
        inventoryListBody.innerHTML = ''; // Clear list
        showLoading();

        const lowerSearchTerm = searchTerm.toLowerCase();

        // Filter inventory definitions first
        const filteredInventory = inventory.filter(item =>
            item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.code.toLowerCase().includes(lowerSearchTerm) ||
            item.category.toLowerCase().includes(lowerSearchTerm)
        );

         // Sort by name
         filteredInventory.sort((a, b) => a.name.localeCompare(b.name));


        if (filteredInventory.length === 0 && !searchTerm) {
             inventoryListBody.innerHTML = '<tr class="no-results"><td colspan="8">No inventory items defined. Add items using the button above.</td></tr>';
        } else if (filteredInventory.length === 0 && searchTerm) {
             inventoryListBody.innerHTML = `<tr class="no-results"><td colspan="8">No items found matching "${searchTerm}".</td></tr>`;
        } else {
            filteredInventory.forEach(item => {
                 // Ensure stock level exists, create if missing (defensive programming)
                 if (!stockLevels[item.code]) {
                      console.warn(`Creating missing stock level entry for ${item.code}`);
                     stockLevels[item.code] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                 }
                 const stock = stockLevels[item.code];
                 const profitLoss = (stock.revenue || 0) - (stock.cost || 0);
                 let profitLossClass = 'profit-zero';
                 let profitLossText = formatCurrency(profitLoss);

                 // Exclude non-stock categories from P/L calculation display
                 if (['Accommodation', 'Service'].includes(item.category)) {
                     profitLossClass = 'profit-na';
                     profitLossText = 'N/A';
                 } else if (profitLoss > 0) {
                    profitLossClass = 'profit-positive';
                 } else if (profitLoss < 0) {
                     profitLossClass = 'profit-negative';
                 }


                 const row = inventoryListBody.insertRow();
                 row.innerHTML = `
                    <td>${item.code}</td>
                    <td>${item.name} ${item.description ? '<small>(' + item.description + ')</small>' : ''} <br><small><em>${item.category}</em></small></td>
                    <td style="${(stock.quantity <= 0 && !['Accommodation', 'Service'].includes(item.category)) ? 'color: red;' : ''}">${formatCurrency(stock.quantity)}</td>
                    <td>${formatCurrency(stock.unitCost)}</td>
                    <td>${formatCurrency(stock.revenue)}</td>
                    <td>${formatCurrency(stock.cost)}</td>
                    <td class="${profitLossClass}">${profitLossText}</td>
                    <td>${stock.lastUpdated ? formatDate(stock.lastUpdated) : 'N/A'}</td>
                 `;
            });
        }
        hideLoading();
    };

     // --- Low Stock List ---
     const renderLowStockList = () => {
         if (!lowStockListBody || !lowStockSection || !downloadLowStockPdfButton) return;
         lowStockListBody.innerHTML = ''; // Clear list
         let lowStockItems = [];

         inventory.forEach(item => {
              // Exclude non-stock types like Accommodation/Service from low stock report
             if (['Accommodation', 'Service'].includes(item.category)) {
                 return; // Skip to next item
             }

             const stock = stockLevels[item.code];
             // Ensure stock exists and quantity is valid before checking
             if (stock && typeof stock.quantity === 'number' && !isNaN(stock.quantity) && stock.quantity <= 0) {
                  lowStockItems.push({
                      code: item.code,
                      name: item.name,
                      quantity: stock.quantity
                  });
             }
         });

         // Sort by quantity (most negative first) then by name
         lowStockItems.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));


         if (lowStockItems.length > 0) {
             lowStockItems.forEach(item => {
                 const row = lowStockListBody.insertRow();
                 row.innerHTML = `
                     <td>${item.code}</td>
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

    // --- Export Inventory ---
    const exportInventory = (format) => {
        showLoading();
        try {
            const dataToExport = inventory.map(item => {
                 const stock = stockLevels[item.code] || { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                 return {
                    ItemCode: item.code,
                    ItemName: item.name,
                     Category: item.category,
                     Description: item.description || '',
                    QuantityOnHand: stock.quantity || 0,
                     UnitCost: stock.unitCost || 0,
                     TotalRevenue: stock.revenue || 0,
                     TotalCost: stock.cost || 0,
                     ProfitLoss: (stock.revenue || 0) - (stock.cost || 0),
                     LastUpdated: stock.lastUpdated ? formatDate(stock.lastUpdated) : ''
                 };
            });

             if (dataToExport.length === 0) {
                showMessage(inventoryMessage, "No inventory data to export.", "info");
                hideLoading();
                return;
             }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filenameBase = `inventory_export_${timestamp}`;

            if (format === 'json') {
                const jsonString = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                triggerDownload(blob, `${filenameBase}.json`);
                showMessage(inventoryMessage, "Inventory exported as JSON.", "success");

            } else if (format === 'csv') {
                const headers = Object.keys(dataToExport[0]);
                const csvRows = [headers.join(',')]; // Header row

                 dataToExport.forEach(row => {
                     const values = headers.map(header => {
                        const value = row[header] === null || row[header] === undefined ? '' : row[header]; // Handle null/undefined
                        const escaped = ('' + value).replace(/"/g, '""'); // Escape double quotes
                         return `"${escaped}"`; // Wrap in double quotes
                     });
                     csvRows.push(values.join(','));
                 });

                const csvString = csvRows.join('\r\n');
                 const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
                 triggerDownload(blob, `${filenameBase}.csv`);
                 showMessage(inventoryMessage, "Inventory exported as CSV.", "success");
            }
        } catch (error) {
             console.error("Error exporting inventory:", error);
             showMessage(inventoryMessage, `Error exporting inventory: ${error.message}`, "error");
        } finally {
             hideLoading();
        }
    };

    // Helper function to trigger file download
     const triggerDownload = (blob, filename) => {
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
     };


    // --- Payment Management ---
    const clearPaymentForm = () => {
        paymentForm.reset();
        document.getElementById('payment-id').value = '';
        try {
             document.getElementById('payment-date').valueAsDate = new Date(); // Default to today
        } catch(e) {
              document.getElementById('payment-date').value = formatDate(new Date().toISOString());
        }
         paymentInvoiceLinkCheck.checked = false; // Uncheck link box
         paymentInvoiceLinkRow.classList.add('hidden'); // Hide dropdown
         paymentPartyRow.classList.remove('hidden'); // Show manual party input
        invoiceBalanceInfoSpan.textContent = ''; // Clear balance info
         hideMessage(paymentsMessage);
    };

    const calculateInvoiceBalance = (invoiceId) => {
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice) return 0;

         const totalPaid = payments
             .filter(p => p.linkedInvoiceId === invoiceId)
             .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

         return (parseFloat(invoice.totalAmount || 0) - totalPaid);
     };

     const updateInvoicePaymentStatus = (invoiceId) => {
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice || invoice.type !== 'customer') return false; // Only update customer invoices, return bool indicating change

         const totalPaid = payments
             .filter(p => p.linkedInvoiceId === invoiceId)
             .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

         const totalAmount = parseFloat(invoice.totalAmount || 0);
         const oldStatus = invoice.paymentStatus;
         let newStatus;

         if (totalPaid <= 0) {
             newStatus = 'Unpaid';
         } else if (totalPaid < totalAmount - 0.001) { // Use small tolerance for floating point
             newStatus = 'Partial';
         } else { // totalPaid >= totalAmount
             newStatus = 'Paid';
         }

         if (oldStatus !== newStatus) {
             invoice.paymentStatus = newStatus;
             invoice.lastUpdated = getCurrentTimestamp();
             console.log(`Updated status for Invoice #${invoiceId} to ${invoice.paymentStatus}`);
             return true; // Status changed
         }
         return false; // Status did not change
     };

     // Update supplier invoice status (simpler: Paid or Unpaid)
     const updateSupplierInvoicePaymentStatus = (invoiceId) => {
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice || invoice.type !== 'supplier') return false;

         const totalPaid = payments
             .filter(p => p.linkedInvoiceId === invoiceId)
             .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

         const oldStatus = invoice.paymentStatus;
         const newStatus = totalPaid > 0 ? 'Paid' : 'Unpaid';

         if (oldStatus !== newStatus) {
             invoice.paymentStatus = newStatus;
             invoice.lastUpdated = getCurrentTimestamp();
             console.log(`Updated status for Supplier Invoice #${invoiceId} to ${invoice.paymentStatus}`);
             return true; // Status changed
         }
          return false; // Status did not change
     };

    const handlePaymentFormSubmit = (e) => {
         e.preventDefault();
         showLoading();

         const paymentId = document.getElementById('payment-id').value;
         const date = document.getElementById('payment-date').value;
         const amount = parseFloat(document.getElementById('payment-amount').value);
         const method = document.getElementById('payment-method').value;
         const linkToInvoice = paymentInvoiceLinkCheck.checked;
         const linkedInvoiceId = linkToInvoice ? parseInt(paymentInvoiceSelect.value, 10) : null;
         const partyType = linkToInvoice ? 'customer' : paymentPartyType.value; // Infer party type if linking
         const partyName = linkToInvoice
             ? paymentInvoiceSelect.options[paymentInvoiceSelect.selectedIndex]?.dataset.partyName // Get from selected invoice
             : document.getElementById('payment-party-name').value.trim(); // Get from manual input
         const reference = document.getElementById('payment-reference').value.trim();
         const notes = document.getElementById('payment-notes').value.trim();

         // --- Validation ---
         if (isNaN(amount) || amount <= 0) {
             showMessage(paymentsMessage, 'Please enter a valid payment amount.', 'error');
             hideLoading();
             return;
         }
         if (linkToInvoice && !linkedInvoiceId) {
             showMessage(paymentsMessage, 'Please select an invoice to link the payment to.', 'error');
              hideLoading();
             return;
         }
         if (!linkToInvoice && !partyName) {
              showMessage(paymentsMessage, 'Please enter a Customer or Supplier name if not linking to an invoice.', 'error');
              hideLoading();
             return;
         }

         // Check if payment exceeds invoice balance when linking
         let invoiceBalance = 0;
         let associatedInvoice = null;
         if (linkToInvoice && linkedInvoiceId) {
             associatedInvoice = invoices.find(inv => inv.id === linkedInvoiceId);
             if (associatedInvoice) {
                 // Calculate balance *before* adding this potential new payment
                 const currentPaid = payments
                     .filter(p => p.linkedInvoiceId === linkedInvoiceId && (!paymentId || p.id !== parseInt(paymentId, 10))) // Exclude current payment if editing
                     .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                 invoiceBalance = parseFloat(associatedInvoice.totalAmount || 0) - currentPaid;

                 // Allow slight overpayment (e.g., rounding), but warn for large amounts
                 if (amount > invoiceBalance + 0.01) { // Allow 1 cent overpayment
                     if (!confirm(`Warning: Payment amount (${formatCurrency(amount)}) exceeds the remaining balance (${formatCurrency(invoiceBalance)}) for Invoice #${linkedInvoiceId}. Do you want to proceed?`)) {
                          hideLoading();
                         return;
                     }
                 }
             } else {
                  showMessage(paymentsMessage, `Selected invoice #${linkedInvoiceId} not found.`, 'error');
                  hideLoading();
                  return;
             }
         }

         // --- Create/Update Payment Object ---
         const paymentData = {
             id: paymentId ? parseInt(paymentId, 10) : nextPaymentId,
             date: date,
             amount: amount,
             method: method,
             linkedInvoiceId: linkedInvoiceId,
             partyType: partyType,
             partyName: partyName,
             reference: reference,
             notes: notes,
             lastUpdated: getCurrentTimestamp()
         };

         let invoiceStatusNeedsUpdate = false;
         let previousLinkedInvoiceId = null; // Track if the linked invoice changed during edit

         // --- Update or Add Payment ---
         if (paymentId) {
             // Update existing payment
             const index = payments.findIndex(p => p.id === parseInt(paymentId, 10));
             if (index > -1) {
                  previousLinkedInvoiceId = payments[index].linkedInvoiceId; // Store old linked ID before overwriting
                 payments[index] = paymentData;
             } else {
                  // Should not happen if UI is correct, but handle defensively
                  payments.push(paymentData); // Add if somehow missing
                   if (!paymentId) nextPaymentId++; // Increment only if it was truly new
             }
         } else {
             // Add new payment
             payments.push(paymentData);
             nextPaymentId++;
         }

         // --- Update Invoice Status(es) ---
         // Update status of the *newly* linked invoice (if any)
         if (paymentData.linkedInvoiceId) {
              const currentInvoice = invoices.find(inv => inv.id === paymentData.linkedInvoiceId);
               if (currentInvoice) {
                    const changed = currentInvoice.type === 'customer' ?
                       updateInvoicePaymentStatus(paymentData.linkedInvoiceId) :
                       updateSupplierInvoicePaymentStatus(paymentData.linkedInvoiceId);
                    if (changed) invoiceStatusNeedsUpdate = true;
               }
         }
         // If editing, and the payment was *previously* linked to a *different* invoice, update the old one too
         if (paymentId && previousLinkedInvoiceId && previousLinkedInvoiceId !== paymentData.linkedInvoiceId) {
              const prevInvoice = invoices.find(inv => inv.id === previousLinkedInvoiceId);
               if (prevInvoice) {
                   const changed = prevInvoice.type === 'customer' ?
                      updateInvoicePaymentStatus(previousLinkedInvoiceId) :
                      updateSupplierInvoicePaymentStatus(previousLinkedInvoiceId);
                    if (changed) invoiceStatusNeedsUpdate = true;
               }
         }


         // --- Save and Update UI ---
         saveData();
         showMessage(paymentsMessage, `Payment ${paymentId ? 'updated' : 'recorded'} successfully!`, 'success');
         clearPaymentForm();
         renderPaymentsList();
         if (invoiceStatusNeedsUpdate) {
            renderInvoiceList(); // Refresh invoice list if status changed
            renderDuePaymentsList(); // Refresh due list
         }
          populatePartyDatalist(partyNameListStatement); // Update datalists
          populateInvoicePaymentSelect(); // Refresh the payment link dropdown
         hideLoading();
     };

    const editPayment = (id) => {
         showLoading();
         const payment = payments.find(p => p.id === id);
         if (!payment) {
             showMessage(paymentsMessage, `Payment with ID ${id} not found.`, 'error');
             hideLoading();
             return;
         }

         document.getElementById('payment-id').value = payment.id;
         document.getElementById('payment-date').value = formatDate(payment.date);
         document.getElementById('payment-amount').value = payment.amount;
         document.getElementById('payment-method').value = payment.method;
         document.getElementById('payment-reference').value = payment.reference || '';
         document.getElementById('payment-notes').value = payment.notes || '';

         if (payment.linkedInvoiceId) {
              populateInvoicePaymentSelect(); // Ensure dropdown is populated before setting value
             paymentInvoiceLinkCheck.checked = true;
             paymentInvoiceLinkRow.classList.remove('hidden');
             paymentPartyRow.classList.add('hidden');
             paymentInvoiceSelect.value = payment.linkedInvoiceId;
              // Trigger change to update balance display for the selected invoice
              paymentInvoiceSelect.dispatchEvent(new Event('change'));
         } else {
             paymentInvoiceLinkCheck.checked = false;
             paymentInvoiceLinkRow.classList.add('hidden');
             paymentPartyRow.classList.remove('hidden');
             paymentPartyType.value = payment.partyType || 'customer';
             document.getElementById('payment-party-name').value = payment.partyName || '';
             invoiceBalanceInfoSpan.textContent = ''; // Clear balance info
             paymentInvoiceSelect.value = ''; // Ensure no invoice is selected
         }

         document.getElementById('payment-entry-section').scrollIntoView({ behavior: 'smooth' });
         hideLoading();
     };

     const deletePayment = (id) => {
          const paymentIndex = payments.findIndex(p => p.id === id);
         if (paymentIndex === -1) {
             showMessage(paymentsMessage, `Payment #${id} not found.`, 'error');
             return;
         }

          if (!confirm(`Are you sure you want to delete Payment #${id}? This may affect the linked invoice status.`)) {
            return;
         }

         showLoading();
         const deletedPayment = payments[paymentIndex];
         const linkedInvoiceId = deletedPayment.linkedInvoiceId;

         payments.splice(paymentIndex, 1);

         // Update the status of the previously linked invoice, if any
         let invoiceStatusNeedsUpdate = false;
         if (linkedInvoiceId) {
               const invoice = invoices.find(inv => inv.id === linkedInvoiceId);
               if (invoice) {
                    const changed = invoice.type === 'customer' ?
                        updateInvoicePaymentStatus(linkedInvoiceId) :
                        updateSupplierInvoicePaymentStatus(linkedInvoiceId);
                    if (changed) invoiceStatusNeedsUpdate = true;
               }
         }

         saveData();
         showMessage(paymentsMessage, `Payment #${id} deleted.`, 'success');
         renderPaymentsList();
          if (invoiceStatusNeedsUpdate) {
             renderInvoiceList(); // Refresh invoice list if status changed
             renderDuePaymentsList(); // Refresh due list
          }
           populateInvoicePaymentSelect(); // Refresh payment link dropdown
         hideLoading();
     };


    // --- Payments List Rendering ---
    const renderPaymentsList = () => {
        if (!paymentsListBody) return;
        paymentsListBody.innerHTML = ''; // Clear list
        showLoading();

         // Sort by date descending
         const sortedPayments = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedPayments.length === 0) {
            paymentsListBody.innerHTML = '<tr class="no-results"><td colspan="8">No payments recorded yet.</td></tr>';
            hideLoading();
            return;
        }

        sortedPayments.forEach(payment => {
            const row = paymentsListBody.insertRow();
             const partyDisplay = payment.partyName ? `${payment.partyName} <small>(${payment.partyType})</small>` : 'N/A';
             const notesDisplay = `${payment.notes || ''} <br><small>${payment.reference || ''}</small>`;
            row.innerHTML = `
                <td>${payment.id}</td>
                <td>${formatDate(payment.date)}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${payment.method}</td>
                <td>${payment.linkedInvoiceId ? `<a href="#" onclick="event.preventDefault(); viewInvoiceFromPayment(${payment.linkedInvoiceId});">${'#' + payment.linkedInvoiceId}</a>` : 'N/A'}</td>
                 <td>${partyDisplay}</td>
                <td>${notesDisplay.trim()}</td>
                <td>
                     <button class="edit-payment-button" data-id="${payment.id}">Edit</button>
                     <button class="delete-payment-button" data-id="${payment.id}">Delete</button>
                      <button class="pdf-payment-button" data-id="${payment.id}">Receipt</button>
                </td>
            `;
             // Add event listeners
             row.querySelector('.edit-payment-button')?.addEventListener('click', (e) => editPayment(parseInt(e.target.dataset.id)));
             row.querySelector('.delete-payment-button')?.addEventListener('click', (e) => deletePayment(parseInt(e.target.dataset.id)));
             row.querySelector('.pdf-payment-button')?.addEventListener('click', (e) => generatePaymentReceiptPDF(parseInt(e.target.dataset.id)));
        });
        hideLoading();
    };

     // Helper function to navigate to and highlight an invoice from payment list link
     window.viewInvoiceFromPayment = (invoiceId) => {
         editInvoice(invoiceId); // Use editInvoice to load it into the form view
         showScreen('invoices'); // Switch to the invoices screen
         // Optionally scroll to the invoice form if it's visible
          setTimeout(() => { // Allow screen switch transition
             document.getElementById('create-edit-invoice-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
     };


     // --- Due Payments List Rendering ---
     const renderDuePaymentsList = () => {
         if (!dueInvoicesListBody) return;
        dueInvoicesListBody.innerHTML = ''; // Clear list
        showLoading();
         const today = new Date();
         today.setHours(0, 0, 0, 0); // Normalize today's date

        // Get unpaid or partially paid CUSTOMER invoices
        const dueInvoices = invoices.filter(inv =>
            inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')
        );

        // Sort by due date ascending (oldest due first)
         dueInvoices.sort((a, b) => {
             // Handle potentially invalid or missing due dates
             const dateA = a.dueDate && !isNaN(new Date(a.dueDate).getTime()) ? new Date(a.dueDate) : new Date('9999-12-31');
             const dateB = b.dueDate && !isNaN(new Date(b.dueDate).getTime()) ? new Date(b.dueDate) : new Date('9999-12-31');
             return dateA - dateB;
         });


        if (dueInvoices.length === 0) {
            dueInvoicesListBody.innerHTML = '<tr class="no-results"><td colspan="6">No outstanding customer invoices.</td></tr>';
            hideLoading();
            return;
        }

        dueInvoices.forEach(invoice => {
            const amountDue = calculateInvoiceBalance(invoice.id);
             // Skip if amount due is zero or less (e.g., due to rounding or overpayment)
             if (amountDue <= 0) return;

             let dueDate = null;
             let isOverdue = false;
             let overdueTag = '';
             if (invoice.dueDate && !isNaN(new Date(invoice.dueDate).getTime())) {
                  dueDate = new Date(invoice.dueDate);
                  dueDate.setHours(0,0,0,0); // Normalize due date
                  if (dueDate < today) {
                      isOverdue = true;
                      overdueTag = ' <span class="overdue-tag">(Overdue)</span>';
                  }
              }


             const row = dueInvoicesListBody.insertRow();
             row.className = isOverdue ? 'overdue' : '';
            row.innerHTML = `
                <td>${invoice.id}</td>
                <td>${invoice.partyName}</td>
                <td>${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'} ${overdueTag}</td>
                <td>${formatCurrency(invoice.totalAmount)}</td>
                <td>${formatCurrency(amountDue)}</td>
                 <td>
                      <button class="pay-now-button" data-id="${invoice.id}">Record Pymt</button>
                      <button class="view-invoice-button" data-id="${invoice.id}">View Inv.</button>
                 </td>
            `;
             // Add event listeners
             row.querySelector('.pay-now-button')?.addEventListener('click', (e) => triggerPayNow(parseInt(e.target.dataset.id)));
             row.querySelector('.view-invoice-button')?.addEventListener('click', (e) => {
                 editInvoice(parseInt(e.target.dataset.id));
                 showScreen('invoices'); // Switch to invoices screen
             });
        });
         // Add no results row if all items were filtered out due to amountDue <= 0
          if (dueInvoicesListBody.children.length === 0) {
             dueInvoicesListBody.innerHTML = '<tr class="no-results"><td colspan="6">No outstanding customer invoices.</td></tr>';
         }
        hideLoading();
    };

    // --- Account Statement ---
    const generateStatement = (partyName) => {
         if (!statementListBody || !statementResultsSection || !statementResultsTitle || !downloadStatementPdfButton) return;
        statementListBody.innerHTML = ''; // Clear previous statement
        statementResultsSection.classList.remove('hidden');
        statementResultsTitle.textContent = partyName;
        downloadStatementPdfButton.classList.add('hidden'); // Hide PDF button initially
        showLoading();

        let balance = 0;
        const statementEntries = [];

        // 1. Find Customer/Supplier Invoices
        invoices.forEach(inv => {
            if (inv.partyName === partyName) {
                 let transactionType = '';
                 let reference = `Inv #${inv.id}`;
                 let debit = 0;
                 let credit = 0;

                if (inv.type === 'customer') {
                     transactionType = 'Invoice Issued';
                     debit = inv.totalAmount; // Customer owes us (Debit increases balance)
                     if (inv.dueDate) reference += ` (Due: ${formatDate(inv.dueDate)})`;
                 } else { // Supplier invoice
                     transactionType = 'Bill Received';
                     credit = inv.totalAmount; // We owe supplier (Credit decreases balance)
                      if (inv.supplierInvoiceNumber) reference += ` / Supp Ref: ${inv.supplierInvoiceNumber}`;
                 }

                 statementEntries.push({
                     date: inv.date,
                     type: transactionType,
                     reference: reference,
                     debit: debit,
                     credit: credit
                 });
            }
        });

        // 2. Find Payments Made/Received
         payments.forEach(pay => {
            if (pay.partyName === partyName) {
                 let transactionType = '';
                 let reference = `Pay ID #${pay.id}`;
                 let debit = 0;
                 let credit = 0;

                if (pay.partyType === 'customer') { // Payment Received from Customer
                     transactionType = 'Payment Received';
                     credit = pay.amount; // Reduces what customer owes (Credit decreases balance)
                 } else { // Payment Made to Supplier
                     transactionType = 'Payment Made';
                     debit = pay.amount; // Reduces what we owe supplier (Debit increases balance)
                 }

                 if (pay.method) reference += ` (${pay.method})`;
                 if (pay.reference) reference += ` Ref: ${pay.reference}`;
                 if (pay.linkedInvoiceId) reference += ` (For Inv #${pay.linkedInvoiceId})`;


                  statementEntries.push({
                     date: pay.date,
                     type: transactionType,
                     reference: reference,
                     debit: debit,
                     credit: credit
                 });
            }
        });

         // 3. Sort entries by date, then potentially by type (e.g., invoices before payments on same day)
         statementEntries.sort((a, b) => {
             const dateDiff = new Date(a.date) - new Date(b.date);
             if (dateDiff !== 0) return dateDiff;
             // Optional: secondary sort (e.g., invoice before payment)
             if (a.type.includes('Invoice') && !b.type.includes('Invoice')) return -1;
             if (!a.type.includes('Invoice') && b.type.includes('Invoice')) return 1;
             return 0;
         });


         // 4. Calculate running balance and render table
         if (statementEntries.length === 0) {
             statementListBody.innerHTML = '<tr class="no-results"><td colspan="6">No transactions found for this party.</td></tr>';
              finalBalanceAmountSpan.textContent = '0.00';
              finalBalanceTypeSpan.textContent = '';
              finalBalanceAmountSpan.className = 'final-balance-amount';
             hideLoading();
             return;
         }

         statementEntries.forEach(entry => {
             const debitAmount = parseFloat(entry.debit || 0);
             const creditAmount = parseFloat(entry.credit || 0);
             balance += (debitAmount - creditAmount); // Debit increases balance, Credit decreases

             const row = statementListBody.insertRow();
              const balanceClass = balance > 0.001 ? 'positive-balance' : (balance < -0.001 ? 'negative-balance' : ''); // Class for balance color with tolerance
             row.innerHTML = `
                 <td>${formatDate(entry.date)}</td>
                 <td>${entry.type}</td>
                 <td>${entry.reference}</td>
                 <td class="amount">${debitAmount > 0 ? formatCurrency(debitAmount) : ''}</td>
                 <td class="amount">${creditAmount > 0 ? formatCurrency(creditAmount) : ''}</td>
                 <td class="amount ${balanceClass}">${formatCurrency(balance)}</td>
             `;
         });

         // 5. Display final balance
         finalBalanceAmountSpan.textContent = formatCurrency(Math.abs(balance)); // Show absolute value
         finalBalanceAmountSpan.className = `final-balance-amount ${balance > 0.001 ? 'positive-balance' : (balance < -0.001 ? 'negative-balance' : '')}`;
         finalBalanceTypeSpan.textContent = balance > 0.001 ? '(Due by Customer/Payable to Us)' : (balance < -0.001 ? '(Due to Supplier/Receivable by Us)' : '(Settled)');
         downloadStatementPdfButton.classList.remove('hidden'); // Show PDF button
         hideLoading();
         statementResultsSection.scrollIntoView({behavior: 'smooth'});
    };


    // --- Settings Management ---
    const applySettings = () => {
        // Apply settings to relevant parts of the app (e.g., company name in PDF headers)
        // Update QR code preview
         if (settings.paymentQrImageData) {
            qrCodePreview.src = settings.paymentQrImageData;
            qrCodePreview.style.display = 'block';
             removeQrImageButton.style.display = 'inline-block';
        } else {
            qrCodePreview.src = '#';
            qrCodePreview.style.display = 'none';
             removeQrImageButton.style.display = 'none';
        }
         console.log("Settings applied.");
    };

    const loadSettingsIntoForm = () => {
        settingCompanyNameInput.value = settings.companyName || '';
        settingAddress1Input.value = settings.address1 || '';
         settingAddress2Input.value = settings.address2 || '';
        settingPhoneInput.value = settings.phone || '';
        settingEmailInput.value = settings.email || '';
        // QR code preview is handled by applySettings called during load/save
         settingPaymentQrImageInput.value = null; // Clear file input
        applySettings(); // Ensure preview is up-to-date
    };

    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };


    const handleCompanySettingsSubmit = async (e) => {
        e.preventDefault();
        showLoading();

        try {
            settings.companyName = settingCompanyNameInput.value.trim();
            settings.address1 = settingAddress1Input.value.trim();
             settings.address2 = settingAddress2Input.value.trim();
            settings.phone = settingPhoneInput.value.trim();
            settings.email = settingEmailInput.value.trim();

             // Handle QR image upload
             const qrImageFile = settingPaymentQrImageInput.files[0];
             if (qrImageFile) {
                 // Basic validation (optional: check size, type more strictly)
                 if (qrImageFile.size > 2 * 1024 * 1024) { // 2MB limit example
                     throw new Error("Image file size exceeds 2MB limit.");
                 }
                 settings.paymentQrImageData = await readFileAsDataURL(qrImageFile);

             }
             // Note: If no new file is selected, the existing settings.paymentQrImageData remains unchanged.
             // The remove button handles clearing it.


            saveData();
            applySettings(); // Apply changes immediately (updates preview)
            showMessage(companySettingsMessage, 'Settings saved successfully.', 'success');
        } catch (error) {
             console.error("Error saving settings:", error);
             showMessage(companySettingsMessage, `Error saving settings: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    };

     // Handle remove QR image button click
     removeQrImageButton.addEventListener('click', () => {
         if (confirm("Are you sure you want to remove the QR code image?")) {
             settings.paymentQrImageData = null;
             settingPaymentQrImageInput.value = null; // Clear file input
             saveData();
             applySettings(); // Update UI (hide preview)
             showMessage(companySettingsMessage, 'QR Code image removed.', 'info');
         }
     });

    // --- Backup & Restore ---
    const handleBackup = () => {
        showLoading();
        try {
            const dataToBackup = {
                invoices,
                inventory,
                stockLevels,
                payments,
                settings,
                nextInvoiceId,
                nextPaymentId,
                backupTimestamp: getCurrentTimestamp(), // Add a timestamp
                appVersion: '1.1.0' // Example versioning
            };
            const jsonString = JSON.stringify(dataToBackup, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            triggerDownload(blob, `eaze_inn_accounts_backup_${timestamp}.json`);
            showMessage(backupRestoreMessage, 'Data backup successful!', 'success');
        } catch (e) {
            console.error("Backup failed:", e);
            showMessage(backupRestoreMessage, `Backup failed: ${e.message}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const handleRestore = (event) => {
        const file = event.target.files[0];
        if (!file) {
            showMessage(backupRestoreMessage, 'No file selected for restore.', 'error');
            return;
        }
        if (!file.name.endsWith('.json')) {
             showMessage(backupRestoreMessage, 'Invalid file type. Please select a .json backup file.', 'error');
             restoreFileInput.value = ''; // Clear selection
             restoreButton.disabled = true;
             return;
         }


        if (!confirm('WARNING: Restoring data will overwrite all current information. This cannot be undone. Are you absolutely sure you want to proceed?')) {
            restoreFileInput.value = ''; // Clear selection
            restoreButton.disabled = true;
            return;
        }

        showLoading();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredData = JSON.parse(e.target.result);

                // --- Data Validation (More Robust) ---
                 if (!restoredData || typeof restoredData !== 'object') throw new Error("Invalid backup file format.");
                 if (!Array.isArray(restoredData.invoices)) throw new Error("Missing or invalid 'invoices' data.");
                 if (!Array.isArray(restoredData.inventory)) throw new Error("Missing or invalid 'inventory' data.");
                 if (typeof restoredData.stockLevels !== 'object' || restoredData.stockLevels === null) throw new Error("Missing or invalid 'stockLevels' data.");
                 if (!Array.isArray(restoredData.payments)) throw new Error("Missing or invalid 'payments' data.");
                 if (typeof restoredData.settings !== 'object' || restoredData.settings === null) throw new Error("Missing or invalid 'settings' data.");
                 if (typeof restoredData.nextInvoiceId !== 'number' || restoredData.nextInvoiceId < 1) throw new Error("Invalid 'nextInvoiceId'.");
                 if (typeof restoredData.nextPaymentId !== 'number' || restoredData.nextPaymentId < 1) throw new Error("Invalid 'nextPaymentId'.");
                 // Add more checks as needed (e.g., check structure of individual items)


                 // --- Apply Restored Data ---
                 invoices = restoredData.invoices;
                 inventory = restoredData.inventory;
                 stockLevels = restoredData.stockLevels;
                 payments = restoredData.payments;
                 // Merge restored settings with defaults to handle potential missing keys in old backups
                  settings = {
                     companyName: '', address1: '', address2:'', phone: '', email: '', paymentQrImageData: null, // Start with defaults
                     ...restoredData.settings // Overwrite with restored values
                  };
                 nextInvoiceId = restoredData.nextInvoiceId;
                 nextPaymentId = restoredData.nextPaymentId;

                 // --- Post-Restore Actions ---
                 saveData(); // Save the restored data immediately
                 applySettings(); // Apply restored settings
                 populateDatalists(); // Update all datalists
                 renderAllLists(); // Render all lists with restored data
                 showScreen('dashboard'); // Go to dashboard after restore

                 showMessage(backupRestoreMessage, 'Data restored successfully!', 'success');
                 restoreFileInput.value = ''; // Clear file input
                 restoreButton.disabled = true; // Disable button again

            } catch (err) {
                 console.error("Restore failed:", err);
                showMessage(backupRestoreMessage, `Restore failed: ${err.message}. Data was not changed.`, 'error');
                 restoreFileInput.value = ''; // Clear selection
                 restoreButton.disabled = true;
            } finally {
                hideLoading();
            }
        };
        reader.onerror = (err) => {
             console.error("File reading error:", err);
             showMessage(backupRestoreMessage, 'Error reading the selected file.', 'error');
             hideLoading();
             restoreFileInput.value = ''; // Clear selection
             restoreButton.disabled = true;
        };
        reader.readAsText(file);
    };

    // --- PDF Generation ---

    const getBasePdf = (title) => {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        let y = 15; // Initial Y position

        // Header
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(settings.companyName || 'Eaze Inn Accounts', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10);
         doc.setFont(undefined, 'normal');
         if (settings.address1) {
            doc.text(settings.address1, pageWidth / 2, y, { align: 'center' });
            y += 5;
        }
         if (settings.address2) {
            doc.text(settings.address2, pageWidth / 2, y, { align: 'center' });
            y += 5;
        }
         if (settings.phone) {
            doc.text(`Phone: ${settings.phone}`, pageWidth / 2, y, { align: 'center' });
            y += 5;
        }
          if (settings.email) {
             doc.text(`Email: ${settings.email}`, pageWidth / 2, y, { align: 'center' });
             y += 5;
         }
        y += 5; // Extra space before title

        // Document Title
        doc.setFontSize(14);
         doc.setFont(undefined, 'bold');
        doc.text(title, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Footer Function (added on each page)
         const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
             doc.setFont(undefined, 'italic');
            doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, pageHeight - 10);
        };


        return { doc, y, pageWidth, pageHeight, addFooter };
    };

    // --- !!! ADDED TRY/CATCH and FILENAME CLEANING to all PDF functions !!! ---

     const generateInvoicePDF = (invoiceId) => {
         showLoading();
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice) {
             showMessage(invoiceMessage, `Invoice #${invoiceId} not found.`, 'error');
             hideLoading();
             return;
         }

         try { // <<< ADDED try block
             const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(invoice.type === 'customer' ? 'Tax Invoice' : 'Bill Record');
             let y = startY;

             // Invoice Details
             doc.setFontSize(11);
             doc.setFont(undefined, 'bold');
             doc.text(`Invoice ID:`, 15, y);
             doc.setFont(undefined, 'normal');
             doc.text(`${invoice.id}`, 55, y);

             doc.setFont(undefined, 'bold');
             doc.text(`Date Issued:`, pageWidth / 2, y);
             doc.setFont(undefined, 'normal');
             doc.text(`${formatDate(invoice.date)}`, pageWidth / 2 + 30, y);
             y += 7;

             doc.setFont(undefined, 'bold');
             doc.text(invoice.type === 'customer' ? 'Customer:' : 'Supplier:', 15, y);
             doc.setFont(undefined, 'normal');
             doc.text(`${invoice.partyName}`, 55, y);

             if (invoice.type === 'customer' && invoice.dueDate) {
                 doc.setFont(undefined, 'bold');
                 doc.text(`Due Date:`, pageWidth / 2, y);
                 doc.setFont(undefined, 'normal');
                 doc.text(`${formatDate(invoice.dueDate)}`, pageWidth / 2 + 30, y);
             } else if (invoice.type === 'supplier' && invoice.supplierInvoiceNumber) {
                 doc.setFont(undefined, 'bold');
                 doc.text(`Supplier Ref #:`, pageWidth / 2, y);
                 doc.setFont(undefined, 'normal');
                 doc.text(`${invoice.supplierInvoiceNumber}`, pageWidth / 2 + 35, y);
             }
             y += 10;

             // Items Table - using autoTable
             const head = [['Item Code', 'Description', 'Qty', 'Unit Price', 'Subtotal']];
             const body = invoice.items.map(item => ([
                 item.itemCode,
                 item.description,
                 formatCurrency(item.quantity), // Format numbers for display
                 formatCurrency(item.unitPrice),
                 formatCurrency(item.quantity * item.unitPrice)
             ]));

             doc.autoTable({
                 startY: y,
                 head: head,
                 body: body,
                 theme: 'grid',
                 headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
                 columnStyles: {
                     2: { halign: 'right' }, // Qty
                     3: { halign: 'right' }, // Unit Price
                     4: { halign: 'right' }  // Subtotal
                 },
                 didDrawPage: (data) => {
                     addFooter(); // Add footer to each page generated by autoTable
                 }
             });

             y = doc.lastAutoTable.finalY + 10; // Get Y position after table


             // Totals Section
             const totalYStart = y > pageHeight - 60 ? 20 : y; // Check if totals need new page
             if (totalYStart === 20) doc.addPage();
             doc.setFontSize(12);
             doc.setFont(undefined, 'bold');
             doc.text('Total Amount:', pageWidth - 60, totalYStart, { align: 'left' });
             doc.setFont(undefined, 'normal');
             doc.text(`${formatCurrency(invoice.totalAmount)}`, pageWidth - 15, totalYStart, { align: 'right' });
             y = totalYStart + 7;

             // Payment Status & Details (if Customer Invoice)
             if (invoice.type === 'customer') {
                 const paymentsForInvoice = payments.filter(p => p.linkedInvoiceId === invoiceId);
                 const totalPaid = paymentsForInvoice.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                 const amountDue = calculateInvoiceBalance(invoice.id); // Use function for consistency

                 doc.setFont(undefined, 'bold');
                 doc.text('Payment Status:', pageWidth - 60, y, { align: 'left' });
                 doc.setFont(undefined, 'normal', invoice.paymentStatus === 'Paid' ? 'bold' : 'normal'); // Bold if paid
                 doc.setTextColor(invoice.paymentStatus === 'Paid' ? '#28a745' : (invoice.paymentStatus === 'Partial' ? '#fd7e14' : '#dc3545')); // Color based on status
                 doc.text(`${invoice.paymentStatus}`, pageWidth - 15, y, { align: 'right' });
                 doc.setTextColor(0, 0, 0); // Reset text color
                 y += 7;

                 doc.setFont(undefined, 'bold');
                 doc.text('Total Paid:', pageWidth - 60, y, { align: 'left' });
                 doc.setFont(undefined, 'normal');
                 doc.text(`${formatCurrency(totalPaid)}`, pageWidth - 15, y, { align: 'right' });
                 y += 7;

                 doc.setFont(undefined, 'bold');
                 doc.text('Amount Due:', pageWidth - 60, y, { align: 'left' });
                 doc.setFont(undefined, 'bold'); // Keep amount due bold
                 doc.text(`${formatCurrency(amountDue)}`, pageWidth - 15, y, { align: 'right' });
                 doc.setFont(undefined, 'normal'); // Reset font style
                 y += 10;

                 // Optional: List Payments
                 if (paymentsForInvoice.length > 0) {
                     if (y > pageHeight - 40) { doc.addPage(); y = 20; addFooter(); } // Check page break
                     y += 5;
                     doc.setFontSize(10);
                     doc.setFont(undefined, 'bold');
                     doc.text('Payments Received:', 15, y);
                     y += 6;
                     doc.setFont(undefined, 'normal');
                     paymentsForInvoice.forEach(p => {
                          if (y > pageHeight - 25) { doc.addPage(); y = 20; addFooter(); } // Check page break inside loop
                         doc.text(`- ${formatDate(p.date)}: ${formatCurrency(p.amount)} (${p.method || 'N/A'}${p.reference ? ', Ref: ' + p.reference : ''})`, 20, y);
                         y += 5;
                     });
                 }
             } else {
                 // Supplier Invoice Status
                 doc.setFont(undefined, 'bold');
                 doc.text('Payment Status:', pageWidth - 60, y, { align: 'left' });
                 doc.setFont(undefined, 'normal', invoice.paymentStatus === 'Paid' ? 'bold' : 'normal'); // Bold if paid
                 doc.setTextColor(invoice.paymentStatus === 'Paid' ? '#28a745' : '#dc3545'); // Color based on status
                 doc.text(`${invoice.paymentStatus}`, pageWidth - 15, y, { align: 'right' });
                 doc.setTextColor(0, 0, 0); // Reset text color
                 y += 7;
             }


             // Final check and save
             if (doc.internal.getCurrentPageInfo().pageNumber > 1 || y < pageHeight - 15) { // Avoid double footer on single page
                addFooter(); // Ensure footer is on the last page
             }
             // Clean filename
             const safePartyName = (invoice.partyName || 'UnknownParty').replace(/[^a-zA-Z0-9_.-]/g, '');
             const filename = `Invoice_${invoice.id}_${safePartyName}.pdf`;
             console.log("Saving invoice PDF:", filename);
             doc.save(filename);

         } catch (error) { // <<< ADDED catch block
             console.error("Error generating Invoice PDF:", error);
             showMessage(invoiceMessage, `Error generating PDF: ${error.message}`, 'error');
         } finally { // <<< ADDED finally block
             hideLoading();
         }
     };

      const generatePaymentReceiptPDF = (paymentId) => {
           showLoading();
          const payment = payments.find(p => p.id === paymentId);
          if (!payment) {
              showMessage(paymentsMessage, `Payment #${paymentId} not found.`, 'error');
              hideLoading();
              return;
          }

           try { // <<< ADDED try block
               const title = payment.partyType === 'customer' ? 'Payment Receipt' : 'Payment Confirmation';
               const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(title);
               let y = startY;
               const linkedInvoice = payment.linkedInvoiceId ? invoices.find(inv => inv.id === payment.linkedInvoiceId) : null;

               // Payment Details
               doc.setFontSize(12);
               doc.setFont(undefined, 'bold');
               doc.text('Receipt ID:', 15, y);
               doc.setFont(undefined, 'normal');
               doc.text(`${payment.id}`, 55, y);

               doc.setFont(undefined, 'bold');
               doc.text('Payment Date:', pageWidth / 2, y);
               doc.setFont(undefined, 'normal');
               doc.text(`${formatDate(payment.date)}`, pageWidth / 2 + 35, y);
               y += 8;

               doc.setFont(undefined, 'bold');
               doc.text(payment.partyType === 'customer' ? 'Received From:' : 'Paid To:', 15, y);
               doc.setFont(undefined, 'normal');
               doc.text(`${payment.partyName || 'N/A'}`, 55, y);
               y += 8;

               doc.setFont(undefined, 'bold');
               doc.text('Payment Method:', 15, y);
               doc.setFont(undefined, 'normal');
               doc.text(`${payment.method}`, 55, y);

               if (payment.reference) {
                   doc.setFont(undefined, 'bold');
                   doc.text('Reference:', pageWidth / 2, y);
                   doc.setFont(undefined, 'normal');
                   doc.text(`${payment.reference}`, pageWidth / 2 + 35, y);
               }
               y += 8;

               doc.setFontSize(14);
               doc.setFont(undefined, 'bold');
               doc.text('Amount:', 15, y);
               doc.text(`${formatCurrency(payment.amount)}`, 55, y);
               y += 12;

               // Linked Invoice Info
               if (linkedInvoice) {
                     if (y > pageHeight - 60) { doc.addPage(); y = 20; addFooter(); } // Check page break
                   doc.setFontSize(11);
                   doc.setFont(undefined, 'bold');
                   doc.text('Related Invoice Information:', 15, y);
                   y += 7;
                   doc.setFont(undefined, 'normal');
                   doc.text(`Invoice ID: ${linkedInvoice.id}`, 20, y);
                   doc.text(`Invoice Date: ${formatDate(linkedInvoice.date)}`, pageWidth / 2, y);
                   y += 6;
                   doc.text(`Invoice Total: ${formatCurrency(linkedInvoice.totalAmount)}`, 20, y);

                   // Calculate balance *after* this payment
                   const totalPaidOnInvoice = payments
                       .filter(p => p.linkedInvoiceId === linkedInvoice.id)
                       .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                   const balanceAfterPayment = calculateInvoiceBalance(linkedInvoice.id); // Use function which excludes this payment implicitly if not saved yet

                   doc.text(`Balance After This Payment: ${formatCurrency(balanceAfterPayment)}`, pageWidth / 2, y);
                   y += 8;
               }

               // Notes
               if (payment.notes) {
                    if (y > pageHeight - 40) { doc.addPage(); y = 20; addFooter(); } // Check page break
                   doc.setFontSize(10);
                   doc.setFont(undefined, 'bold');
                   doc.text('Notes:', 15, y);
                   y += 5;
                   doc.setFont(undefined, 'normal');
                   // Use splitTextToSize for potentially long notes
                   const splitNotes = doc.splitTextToSize(payment.notes, pageWidth - 30); // Adjust width as needed
                   doc.text(splitNotes, 15, y);
                   y += (splitNotes.length * 5); // Adjust Y based on number of lines
               }


               addFooter();
               // Clean filename
               const safePartyName = (payment.partyName || 'UnknownParty').replace(/[^a-zA-Z0-9_.-]/g, '');
               const filename = `PaymentReceipt_${payment.id}_${safePartyName}.pdf`;
               console.log("Saving payment receipt PDF:", filename);
               doc.save(filename);

           } catch (error) { // <<< ADDED catch block
                console.error("Error generating Payment Receipt PDF:", error);
                showMessage(paymentsMessage, `Error generating PDF: ${error.message}`, 'error');
           } finally { // <<< ADDED finally block
               hideLoading();
           }
      };

      const generateStatementPDF = () => {
          showLoading();
          const partyName = statementResultsTitle.textContent;
          if (!partyName) {
               showMessage(statementMessage, 'Cannot generate PDF: No party selected.', 'error');
               hideLoading();
              return;
          }


           try { // <<< ADDED try block
               const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(`Account Statement for ${partyName}`);
               let y = startY;

               // Table Header
               const head = [['Date', 'Transaction Type', 'Reference', 'Debit', 'Credit', 'Balance']];
               const body = [];

               // Get data directly from the rendered table (or regenerate from source)
               const tableRows = statementListBody.querySelectorAll('tr');
               if (tableRows.length === 0 || (tableRows.length === 1 && tableRows[0].classList.contains('no-results'))) {
                   showMessage(statementMessage, 'No statement data to generate PDF.', 'info');
                   hideLoading();
                   return;
               }

               tableRows.forEach(tr => {
                   const cells = tr.querySelectorAll('td');
                   if (cells.length === 6) { // Ensure it's a data row
                       body.push([
                           cells[0].textContent, // Date
                           cells[1].textContent, // Type
                           cells[2].textContent, // Reference
                           cells[3].textContent, // Debit
                           cells[4].textContent, // Credit
                           cells[5].textContent  // Balance
                       ]);
                   }
               });

               // Add autoTable
               doc.autoTable({
                   startY: y,
                   head: head,
                   body: body,
                   theme: 'grid',
                   headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
                   columnStyles: {
                       0: { cellWidth: 25 }, // Date
                       1: { cellWidth: 40 }, // Type
                       // 2: Reference (auto)
                       3: { halign: 'right', cellWidth: 25 }, // Debit
                       4: { halign: 'right', cellWidth: 25 }, // Credit
                       5: { halign: 'right', cellWidth: 30 }  // Balance
                   },
                   didDrawPage: (data) => {
                       addFooter();
                   }
               });

               y = doc.lastAutoTable.finalY + 10; // Get Y position after table

                // Check for page break before final balance
               if (y > pageHeight - 25) { doc.addPage(); y = 20; addFooter(); }

               // Add Final Balance Summary
               const finalBalanceText = document.getElementById('statement-final-balance').textContent.trim(); // Get text as displayed
               doc.setFontSize(12);
               doc.setFont(undefined, 'bold');
               doc.text(finalBalanceText, pageWidth - 15, y, { align: 'right' });


               addFooter(); // Ensure footer on last page
               // Clean filename
                const safePartyName = (partyName || 'UnknownParty').replace(/[^a-zA-Z0-9_.-]/g, '');
               const filename = `AccountStatement_${safePartyName}.pdf`;
               console.log("Saving statement PDF:", filename);
               doc.save(filename);

           } catch (error) { // <<< ADDED catch block
               console.error("Error generating Statement PDF:", error);
               showMessage(statementMessage, `Error generating PDF: ${error.message}`, 'error');
           } finally { // <<< ADDED finally block
               hideLoading();
           }
      };

       const generateLowStockPDF = () => {
          showLoading();
          try { // <<< ADDED try block
              const lowStockItems = [];
              lowStockListBody.querySelectorAll('tr').forEach(tr => {
                  const cells = tr.querySelectorAll('td');
                  if (cells.length === 3) {
                      lowStockItems.push({
                          code: cells[0].textContent,
                          name: cells[1].textContent,
                          quantity: cells[2].textContent
                      });
                  }
              });

              if (lowStockItems.length === 0) {
                  showMessage(inventoryMessage, 'No low stock items to generate PDF.', 'info');
                   hideLoading();
                  return;
              }

              const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(`Low Stock Report`);
              let y = startY;

              doc.setFontSize(10);
              doc.setFont(undefined, 'normal');
              doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, y);
              y += 10;

              // Table Header
              const head = [['Item Code', 'Item Name', 'Quantity on Hand']];
              const body = lowStockItems.map(item => [item.code, item.name, item.quantity]);

              // Add autoTable
              doc.autoTable({
                  startY: y,
                  head: head,
                  body: body,
                  theme: 'grid',
                  headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
                  columnStyles: {
                      2: { halign: 'right' } // Quantity
                  },
                  didDrawPage: (data) => {
                      addFooter();
                  }
              });

              addFooter(); // Ensure footer on last page
              const filename = `LowStockReport_${formatDate(new Date().toISOString())}.pdf`;
              console.log("Saving low stock PDF:", filename);
              doc.save(filename);

          } catch (error) { // <<< ADDED catch block
               console.error("Error generating Low Stock PDF:", error);
               showMessage(inventoryMessage, `Error generating PDF: ${error.message}`, 'error');
          } finally { // <<< ADDED finally block
               hideLoading();
          }
       };

       // --- 58mm Thermal Receipt Generation ---
       const generateReceipt = (invoiceId, outputType = 'print') => {
             showLoading();
             const invoice = invoices.find(inv => inv.id === invoiceId);
             if (!invoice || invoice.type !== 'customer') {
                 console.error("Cannot generate receipt: Invoice not found or not a customer invoice.");
                 showMessage(invoiceMessage, 'Cannot generate receipt for this invoice.', 'error');
                  hideLoading();
                 return;
             }

             try { // <<< ADDED try block
                 const companyName = settings.companyName || 'Eaze Inn';
                 const address1 = settings.address1 || '';
                 const address2 = settings.address2 || '';
                 const phone = settings.phone || '';
                 const email = settings.email || '';
                 const qrImageData = settings.paymentQrImageData; // Get base64 image data

                 let receiptContent = '';
                 const lineLength = 32; // Approx chars for 58mm, adjust as needed

                 // Centered Text Helper
                 const centerText = (text) => {
                     const padding = Math.max(0, Math.floor((lineLength - text.length) / 2));
                     return ' '.repeat(padding) + text;
                 };

                 // Align Left/Right Helper
                 const alignLeftRight = (leftText, rightText) => {
                     const spaceNeeded = lineLength - leftText.length - rightText.length;
                     const spaces = Math.max(1, spaceNeeded); // Ensure at least one space
                     return leftText + ' '.repeat(spaces) + rightText;
                 };


                 // --- Build Receipt ---
                 receiptContent += centerText(companyName) + '\n';
                 if (address1) receiptContent += centerText(address1) + '\n';
                 if (address2) receiptContent += centerText(address2) + '\n';
                 if (phone) receiptContent += centerText(`Tel: ${phone}`) + '\n';
                 if (email) receiptContent += centerText(`Email: ${email}`) + '\n';
                 receiptContent += '-'.repeat(lineLength) + '\n';
                 receiptContent += centerText('CUSTOMER RECEIPT') + '\n';
                 receiptContent += '-'.repeat(lineLength) + '\n';

                 receiptContent += alignLeftRight(`Inv #: ${invoice.id}`, `Date: ${formatDate(invoice.date)}`) + '\n';
                 receiptContent += `Customer: ${invoice.partyName}\n`;
                 if (invoice.dueDate) {
                     receiptContent += `Due Date: ${formatDate(invoice.dueDate)}\n`;
                 }
                 receiptContent += '-'.repeat(lineLength) + '\n';
                 receiptContent += 'Item           Qty   Price    Total\n'; // Header - adjusted spacing
                 receiptContent += '-'.repeat(lineLength) + '\n';


                 // Items
                 invoice.items.forEach(item => {
                     const desc = item.description.substring(0, 14).padEnd(14); // Truncate/pad description
                     const qty = String(item.quantity).padStart(4); // Pad quantity
                     const price = formatCurrency(item.unitPrice).padStart(7); // Pad price
                     const subtotal = formatCurrency(item.quantity * item.unitPrice).padStart(7); // Pad subtotal
                     receiptContent += `${desc}${qty}${price}${subtotal}\n`; // Adjust spacing as needed
                 });

                 receiptContent += '='.repeat(lineLength) + '\n';

                 // Totals
                 receiptContent += alignLeftRight('TOTAL AMOUNT:', formatCurrency(invoice.totalAmount).padStart(10)) + '\n';

                 // Payment Details
                 const paymentsForInvoice = payments.filter(p => p.linkedInvoiceId === invoiceId);
                 const totalPaid = paymentsForInvoice.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                 const amountDue = calculateInvoiceBalance(invoice.id);

                 receiptContent += alignLeftRight('TOTAL PAID:', formatCurrency(totalPaid).padStart(10)) + '\n';
                 receiptContent += '-'.repeat(lineLength) + '\n';
                 receiptContent += alignLeftRight('BALANCE DUE:', formatCurrency(amountDue).padStart(10)) + '\n';
                 receiptContent += '='.repeat(lineLength) + '\n';

                 // Payment Status & Method (if paid/partial)
                 if (invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'Partial') {
                     receiptContent += `Status: ${invoice.paymentStatus}\n`;
                     if (paymentsForInvoice.length > 0) {
                         const lastPayment = paymentsForInvoice.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                         receiptContent += `Last Pymt Method: ${lastPayment.method}\n`;
                         if (lastPayment.reference) receiptContent += `Ref: ${lastPayment.reference}\n`;
                     }
                     receiptContent += '-'.repeat(lineLength) + '\n';
                 }


                 // Footer Message
                 receiptContent += centerText('Thank you!') + '\n\n';

                 // Placeholder for QR Code Image
                 if (qrImageData) {
                     receiptContent += '[QR_CODE_PLACEHOLDER]\n\n';
                 }


                 // --- Output ---
                 if (outputType === 'print') {
                     printThermalReceipt(receiptContent, qrImageData);
                 } else {
                     console.log("Receipt Content:\n", receiptContent);
                     alert("Receipt content logged to console. Print functionality requires browser print dialog.");
                 }

             } catch (error) { // <<< ADDED catch block
                 console.error("Error generating Receipt:", error);
                 showMessage(invoiceMessage, `Error generating receipt: ${error.message}`, 'error');
             } finally { // <<< ADDED finally block
                 hideLoading();
             }
       };

       const printThermalReceipt = (textContent, qrImageDataUrl = null) => {
            let printContents = `
               <html>
               <head>
                   <title>Receipt</title>
                   <style>
                       @media print {
                            @page { margin: 0; size: 58mm auto; } /* Adjust size and margins for printer */
                            body { margin: 2mm; } /* Minimal body margin */
                       }
                       body {
                           font-family: 'Courier New', Courier, monospace;
                           font-size: 9pt; /* Smaller font common for thermal */
                           line-height: 1.2;
                           margin: 0; /* Reset margin for screen view */
                           padding: 0;
                           width: 58mm; /* Approx width */
                           overflow: hidden;
                           background-color: #fff; /* Ensure white background */
                           color: #000; /* Ensure black text */
                       }
                       pre {
                           margin: 0;
                           padding: 0;
                           white-space: pre-wrap; /* Wrap long lines */
                           word-wrap: break-word;
                           font-family: inherit;
                           font-size: inherit;
                       }
                        img.qr-code {
                           display: block;
                           margin: 3mm auto; /* Center image with margin */
                           max-width: 70%; /* Adjust size relative to 58mm */
                           height: auto;
                        }
                   </style>
               </head>
               <body>
                   <pre>${textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace('[QR_CODE_PLACEHOLDER]', '')}</pre>`; // Escape HTML in text, remove placeholder

            // Add QR code image tag if data exists
             if (qrImageDataUrl) {
                 printContents += `<img src="${qrImageDataUrl}" class="qr-code" alt="Payment QR Code">`;
             }

             printContents += `</body></html>`;

             const printWindow = window.open('', '_blank');
             if (!printWindow) {
                 alert("Please allow popups for this site to print receipts.");
                 return;
             }

             printWindow.document.write(printContents);
             printWindow.document.close(); // Important for some browsers
             printWindow.focus(); // Focus the new window

             // Use timeout to ensure content is rendered before printing
             setTimeout(() => {
                 try {
                     printWindow.print();
                      // Close might be too fast on some systems, leave it open or use a longer delay if needed
                     // setTimeout(() => { printWindow.close(); }, 1000);
                 } catch (e) {
                     console.error("Printing failed:", e);
                      try { printWindow.close(); } catch (closeErr) {}
                     alert("Could not initiate printing.");
                 }
             }, 500); // Adjust delay if needed
       };


    // --- Event Listeners ---
    const setupEventListeners = () => {
         navButtons.forEach(button => {
             button.addEventListener('click', () => {
                 const screenId = button.dataset.screen;
                 showScreen(screenId);
             });
         });

         // Invoice Event Listeners
         showCreateInvoiceButton?.addEventListener('click', () => {
             clearInvoiceForm();
             createEditInvoiceSection?.classList.remove('hidden');
             createEditInvoiceSection?.scrollIntoView({ behavior: 'smooth' });
         });
         cancelInvoiceButton?.addEventListener('click', () => {
             clearInvoiceForm();
             createEditInvoiceSection?.classList.add('hidden');
         });
         addInvoiceItemButton?.addEventListener('click', () => addInvoiceItemRow());
         invoiceForm?.addEventListener('submit', handleInvoiceFormSubmit);
         invoiceListFilter?.addEventListener('change', renderInvoiceList);
         invoiceTypeSelect?.addEventListener('change', () => {
             const isCustomer = invoiceTypeSelect.value === 'customer';
              if(invoicePartyLabel) invoicePartyLabel.textContent = isCustomer ? 'Customer Name:' : 'Supplier Name:';
             supplierFields.forEach(el => el.classList.toggle('hidden', isCustomer));
             customerFields.forEach(el => el.classList.toggle('hidden', !isCustomer));
             // Clear irrelevant fields on type change
             if (isCustomer) {
                  if(document.getElementById('invoice-number-supplier')) document.getElementById('invoice-number-supplier').value = '';
             } else {
                 if(document.getElementById('invoice-due-date')) document.getElementById('invoice-due-date').value = '';
             }
         });
         invoiceItemsContainer?.addEventListener('input', (e) => {
             if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-unit-price')) {
                 const row = e.target.closest('.invoice-item-row');
                 if (row) {
                     updateItemSubtotal(row);
                     updateInvoiceTotal();
                 }
             }
             if (e.target.classList.contains('item-code')) {
                 const row = e.target.closest('.invoice-item-row');
                 const code = e.target.value;
                 const inventoryItem = inventory.find(i => i.code === code);
                 if (row && inventoryItem) {
                     row.querySelector('.item-description').value = inventoryItem.name || '';
                     updateItemSubtotal(row);
                     updateInvoiceTotal();
                 }
             }
         });
         document.getElementById('invoice-image')?.addEventListener('change', (e) => {
              const fileInput = e.target;
              const pathSpan = invoiceImagePathSpan; // Already defined globally
              if (!fileInput.files || fileInput.files.length === 0) {
                   if(pathSpan) pathSpan.textContent = '';
              } else {
                   if(pathSpan) pathSpan.textContent = `File: ${fileInput.files[0].name}`; // Show file name
              }
          });


         // Inventory Event Listeners
         showAddItemButton?.addEventListener('click', () => {
             addItemForm?.reset();
             hideMessage(generatedItemCodeMessage); // Hide previous generated code message
             addItemSection?.classList.remove('hidden');
             addItemSection?.scrollIntoView({ behavior: 'smooth' });
             document.getElementById('item-name-new')?.focus();
         });
         cancelItemButton?.addEventListener('click', () => {
             addItemForm?.reset();
             hideMessage(generatedItemCodeMessage);
             addItemSection?.classList.add('hidden');
         });
         addItemForm?.addEventListener('submit', handleAddItemFormSubmit);
         inventorySearchInput?.addEventListener('input', (e) => renderInventoryList(e.target.value));
         exportInventoryJsonButton?.addEventListener('click', () => exportInventory('json'));
         exportInventoryCsvButton?.addEventListener('click', () => exportInventory('csv')); // CSV Export listener
         downloadLowStockPdfButton?.addEventListener('click', generateLowStockPDF);


         // Payments Event Listeners
         paymentForm?.addEventListener('submit', handlePaymentFormSubmit);
         clearPaymentButton?.addEventListener('click', clearPaymentForm);
         paymentInvoiceLinkCheck?.addEventListener('change', () => {
             const isChecked = paymentInvoiceLinkCheck.checked;
             paymentInvoiceLinkRow?.classList.toggle('hidden', !isChecked);
             paymentPartyRow?.classList.toggle('hidden', isChecked);
              if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = ''; // Clear balance info when toggling
             if (!isChecked) {
                 if(paymentInvoiceSelect) paymentInvoiceSelect.value = ''; // Clear invoice selection
                 if(paymentPartyNameInput) paymentPartyNameInput.value = ''; // Clear manual name too
             } else {
                 populateInvoicePaymentSelect();
                 paymentInvoiceSelect?.focus();
             }
         });
         paymentInvoiceSelect?.addEventListener('change', (e) => {
             const selectedOption = e.target.options[e.target.selectedIndex];
             if (selectedOption && selectedOption.value) {
                 const balance = selectedOption.dataset.balance;
                 const partyName = selectedOption.dataset.partyName;
                  if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = `(Balance: ${formatCurrency(balance)})`;
                 if(paymentPartyType) paymentPartyType.value = 'customer';
                 if(paymentPartyNameInput) paymentPartyNameInput.value = partyName || ''; // Use stored party name
             } else {
                  if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = '';
                  if(paymentPartyNameInput) paymentPartyNameInput.value = ''; // Clear name if no invoice selected
             }
         });

         // Statement Event Listeners
         statementForm?.addEventListener('submit', (e) => {
             e.preventDefault();
             const partyName = document.getElementById('statement-party-name')?.value.trim();
             if (partyName) {
                 generateStatement(partyName);
             } else {
                 showMessage(statementMessage, 'Please select or enter a customer/supplier name.', 'error');
                 statementResultsSection?.classList.add('hidden');
             }
         });
         downloadStatementPdfButton?.addEventListener('click', generateStatementPDF);


         // Settings Event Listeners
         companySettingsForm?.addEventListener('submit', handleCompanySettingsSubmit);
          removeQrImageButton?.addEventListener('click', () => { // Moved listener here from global scope
             if (confirm("Are you sure you want to remove the QR code image?")) {
                 settings.paymentQrImageData = null;
                 if(settingPaymentQrImageInput) settingPaymentQrImageInput.value = null; // Clear file input
                 saveData();
                 applySettings(); // Update UI (hide preview)
                 showMessage(companySettingsMessage, 'QR Code image removed.', 'info');
             }
         });

         // Backup/Restore Event Listeners
         backupButton?.addEventListener('click', handleBackup);
         restoreFileInput?.addEventListener('change', (e) => {
             if (restoreButton) restoreButton.disabled = !e.target.files || e.target.files.length === 0;
         });
         restoreButton?.addEventListener('click', () => handleRestore({ target: restoreFileInput }));
     };


    // --- Initialization ---
    const initializeApp = () => {
        console.log("Initializing Eaze Inn Accounts...");
        loadData(); // Load data first
        setupEventListeners(); // Setup listeners after elements are loaded
        showScreen('dashboard'); // Show dashboard by default
        console.log("App Initialized.");
    };

     const renderAllLists = () => {
         renderInvoiceList();
         renderInventoryList();
         renderLowStockList();
         renderPaymentsList();
         renderDuePaymentsList();
          // We don't render statement list by default
     };

    initializeApp(); // Start the application
});