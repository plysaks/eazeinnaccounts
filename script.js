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
            // Handle potential ISO string with time part
            if (dateString.includes('T')) {
                dateString = dateString.split('T')[0];
            }
            // Use UTC interpretation to avoid timezone shifts affecting the date part
            const date = new Date(dateString + 'T00:00:00Z');
             if (isNaN(date.getTime())) {
                // Fallback for potentially invalid formats before trying parsing
                const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (parts) {
                    return `${parts[1]}-${parts[2]}-${parts[3]}`;
                }
                throw new Error("Invalid date value");
             }
            // Use UTC methods to get the correct date parts regardless of local timezone
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Return original on error
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
                 if (!item || !item.name) {
                      console.warn("Skipping invalid item (missing name) during stock level validation in saveData:", item);
                      return;
                 }
                if (stockLevels[item.name]) {
                    validStockLevels[item.name] = stockLevels[item.name];
                } else {
                    // If missing, initialize it here before saving
                    console.warn(`Initializing missing stockLevel for '${item.name}' during save.`);
                    validStockLevels[item.name] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                }
            });
             // Remove stock level entries for items no longer in inventory
            Object.keys(stockLevels).forEach(itemNameKey => {
                if (!inventory.some(item => item.name === itemNameKey)) {
                    console.warn(`Removing orphaned stockLevel entry for '${itemNameKey}' during save.`);
                    delete stockLevels[itemNameKey]; // remove from original to be replaced
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
             // Avoid infinite loop if saving fails repeatedly
             if (e.message.includes("saveData")) {
                  console.error("Recursive save error detected. Aborting save.");
                  hideLoading(); // Make sure loading is hidden
                  return;
             }
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
                 if (!item || !item.name) {
                     console.error("Inventory item found with missing name during load:", item);
                     return; // Skip items without names
                 }
                const itemNameKey = item.name; // Use name as the key
                 // Ensure stockLevels[itemNameKey] exists and is an object before accessing properties
                 const existingStock = stockLevels[itemNameKey];
                 if (existingStock && typeof existingStock === 'object') {
                    // Validate existing entry
                    validatedStockLevels[itemNameKey] = {
                        quantity: (typeof existingStock.quantity === 'number' && !isNaN(existingStock.quantity)) ? existingStock.quantity : 0,
                        unitCost: (typeof existingStock.unitCost === 'number' && !isNaN(existingStock.unitCost)) ? existingStock.unitCost : 0,
                        revenue: (typeof existingStock.revenue === 'number' && !isNaN(existingStock.revenue)) ? existingStock.revenue : 0,
                        cost: (typeof existingStock.cost === 'number' && !isNaN(existingStock.cost)) ? existingStock.cost : 0,
                        lastUpdated: existingStock.lastUpdated || null // Keep null if never updated
                    };
                } else {
                    // Initialize missing or invalid entry
                     console.log(`Initializing stock level for item: '${itemNameKey}' (was missing or invalid type)`);
                     validatedStockLevels[itemNameKey] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                }
            });

             // Remove stock level entries for items no longer in the inventory array
             Object.keys(stockLevels).forEach(key => {
                 if (!currentInventoryNames.has(key)) {
                     console.warn(`Removing orphaned stockLevel entry for '${key}' during load validation.`);
                     // No need to delete from validatedStockLevels, it wasn't added
                 }
             });

            stockLevels = validatedStockLevels; // Replace with validated object

             // Validate invoice dates (attempt to fix if possible)
             invoices.forEach(inv => {
                 if (inv.date && isNaN(new Date(inv.date).getTime())) {
                     console.warn(`Invalid date found in invoice ${inv.id}: ${inv.date}. Attempting to parse.`);
                     const parsedDate = formatDate(inv.date); // Use our formatter
                     if (!isNaN(new Date(parsedDate).getTime())) {
                         inv.date = parsedDate;
                         console.log(`   > Corrected date for invoice ${inv.id} to ${parsedDate}`);
                     } else {
                         console.error(`   > Failed to correct invalid date for invoice ${inv.id}. Keeping original: ${inv.date}`);
                     }
                 }
                 // Same for due date if exists
                 if (inv.dueDate && isNaN(new Date(inv.dueDate).getTime())) {
                     console.warn(`Invalid due date found in invoice ${inv.id}: ${inv.dueDate}. Attempting to parse.`);
                     const parsedDueDate = formatDate(inv.dueDate);
                     if (!isNaN(new Date(parsedDueDate).getTime())) {
                         inv.dueDate = parsedDueDate;
                         console.log(`   > Corrected due date for invoice ${inv.id} to ${parsedDueDate}`);
                     } else {
                         console.error(`   > Failed to correct invalid due date for invoice ${inv.id}. Keeping original: ${inv.dueDate}`);
                     }
                 }
             });

             // Validate payment dates
             payments.forEach(pay => {
                  if (pay.date && isNaN(new Date(pay.date).getTime())) {
                      console.warn(`Invalid date found in payment ${pay.id}: ${pay.date}. Attempting to parse.`);
                      const parsedDate = formatDate(pay.date);
                      if (!isNaN(new Date(parsedDate).getTime())) {
                          pay.date = parsedDate;
                          console.log(`   > Corrected date for payment ${pay.id} to ${parsedDate}`);
                      } else {
                           console.error(`   > Failed to correct invalid date for payment ${pay.id}. Keeping original: ${pay.date}`);
                      }
                  }
             });


            console.log("Data loaded successfully.");
            applySettings();
            populateDatalists();
            renderAllLists(); // Render lists *after* data is loaded and validated

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
             try {
                 saveData(); // Save the defaults (this will hide loading)
             } catch (saveError) {
                 console.error("Failed to save default data after load error:", saveError);
                 hideLoading(); // Ensure loading is hidden even if save fails
             }
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
            renderDuePaymentsList(); // Keep updated
            populateInvoicePaymentSelect(); // Update select options
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
            // Use setTimeout to ensure the screen is visible before chart rendering
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
        // Sort inventory alphabetically by name before creating options
        [...inventory].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
             if (!item || !item.name) return; // Skip invalid items
            const option = document.createElement('option');
            option.value = item.name; // Value is the name
            option.textContent = `${item.category}`; // Show category in text part (optional, can be removed)
            itemNameList.appendChild(option);
        });
    };

    const populatePartyDatalist = (datalistElement) => {
        if (!datalistElement) return;
        datalistElement.innerHTML = '';
        const partyNames = new Set();
        // Collect unique, non-empty party names
        invoices.forEach(inv => { if (inv.partyName && inv.partyName.trim()) partyNames.add(inv.partyName.trim()); });
        payments.forEach(pay => { if (pay.partyName && pay.partyName.trim()) partyNames.add(pay.partyName.trim()); });

        // Sort and populate the datalist
        Array.from(partyNames).sort((a, b) => a.localeCompare(b)).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalistElement.appendChild(option);
        });
    };

     const populateInvoicePaymentSelect = () => {
        if (!paymentInvoiceSelect || !invoiceBalanceInfoSpan) return;
        const currentSelectedValue = paymentInvoiceSelect.value; // Remember selection if possible
        paymentInvoiceSelect.innerHTML = '<option value="">-- Select Invoice --</option>';
        invoiceBalanceInfoSpan.textContent = '';

        // Filter for due CUSTOMER invoices only
        const dueInvoices = invoices.filter(inv =>
            inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')
        ).sort((a, b) => {
             // Sort primarily by due date (oldest first), then by ID descending
             const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
             const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
             if (dateA.getTime() !== dateB.getTime()) {
                 return dateA - dateB; // Oldest due date first
             }
             return b.id - a.id; // Newer ID first if dates are same/missing
         });


        dueInvoices.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            const amountDue = calculateInvoiceBalance(inv.id);
             // Skip adding if amount due is zero or less (already paid)
             if (amountDue <= 0.001) {
                 return;
             }
             const dueDateText = inv.dueDate ? ` (Due: ${formatDate(inv.dueDate)})` : '';
             option.textContent = `Inv #${inv.id} - ${inv.partyName}${dueDateText} (Bal: ${formatCurrency(amountDue)})`;
            option.dataset.balance = amountDue;
            option.dataset.partyName = inv.partyName;
            paymentInvoiceSelect.appendChild(option);
        });

        // Try to restore previous selection
        if (currentSelectedValue && paymentInvoiceSelect.querySelector(`option[value="${currentSelectedValue}"]`)) {
            paymentInvoiceSelect.value = currentSelectedValue;
            paymentInvoiceSelect.dispatchEvent(new Event('change')); // Trigger update if needed
        }
    };


    // --- Chart Rendering ---
    const prepareChartData = () => {
        const monthlySales = {}; // Key: YYYY-MM
        const annualSales = {};  // Key: YYYY
        const stockByCategory = {}; // Key: Category Name
        const currentYear = new Date().getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Initialize monthly sales for the current year to zero
        for (let i = 0; i < 12; i++) {
            const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
            monthlySales[monthKey] = 0;
        }

        // Process CUSTOMER invoices for sales data
        invoices.forEach(inv => {
            if (inv.type === 'customer') {
                try {
                     // Validate date and amount
                     if (!inv.date || isNaN(new Date(inv.date).getTime())) {
                         console.warn(`Skipping invoice ${inv.id} for charts due to invalid date: ${inv.date}`);
                         return;
                     }
                     const amount = parseFloat(inv.totalAmount || 0);
                     if (isNaN(amount) || amount <= 0) {
                          console.warn(`Skipping invoice ${inv.id} for charts due to invalid amount: ${inv.totalAmount}`);
                         return;
                     }

                    const date = new Date(inv.date);
                    const year = date.getFullYear();
                    const month = date.getMonth(); // 0-indexed
                    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

                    // Add to monthly sales if it's the current year
                     if (year === currentYear) {
                         // Check if the key exists (it should due to initialization)
                         if (monthlySales.hasOwnProperty(yearMonth)) {
                              monthlySales[yearMonth] += amount;
                         } else {
                              // This case should ideally not happen if initialized correctly
                              console.warn(`Missing key in monthlySales for ${yearMonth}. Initializing.`);
                              monthlySales[yearMonth] = amount;
                         }
                    }

                    // Add to annual sales
                    annualSales[year] = (annualSales[year] || 0) + amount;

                } catch (e) {
                    console.error("Error processing invoice date/amount for charts:", inv, e);
                }
            }
        });

        // Process inventory for stock category data
        inventory.forEach(item => {
             if (!item || !item.name || !item.category) return; // Skip invalid items
             const stockInfo = stockLevels[item.name]; // Use item NAME as key
             const category = item.category;

             // Only include items with positive quantity and that are not Accommodation/Service
             if (stockInfo && typeof stockInfo.quantity === 'number' && !isNaN(stockInfo.quantity) && stockInfo.quantity > 0 && !['Accommodation', 'Service'].includes(category)) {
                 stockByCategory[category] = (stockByCategory[category] || 0) + stockInfo.quantity;
             }
        });

        // Prepare data for charts
        const monthlyLabels = monthNames;
        // Map the monthlySales object to the data array in the correct order
        const monthlyData = monthNames.map((_, index) => {
            const monthKey = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
            return monthlySales[monthKey] || 0; // Default to 0 if key somehow doesn't exist
        });


        const sortedYears = Object.keys(annualSales).sort();
        const annualLabels = sortedYears;
        const annualData = sortedYears.map(year => annualSales[year]);

        // Filter out categories with zero quantity before creating labels/data
        const categoryLabels = Object.keys(stockByCategory).filter(cat => stockByCategory[cat] > 0);
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
             console.warn("Dashboard chart canvas elements not found."); return;
         }
         if (typeof Chart === 'undefined') {
             showMessage(document.getElementById('monthlySalesChartMsg'), "Charting library not loaded.", "error"); return;
         }
         try {
             const chartData = prepareChartData();
             renderMonthlySalesChart(chartData.monthly);
             renderAnnualSalesChart(chartData.annual);
             renderStockCategoryChart(chartData.stock);
         } catch (error) {
             console.error("Error rendering charts:", error);
             showMessage(document.getElementById('monthlySalesChartMsg'), "Error rendering charts.", "error");
         }
    };
    const renderMonthlySalesChart = ({ labels, data }) => {
        const canvas = document.getElementById('monthlySalesChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const msgElement = document.getElementById('monthlySalesChartMsg'); hideMessage(msgElement); if (monthlySalesChartInstance) monthlySalesChartInstance.destroy(); if (!data || data.length === 0 || data.every(val => val === 0)) { showMessage(msgElement, "No sales data for current year.", "info"); return; } monthlySalesChartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Monthly Sales', data: data, backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label || ''}: ${formatCurrency(c.parsed.y)}` } }, legend: { display: false } } } }); };
     const renderAnnualSalesChart = ({ labels, data }) => {
        const canvas = document.getElementById('annualSalesChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const msgElement = document.getElementById('annualSalesChartMsg'); hideMessage(msgElement); if (annualSalesChartInstance) annualSalesChartInstance.destroy(); if (!data || data.length === 0) { showMessage(msgElement, "No sales data available.", "info"); return; } annualSalesChartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Annual Sales', data: data, backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label || ''}: ${formatCurrency(c.parsed.y)}` } }, legend: { display: false } } } }); };
     const renderStockCategoryChart = ({ labels, data }) => {
        const canvas = document.getElementById('stockCategoryChart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const msgElement = document.getElementById('stockCategoryChartMsg'); hideMessage(msgElement); if (stockCategoryChartInstance) stockCategoryChartInstance.destroy(); if (!data || data.length === 0) { showMessage(msgElement, "No stock data available (excluding Accommodation/Service).", "info"); return; } const backgroundColors = ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(100, 180, 120, 0.7)', 'rgba(210, 110, 190, 0.7)']; const borderColors = backgroundColors.map(c => c.replace('0.7', '1')); stockCategoryChartInstance = new Chart(ctx, { type: 'pie', data: { labels: labels, datasets: [{ label: 'Stock Quantity', data: data, backgroundColor: backgroundColors.slice(0, data.length), borderColor: borderColors.slice(0, data.length), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (c) => { let l = c.label || ''; let v = c.parsed || 0; let t = c.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); let p = t > 0 ? ((v / t) * 100).toFixed(1) + '%' : '0%'; return `${l}: ${v} (${p})`; } } } } } }); };


    // --- Invoice Management ---
    const clearInvoiceForm = () => {
        invoiceForm.reset();
        document.getElementById('invoice-id').value = '';
        invoiceItemsContainer.innerHTML = '';
        invoiceTotalSpan.textContent = '0.00';
        // Set defaults for selects
        document.getElementById('invoice-type').value = 'customer';
        document.getElementById('invoice-payment-status').value = 'Unpaid';
        document.getElementById('invoice-payment-status-supplier').value = 'Unpaid';
        document.getElementById('invoice-transaction-type').value = 'Cash'; // Default for customer

         try {
             // Set invoice date to today
             const today = new Date();
             document.getElementById('invoice-date').value = today.toISOString().split('T')[0];
         } catch (e) {
             console.warn("Failed to set default invoice date:", e);
              document.getElementById('invoice-date').value = formatDate(new Date().toISOString()); // Fallback
         }
        document.getElementById('invoice-due-date').value = ''; // Clear due date
        invoiceImagePathSpan.textContent = '';
        document.getElementById('invoice-image').value = null; // Clear file input
        addInvoiceItemRow(); // Add one empty row
        updateInvoiceTotal();
        hideMessage(invoiceMessage);
        invoiceTypeSelect.dispatchEvent(new Event('change')); // Trigger change to show/hide fields
        document.getElementById('invoice-form-title').textContent = 'Create New Invoice';
    };


    // Modified to use Item Name instead of Item Code
    const addInvoiceItemRow = (item = { itemName: '', quantity: 1, unitPrice: '' }) => {
        const itemRow = document.createElement('div');
        itemRow.classList.add('invoice-item-row');

        // Find item details from inventory based on name
        const inventoryItem = inventory.find(i => i.name === item.itemName);
        const description = inventoryItem ? inventoryItem.description : ''; // Get description if item exists
        const category = inventoryItem ? inventoryItem.category : ''; // Get category

        // Determine if quantity should allow decimals based on category (e.g., 'Food' might, 'Beverage' might not)
        // Simple example: Allow decimals for anything NOT Beverage or Amenities
        const allowDecimalQty = inventoryItem && !['Beverage', 'Amenities', 'Accommodation'].includes(category);
        const qtyStep = allowDecimalQty ? "any" : "1";
        const qtyMin = allowDecimalQty ? "0.001" : "1";

        itemRow.innerHTML = `
            <input type="text" list="item-name-list" class="item-name" placeholder="Item Name" value="${item.itemName || ''}" required>
            <input type="number" class="item-quantity" placeholder="Qty" value="${item.quantity || 1}" min="${qtyMin}" step="${qtyStep}" required>
            <input type="number" class="item-unit-price" placeholder="Unit Price" value="${item.unitPrice || ''}" min="0" step="0.01" required>
            <span class="item-description hidden">${description || ''}</span> <!-- Store description hidden -->
             <span class="item-category hidden">${category || ''}</span> <!-- Store category hidden -->
            <span>Subtotal: <span class="item-subtotal">0.00</span></span>
            <button type="button" class="remove-item-button" title="Remove Item">X</button>
        `;

        itemRow.querySelector('.remove-item-button').addEventListener('click', () => {
             if (invoiceItemsContainer.children.length > 1) {
                 itemRow.remove();
                 updateInvoiceTotal();
             } else {
                 // Clear the fields of the last row instead of removing it
                 itemRow.querySelector('.item-name').value = '';
                 itemRow.querySelector('.item-quantity').value = 1; // Reset qty
                 itemRow.querySelector('.item-unit-price').value = '';
                 itemRow.querySelector('.item-subtotal').textContent = '0.00';
                 itemRow.querySelector('.item-description').textContent = '';
                 itemRow.querySelector('.item-category').textContent = '';
                 itemRow.querySelector('.item-quantity').step = '1'; // Reset step/min
                 itemRow.querySelector('.item-quantity').min = '1';
                 updateInvoiceTotal();
             }
        });

        // Update description/category and quantity rules when item name changes (using input for better UX)
        itemRow.querySelector('.item-name').addEventListener('input', (e) => { // Use input for immediate feedback
            const selectedName = e.target.value;
            const descriptionSpan = itemRow.querySelector('.item-description');
             const categorySpan = itemRow.querySelector('.item-category');
             const qtyInput = itemRow.querySelector('.item-quantity');
            const inventoryItem = inventory.find(i => i.name === selectedName);

            if (inventoryItem) {
                 if (descriptionSpan) descriptionSpan.textContent = inventoryItem.description || '';
                 if (categorySpan) categorySpan.textContent = inventoryItem.category || '';
                 // Adjust qty input rules based on category
                 const allowDecimal = !['Beverage', 'Amenities', 'Accommodation'].includes(inventoryItem.category);
                 qtyInput.step = allowDecimal ? "any" : "1";
                 qtyInput.min = allowDecimal ? "0.001" : "1";
             } else {
                 if (descriptionSpan) descriptionSpan.textContent = '';
                 if (categorySpan) categorySpan.textContent = '';
                 qtyInput.step = '1'; // Default back if item not found
                 qtyInput.min = '1';
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
        updateItemSubtotal(itemRow); // Calculate initial subtotal
    };


    const updateItemSubtotal = (itemRow) => {
         const quantityInput = itemRow.querySelector('.item-quantity');
         const unitPriceInput = itemRow.querySelector('.item-unit-price');
         const subtotalSpan = itemRow.querySelector('.item-subtotal');
         if (!quantityInput || !unitPriceInput || !subtotalSpan) return; // Element check

         const quantity = parseFloat(quantityInput.value) || 0;
         const unitPrice = parseFloat(unitPriceInput.value) || 0;
         subtotalSpan.textContent = formatCurrency(quantity * unitPrice);
    };

    const updateInvoiceTotal = () => {
        let total = 0;
        invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
            const unitPrice = parseFloat(row.querySelector('.item-unit-price')?.value) || 0;
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
             showMessage(invoiceMessage, 'Invoice must contain at least one item.', 'error');
             return false; // No items is invalid
         }

         // Check if the only row is empty and should be considered invalid
         if (itemRows.length === 1) {
             const nameInput = itemRows[0].querySelector('.item-name');
             const qtyInput = itemRows[0].querySelector('.item-quantity');
             const priceInput = itemRows[0].querySelector('.item-unit-price');
             if (!nameInput.value.trim() && (!qtyInput.value || parseFloat(qtyInput.value) === 1) && !priceInput.value.trim()) {
                  showMessage(invoiceMessage, 'Please add item details to the invoice.', 'error');
                  itemRows[0].style.border = '1px solid red';
                  nameInput.style.borderColor = 'red'; // Highlight specific fields
                  qtyInput.style.borderColor = 'red';
                  priceInput.style.borderColor = 'red';
                  return false; // Single empty row is invalid
             }
         }


         itemRows.forEach(row => {
             const nameInput = row.querySelector('.item-name'); // Changed from codeInput
             const qtyInput = row.querySelector('.item-quantity');
             const priceInput = row.querySelector('.item-unit-price');
             const category = row.querySelector('.item-category')?.textContent || ''; // Get category for validation
             row.style.border = 'none'; // Reset border style
             nameInput.style.borderColor = ''; // Reset border color
             qtyInput.style.borderColor = '';
             priceInput.style.borderColor = '';

             const quantity = parseFloat(qtyInput.value);
             const price = parseFloat(priceInput.value);
             const qtyMin = parseFloat(qtyInput.min) || 0.001; // Get min from attribute

             let rowIsValid = true;
             let validationMessage = '';

             if (!nameInput.value.trim()) {
                 rowIsValid = false; nameInput.style.borderColor = 'red'; validationMessage += 'Item name required. ';
             }
             if (isNaN(quantity) || quantity < qtyMin) { // Check against dynamic min
                 rowIsValid = false; qtyInput.style.borderColor = 'red'; validationMessage += `Valid quantity (min ${qtyMin}) required. `;
             }
             if (isNaN(price) || price < 0) {
                 rowIsValid = false; priceInput.style.borderColor = 'red'; validationMessage += 'Valid price (>= 0) required. ';
             }

             // Check if item name actually exists in inventory (Warning, not strictly error)
             const itemNameExists = inventory.some(invItem => invItem.name.toLowerCase() === nameInput.value.trim().toLowerCase());
             if (!itemNameExists && nameInput.value.trim()) {
                  nameInput.style.borderColor = 'orange'; // Use different color for "not found" warning
                  if (rowIsValid) validationMessage += 'Item name not found in inventory (Warning). ';
                  console.warn(`Item name '${nameInput.value}' not found in inventory.`);
                  // Do NOT set rowIsValid = false here - allow saving non-inventory items
             }

             if (!rowIsValid) {
                  isValid = false;
                  row.style.border = '1px solid red'; // Highlight invalid row
                  console.warn(`Invalid row: ${nameInput.value} - ${validationMessage}`);
                  if (!firstInvalidRow) firstInvalidRow = row;
             }
         });

          if (!isValid && firstInvalidRow) {
              firstInvalidRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
               // Improve message based on common errors
               const errorFields = [];
                if (firstInvalidRow.querySelector('.item-name').style.borderColor === 'red') errorFields.push('Item Name');
                if (firstInvalidRow.querySelector('.item-quantity').style.borderColor === 'red') errorFields.push('Quantity');
                if (firstInvalidRow.querySelector('.item-unit-price').style.borderColor === 'red') errorFields.push('Price');
                const baseMsg = errorFields.length > 0
                    ? `Please correct highlighted item(s). Check required fields: ${errorFields.join(', ')}.`
                    : 'Please correct highlighted item(s). Check required fields.';
                const warningMsg = document.querySelector('.invoice-item-row input.item-name[style*="border-color: orange"]') ? ' Orange border means item not found in inventory (optional).' : '';
               showMessage(invoiceMessage, baseMsg + warningMsg, 'error');

           } else if (isValid) {
               hideMessage(invoiceMessage);
           }
         return isValid;
     };


    // Modified to extract Item Name
    const handleInvoiceFormSubmit = async (e) => {
        e.preventDefault();
        hideMessage(invoiceMessage); // Clear previous messages
        if (!validateInvoiceItems()) return; // Stop if basic validation fails

        showLoading();

        const invoiceId = document.getElementById('invoice-id').value;
        const invoiceType = invoiceTypeSelect.value;
        const partyName = document.getElementById('invoice-party-name').value.trim();
        const date = document.getElementById('invoice-date').value;
        const dueDate = document.getElementById('invoice-due-date').value;
        const supplierInvoiceNumber = document.getElementById('invoice-number-supplier').value.trim();
        const imageFile = document.getElementById('invoice-image').files[0];
        const transactionType = document.getElementById('invoice-transaction-type').value; // For customer invoices

         // Date validation (ensure date is selected)
         if (!date) {
             showMessage(invoiceMessage, 'Invoice Date is required.', 'error');
             document.getElementById('invoice-date').style.borderColor = 'red';
             hideLoading(); return;
         } else {
              document.getElementById('invoice-date').style.borderColor = '';
         }

         // Party name validation
         if (!partyName) {
              showMessage(invoiceMessage, `${invoiceType === 'customer' ? 'Customer' : 'Supplier'} Name is required.`, 'error');
              document.getElementById('invoice-party-name').style.borderColor = 'red';
              hideLoading(); return;
         } else {
               document.getElementById('invoice-party-name').style.borderColor = '';
         }


        let imageDataUrl = null;
        if (imageFile) {
             try {
                  if (imageFile.size > 5 * 1024 * 1024) throw new Error("Image file size exceeds 5MB limit.");
                  imageDataUrl = await readFileAsDataURL(imageFile);
             } catch (error) {
                  console.error("Error reading image file:", error);
                  showMessage(invoiceMessage, `Error processing image file: ${error.message}`, 'error');
                  hideLoading(); return;
             }
        } else if (invoiceId) { // Retain existing image if not changed and editing
             const existingInvoice = invoices.find(inv => inv.id === parseInt(invoiceId, 10));
             if (existingInvoice && existingInvoice.imageDataUrl && document.getElementById('invoice-image').value === '') {
                 imageDataUrl = existingInvoice.imageDataUrl;
                 console.log("Retaining existing image for invoice", invoiceId);
             } else {
                  imageDataUrl = null; // No new file chosen, and no/cleared existing image
             }
        }

        const items = [];
        let hasNonInventoryItems = false;
        invoiceItemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
            const itemName = row.querySelector('.item-name').value.trim(); // Get name instead of code
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
            const description = row.querySelector('.item-description')?.textContent || ''; // Get hidden description
            const qtyMin = parseFloat(row.querySelector('.item-quantity').min) || 0.001; // Get min for check

            // Check if item name exists in inventory
             const inventoryItemExists = inventory.some(invItem => invItem.name.toLowerCase() === itemName.toLowerCase());
             if (!inventoryItemExists && itemName) {
                 hasNonInventoryItems = true;
             }

            // Only add if name, quantity, and price seem valid (stricter check)
            if (itemName && !isNaN(quantity) && quantity >= qtyMin && !isNaN(unitPrice) && unitPrice >= 0) {
                items.push({ itemName, description, quantity, unitPrice }); // Store itemName
            } else {
                 console.warn(`Skipping invalid item row during final save processing: Name=${itemName}, Qty=${quantity}, Price=${unitPrice}`);
            }
        });

        // Final check: Ensure at least one valid item was processed
         if (items.length === 0) {
            showMessage(invoiceMessage, 'No valid items found in the invoice. Please check item details (Name, Qty, Price).', 'error');
            hideLoading();
            return;
         }

         // Confirm if non-inventory items are included (optional)
         if (hasNonInventoryItems) {
             if (!confirm("Warning: One or more items are not found in your inventory list.\nDo you want to proceed with saving the invoice?\nStock levels for these items will not be affected.")) {
                  hideLoading();
                  return; // Abort save if user cancels
             }
         }

        const totalAmount = parseFloat(invoiceTotalSpan.textContent) || 0;
        const existingInvoice = invoiceId ? invoices.find(inv => inv.id === parseInt(invoiceId, 10)) : null;

        // Determine payment status (only relevant for display, calculated from payments)
        // Status on the form is disabled, actual status depends on payments
        let paymentStatus;
        if (existingInvoice) {
             // We don't need to read the disabled select. We'll rely on the status already in the data.
             // It gets updated by payment actions.
             paymentStatus = existingInvoice.paymentStatus;
        } else {
             paymentStatus = 'Unpaid'; // Default for new invoices
        }


        const invoiceData = {
            id: existingInvoice ? existingInvoice.id : nextInvoiceId,
            type: invoiceType, partyName, date, totalAmount, items,
            paymentStatus: paymentStatus, // Store the *current* status, payments will update later if needed
            imageDataUrl, lastUpdated: getCurrentTimestamp()
        };

         // Add type-specific fields
         if (invoiceType === 'customer') {
             invoiceData.dueDate = dueDate || null; // Store null if empty
             invoiceData.defaultTransactionType = transactionType;
         } else { // Supplier
             invoiceData.supplierInvoiceNumber = supplierInvoiceNumber; // Can be empty string
             // Status for supplier is just Paid/Unpaid based on *any* linked payment
              if (invoiceData.paymentStatus === 'Partial') {
                   invoiceData.paymentStatus = 'Unpaid'; // Cannot be partial for supplier
              }
         }

        // --- Update or add invoice ---
        let stockChanged = false;
        if (existingInvoice) {
            const index = invoices.findIndex(inv => inv.id === existingInvoice.id);
            if (index > -1) {
                 const previousItems = Array.isArray(invoices[index].items) ? invoices[index].items : [];
                 invoices[index] = invoiceData; // Update the invoice data
                 stockChanged = updateStockOnInvoiceEdit(previousItems, invoiceData.items, invoiceData.type); // Pass item objects
                 console.log(`Invoice ${invoiceData.id} updated. Stock adjustment result: ${stockChanged}`);
            } else {
                 console.error(`Failed to find existing invoice ${invoiceId} for update.`);
                 showMessage(invoiceMessage, `Error updating invoice ${invoiceId}. Not found.`, 'error');
                 hideLoading(); return;
            }
        } else {
            invoices.push(invoiceData);
            nextInvoiceId++;
            stockChanged = updateStockOnInvoiceSave(invoiceData.items, invoiceData.type); // Pass item objects
            console.log(`Invoice ${invoiceData.id} created. Stock adjustment result: ${stockChanged}`);
        }

        // --- Update payment statuses potentially affected by total amount change ---
        let paymentStatusUpdated = false;
        if (invoiceData.type === 'customer' && existingInvoice) {
            // If editing a customer invoice, recalculate its status based on current payments vs NEW total
            const updated = updateInvoicePaymentStatus(invoiceData.id);
            if (updated) paymentStatusUpdated = true;
        } else if (invoiceData.type === 'supplier' && existingInvoice) {
            const updated = updateSupplierInvoicePaymentStatus(invoiceData.id);
             if (updated) paymentStatusUpdated = true;
        }


        saveData();
        showMessage(invoiceMessage, `Invoice ${existingInvoice ? 'updated' : 'created'} successfully!`, 'success');
        createEditInvoiceSection.classList.add('hidden'); // Hide form
        renderInvoiceList(); // Refresh list (shows updated status if changed)
         if (stockChanged) {
             renderInventoryList(); // Refresh inventory if stock changed
             renderLowStockList(); // Refresh low stock list
         }
         if (paymentStatusUpdated) { // Only refresh due list if status might have changed
              renderDuePaymentsList();
              populateInvoicePaymentSelect();
         }
        populatePartyDatalist(partyNameListStatement); // Update party datalists
        clearInvoiceForm(); // Clear the form for the next entry
        // SaveData hides loading indicator
    };


    // Modified to populate Item Name
    const editInvoice = (id) => {
        showLoading();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) {
            showMessage(invoiceMessage, `Invoice ${id} not found.`, 'error');
            hideLoading();
            return;
        }
        hideMessage(invoiceMessage); // Clear previous messages

        document.getElementById('invoice-id').value = invoice.id;
        invoiceTypeSelect.value = invoice.type;
        document.getElementById('invoice-party-name').value = invoice.partyName;
        document.getElementById('invoice-date').value = formatDate(invoice.date); // Use formatter
        document.getElementById('invoice-total').textContent = formatCurrency(invoice.totalAmount);
        // Image handling: Show existing path, clear file input
        invoiceImagePathSpan.textContent = invoice.imageDataUrl ? 'Image previously uploaded. Choose file to replace.' : '';
        document.getElementById('invoice-image').value = null; // Clear file input selector

        invoiceTypeSelect.dispatchEvent(new Event('change')); // Trigger show/hide fields

         if (invoice.type === 'customer') {
             document.getElementById('invoice-due-date').value = formatDate(invoice.dueDate); // Use formatter
             document.getElementById('invoice-payment-status').value = invoice.paymentStatus || 'Unpaid';
             document.getElementById('invoice-transaction-type').value = invoice.defaultTransactionType || 'Cash';
             // Keep payment status disabled as it's auto-calculated
              document.getElementById('invoice-payment-status').disabled = true;
              document.getElementById('invoice-payment-status-supplier').disabled = true;
         } else { // Supplier
             document.getElementById('invoice-number-supplier').value = invoice.supplierInvoiceNumber || '';
             document.getElementById('invoice-payment-status-supplier').value = invoice.paymentStatus || 'Unpaid';
             // Keep payment status disabled
             document.getElementById('invoice-payment-status').disabled = true;
             document.getElementById('invoice-payment-status-supplier').disabled = true;
         }

        invoiceItemsContainer.innerHTML = ''; // Clear existing items
        if (Array.isArray(invoice.items) && invoice.items.length > 0) {
             invoice.items.forEach(item => addInvoiceItemRow(item)); // addInvoiceItemRow expects {itemName, quantity, unitPrice}
        } else {
            addInvoiceItemRow(); // Add a blank row if no items exist
        }
        updateInvoiceTotal(); // Ensure total is correct after adding items

        document.getElementById('invoice-form-title').textContent = `Edit Invoice #${invoice.id}`;
        createEditInvoiceSection.classList.remove('hidden');
        createEditInvoiceSection.scrollIntoView({ behavior: 'smooth' });
        hideLoading();
    };

    // Uses Item Name now
    const deleteInvoice = (id) => {
        const invoiceIndex = invoices.findIndex(inv => inv.id === id);
         if (invoiceIndex === -1) { showMessage(invoiceMessage, `Invoice #${id} not found.`, 'error'); return; }

         const invoiceToDelete = invoices[invoiceIndex];
         if (!confirm(`Are you sure you want to delete Invoice #${id} for "${invoiceToDelete.partyName}"?\n\nStock levels for items listed (if tracked) will be reversed based on this invoice.\nThis action cannot be undone.`)) {
              return; // User cancelled
         }
         showLoading();

        const itemsToReverse = Array.isArray(invoiceToDelete.items) ? invoiceToDelete.items : [];
        let stockReversed = false;

        // Only reverse stock if items exist
         if (itemsToReverse.length > 0) {
             stockReversed = reverseStockOnInvoiceDelete(itemsToReverse, invoiceToDelete.type); // Pass item objects
             console.log(`Invoice ${id} deletion: Stock reversal initiated. Result: ${stockReversed}`);
         } else {
             console.log(`Invoice ${id} deletion: No items to reverse stock for.`);
         }


        // Remove the invoice
        invoices.splice(invoiceIndex, 1);

        // Unlink any payments linked to this deleted invoice
        let paymentsChanged = false;
        payments.forEach(p => {
            if (p.linkedInvoiceId === id) {
                p.linkedInvoiceId = null; // Unlink
                // Add a note indicating the original link
                p.notes = (p.notes ? p.notes + ' ' : '') + `(Originally linked to deleted Inv #${id})`;
                paymentsChanged = true;
                 console.log(`Unlinked Payment #${p.id} from deleted Invoice #${id}.`);
            }
        });

        saveData();
        showMessage(invoiceMessage, `Invoice #${id} deleted successfully.`, 'success');
        renderInvoiceList(); // Refresh invoice list
         if (stockReversed) {
             renderInventoryList(); // Refresh inventory list if stock was changed
             renderLowStockList(); // Refresh low stock list
         }
        if (paymentsChanged) {
            renderPaymentsList(); // Refresh payments list if any were unlinked
            // No need to update other invoice statuses here; payments drive status changes.
        }
        renderDuePaymentsList(); // Refresh due payments list
        populateInvoicePaymentSelect(); // Update payment link dropdown
        // saveData hides loading
    };


    // --- Stock Level Adjustments (Using Item Name) ---

    // Uses item.itemName
    const updateStockOnInvoiceSave = (items, invoiceType) => {
        let stockUpdated = false;
        items.forEach(item => {
             const itemNameKey = item.itemName; // Use name as the key
             const inventoryItem = inventory.find(i => i.name === itemNameKey);

             // Skip if item is not in inventory or is non-stock type
             if (!inventoryItem || ['Accommodation', 'Service'].includes(inventoryItem.category)) {
                 console.log(`   Skipping stock update for non-inventory/non-stock item: ${itemNameKey}`);
                 return;
             }

             let stockItem = stockLevels[itemNameKey];
             if (!stockItem) {
                  console.error(`!!! Stock level item NOT FOUND for inventory item: '${itemNameKey}' during NEW invoice save. Initializing.`);
                  stockItem = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                  stockLevels[itemNameKey] = stockItem;
             }

            const quantityChange = parseFloat(item.quantity || 0);
            if (isNaN(quantityChange) || quantityChange <= 0) {
                console.warn(`Invalid quantity (${item.quantity}) for item '${itemNameKey}' in new invoice. Skipping stock update.`);
                return;
            }

            const unitPrice = parseFloat(item.unitPrice || 0);
             if (isNaN(unitPrice) || unitPrice < 0) {
                 console.warn(`Invalid unit price (${item.unitPrice}) for item '${itemNameKey}' in new invoice. Skipping stock update.`);
                 return;
             }
            const amountChange = quantityChange * unitPrice;
            const oldQty = stockItem.quantity || 0; // Default to 0 if undefined
            const oldCost = stockItem.cost || 0;
            const oldRevenue = stockItem.revenue || 0;

            console.log(`   Processing item: ${itemNameKey}, Qty Change: ${quantityChange}, Type: ${invoiceType}`);

            if (invoiceType === 'customer') { // Selling items
                stockItem.quantity = oldQty - quantityChange;
                stockItem.revenue = oldRevenue + amountChange; // Add revenue
                 console.log(`   -> Customer Sale: Qty ${oldQty} -> ${stockItem.quantity}. Revenue ${formatCurrency(oldRevenue)} -> ${formatCurrency(stockItem.revenue)}`);
            } else if (invoiceType === 'supplier') { // Buying items
                stockItem.quantity = oldQty + quantityChange;
                stockItem.cost = oldCost + amountChange; // Add to total cost of acquiring this item
                // Recalculate average unit cost
                stockItem.unitCost = stockItem.quantity > 0 ? (stockItem.cost / stockItem.quantity) : 0;
                 console.log(`   -> Supplier Purchase: Qty ${oldQty} -> ${stockItem.quantity}. Cost ${formatCurrency(oldCost)} -> ${formatCurrency(stockItem.cost)}. New Unit Cost: ${formatCurrency(stockItem.unitCost)}`);
            }
            stockItem.lastUpdated = getCurrentTimestamp();
            stockUpdated = true;
        });
        // No need to render low stock here, will be done after save if stockChanged is true
        return stockUpdated; // Return true if any stock changed
    };

     // Uses item.itemName
     const updateStockOnInvoiceEdit = (previousItems, currentItems, invoiceType) => {
         let stockUpdated = false;
         // Create maps keyed by item name for efficient lookup
         const prevItemMap = new Map(previousItems.map(item => [item.itemName, item]));
         const currentItemMap = new Map(currentItems.map(item => [item.itemName, item]));
         // Get a unique set of all item names involved in the edit (both old and new)
         const allItemNames = new Set([...previousItems.map(i => i.itemName), ...currentItems.map(i => i.itemName)]);

         allItemNames.forEach(itemNameKey => {
              const inventoryItem = inventory.find(i => i.name === itemNameKey);

              // Skip if item is not in inventory or is non-stock type
              if (!inventoryItem || ['Accommodation', 'Service'].includes(inventoryItem.category)) {
                  console.log(`   Skipping stock update (edit) for non-inventory/non-stock item: ${itemNameKey}`);
                  return;
              }

             let stockItem = stockLevels[itemNameKey]; // Use name as key

             if (!stockItem) {
                  console.error(`!!! Stock level item NOT FOUND for inventory item: '${itemNameKey}' during invoice EDIT. Initializing.`);
                  stockItem = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                  stockLevels[itemNameKey] = stockItem;
             }

             // Calculate changes in quantity and total value (amount)
             const prevItem = prevItemMap.get(itemNameKey);
             const currentItem = currentItemMap.get(itemNameKey);

             const prevQuantity = prevItem ? (parseFloat(prevItem.quantity || 0) || 0) : 0;
             const currentQuantity = currentItem ? (parseFloat(currentItem.quantity || 0) || 0) : 0;
             const quantityDifference = currentQuantity - prevQuantity; // Positive if added/increased, negative if removed/decreased

             const prevUnitPrice = prevItem ? (parseFloat(prevItem.unitPrice || 0) || 0) : 0;
             const currentUnitPrice = currentItem ? (parseFloat(currentItem.unitPrice || 0) || 0) : 0;
             const prevAmount = prevQuantity * prevUnitPrice;
             const currentAmount = currentQuantity * currentUnitPrice;
             const amountDifference = currentAmount - prevAmount; // Change in the line item's total value

             // Only proceed if there's a significant change in quantity or amount
             if (Math.abs(quantityDifference) < 0.0001 && Math.abs(amountDifference) < 0.001) {
                 console.log(`   Skipping item: ${itemNameKey} - No significant change in quantity or amount.`);
                 return; // No change, skip update for this item
             }

             stockUpdated = true; // Mark that stock needs recalculation
             const oldQty = stockItem.quantity || 0;
             const oldCost = stockItem.cost || 0;
             const oldRevenue = stockItem.revenue || 0;

             console.log(`   Editing item: ${itemNameKey}, QtyDiff: ${quantityDifference}, AmountDiff: ${formatCurrency(amountDifference)}, Type: ${invoiceType}`);

             if (invoiceType === 'customer') { // Editing a sale
                 // Adjust quantity (subtract the difference)
                 stockItem.quantity = oldQty - quantityDifference;
                 // Adjust revenue (add the difference in amount)
                 stockItem.revenue = oldRevenue + amountDifference;
                  console.log(`   -> Customer Edit: Qty ${oldQty} -> ${stockItem.quantity}. Revenue ${formatCurrency(oldRevenue)} -> ${formatCurrency(stockItem.revenue)}`);
             } else if (invoiceType === 'supplier') { // Editing a purchase
                 // Adjust quantity (add the difference)
                 stockItem.quantity = oldQty + quantityDifference;
                 // Adjust total cost (add the difference in amount)
                 stockItem.cost = oldCost + amountDifference;
                 // Recalculate average unit cost
                 stockItem.unitCost = stockItem.quantity > 0 ? (stockItem.cost / stockItem.quantity) : 0;
                  console.log(`   -> Supplier Edit: Qty ${oldQty} -> ${stockItem.quantity}. Cost ${formatCurrency(oldCost)} -> ${formatCurrency(stockItem.cost)}. New Unit Cost: ${formatCurrency(stockItem.unitCost)}`);
             }
             stockItem.lastUpdated = getCurrentTimestamp();
         });

          // No need to render low stock here, will be done after save if stockChanged is true
          return stockUpdated; // Return true if any stock changed
     };


    // Uses item.itemName
     const reverseStockOnInvoiceDelete = (items, invoiceType) => {
         let stockUpdated = false;
         items.forEach(item => {
             const itemNameKey = item.itemName; // Use name as key
              const inventoryItem = inventory.find(i => i.name === itemNameKey);

              // Skip if item is not in inventory or is non-stock type
              if (!inventoryItem || ['Accommodation', 'Service'].includes(inventoryItem.category)) {
                   console.log(`   Skipping stock reversal for non-inventory/non-stock item: ${itemNameKey}`);
                  return;
              }

             const stockItem = stockLevels[itemNameKey];
             if (!stockItem) {
                 console.error(`!!! Stock level item NOT FOUND for inventory item: '${itemNameKey}' during invoice DELETE reversal. Cannot reverse stock.`);
                 return; // Can't reverse if it doesn't exist
             }

             const quantityChange = parseFloat(item.quantity || 0);
             if (isNaN(quantityChange) || quantityChange <= 0) {
                 console.warn(`Invalid quantity (${item.quantity}) for item '${itemNameKey}' in deleted invoice. Skipping reversal.`);
                 return;
             }

             const amountChange = quantityChange * (parseFloat(item.unitPrice || 0) || 0);
             if (isNaN(amountChange)) {
                  console.warn(`Invalid amount calculated for item '${itemNameKey}' in deleted invoice. Skipping reversal.`);
                  return;
             }
             const oldQty = stockItem.quantity || 0;
             const oldCost = stockItem.cost || 0;
             const oldRevenue = stockItem.revenue || 0;
             console.log(`   Reversing item: ${itemNameKey}, Qty Change: ${quantityChange}, Amount: ${formatCurrency(amountChange)}, Type: ${invoiceType}`);

             if (invoiceType === 'customer') { // Reversing a sale
                 stockItem.quantity = oldQty + quantityChange; // Add quantity back
                 stockItem.revenue = oldRevenue - amountChange; // Subtract revenue
                 console.log(`   -> Customer Delete Reversal: Qty ${oldQty} -> ${stockItem.quantity}. Revenue ${formatCurrency(oldRevenue)} -> ${formatCurrency(stockItem.revenue)}`);
             } else if (invoiceType === 'supplier') { // Reversing a purchase
                 stockItem.quantity = oldQty - quantityChange; // Subtract quantity
                 stockItem.cost = oldCost - amountChange; // Subtract cost
                 // Recalculate average unit cost
                 stockItem.unitCost = stockItem.quantity > 0 ? ((stockItem.cost || 0) / stockItem.quantity) : 0;
                 console.log(`   -> Supplier Delete Reversal: Qty ${oldQty} -> ${stockItem.quantity}. Cost ${formatCurrency(oldCost)} -> ${formatCurrency(stockItem.cost)}. New Unit Cost: ${formatCurrency(stockItem.unitCost)}`);
             }
             stockItem.lastUpdated = getCurrentTimestamp();

             // Sanity checks - prevent negative revenue/cost (though quantity can be negative)
             if (stockItem.revenue < -0.001) {
                 console.warn(`Revenue for ${itemNameKey} became negative after reversal. Setting to 0.`);
                 stockItem.revenue = 0;
             }
             if (stockItem.cost < -0.001) {
                 console.warn(`Cost for ${itemNameKey} became negative after reversal. Setting to 0.`);
                 stockItem.cost = 0;
                  // If cost is zero, unit cost should also be zero
                 stockItem.unitCost = 0;
             }
             if (stockItem.quantity < -0.001) {
                 console.warn(`Stock quantity for ${itemNameKey} is negative after reversal: ${stockItem.quantity}`);
             }


             stockUpdated = true;
         });
          // No need to render low stock here, will be done after save if stockChanged is true
          return stockUpdated; // Return true if any stock changed
     };



    // --- Invoice List Rendering ---
    const renderInvoiceList = () => {
        const invoiceListBody = document.getElementById('invoices-list');
        if (!invoiceListBody) return;
        invoiceListBody.innerHTML = ''; // Clear existing rows
        showLoading();
        const filter = invoiceListFilter.value;
        let filteredInvoices = invoices;

        // Apply filter
        if (filter === 'customer') {
            filteredInvoices = invoices.filter(inv => inv.type === 'customer');
        } else if (filter === 'supplier') {
            filteredInvoices = invoices.filter(inv => inv.type === 'supplier');
        } else if (filter === 'unpaid_partial') {
            filteredInvoices = invoices.filter(inv => inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial'));
        } // 'all' needs no filtering

        // Sort by date descending (most recent first)
        filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredInvoices.length === 0) {
            invoiceListBody.innerHTML = `<tr class="no-results"><td colspan="7">No invoices found matching filter '${filter}'.</td></tr>`;
            hideLoading();
            return;
        }

        // Populate table body
        filteredInvoices.forEach(invoice => {
            const row = invoiceListBody.insertRow();
            let statusClass = '';
            switch (invoice.paymentStatus) {
                case 'Paid': statusClass = 'status-paid'; break;
                case 'Partial': statusClass = 'status-partial'; break;
                case 'Unpaid': statusClass = 'status-unpaid'; break;
                default: statusClass = ''; // Handle unexpected status
            }

            // Create action buttons string
             let actionButtons = `
                <button class="edit-invoice-button" data-id="${invoice.id}" title="Edit Invoice">Edit</button>
                <button class="delete-invoice-button" data-id="${invoice.id}" title="Delete Invoice">Delete</button>
                <button class="pdf-invoice-button" data-id="${invoice.id}" title="Download PDF Invoice">PDF</button>
            `;
             if (invoice.type === 'customer') {
                 actionButtons += `<button class="receipt-print-button" data-id="${invoice.id}" title="Print 58mm Receipt">Receipt</button>`;
                 if (invoice.paymentStatus === 'Unpaid' || invoice.paymentStatus === 'Partial') {
                     actionButtons += `<button class="pay-now-button" data-id="${invoice.id}" title="Record Payment for this Invoice">Pay Now</button>`;
                 }
             }

            row.innerHTML = `
                <td>${invoice.id}</td>
                <td>${invoice.type.charAt(0).toUpperCase() + invoice.type.slice(1)}</td>
                <td>${invoice.partyName || 'N/A'}</td>
                <td>${formatDate(invoice.date)}</td>
                <td>${formatCurrency(invoice.totalAmount)}</td>
                <td class="${statusClass}">${invoice.paymentStatus || 'N/A'}</td>
                <td>${actionButtons}</td>
            `;

            // Add event listeners to buttons in the new row
            row.querySelector('.edit-invoice-button')?.addEventListener('click', (e) => editInvoice(parseInt(e.target.dataset.id)));
            row.querySelector('.delete-invoice-button')?.addEventListener('click', (e) => deleteInvoice(parseInt(e.target.dataset.id)));
            row.querySelector('.pdf-invoice-button')?.addEventListener('click', (e) => generateInvoicePDF(parseInt(e.target.dataset.id)));
            row.querySelector('.receipt-print-button')?.addEventListener('click', (e) => generateReceipt(parseInt(e.target.dataset.id), 'print'));
            row.querySelector('.pay-now-button')?.addEventListener('click', (e) => triggerPayNow(parseInt(e.target.dataset.id)));
        });

        hideLoading();
    };
    const triggerPayNow = (invoiceId) => {
        const invoice = invoices.find(inv => inv.id === invoiceId); if (!invoice) return; showScreen('payments'); clearPaymentForm(); try { document.getElementById('payment-date').valueAsDate = new Date(); } catch(e) { document.getElementById('payment-date').value = formatDate(new Date().toISOString()); } paymentInvoiceLinkCheck.checked = true; paymentInvoiceLinkRow.classList.remove('hidden'); paymentPartyRow.classList.add('hidden'); paymentInvoiceSelect.value = invoiceId; paymentInvoiceSelect.dispatchEvent(new Event('change')); const amountDue = calculateInvoiceBalance(invoiceId); document.getElementById('payment-amount').value = formatCurrency(amountDue > 0 ? amountDue : 0); document.getElementById('payment-amount').focus(); document.getElementById('payment-amount').select(); document.getElementById('payment-entry-section').scrollIntoView({ behavior: 'smooth' }); };


    // --- Inventory Management ---

    const handleAddItemFormSubmit = (e) => {
        e.preventDefault();
        hideMessage(inventoryMessage); // Clear previous messages
        showLoading();

        const nameInput = document.getElementById('item-name-new');
        const categorySelect = document.getElementById('item-category-new');
        const descriptionInput = document.getElementById('item-description-new');

        const name = nameInput.value.trim();
        const category = categorySelect.value;
        const description = descriptionInput.value.trim();

        // Validation
        let isValid = true;
        nameInput.style.borderColor = ''; // Reset borders
        categorySelect.style.borderColor = '';
        if (!name) {
            showMessage(inventoryMessage, 'Item Name is required.', 'error');
            nameInput.style.borderColor = 'red'; isValid = false;
        }
        if (!category) {
             // Show message only if name was valid or also invalid
             if(isValid) showMessage(inventoryMessage, 'Category is required.', 'error');
            categorySelect.style.borderColor = 'red'; isValid = false;
        }

        if (!isValid) { hideLoading(); return; }


        // Check if item *name* already exists (case-insensitive check)
        const nameLower = name.toLowerCase();
        if (inventory.some(item => item.name.toLowerCase() === nameLower)) {
             showMessage(inventoryMessage, `An item named "${name}" already exists. Item names must be unique.`, 'error');
             nameInput.style.borderColor = 'red'; // Highlight the duplicate name field
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

        saveData(); // Save includes hideLoading
         showMessage(inventoryMessage, `Item type "${name}" added successfully.`, 'success'); // No code to show

        addItemForm.reset(); // Reset form fields
        addItemSection.classList.add('hidden'); // Hide the form section
        populateItemNameDatalist(); // Update name datalist for invoice items
        renderInventoryList(); // Refresh the main inventory list
        renderLowStockList(); // Refresh low stock (new item will be 0)
        // saveData hides loading
    };


    // --- Inventory List Rendering (Uses Item Name) ---
    const renderInventoryList = (searchTerm = '') => {
        if (!inventoryListBody) return;
        inventoryListBody.innerHTML = '';
        showLoading();
        const lowerSearchTerm = searchTerm.toLowerCase();

        const filteredInventory = inventory.filter(item =>
            (item.name && item.name.toLowerCase().includes(lowerSearchTerm)) ||
            (item.category && item.category.toLowerCase().includes(lowerSearchTerm))
        );
        filteredInventory.sort((a, b) => a.name.localeCompare(b.name));

        if (filteredInventory.length === 0 && inventory.length > 0 && searchTerm) {
             inventoryListBody.innerHTML = `<tr class="no-results"><td colspan="7">No items found matching "${searchTerm}".</td></tr>`;
        } else if (inventory.length === 0) {
             inventoryListBody.innerHTML = '<tr class="no-results"><td colspan="7">No inventory items defined. Add items using the button above.</td></tr>'; // Colspan is 7 now
        } else {
            filteredInventory.forEach(item => {
                const itemNameKey = item.name; // Use name as key
                 // Ensure stock level exists, create if missing (should ideally not happen after load/add)
                 let stock = stockLevels[itemNameKey];
                 if (!stock) {
                      console.warn(`Creating missing stock level entry for '${itemNameKey}' during renderInventoryList.`);
                     stock = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                     stockLevels[itemNameKey] = stock;
                     // Optionally trigger save immediately? Or rely on next save action?
                     // saveData(); // Let's avoid saving within a render loop for performance
                 }
                 const revenue = stock.revenue || 0;
                 const cost = stock.cost || 0;
                 const quantity = stock.quantity || 0;
                 const unitCost = stock.unitCost || 0;

                 const profitLoss = revenue - cost;
                 let profitLossClass = 'profit-zero';
                 let profitLossText = formatCurrency(profitLoss);
                 let quantityDisplay = formatCurrency(quantity); // Format quantity
                 let unitCostDisplay = formatCurrency(unitCost);
                 let qtyStyle = '';

                 // Handle non-stock items specifically
                 if (['Accommodation', 'Service'].includes(item.category)) {
                     profitLossClass = 'profit-na'; profitLossText = 'N/A';
                     quantityDisplay = 'N/A'; // Quantity doesn't apply
                     unitCostDisplay = 'N/A'; // Unit cost doesn't apply
                 } else {
                     // Apply P/L colors
                     if (profitLoss > 0.001) profitLossClass = 'profit-positive';
                     else if (profitLoss < -0.001) profitLossClass = 'profit-negative';
                     // Style quantity if low/negative
                     if (quantity <= 0) qtyStyle = 'color: red; font-weight: bold;';
                 }

                 const row = inventoryListBody.insertRow();
                 row.innerHTML = `
                    <td>${item.name} ${item.description ? `<br><small>(${item.description})</small>` : ''} <br><small><em>${item.category}</em></small></td>
                    <td style="${qtyStyle}">${quantityDisplay}</td>
                    <td>${unitCostDisplay}</td>
                    <td>${formatCurrency(revenue)}</td>
                    <td>${formatCurrency(cost)}</td>
                    <td class="${profitLossClass}">${profitLossText}</td>
                    <td>${stock.lastUpdated ? formatDate(stock.lastUpdated.split('T')[0]) : 'N/A'}</td>
                 `;
            });
        }
        hideLoading();
    };


     // --- Low Stock List (Uses Item Name) ---
     const renderLowStockList = () => {
         if (!lowStockListBody || !lowStockSection || !downloadLowStockPdfButton) return;
         lowStockListBody.innerHTML = ''; // Clear previous entries
         let lowStockItems = [];

         inventory.forEach(item => {
             // Skip non-stock categories explicitly
             if (['Accommodation', 'Service'].includes(item.category)) return;

             const itemNameKey = item.name; // Use name as key
             const stock = stockLevels[itemNameKey];

             // Check if stock exists and quantity is a number <= 0
             if (stock && typeof stock.quantity === 'number' && !isNaN(stock.quantity) && stock.quantity <= 0) {
                  lowStockItems.push({ name: item.name, quantity: stock.quantity });
             }
             // Also include items where stock level might be missing (implies 0 or error)
             else if (!stock && item.name) { // Ensure item name exists
                   console.warn(`Stock level missing for item '${itemNameKey}' during low stock check. Treating as 0.`);
                   lowStockItems.push({ name: item.name, quantity: 0 });
             }
         });

         // Sort by quantity ascending (most negative/zero first), then by name
         lowStockItems.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));

         if (lowStockItems.length > 0) {
             lowStockItems.forEach(item => {
                 const row = lowStockListBody.insertRow();
                 row.innerHTML = `
                     <td>${item.name}</td>
                     <td>${formatCurrency(item.quantity)}</td>
                 `;
             });
             lowStockSection.classList.remove('hidden'); // Show section
             downloadLowStockPdfButton.classList.remove('hidden'); // Show button
         } else {
             lowStockSection.classList.add('hidden'); // Hide section if no low stock items
             downloadLowStockPdfButton.classList.add('hidden'); // Hide button
         }
     };


    // --- Export Inventory (Uses Item Name) ---
    const exportInventory = (format) => {
        showLoading();
        try {
            const dataToExport = inventory.map(item => {
                 const itemNameKey = item.name; // Use name as key
                 // Provide default values if stock level is missing (shouldn't happen ideally)
                 const stock = stockLevels[itemNameKey] || { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                 const revenue = stock.revenue || 0;
                 const cost = stock.cost || 0;
                 const profitLoss = revenue - cost;
                 const isNonStock = ['Accommodation', 'Service'].includes(item.category);

                 return {
                    // ItemCode removed
                    ItemName: item.name,
                    Category: item.category,
                    Description: item.description || '',
                    QuantityOnHand: isNonStock ? 'N/A' : (stock.quantity || 0),
                    UnitCost: isNonStock ? 'N/A' : formatCurrency(stock.unitCost || 0),
                    TotalRevenue: formatCurrency(revenue),
                    TotalCost: formatCurrency(cost),
                    ProfitLoss: isNonStock ? 'N/A' : formatCurrency(profitLoss),
                    LastUpdated: stock.lastUpdated ? formatDate(stock.lastUpdated.split('T')[0]) : ''
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
                const jsonString = JSON.stringify(dataToExport, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); triggerDownload(blob, `${filenameBase}.json`); showMessage(inventoryMessage, "Inventory exported as JSON.", "success");
            } else if (format === 'csv') {
                 // Ensure headers are extracted correctly even if first item is non-stock
                 const headers = Object.keys(dataToExport[0]);
                 const csvRows = [headers.join(',')]; // Add header row
                 dataToExport.forEach(row => {
                     // Map values in the correct order based on headers
                     const values = headers.map(header => {
                         const value = row[header] === null || row[header] === undefined ? '' : row[header];
                         // Escape double quotes within values by doubling them
                         const escaped = ('' + value).replace(/"/g, '""');
                         // Enclose each value in double quotes
                         return `"${escaped}"`;
                     });
                     csvRows.push(values.join(',')); // Join values with commas
                 });
                 const csvString = csvRows.join('\r\n'); // Join rows with CRLF
                 // Add BOM for better Excel compatibility with UTF-8
                 const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
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
     const triggerDownload = (blob, filename) => {
        try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { console.error("Error triggering download:", e); } };


    // --- Payment Management ---
    const clearPaymentForm = () => {
        paymentForm.reset();
        document.getElementById('payment-id').value = '';
        try {
             document.getElementById('payment-date').valueAsDate = new Date();
         } catch(e) {
             document.getElementById('payment-date').value = formatDate(new Date().toISOString());
         }
        paymentInvoiceLinkCheck.checked = false;
        paymentInvoiceLinkRow?.classList.add('hidden');
        paymentPartyRow?.classList.remove('hidden');
        if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = '';
        if(paymentInvoiceSelect) paymentInvoiceSelect.value = '';
        hideMessage(paymentsMessage);
        // Reset borders
         document.getElementById('payment-date').style.borderColor = '';
         document.getElementById('payment-amount').style.borderColor = '';
         document.getElementById('payment-invoice-id').style.borderColor = '';
         document.getElementById('payment-party-name').style.borderColor = '';
    };
    const calculateInvoiceBalance = (invoiceId) => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return 0;
        const totalPaid = payments
            .filter(p => p.linkedInvoiceId === invoiceId)
            .reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);
        const totalAmount = parseFloat(invoice.totalAmount || 0) || 0;
        const balance = totalAmount - totalPaid;
        // Return balance rounded to 2 decimal places to avoid floating point issues
        return parseFloat(balance.toFixed(2));
    };
    const updateInvoicePaymentStatus = (invoiceId) => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice || invoice.type !== 'customer') return false;

        const balance = calculateInvoiceBalance(invoiceId);
        const totalAmount = parseFloat(invoice.totalAmount || 0) || 0;
        const oldStatus = invoice.paymentStatus;
        let newStatus;

        const tolerance = 0.001; // Tolerance for floating point comparisons

        if (balance >= totalAmount - tolerance) {
            newStatus = 'Unpaid'; // If balance is equal to or greater than total (e.g., 0 payment)
        } else if (balance > tolerance) {
            newStatus = 'Partial'; // If there's still a balance due > 0
        } else {
            newStatus = 'Paid'; // If balance is zero or less
        }


        if (oldStatus !== newStatus) {
            invoice.paymentStatus = newStatus;
            invoice.lastUpdated = getCurrentTimestamp();
            console.log(`Updated status for Invoice #${invoiceId} to ${invoice.paymentStatus}`);
            return true; // Status changed
        }
        return false; // Status did not change
    };
    const updateSupplierInvoicePaymentStatus = (invoiceId) => {
        // Simplified for suppliers: Paid if any payment linked, Unpaid otherwise
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice || invoice.type !== 'supplier') return false;

        const hasPayments = payments.some(p => p.linkedInvoiceId === invoiceId);
        const oldStatus = invoice.paymentStatus;
        // Note: We don't typically track partial payments *to* suppliers in this simple model.
        // A single payment might cover it fully or partially, but we mark it 'Paid'.
        const newStatus = hasPayments ? 'Paid' : 'Unpaid';

        if (oldStatus !== newStatus) {
            invoice.paymentStatus = newStatus;
            invoice.lastUpdated = getCurrentTimestamp();
            console.log(`Updated status for Supplier Invoice #${invoiceId} to ${invoice.paymentStatus}`);
            return true;
        }
        return false;
    };

    const handlePaymentFormSubmit = (e) => {
        e.preventDefault();
        hideMessage(paymentsMessage); // Clear previous messages
        showLoading();

        // Reset validation styles
         document.getElementById('payment-date').style.borderColor = '';
         document.getElementById('payment-amount').style.borderColor = '';
         document.getElementById('payment-invoice-id').style.borderColor = '';
         document.getElementById('payment-party-name').style.borderColor = '';

        const paymentId = document.getElementById('payment-id').value;
        const date = document.getElementById('payment-date').value;
        const amountInput = document.getElementById('payment-amount');
        const amount = parseFloat(amountInput.value);
        const method = document.getElementById('payment-method').value;
        const linkToInvoice = paymentInvoiceLinkCheck.checked;
        const linkedInvoiceIdInput = document.getElementById('payment-invoice-id');
        const linkedInvoiceId = linkToInvoice ? parseInt(linkedInvoiceIdInput.value, 10) : null;
        const partyNameInput = document.getElementById('payment-party-name');


        // --- Validation ---
        let isValid = true;
        if (!date) {
             showMessage(paymentsMessage, 'Please select a payment date.', 'error');
             document.getElementById('payment-date').style.borderColor = 'red';
             isValid = false;
        }
        if (isNaN(amount) || amount <= 0) {
             showMessage(paymentsMessage, 'Please enter a valid positive payment amount.', 'error');
             amountInput.style.borderColor = 'red';
             isValid = false;
        }

        let partyName = '';
        let partyType = 'customer'; // Default

        if (linkToInvoice) {
            if (!linkedInvoiceId || isNaN(linkedInvoiceId)) {
                // Show message only if other fields were valid
                if (isValid) showMessage(paymentsMessage, 'Please select a valid invoice to link.', 'error');
                linkedInvoiceIdInput.style.borderColor = 'red';
                isValid = false;
            } else {
                 const selectedOption = linkedInvoiceIdInput.options[linkedInvoiceIdInput.selectedIndex];
                 partyName = selectedOption ? selectedOption.dataset.partyName : '';
                 // Determine partyType from linked invoice (important for statement)
                  const linkedInvoice = invoices.find(inv => inv.id === linkedInvoiceId);
                  if (linkedInvoice) {
                      partyType = linkedInvoice.type; // Should be 'customer' based on dropdown population
                  } else {
                       // Invoice disappeared between selection and submission? Rare.
                       showMessage(paymentsMessage, `Error: Linked invoice #${linkedInvoiceId} not found.`, 'error');
                       isValid = false;
                  }
            }
        } else { // Not linking to invoice
            partyName = partyNameInput.value.trim();
            partyType = paymentPartyType.value;
            if (!partyName) {
                if (isValid) showMessage(paymentsMessage, 'Please enter the Customer/Supplier Name if not linking to an invoice.', 'error');
                partyNameInput.style.borderColor = 'red';
                isValid = false;
            }
        }

        if (!isValid) { hideLoading(); return; } // Stop if validation failed

        // --- Overpayment Check (if linking customer invoice) ---
        if (linkToInvoice && partyType === 'customer') {
             const associatedInvoice = invoices.find(inv => inv.id === linkedInvoiceId);
             if (associatedInvoice) {
                  // Calculate balance *before* this potential payment
                  const currentPaid = payments
                     .filter(p => p.linkedInvoiceId === linkedInvoiceId && (!paymentId || p.id !== parseInt(paymentId, 10))) // Exclude payment being edited
                     .reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);
                  const invoiceTotal = parseFloat(associatedInvoice.totalAmount || 0) || 0;
                  const invoiceBalance = parseFloat((invoiceTotal - currentPaid).toFixed(2)); // Use rounded balance
                  const overpaymentTolerance = 0.01;

                  if (amount > invoiceBalance + overpaymentTolerance) {
                       if (!confirm(`Warning: Payment (${formatCurrency(amount)}) exceeds the current balance (${formatCurrency(invoiceBalance)}) for Invoice #${linkedInvoiceId}.\n\nDo you want to record this payment anyway?`)) {
                            hideLoading();
                            return; // User cancelled overpayment
                       }
                  }
             }
             // No need for 'else' here, we already validated invoice existence
        }


        // --- Prepare Payment Data ---
        const reference = document.getElementById('payment-reference').value.trim();
        const notes = document.getElementById('payment-notes').value.trim();

        const paymentData = {
            id: paymentId ? parseInt(paymentId, 10) : nextPaymentId,
            date, amount, method,
            linkedInvoiceId: linkToInvoice ? linkedInvoiceId : null, // Store linked ID
            partyType, // Store whether it's customer/supplier payment
            partyName, // Store the name (either from invoice or manual input)
            reference, notes,
            lastUpdated: getCurrentTimestamp()
        };

        // --- Save Payment and Update Statuses ---
        let invoiceStatusNeedsUpdate = false;
        let previousLinkedInvoiceId = null;

        if (paymentId) { // Editing existing payment
            const index = payments.findIndex(p => p.id === parseInt(paymentId, 10));
            if (index > -1) {
                previousLinkedInvoiceId = payments[index].linkedInvoiceId; // Store old linked ID
                payments[index] = paymentData; // Update payment in array
                console.log(`Payment ${paymentData.id} updated.`);
            } else {
                // Should not happen if edit button was clicked correctly
                console.error(`Payment ID ${paymentId} not found for update.`);
                showMessage(paymentsMessage, `Error: Payment ID ${paymentId} not found. Cannot update.`, 'error');
                hideLoading(); return;
            }
        } else { // Adding new payment
            payments.push(paymentData);
            nextPaymentId++;
            console.log(`Payment ${paymentData.id} created.`);
        }

        // Update status of the *currently* linked invoice (if any)
        if (paymentData.linkedInvoiceId) {
            const currentInvoice = invoices.find(inv => inv.id === paymentData.linkedInvoiceId);
            if (currentInvoice) {
                const changed = currentInvoice.type === 'customer'
                    ? updateInvoicePaymentStatus(paymentData.linkedInvoiceId)
                    : updateSupplierInvoicePaymentStatus(paymentData.linkedInvoiceId);
                if (changed) invoiceStatusNeedsUpdate = true;
            }
        }

        // If editing, also update status of the *previously* linked invoice (if different and existed)
        if (paymentId && previousLinkedInvoiceId && previousLinkedInvoiceId !== paymentData.linkedInvoiceId) {
            const prevInvoice = invoices.find(inv => inv.id === previousLinkedInvoiceId);
            if (prevInvoice) {
                const changed = prevInvoice.type === 'customer'
                    ? updateInvoicePaymentStatus(previousLinkedInvoiceId)
                    : updateSupplierInvoicePaymentStatus(previousLinkedInvoiceId);
                if (changed) invoiceStatusNeedsUpdate = true;
            }
        }

        // --- Finalize ---
        saveData();
        showMessage(paymentsMessage, `Payment ${paymentId ? 'updated' : 'recorded'} successfully!`, 'success');
        clearPaymentForm();
        renderPaymentsList(); // Always refresh payment list

        if (invoiceStatusNeedsUpdate) { // Refresh invoice lists only if a status changed
            renderInvoiceList();
            renderDuePaymentsList();
        }
        populatePartyDatalist(partyNameListStatement); // Update statement datalist
        populateInvoicePaymentSelect(); // Refresh invoice selection dropdown
        // saveData hides loading
    };
    const editPayment = (id) => {
        showLoading();
        const payment = payments.find(p => p.id === id);
        if (!payment) {
            showMessage(paymentsMessage, `Payment ${id} not found.`, 'error');
            hideLoading();
            return;
        }
        hideMessage(paymentsMessage); // Clear message area

        // Populate form fields
        document.getElementById('payment-id').value = payment.id;
        document.getElementById('payment-date').value = formatDate(payment.date);
        document.getElementById('payment-amount').value = payment.amount;
        document.getElementById('payment-method').value = payment.method;
        document.getElementById('payment-reference').value = payment.reference || '';
        document.getElementById('payment-notes').value = payment.notes || '';

        populateInvoicePaymentSelect(); // Ensure dropdown is up-to-date

        if (payment.linkedInvoiceId) {
            paymentInvoiceLinkCheck.checked = true;
            paymentInvoiceLinkRow?.classList.remove('hidden');
            paymentPartyRow?.classList.add('hidden');
             // Select the correct invoice, even if it's now paid off (it should still be in the list if it exists)
             if (paymentInvoiceSelect.querySelector(`option[value="${payment.linkedInvoiceId}"]`)) {
                 paymentInvoiceSelect.value = payment.linkedInvoiceId;
             } else {
                 // If the invoice is somehow missing from the dropdown (e.g., deleted), show warning but keep ID
                 console.warn(`Linked invoice ${payment.linkedInvoiceId} not found in dropdown during edit.`);
                 paymentInvoiceSelect.value = ''; // Clear selection visually
                  // Optionally add a temporary option? Or just rely on the hidden ID?
             }

            paymentInvoiceSelect.dispatchEvent(new Event('change')); // Trigger balance display
        } else {
            paymentInvoiceLinkCheck.checked = false;
            paymentInvoiceLinkRow?.classList.add('hidden');
            paymentPartyRow?.classList.remove('hidden');
            paymentPartyType.value = payment.partyType || 'customer';
            document.getElementById('payment-party-name').value = payment.partyName || '';
            if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = '';
            paymentInvoiceSelect.value = ''; // Ensure dropdown is cleared
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
        const paymentToDelete = payments[paymentIndex];
        if (!confirm(`Are you sure you want to delete Payment #${id} for ${paymentToDelete.partyName} (${formatCurrency(paymentToDelete.amount)})?\n\nThis will update the status of the linked invoice (if any).\nThis action cannot be undone.`)) {
            return;
        }

        showLoading();
        const linkedInvoiceId = paymentToDelete.linkedInvoiceId;

        // Remove the payment
        payments.splice(paymentIndex, 1);
        console.log(`Payment ${id} deleted.`);

        let invoiceStatusNeedsUpdate = false;
        // Update status of the previously linked invoice (if any)
        if (linkedInvoiceId) {
            const invoice = invoices.find(inv => inv.id === linkedInvoiceId);
            if (invoice) {
                const changed = invoice.type === 'customer'
                    ? updateInvoicePaymentStatus(linkedInvoiceId)
                    : updateSupplierInvoicePaymentStatus(linkedInvoiceId);
                if (changed) invoiceStatusNeedsUpdate = true;
            } else {
                console.warn(`Invoice #${linkedInvoiceId} linked to deleted payment was not found.`);
            }
        }

        // --- Finalize ---
        saveData();
        showMessage(paymentsMessage, `Payment #${id} deleted successfully.`, 'success');
        renderPaymentsList(); // Always refresh payment list

        if (invoiceStatusNeedsUpdate) { // Refresh invoice lists only if a status changed
            renderInvoiceList();
            renderDuePaymentsList();
        }
        populateInvoicePaymentSelect(); // Refresh invoice selection dropdown
        // saveData hides loading
    };


    // --- Payments List Rendering ---
    const renderPaymentsList = () => {
        if (!paymentsListBody) return;
        paymentsListBody.innerHTML = ''; // Clear existing rows
        showLoading();
        // Sort by date descending, then ID descending as tie-breaker
        const sortedPayments = [...payments].sort((a, b) => {
            const dateDiff = new Date(b.date) - new Date(a.date);
            if (dateDiff !== 0) return dateDiff;
            return b.id - a.id;
        });

        if (sortedPayments.length === 0) {
            paymentsListBody.innerHTML = '<tr class="no-results"><td colspan="8">No payments recorded yet.</td></tr>';
            hideLoading();
            return;
        }

        sortedPayments.forEach(payment => {
            const row = paymentsListBody.insertRow();
            // Display party name and type (customer/supplier)
            const partyDisplay = payment.partyName
                ? `${payment.partyName} <small>(${payment.partyType || 'N/A'})</small>`
                : 'N/A';
            // Combine notes and reference for display
            const notesDisplay = `${payment.notes || ''} ${payment.reference ? '<br><small>Ref: ' + payment.reference + '</small>' : ''}`.trim();
            // Create link for invoice ID if present
            const invoiceLink = payment.linkedInvoiceId
                ? `<a href="#" onclick="event.preventDefault(); viewInvoiceFromPayment(${payment.linkedInvoiceId});" title="View Invoice #${payment.linkedInvoiceId}">${'#' + payment.linkedInvoiceId}</a>`
                : 'N/A';

            row.innerHTML = `
                <td>${payment.id}</td>
                <td>${formatDate(payment.date)}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${payment.method}</td>
                <td>${invoiceLink}</td>
                <td>${partyDisplay}</td>
                <td>${notesDisplay || '<small><em>(none)</em></small>'}</td>
                <td>
                    <button class="edit-payment-button" data-id="${payment.id}" title="Edit Payment">Edit</button>
                    <button class="delete-payment-button" data-id="${payment.id}" title="Delete Payment">Delete</button>
                    <button class="pdf-payment-button" data-id="${payment.id}" title="Download Payment Receipt">Receipt</button>
                </td>
            `;

            // Add event listeners for the buttons in this row
            row.querySelector('.edit-payment-button')?.addEventListener('click', (e) => editPayment(parseInt(e.target.dataset.id)));
            row.querySelector('.delete-payment-button')?.addEventListener('click', (e) => deletePayment(parseInt(e.target.dataset.id)));
            row.querySelector('.pdf-payment-button')?.addEventListener('click', (e) => generatePaymentReceiptPDF(parseInt(e.target.dataset.id)));
        });
        hideLoading();
    };
    // Helper function to navigate to invoice edit screen from payment list link
    window.viewInvoiceFromPayment = (invoiceId) => {
         // Find the invoice first to make sure it exists
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice) {
             alert(`Invoice #${invoiceId} could not be found.`);
             return;
         }
        editInvoice(invoiceId); // Populate the form with invoice data
        showScreen('invoices'); // Switch to the invoices screen
        // Scroll to the form after a short delay to ensure it's visible
        setTimeout(() => {
            document.getElementById('create-edit-invoice-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };
    const renderDuePaymentsList = () => {
         if (!dueInvoicesListBody) return;
         dueInvoicesListBody.innerHTML = ''; // Clear existing rows
         showLoading();
         const today = new Date();
         today.setHours(0, 0, 0, 0); // Set to start of today for comparison

         // Filter for CUSTOMER invoices that are Unpaid or Partial
         const dueInvoices = invoices.filter(inv =>
             inv.type === 'customer' && (inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial')
         );

         // Sort by due date ascending (oldest due first), then by ID descending
         dueInvoices.sort((a, b) => {
             const dateA = a.dueDate && !isNaN(new Date(a.dueDate).getTime()) ? new Date(a.dueDate) : new Date('9999-12-31'); // Treat missing due date as far future
             const dateB = b.dueDate && !isNaN(new Date(b.dueDate).getTime()) ? new Date(b.dueDate) : new Date('9999-12-31');
             dateA.setHours(0,0,0,0);
             dateB.setHours(0,0,0,0);
             // Primary sort: Due Date Ascending
             if (dateA.getTime() !== dateB.getTime()) {
                 return dateA - dateB;
             }
             // Secondary sort: Invoice ID Descending (newer invoices first if due dates are same)
             return b.id - a.id;
         });

         if (dueInvoices.length === 0) {
             dueInvoicesListBody.innerHTML = '<tr class="no-results"><td colspan="6">No outstanding customer invoices.</td></tr>';
             hideLoading();
             return;
         }

         let hasVisibleDueInvoices = false;
         dueInvoices.forEach(invoice => {
             const amountDue = calculateInvoiceBalance(invoice.id);
             // Only display if there is actually an amount due
             if (amountDue <= 0.001) return;

             hasVisibleDueInvoices = true;
             let dueDateObj = null;
             let isOverdue = false;
             let overdueTag = '';
             // Check if due date is valid and in the past
             if (invoice.dueDate && !isNaN(new Date(invoice.dueDate).getTime())) {
                 dueDateObj = new Date(invoice.dueDate);
                 dueDateObj.setHours(0,0,0,0);
                 if (dueDateObj < today) {
                     isOverdue = true;
                     overdueTag = ' <span class="overdue-tag">(Overdue)</span>';
                 }
             }

             const row = dueInvoicesListBody.insertRow();
             row.className = isOverdue ? 'overdue' : ''; // Add class for styling overdue rows

             row.innerHTML = `
                 <td>${invoice.id}</td>
                 <td>${invoice.partyName}</td>
                 <td>${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'} ${overdueTag}</td>
                 <td>${formatCurrency(invoice.totalAmount)}</td>
                 <td>${formatCurrency(amountDue)}</td>
                 <td>
                     <button class="pay-now-button" data-id="${invoice.id}" title="Record Payment">Record Pymt</button>
                     <button class="view-invoice-button" data-id="${invoice.id}" title="View Invoice Details">View Inv.</button>
                 </td>
             `;

             // Add event listeners for buttons in this row
             row.querySelector('.pay-now-button')?.addEventListener('click', (e) => triggerPayNow(parseInt(e.target.dataset.id)));
             row.querySelector('.view-invoice-button')?.addEventListener('click', (e) => {
                 editInvoice(parseInt(e.target.dataset.id));
                 showScreen('invoices');
                 setTimeout(() => {
                     document.getElementById('create-edit-invoice-section')?.scrollIntoView({ behavior: 'smooth' });
                 }, 100);
             });
         });

         // If all due invoices had zero balance, show the no results message
         if (!hasVisibleDueInvoices) {
             dueInvoicesListBody.innerHTML = '<tr class="no-results"><td colspan="6">No outstanding customer invoices found with a balance due.</td></tr>';
         }
         hideLoading();
     };


    // --- Account Statement ---
    const generateStatement = (partyName) => {
        if (!statementListBody || !statementResultsSection || !statementResultsTitle || !downloadStatementPdfButton) return;
        statementListBody.innerHTML = ''; // Clear previous results
        statementResultsSection.classList.remove('hidden'); // Show results section
        statementResultsTitle.textContent = partyName; // Set title
        downloadStatementPdfButton.classList.add('hidden'); // Hide PDF button initially
        hideMessage(statementMessage); // Hide any previous messages
        showLoading();

        let balance = 0;
        const statementEntries = [];

        // 1. Gather Invoices for the party
        invoices.forEach(inv => {
            if (inv.partyName === partyName) {
                let transactionType = '';
                let reference = `Inv #${inv.id}`;
                let debit = 0;
                let credit = 0;
                const amount = parseFloat(inv.totalAmount || 0) || 0;

                if (inv.type === 'customer') {
                    transactionType = 'Invoice Issued';
                    debit = amount; // Customer owes us (Debit Accounts Receivable)
                    if (inv.dueDate) reference += ` (Due: ${formatDate(inv.dueDate)})`;
                } else { // Supplier Invoice
                    transactionType = 'Bill Received';
                    credit = amount; // We owe supplier (Credit Accounts Payable)
                    if (inv.supplierInvoiceNumber) reference += ` / Supp Ref: ${inv.supplierInvoiceNumber}`;
                }
                statementEntries.push({
                    date: inv.date,
                    type: transactionType,
                    reference: reference,
                    debit: debit,
                    credit: credit,
                    timestamp: new Date(inv.date).getTime() // Add timestamp for precise sorting
                });
            }
        });

        // 2. Gather Payments for the party
        payments.forEach(pay => {
            if (pay.partyName === partyName) {
                let transactionType = '';
                let reference = `Pay ID #${pay.id}`;
                let debit = 0;
                let credit = 0;
                const amount = parseFloat(pay.amount || 0) || 0;

                if (pay.partyType === 'customer') {
                    transactionType = 'Payment Received';
                    credit = amount; // Reduces what customer owes us (Credit Accounts Receivable)
                } else { // Supplier Payment
                    transactionType = 'Payment Made';
                    debit = amount; // Reduces what we owe supplier (Debit Accounts Payable)
                }

                if (pay.method) reference += ` (${pay.method})`;
                if (pay.reference) reference += ` Ref: ${pay.reference}`;
                if (pay.linkedInvoiceId) reference += ` (For Inv #${pay.linkedInvoiceId})`;

                statementEntries.push({
                    date: pay.date,
                    type: transactionType,
                    reference: reference,
                    debit: debit,
                    credit: credit,
                    // Add a small offset to timestamp for payments to appear after invoices on the same day
                    timestamp: new Date(pay.date).getTime() + 1
                });
            }
        });

        // 3. Sort transactions chronologically
        statementEntries.sort((a, b) => a.timestamp - b.timestamp);

        if (statementEntries.length === 0) {
            statementListBody.innerHTML = '<tr class="no-results"><td colspan="6">No transactions found for this party.</td></tr>';
            finalBalanceAmountSpan.textContent = '0.00';
            finalBalanceTypeSpan.textContent = '';
            finalBalanceAmountSpan.className = 'final-balance-amount';
            hideLoading();
            return;
        }

        // 4. Calculate running balance and populate table
        balance = 0; // Reset balance before iteration
        statementEntries.forEach(entry => {
            const debitAmount = parseFloat(entry.debit || 0);
            const creditAmount = parseFloat(entry.credit || 0);
            balance += (debitAmount - creditAmount); // Update running balance

            const row = statementListBody.insertRow();
            const balanceClass = balance > 0.001 ? 'positive-balance' : (balance < -0.001 ? 'negative-balance' : ''); // Tolerance for floating point

            row.innerHTML = `
                <td>${formatDate(entry.date)}</td>
                <td>${entry.type}</td>
                <td>${entry.reference}</td>
                <td class="amount">${debitAmount > 0 ? formatCurrency(debitAmount) : ''}</td>
                <td class="amount">${creditAmount > 0 ? formatCurrency(creditAmount) : ''}</td>
                <td class="amount ${balanceClass}">${formatCurrency(balance)}</td>
            `;
        });

        // 5. Display Final Balance
        const finalBalance = balance; // Use the last calculated balance
        finalBalanceAmountSpan.textContent = formatCurrency(Math.abs(finalBalance));
        finalBalanceAmountSpan.className = `final-balance-amount ${finalBalance > 0.001 ? 'positive-balance' : (finalBalance < -0.001 ? 'negative-balance' : '')}`;
        // Determine balance type description based on the sign
         if (finalBalance > 0.001) {
             finalBalanceTypeSpan.textContent = '(Amount Owed To Us / Debit Balance)';
         } else if (finalBalance < -0.001) {
             finalBalanceTypeSpan.textContent = '(Amount We Owe / Credit Balance)';
         } else {
             finalBalanceTypeSpan.textContent = '(Settled)';
         }

        downloadStatementPdfButton.classList.remove('hidden'); // Show PDF button now
        hideLoading();
        statementResultsSection.scrollIntoView({behavior: 'smooth'});
    };


    // --- Settings Management ---
    const applySettings = () => {
        // Apply QR code preview
        if (settings.paymentQrImageData) {
            qrCodePreview.src = settings.paymentQrImageData;
            qrCodePreview.style.display = 'block';
            removeQrImageButton.style.display = 'inline-block';
        } else {
            qrCodePreview.src = '#'; // Use placeholder or leave empty
            qrCodePreview.style.display = 'none';
            removeQrImageButton.style.display = 'none';
        }
        // Other settings might apply elsewhere (e.g., company name in PDFs/Receipts)
        console.log("Settings applied (QR code preview updated).");
    };
    const loadSettingsIntoForm = () => {
        settingCompanyNameInput.value = settings.companyName || '';
        settingAddress1Input.value = settings.address1 || '';
        settingAddress2Input.value = settings.address2 || '';
        settingPhoneInput.value = settings.phone || '';
        settingEmailInput.value = settings.email || '';
        // Clear the file input - user must re-select if changing
        settingPaymentQrImageInput.value = null;
        // Update the preview based on currently saved settings
        applySettings();
        hideMessage(companySettingsMessage); // Hide previous messages
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
        hideMessage(companySettingsMessage); // Hide previous messages
        try {
            // Update settings object from form inputs
            settings.companyName = settingCompanyNameInput.value.trim();
            settings.address1 = settingAddress1Input.value.trim();
            settings.address2 = settingAddress2Input.value.trim();
            settings.phone = settingPhoneInput.value.trim();
            settings.email = settingEmailInput.value.trim();

            const qrImageFile = settingPaymentQrImageInput.files[0];
            if (qrImageFile) {
                 // Validate file type and size before reading
                 if (qrImageFile.size > 2 * 1024 * 1024) { // 2MB limit
                      throw new Error("Image file size exceeds 2MB limit.");
                 }
                 if (!['image/png', 'image/jpeg', 'image/gif'].includes(qrImageFile.type)) {
                      throw new Error("Invalid image file type. Please use PNG, JPG, or GIF.");
                 }
                // Read the new file as Data URL
                settings.paymentQrImageData = await readFileAsDataURL(qrImageFile);
                console.log("QR Code image updated.");
            }
            // Note: If no new file is selected, settings.paymentQrImageData remains unchanged (or null if removed)

            saveData(); // Save updated settings
            applySettings(); // Update UI elements like the preview
            showMessage(companySettingsMessage, 'Settings saved successfully.', 'success');
        } catch (error) {
            console.error("Error saving settings:", error);
            showMessage(companySettingsMessage, `Error saving settings: ${error.message}`, 'error');
        } finally {
            // saveData hides loading
        }
    };


    // --- Backup & Restore ---
    const handleBackup = () => {
        showLoading();
        try {
            // Ensure consistency before backup
            const itemNames = inventory.map(item => item.name.toLowerCase());
            const hasDuplicates = itemNames.some((name, index) => itemNames.indexOf(name) !== index);
            if (hasDuplicates) throw new Error("Duplicate item names detected. Please fix before backing up.");

             // Ensure stock levels are consistent with inventory
             const validatedStockLevels = {};
             let missingStock = false;
             inventory.forEach(item => {
                  if (!item || !item.name) return; // Skip invalid inventory items
                 if (!stockLevels[item.name]) {
                     console.warn(`Missing stock level for '${item.name}' during backup. Initializing.`);
                     validatedStockLevels[item.name] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                     missingStock = true;
                 } else {
                     validatedStockLevels[item.name] = stockLevels[item.name];
                 }
             });
              // If we had to initialize missing stock, maybe warn user or just include it?
             if (missingStock) {
                  console.log("Using validated stock levels (with initializations) for backup.");
             }


            const dataToBackup = {
                invoices,
                inventory, // Contains { name, category, description }
                stockLevels: missingStock ? validatedStockLevels : stockLevels, // Use corrected if needed
                payments,
                settings,
                nextInvoiceId,
                nextPaymentId,
                backupTimestamp: getCurrentTimestamp(),
                appVersion: '1.2.1-no-code' // Indicate version without code
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
        if (!confirm('WARNING: Restoring data will overwrite all current information. This action cannot be undone.\n\nAre you sure you want to proceed?')) { restoreFileInput.value = ''; restoreButton.disabled = true; return; }

        showLoading();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredData = JSON.parse(e.target.result);

                // --- Data Validation (Updated for no-code structure) ---
                 if (!restoredData || typeof restoredData !== 'object') throw new Error("Invalid backup file format (not an object).");
                 if (!Array.isArray(restoredData.invoices)) throw new Error("Backup missing/invalid 'invoices' array.");
                 if (!Array.isArray(restoredData.inventory)) throw new Error("Backup missing/invalid 'inventory' array.");
                 // Check if inventory items have names (basic check)
                 if (restoredData.inventory.some(item => !item || typeof item.name !== 'string')) {
                      throw new Error("Inventory data format mismatch (items must have a 'name').");
                 }
                 // Check for duplicate names in restored inventory (case-insensitive)
                const restoredNames = restoredData.inventory.map(item => item.name.toLowerCase());
                if (restoredNames.some((name, index) => restoredNames.indexOf(name) !== index)) {
                    throw new Error("Backup contains duplicate item names. Cannot restore.");
                }

                 if (typeof restoredData.stockLevels !== 'object' || restoredData.stockLevels === null) throw new Error("Backup missing/invalid 'stockLevels' object.");
                 if (!Array.isArray(restoredData.payments)) throw new Error("Backup missing/invalid 'payments' array.");
                 if (typeof restoredData.settings !== 'object' || restoredData.settings === null) throw new Error("Backup missing/invalid 'settings' object.");
                 // Validate IDs are numbers and positive integers
                 if (typeof restoredData.nextInvoiceId !== 'number' || restoredData.nextInvoiceId < 1 || !Number.isInteger(restoredData.nextInvoiceId)) throw new Error("Invalid 'nextInvoiceId' (must be positive integer).");
                 if (typeof restoredData.nextPaymentId !== 'number' || restoredData.nextPaymentId < 1 || !Number.isInteger(restoredData.nextPaymentId)) throw new Error("Invalid 'nextPaymentId' (must be positive integer).");
                 console.log("Backup file basic structure validated (no-code).");

                 // --- Apply Restored Data (Temporarily) ---
                 const tempInvoices = restoredData.invoices;
                 const tempInventory = restoredData.inventory;
                 const tempStockLevels = restoredData.stockLevels;
                 const tempPayments = restoredData.payments;
                  const tempSettings = { companyName: '', address1: '', address2:'', phone: '', email: '', paymentQrImageData: null, ...restoredData.settings };
                 const tempNextInvoiceId = restoredData.nextInvoiceId;
                 const tempNextPaymentId = restoredData.nextPaymentId;

                 // --- Post-Restore Validation & Cleanup ---
                 const currentInventoryNames = new Set(tempInventory.map(item => item.name));
                 const validatedStockLevels = {};
                 let validationIssues = [];

                 // 1. Ensure stock level exists for every inventory item and validate properties
                 tempInventory.forEach(item => {
                     const itemNameKey = item.name;
                     const stock = tempStockLevels[itemNameKey];
                     if (stock && typeof stock === 'object') {
                         validatedStockLevels[itemNameKey] = {
                             quantity: (typeof stock.quantity === 'number' && !isNaN(stock.quantity)) ? stock.quantity : 0,
                             unitCost: (typeof stock.unitCost === 'number' && !isNaN(stock.unitCost)) ? stock.unitCost : 0,
                             revenue: (typeof stock.revenue === 'number' && !isNaN(stock.revenue)) ? stock.revenue : 0,
                             cost: (typeof stock.cost === 'number' && !isNaN(stock.cost)) ? stock.cost : 0,
                             lastUpdated: stock.lastUpdated || null
                         };
                         // Add sanity checks for consistency
                         if (validatedStockLevels[itemNameKey].quantity <= 0 && validatedStockLevels[itemNameKey].unitCost !== 0) {
                              console.warn(`Restore: Stock for ${itemNameKey} has <= 0 quantity but non-zero unit cost. Resetting unit cost.`);
                              validatedStockLevels[itemNameKey].unitCost = 0;
                         }
                         if (validatedStockLevels[itemNameKey].quantity <= 0 && validatedStockLevels[itemNameKey].cost !== 0) {
                              console.warn(`Restore: Stock for ${itemNameKey} has <= 0 quantity but non-zero total cost. Resetting cost.`);
                              validatedStockLevels[itemNameKey].cost = 0;
                              validatedStockLevels[itemNameKey].unitCost = 0;
                         }
                     } else {
                         validatedStockLevels[itemNameKey] = { quantity: 0, unitCost: 0, lastUpdated: null, revenue: 0, cost: 0 };
                         validationIssues.push(`Initialized missing/invalid stock level for '${itemNameKey}'.`);
                     }
                 });

                 // 2. Remove orphaned stock levels
                 Object.keys(tempStockLevels).forEach(key => {
                     if (!currentInventoryNames.has(key)) {
                         validationIssues.push(`Removed orphaned stockLevel data for non-existent item '${key}'.`);
                     }
                 });

                 // 3. Validate invoice/payment data (basic checks)
                 tempInvoices.forEach((inv, index) => {
                      if (!inv || typeof inv !== 'object') { validationIssues.push(`Invalid invoice data at index ${index}.`); return; }
                     if (isNaN(new Date(inv.date).getTime())) validationIssues.push(`Invoice ID ${inv.id || '(no ID)'} has invalid date: ${inv.date}.`);
                     if (typeof inv.totalAmount !== 'number') validationIssues.push(`Invoice ID ${inv.id || '(no ID)'} has invalid totalAmount.`);
                      if (!Array.isArray(inv.items)) { validationIssues.push(`Invoice ID ${inv.id || '(no ID)'} missing items array.`); inv.items = []; }
                      inv.items.forEach((item, itemIndex) => {
                           if (!item || !item.itemName || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
                                validationIssues.push(`Invoice ID ${inv.id || '(no ID)'}, item index ${itemIndex} has invalid data.`);
                           }
                       });
                      // Ensure correct payment status enum values
                      if (inv.type === 'customer' && !['Paid', 'Unpaid', 'Partial'].includes(inv.paymentStatus)) {
                          validationIssues.push(`Invoice ID ${inv.id || '(no ID)'} has invalid customer payment status: ${inv.paymentStatus}. Setting to Unpaid.`);
                          inv.paymentStatus = 'Unpaid'; // Correct it
                      } else if (inv.type === 'supplier' && !['Paid', 'Unpaid'].includes(inv.paymentStatus)){
                          validationIssues.push(`Invoice ID ${inv.id || '(no ID)'} has invalid supplier payment status: ${inv.paymentStatus}. Setting to Unpaid.`);
                          inv.paymentStatus = 'Unpaid'; // Correct it
                      }
                 });
                 tempPayments.forEach((pay, index) => {
                     if (!pay || typeof pay !== 'object') { validationIssues.push(`Invalid payment data at index ${index}.`); return; }
                     if (isNaN(new Date(pay.date).getTime())) validationIssues.push(`Payment ID ${pay.id || '(no ID)'} has invalid date: ${pay.date}.`);
                     if (typeof pay.amount !== 'number') validationIssues.push(`Payment ID ${pay.id || '(no ID)'} has invalid amount.`);
                      if (!['customer', 'supplier'].includes(pay.partyType)) {
                          validationIssues.push(`Payment ID ${pay.id || '(no ID)'} has invalid partyType: ${pay.partyType}. Setting to customer.`);
                          pay.partyType = 'customer';
                      }
                 });

                 // If major validation issues occurred, maybe warn user more strongly?
                  if (validationIssues.length > 0) {
                       console.warn("Restore Validation Issues:\n - " + validationIssues.join("\n - "));
                  }

                 // --- Commit Restored Data ---
                 invoices = tempInvoices;
                 inventory = tempInventory;
                 stockLevels = validatedStockLevels; // Use the validated levels
                 payments = tempPayments;
                 settings = tempSettings;
                 nextInvoiceId = tempNextInvoiceId;
                 nextPaymentId = tempNextPaymentId;

                  // --- Recalculate all invoice statuses after restoring ---
                  console.log("Recalculating all invoice statuses post-restore...");
                  invoices.forEach(inv => {
                       if (inv.type === 'customer') {
                           updateInvoicePaymentStatus(inv.id);
                       } else {
                           updateSupplierInvoicePaymentStatus(inv.id);
                       }
                   });
                  console.log("Invoice status recalculation complete.");


                 saveData(); // Persist the restored and validated data
                 applySettings();
                 populateDatalists();
                 renderAllLists(); // Update UI
                 showScreen('dashboard'); // Go to dashboard after restore
                 showMessage(backupRestoreMessage, 'Data restored successfully!' + (validationIssues.length ? ' (with minor corrections)' : ''), 'success');
                 restoreFileInput.value = ''; // Clear file input
                 restoreButton.disabled = true;

            } catch (err) {
                 console.error("Restore failed:", err);
                 showMessage(backupRestoreMessage, `Restore failed: ${err.message}. Data not changed.`, 'error');
                 restoreFileInput.value = '';
                 restoreButton.disabled = true;
            } finally {
                 hideLoading(); // Ensure loading indicator is hidden
            }
        };
        reader.onerror = (err) => { console.error("File reading error:", err); showMessage(backupRestoreMessage, 'Error reading file.', 'error'); hideLoading(); restoreFileInput.value = ''; restoreButton.disabled = true; };
        reader.readAsText(file);
    };


    // --- PDF Generation ---
    const cleanFilename = (name) => (name || 'document').replace(/[\s\\/:*?"<>|]+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const getBasePdf = (title) => {
        const doc = new jsPDF(); const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight(); const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth(); let y = 15; doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text(settings.companyName || 'Eaze Inn Accounts', pageWidth / 2, y, { align: 'center' }); y += 6; doc.setFontSize(10); doc.setFont(undefined, 'normal'); if (settings.address1) { doc.text(settings.address1, pageWidth / 2, y, { align: 'center' }); y += 5; } if (settings.address2) { doc.text(settings.address2, pageWidth / 2, y, { align: 'center' }); y += 5; } if (settings.phone) { doc.text(`Phone: ${settings.phone}`, pageWidth / 2, y, { align: 'center' }); y += 5; } if (settings.email) { doc.text(`Email: ${settings.email}`, pageWidth / 2, y, { align: 'center' }); y += 5; } y += 5; doc.line(15, y, pageWidth - 15, y); y += 5; doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text(title, pageWidth / 2, y, { align: 'center' }); y += 10; const addFooter = () => { try { const pageCount = doc.internal.getNumberOfPages(); doc.setFontSize(8); doc.setFont(undefined, 'italic'); const pageNum = doc.internal.getCurrentPageInfo().pageNumber; doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' }); doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, pageHeight - 10); } catch (footerError) { console.error("Error adding PDF footer:", footerError); } }; return { doc, y, pageWidth, pageHeight, addFooter };
    };

    // PDF - Invoice (No Item Code)
     const generateInvoicePDF = (invoiceId) => {
         showLoading();
         const invoice = invoices.find(inv => inv.id === invoiceId);
         if (!invoice) { showMessage(invoiceMessage, `Invoice #${invoiceId} not found.`, 'error'); hideLoading(); return; }

         try {
             const docTitle = invoice.type === 'customer' ? 'Tax Invoice' : 'Bill Record';
             const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(docTitle);
             let y = startY;

             // --- Invoice Details Section ---
             doc.setFontSize(11);
             // Row 1
             doc.setFont(undefined, 'bold'); doc.text(`Invoice ID:`, 15, y);
             doc.setFont(undefined, 'normal'); doc.text(`${invoice.id}`, 55, y);
             doc.setFont(undefined, 'bold'); doc.text(`Date Issued:`, pageWidth / 2, y);
             doc.setFont(undefined, 'normal'); doc.text(`${formatDate(invoice.date)}`, pageWidth / 2 + 30, y);
             y += 7;
             // Row 2
             doc.setFont(undefined, 'bold'); doc.text(invoice.type === 'customer' ? 'Customer:' : 'Supplier:', 15, y);
             doc.setFont(undefined, 'normal'); doc.text(`${invoice.partyName}`, 55, y);

             // Right side of Row 2 depends on type
             if (invoice.type === 'customer' && invoice.dueDate) {
                 doc.setFont(undefined, 'bold'); doc.text(`Due Date:`, pageWidth / 2, y);
                 doc.setFont(undefined, 'normal'); doc.text(`${formatDate(invoice.dueDate)}`, pageWidth / 2 + 30, y);
             } else if (invoice.type === 'supplier' && invoice.supplierInvoiceNumber) {
                 doc.setFont(undefined, 'bold'); doc.text(`Supplier Ref #:`, pageWidth / 2, y);
                 doc.setFont(undefined, 'normal'); doc.text(`${invoice.supplierInvoiceNumber}`, pageWidth / 2 + 35, y);
             }
             y += 10;

             // --- Items Table ---
             // REMOVED Item Code column header
             const head = [['Item Name', 'Qty', 'Unit Price', 'Subtotal']];
             const body = (Array.isArray(invoice.items) ? invoice.items : []).map(item => ([
                 item.itemName + (item.description ? `\n(${item.description})` : ''), // Use itemName, add description on new line if exists
                 formatCurrency(item.quantity), // Format qty for consistency? Or leave raw? Let's format.
                 formatCurrency(item.unitPrice),
                 formatCurrency(item.quantity * item.unitPrice)
             ]));

             if (body.length === 0) {
                 doc.text("No items found on this invoice.", 15, y);
                 y += 10;
             } else {
                 doc.autoTable({
                     startY: y,
                     head: head,
                     body: body,
                     theme: 'grid',
                     headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
                     columnStyles: { // Adjust column indices and widths
                         0: { cellWidth: 'auto', minCellWidth: 60 }, // Item Name (allow wrap, more space)
                         1: { halign: 'right', cellWidth: 20 }, // Qty
                         2: { halign: 'right', cellWidth: 30 }, // Unit Price
                         3: { halign: 'right', cellWidth: 30 }  // Subtotal
                     },
                     didDrawPage: (data) => { addFooter(); }, // Add footer to each page
                     // Use hook to allow multi-line item names/descriptions
                     didParseCell: function (data) {
                         if (data.column.index === 0 && data.cell.section === 'body') {
                              // AutoTable handles basic newline wrapping
                         }
                     }
                 });
                 y = doc.lastAutoTable.finalY + 10; // Get Y position after table
             }

             // --- Totals & Payment Section ---
             // Check if content needs new page
             const spaceNeededForTotals = 60; // Estimate space needed
             if (y > pageHeight - spaceNeededForTotals) {
                 doc.addPage();
                 y = 20; // Reset Y on new page
                 addFooter(); // Add footer to the new page
             }

             const totalsXStart = pageWidth - 65; // Position for labels
             const totalsValueX = pageWidth - 15; // Position for values (right aligned)

             doc.setFontSize(12);
             // Total Amount (always show)
             doc.setFont(undefined, 'bold'); doc.text('Total Amount:', totalsXStart, y);
             doc.setFont(undefined, 'normal'); doc.text(`${formatCurrency(invoice.totalAmount)}`, totalsValueX, y, { align: 'right' });
             y += 7;

             if (invoice.type === 'customer') {
                 const paymentsForInvoice = payments.filter(p => p.linkedInvoiceId === invoiceId);
                 const totalPaid = paymentsForInvoice.reduce((sum, p) => sum + (parseFloat(p.amount || 0) || 0), 0);
                 const amountDue = calculateInvoiceBalance(invoice.id); // Use existing function

                 // Payment Status
                 doc.setFont(undefined, 'bold'); doc.text('Payment Status:', totalsXStart, y);
                 doc.setFont(undefined, invoice.paymentStatus === 'Paid' ? 'bold' : 'normal');
                 // Set color based on status
                 if (invoice.paymentStatus === 'Paid') doc.setTextColor(34, 139, 34); // ForestGreen
                 else if (invoice.paymentStatus === 'Partial') doc.setTextColor(255, 165, 0); // Orange
                 else doc.setTextColor(220, 20, 60); // Crimson
                 doc.text(`${invoice.paymentStatus}`, totalsValueX, y, { align: 'right' });
                 doc.setTextColor(0, 0, 0); // Reset color
                 doc.setFont(undefined, 'normal');
                 y += 7;

                 // Total Paid
                 doc.setFont(undefined, 'bold'); doc.text('Total Paid:', totalsXStart, y);
                 doc.setFont(undefined, 'normal'); doc.text(`${formatCurrency(totalPaid)}`, totalsValueX, y, { align: 'right' });
                 y += 7;

                 // Amount Due (Bold)
                 doc.setFont(undefined, 'bold'); doc.text('Amount Due:', totalsXStart, y);
                 doc.setFont(undefined, 'bold'); // Keep bold for amount due value
                 doc.text(`${formatCurrency(amountDue)}`, totalsValueX, y, { align: 'right' });
                 doc.setFont(undefined, 'normal'); // Reset font weight
                 y += 10; // Extra space after totals block

                 // List Payments Received (if any)
                 if (paymentsForInvoice.length > 0) {
                      // Check for page break before listing payments
                      if (y > pageHeight - (paymentsForInvoice.length * 6 + 20)) { // Estimate space
                           doc.addPage(); y = 20; addFooter();
                      }
                     y += 5;
                     doc.setFontSize(10);
                     doc.setFont(undefined, 'bold'); doc.text('Payments Received:', 15, y);
                     y += 6;
                     doc.setFont(undefined, 'normal');
                     paymentsForInvoice.forEach(p => {
                          // Check for page break inside loop
                          if (y > pageHeight - 20) {
                               doc.addPage(); y = 20; addFooter();
                          }
                         doc.text(`- ${formatDate(p.date)}: ${formatCurrency(p.amount)} (${p.method || 'N/A'}${p.reference ? ', Ref: ' + p.reference : ''})`, 20, y);
                         y += 5;
                     });
                 }

             } else { // Supplier Invoice specific footer (simpler)
                 doc.setFont(undefined, 'bold'); doc.text('Payment Status:', totalsXStart, y);
                 doc.setFont(undefined, invoice.paymentStatus === 'Paid' ? 'bold' : 'normal');
                 doc.setTextColor(invoice.paymentStatus === 'Paid' ? '#28a745' : '#dc3545');
                 doc.text(`${invoice.paymentStatus}`, totalsValueX, y, { align: 'right' });
                 doc.setTextColor(0, 0, 0); // Reset color
                 doc.setFont(undefined, 'normal');
                 y += 7;
             }

             // Final footer call might be redundant if already added on page draw, but safe to call.
             addFooter();

             // --- Save PDF ---
             const safePartyName = cleanFilename(invoice.partyName);
             const filename = `Invoice_${invoice.id}_${safePartyName}.pdf`;
             doc.save(filename);
             showMessage(invoiceMessage, `PDF generated: ${filename}`, 'success');

         } catch (error) { console.error("Error generating Invoice PDF:", error); showMessage(invoiceMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); }
     };
    // PDF - Payment Receipt
    const generatePaymentReceiptPDF = (paymentId) => { showLoading(); const payment = payments.find(p => p.id === paymentId); if (!payment) { showMessage(paymentsMessage, `Payment #${paymentId} not found.`, 'error'); hideLoading(); return; } try { const title = payment.partyType === 'customer' ? 'Payment Receipt' : 'Payment Confirmation'; const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(title); let y = startY; const linkedInvoice = payment.linkedInvoiceId ? invoices.find(inv => inv.id === payment.linkedInvoiceId) : null; doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text('Receipt ID:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.id}`, 55, y); doc.setFont(undefined, 'bold'); doc.text('Payment Date:', pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${formatDate(payment.date)}`, pageWidth / 2 + 35, y); y += 8; doc.setFont(undefined, 'bold'); doc.text(payment.partyType === 'customer' ? 'Received From:' : 'Paid To:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.partyName || 'N/A'}`, 55, y); y += 8; doc.setFont(undefined, 'bold'); doc.text('Payment Method:', 15, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.method}`, 55, y); if (payment.reference) { doc.setFont(undefined, 'bold'); doc.text('Reference:', pageWidth / 2, y); doc.setFont(undefined, 'normal'); doc.text(`${payment.reference}`, pageWidth / 2 + 35, y); } y += 8; doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Amount:', 15, y); doc.text(`${formatCurrency(payment.amount)}`, 55, y); y += 12; if (linkedInvoice) { if (y > pageHeight - 60) { doc.addPage(); y = 20; addFooter(); } doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Related Invoice Information:', 15, y); y += 7; doc.setFont(undefined, 'normal'); doc.text(`Invoice ID: ${linkedInvoice.id}`, 20, y); doc.text(`Invoice Date: ${formatDate(linkedInvoice.date)}`, pageWidth / 2, y); y += 6; doc.text(`Invoice Total: ${formatCurrency(linkedInvoice.totalAmount)}`, 20, y); if (linkedInvoice.type === 'customer') { const balanceAfterPayment = calculateInvoiceBalance(linkedInvoice.id); doc.text(`Balance After This Payment: ${formatCurrency(balanceAfterPayment)}`, pageWidth / 2, y); } y += 8; } if (payment.notes) { if (y > pageHeight - 40) { doc.addPage(); y = 20; addFooter(); } doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Notes:', 15, y); y += 5; doc.setFont(undefined, 'normal'); const splitNotes = doc.splitTextToSize(payment.notes, pageWidth - 30); doc.text(splitNotes, 15, y); y += (splitNotes.length * 5); } addFooter(); const safePartyName = cleanFilename(payment.partyName); const filename = `PaymentReceipt_${payment.id}_${safePartyName}.pdf`; doc.save(filename); showMessage(paymentsMessage, `PDF generated: ${filename}`, 'success'); } catch (error) { console.error("Error generating Payment Receipt PDF:", error); showMessage(paymentsMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); } };
    // PDF - Statement
    const generateStatementPDF = () => { showLoading(); const partyName = statementResultsTitle.textContent; if (!partyName) { showMessage(statementMessage, 'Cannot generate PDF: No party selected.', 'error'); hideLoading(); return; } try { const { doc, y: startY, pageWidth, pageHeight, addFooter } = getBasePdf(`Account Statement for ${partyName}`); let y = startY; const head = [['Date', 'Transaction Type', 'Reference', 'Debit', 'Credit', 'Balance']]; const body = []; const tableRows = statementListBody.querySelectorAll('tr'); if (tableRows.length === 0 || (tableRows.length === 1 && tableRows[0].classList.contains('no-results'))) { showMessage(statementMessage, 'No statement data to generate PDF.', 'info'); hideLoading(); return; } tableRows.forEach(tr => { const cells = tr.querySelectorAll('td'); if (cells.length === 6) { body.push([ cells[0].textContent, cells[1].textContent, cells[2].textContent, cells[3].textContent, cells[4].textContent, cells[5].textContent ]); } }); doc.autoTable({ startY: y, head: head, body: body, theme: 'grid', headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' }, 3: { halign: 'right', cellWidth: 25 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'right', cellWidth: 30 } }, willDrawCell: (data) => { if (data.column.index === 5 && data.cell.section === 'body') { const cellText = data.cell.text[0]; const balanceValue = parseFloat(cellText.replace(/[^0-9.-]+/g,"")); if (!isNaN(balanceValue)) { if (balanceValue < -0.001) doc.setTextColor(114, 28, 36); else if (balanceValue > 0.001) doc.setTextColor(21, 87, 36); else doc.setTextColor(108, 117, 125); } } }, didParseCell: (data) => { doc.setTextColor(0, 0, 0); }, didDrawPage: (data) => { addFooter(); } }); y = doc.lastAutoTable.finalY + 10; if (y > pageHeight - 25) { doc.addPage(); y = 20; addFooter(); } const finalBalanceValueText = finalBalanceAmountSpan.textContent; const finalBalanceTypeText = finalBalanceTypeSpan.textContent; const finalBalanceCombined = `Final Balance: ${finalBalanceValueText} ${finalBalanceTypeText}`; if (finalBalanceAmountSpan.classList.contains('negative-balance')) doc.setTextColor(114, 28, 36); else if (finalBalanceAmountSpan.classList.contains('positive-balance')) doc.setTextColor(21, 87, 36); else doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(finalBalanceCombined, pageWidth - 15, y, { align: 'right' }); doc.setTextColor(0,0,0); addFooter(); const safePartyName = cleanFilename(partyName); const filename = `AccountStatement_${safePartyName}_${formatDate(new Date().toISOString())}.pdf`; doc.save(filename); showMessage(statementMessage, `PDF generated: ${filename}`, 'success'); } catch (error) { console.error("Error generating Statement PDF:", error); showMessage(statementMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); } };
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
                columnStyles: {
                    0: { cellWidth: 'auto' }, // Item Name
                    1: { halign: 'right', cellWidth: 40 } // Quantity (index 1 now)
                },
                 willDrawCell: (data) => {
                     // Highlight quantity if it's <= 0
                     if (data.column.index === 1 && data.cell.section === 'body') { // Index 1 is Qty
                         const qtyValue = parseFloat(data.cell.text[0].replace(/[^0-9.-]+/g,""));
                         if (!isNaN(qtyValue) && qtyValue <= 0) {
                              doc.setTextColor(220, 53, 69); // Red color for low/negative stock
                              doc.setFont(undefined, 'bold');
                         }
                     }
                 },
                 didParseCell: (data) => {
                      // Reset text color and style after drawing the cell
                      doc.setTextColor(0, 0, 0);
                      doc.setFont(undefined, 'normal');
                 },
                didDrawPage: addFooter
            });

            addFooter(); // Ensure footer on the last page
            const filename = `LowStockReport_${formatDate(new Date().toISOString().split('T')[0])}.pdf`;
            doc.save(filename);
            showMessage(inventoryMessage, `PDF generated: ${filename}`, 'success');
        } catch (error) { console.error("Error generating Low Stock PDF:", error); showMessage(inventoryMessage, `Error generating PDF: ${error.message}`, 'error'); } finally { hideLoading(); }
    };

    // --- 58mm Thermal Receipt Generation ---
    const generateReceipt = (invoiceId, outputType = 'print') => {
        showLoading();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice || invoice.type !== 'customer') {
            showMessage(invoiceMessage, 'Receipts can only be generated for Customer Invoices.', 'error');
            hideLoading();
            return;
        }

        try {
            const companyName = settings.companyName || 'Eaze Inn';
            const address1 = settings.address1 || '';
            const address2 = settings.address2 || '';
            const phone = settings.phone || '';
            const email = settings.email || '';
            const qrImageData = settings.paymentQrImageData;
            let receiptContent = '';
            const lineLength = 32; // Standard width for 58mm printers
            const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

            // --- Helper Functions for Text Alignment ---
            const centerText = (text) => {
                 const safeText = escapeHtml(String(text)); // Ensure it's a string
                 const padding = Math.max(0, Math.floor((lineLength - safeText.length) / 2));
                 return ' '.repeat(padding) + safeText;
            };
             const leftAlignText = (text) => {
                 const safeText = escapeHtml(String(text));
                 // Basic wrapping (doesn't handle long words well, but okay for simple lines)
                 let lines = [];
                 for (let i = 0; i < safeText.length; i += lineLength) {
                     lines.push(safeText.substring(i, i + lineLength).padEnd(lineLength));
                 }
                 return lines.join('\n');
             };
            const alignLeftRight = (leftText, rightText) => {
                 const safeLeft = escapeHtml(String(leftText));
                 const safeRight = escapeHtml(String(rightText));
                 const spaceNeeded = lineLength - safeLeft.length - safeRight.length;
                 const spaces = Math.max(1, spaceNeeded); // Ensure at least one space
                 return safeLeft + ' '.repeat(spaces) + safeRight;
            };
             const itemLine = (name, qty, price, total) => {
                 const maxNameLen = 14; // Max length for item name part
                 const qtyStr = String(qty).padStart(4); // Qty max width 4
                 const priceStr = formatCurrency(price).padStart(6); // Price max 6
                 const totalStr = formatCurrency(total).padStart(7); // Total max 7
                 // 14 + 4 + 6 + 7 = 31 chars + 1 space = 32

                 let namePart = escapeHtml(name);
                 if (namePart.length > maxNameLen) {
                     namePart = namePart.substring(0, maxNameLen - 1) + '.'; // Truncate with ellipsis
                 } else {
                     namePart = namePart.padEnd(maxNameLen); // Pad if shorter
                 }
                 return `${namePart} ${qtyStr}${priceStr}${totalStr}`; // Add space between name and numbers
            };

            // --- Build Receipt Content ---
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
            // Updated Item Header - Aligned with itemLine function
            receiptContent += 'Item Name        Qty Price   Total\n'; // Header aligns with itemLine structure
            receiptContent += '-'.repeat(lineLength) + '\n';

            (Array.isArray(invoice.items) ? invoice.items : []).forEach(item => {
                receiptContent += itemLine(item.itemName, item.quantity, item.unitPrice, item.quantity * item.unitPrice) + '\n';
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
            if (invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'Partial') {
                 receiptContent += `Status: ${escapeHtml(invoice.paymentStatus)}\n`;
                 if (paymentsForInvoice.length > 0) {
                     // Find the most recent payment linked to this invoice
                     const lastPayment = [...paymentsForInvoice].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                     receiptContent += `Last Pymt Method: ${escapeHtml(lastPayment.method)}\n`;
                     if (lastPayment.reference) receiptContent += `Ref: ${escapeHtml(lastPayment.reference)}\n`;
                 }
                 receiptContent += '-'.repeat(lineLength) + '\n';
            }
            receiptContent += centerText('Thank you!') + '\n\n';
            if (qrImageData) receiptContent += '[QR_CODE_PLACEHOLDER]\n\n'; // Placeholder for image insertion

            if (outputType === 'print') {
                printThermalReceipt(receiptContent, qrImageData); // Pass content and QR data to print function
            } else {
                 // Log to console for debugging
                 console.log("--- Receipt Content ---\n", receiptContent.replace('[QR_CODE_PLACEHOLDER]', qrImageData ? '(QR Code Image)' : ''), "\n--- End Receipt ---");
                 alert("Receipt content logged to console (for debugging).");
            }
        } catch (error) { console.error("Error generating Receipt:", error); showMessage(invoiceMessage, `Error generating receipt: ${error.message}`, 'error'); } finally { hideLoading(); }
    };


    // --- 58mm Thermal Printing Function (with BOLD style) ---
    const printThermalReceipt = (textContent, qrImageDataUrl = null) => {
        const textToPrint = textContent.replace('[QR_CODE_PLACEHOLDER]', ''); // Remove placeholder text

        // Build HTML content for the print window
        let printContents = `
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    @media print {
                        @page {
                            margin: 0mm 0mm 0mm 0mm; /* Minimize margins */
                            size: 58mm auto; /* Specify paper width */
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: #fff; /* Ensure white background */
                        }
                    }
                    body {
                        font-family: 'Courier New', Courier, monospace; /* Monospace font is typical */
                        font-size: 9pt;       /* Common thermal printer font size */
                        line-height: 1.2;     /* Adjust line spacing */
                        margin: 2mm;          /* Small margin inside the page */
                        padding: 0;
                        width: calc(58mm - 4mm); /* Content width */
                        overflow: hidden;     /* Hide overflow */
                        background-color: #fff;
                        color: #000;
                        font-weight: bold; /* <<< MAKE TEXT BOLDER >>> */
                    }
                    pre {
                        margin: 0;
                        padding: 0;
                        white-space: pre-wrap; /* Allow wrapping */
                        word-wrap: break-word; /* Break long words */
                        font-family: inherit;  /* Inherit from body */
                        font-size: inherit;
                        line-height: inherit;
                        color: inherit;
                        font-weight: inherit; /* Inherit boldness from body */
                    }
                    img.qr-code {
                        display: block;
                        margin: 3mm auto 3mm auto; /* Center QR code */
                        max-width: 80%;       /* Limit QR code size */
                        height: auto;
                        image-rendering: pixelated; /* Better for QR codes on low-res printers */
                    }
                </style>
            </head>
            <body>
                <pre>${textToPrint}</pre>
        `;

        // Add QR code image if provided
        if (qrImageDataUrl) {
            printContents += `<img src="${qrImageDataUrl}" class="qr-code" alt="Payment QR Code">`;
        }

        printContents += `</body></html>`;

        // Open a new window for printing
        const printWindow = window.open('', '_blank', 'width=300,height=500,resizable=yes,scrollbars=yes');
        if (!printWindow) {
            alert("Please allow popups for this site to print receipts.");
            return;
        }

        printWindow.document.write(printContents);
        printWindow.document.close(); // Important: Close the document stream
        printWindow.focus(); // Focus the new window

        // Delay printing slightly to allow content rendering
        setTimeout(() => {
             try {
                 console.log("Attempting to print receipt...");
                 printWindow.print(); // Trigger the browser's print dialog

                 // Attempt to close the window after a delay (might be blocked by browser)
                 setTimeout(() => {
                     try {
                          if (!printWindow.closed) {
                              printWindow.close();
                          }
                     } catch (closeErr) {
                         console.warn("Could not close print window automatically:", closeErr);
                     }
                 }, 1500); // Adjust delay as needed

             } catch (e) {
                 console.error("Printing failed:", e);
                 try { printWindow.close(); } catch (closeErr) {} // Attempt to close on error
                 alert("Could not initiate printing. Please try printing from the popup window manually.");
             }
        }, 500); // 500ms delay before printing

    };


    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
         navButtons.forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screen)));

         // Invoice Screen Listeners
         showCreateInvoiceButton?.addEventListener('click', () => { clearInvoiceForm(); createEditInvoiceSection?.classList.remove('hidden'); createEditInvoiceSection?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('invoice-party-name')?.focus(); });
         cancelInvoiceButton?.addEventListener('click', () => { clearInvoiceForm(); createEditInvoiceSection?.classList.add('hidden'); });
         addInvoiceItemButton?.addEventListener('click', () => addInvoiceItemRow());
         invoiceForm?.addEventListener('submit', handleInvoiceFormSubmit);
         invoiceListFilter?.addEventListener('change', renderInvoiceList);
         invoiceTypeSelect?.addEventListener('change', () => {
             const isCustomer = invoiceTypeSelect.value === 'customer';
             if(invoicePartyLabel) invoicePartyLabel.textContent = isCustomer ? 'Customer Name:' : 'Supplier Name:';
             supplierFields.forEach(el => el.classList.toggle('hidden', isCustomer));
             customerFields.forEach(el => el.classList.toggle('hidden', !isCustomer));
             if (isCustomer) { if(document.getElementById('invoice-number-supplier')) document.getElementById('invoice-number-supplier').value = ''; }
             else { if(document.getElementById('invoice-due-date')) document.getElementById('invoice-due-date').value = ''; }
             // Ensure payment status selects are disabled
             document.getElementById('invoice-payment-status').disabled = true;
             document.getElementById('invoice-payment-status-supplier').disabled = true;
          });
         invoiceItemsContainer?.addEventListener('input', (e) => { // Using 'input' for real-time updates
             const target = e.target;
             const row = target.closest('.invoice-item-row');
             if (!row) return;

             if (target.classList.contains('item-quantity') || target.classList.contains('item-unit-price')) {
                 updateItemSubtotal(row);
                 updateInvoiceTotal();
             }
             else if (target.classList.contains('item-name')) {
                  const name = target.value;
                  const descSpan = row.querySelector('.item-description');
                  const catSpan = row.querySelector('.item-category');
                  const qtyInput = row.querySelector('.item-quantity');
                  if (descSpan && catSpan && qtyInput) {
                       const inventoryItem = inventory.find(i => i.name === name);
                       descSpan.textContent = inventoryItem ? (inventoryItem.description || '') : '';
                       catSpan.textContent = inventoryItem ? (inventoryItem.category || '') : '';
                       // Update qty rules
                       const allowDecimal = inventoryItem && !['Beverage', 'Amenities', 'Accommodation'].includes(inventoryItem.category);
                       qtyInput.step = allowDecimal ? "any" : "1";
                       qtyInput.min = allowDecimal ? "0.001" : "1";
                  }
                  updateItemSubtotal(row); // Recalculate subtotal on name change too
                  updateInvoiceTotal();
             }
         });
         document.getElementById('invoice-image')?.addEventListener('change', (e) => {
             const fileInput = e.target; const pathSpan = invoiceImagePathSpan; if (!pathSpan) return;
             if (!fileInput.files || fileInput.files.length === 0) pathSpan.textContent = '';
             else pathSpan.textContent = `File: ${fileInput.files[0].name}`; });

         // Inventory Screen Listeners
         showAddItemButton?.addEventListener('click', () => { addItemForm?.reset(); hideMessage(inventoryMessage); addItemSection?.classList.remove('hidden'); addItemSection?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('item-name-new')?.focus(); });
         cancelItemButton?.addEventListener('click', () => { addItemForm?.reset(); hideMessage(inventoryMessage); addItemSection?.classList.add('hidden'); });
         addItemForm?.addEventListener('submit', handleAddItemFormSubmit);
         inventorySearchInput?.addEventListener('input', (e) => renderInventoryList(e.target.value));
         exportInventoryJsonButton?.addEventListener('click', () => exportInventory('json'));
         exportInventoryCsvButton?.addEventListener('click', () => exportInventory('csv'));
         downloadLowStockPdfButton?.addEventListener('click', generateLowStockPDF);

         // Payments Screen Listeners
         paymentForm?.addEventListener('submit', handlePaymentFormSubmit);
         clearPaymentButton?.addEventListener('click', clearPaymentForm);
         paymentInvoiceLinkCheck?.addEventListener('change', () => {
             const isChecked = paymentInvoiceLinkCheck.checked;
             paymentInvoiceLinkRow?.classList.toggle('hidden', !isChecked);
             paymentPartyRow?.classList.toggle('hidden', isChecked);
             if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = '';
             if (!isChecked) { // Reset fields if unchecking
                 if(paymentInvoiceSelect) paymentInvoiceSelect.value = '';
                 if(paymentPartyNameInput) paymentPartyNameInput.value = '';
             } else { // Populate and focus if checking
                 populateInvoicePaymentSelect();
                 paymentInvoiceSelect?.focus();
             } });
         paymentInvoiceSelect?.addEventListener('change', (e) => {
             const selectedOption = e.target.options[e.target.selectedIndex];
             if (selectedOption && selectedOption.value) {
                 const balance = selectedOption.dataset.balance;
                 const partyName = selectedOption.dataset.partyName;
                 if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = `(Bal: ${formatCurrency(balance)})`;
                 // Set party type to customer when linking invoice
                 if(paymentPartyType) paymentPartyType.value = 'customer';
                 if(paymentPartyNameInput) paymentPartyNameInput.value = partyName || ''; // Autofill name
             } else { // No invoice selected
                 if(invoiceBalanceInfoSpan) invoiceBalanceInfoSpan.textContent = '';
                 if(paymentPartyNameInput) paymentPartyNameInput.value = ''; // Clear name if no invoice selected
             } });

         // Statement Screen Listeners
         statementForm?.addEventListener('submit', (e) => {
             e.preventDefault();
             const partyName = document.getElementById('statement-party-name')?.value.trim();
             if (partyName) generateStatement(partyName);
             else {
                 showMessage(statementMessage, 'Please select or enter a name.', 'error');
                 statementResultsSection?.classList.add('hidden'); } });
         downloadStatementPdfButton?.addEventListener('click', generateStatementPDF);

         // Settings Screen Listeners
         companySettingsForm?.addEventListener('submit', handleCompanySettingsSubmit);
         removeQrImageButton?.addEventListener('click', () => {
             if (confirm("Remove QR code image?")) {
                 settings.paymentQrImageData = null;
                 if(settingPaymentQrImageInput) settingPaymentQrImageInput.value = null; // Clear file input
                 saveData(); applySettings(); showMessage(companySettingsMessage, 'QR Code image removed.', 'info'); } });

         // Backup/Restore Screen Listeners
         backupButton?.addEventListener('click', handleBackup);
         restoreFileInput?.addEventListener('change', (e) => {
             const hasFiles = e.target.files && e.target.files.length > 0;
             if (restoreButton) restoreButton.disabled = !hasFiles;
             if (hasFiles && !e.target.files[0].name.toLowerCase().endsWith('.json')) {
                 showMessage(backupRestoreMessage, 'Invalid file type. Select .json backup.', 'error');
                 restoreFileInput.value = ''; // Clear invalid selection
                 restoreButton.disabled = true;
             } else if (hasFiles) {
                  hideMessage(backupRestoreMessage); // Clear message if valid file selected
             }
         });
         restoreButton?.addEventListener('click', () => handleRestore({ target: restoreFileInput }));
     };


    // --- Initialization ---
    const initializeApp = () => {
        console.log("Initializing Eaze Inn Accounts (No Item Code Version)...");
        loadData(); // Load data first
        setupEventListeners(); // Then setup listeners
        showScreen('dashboard'); // Show initial screen
        console.log("App Initialized.");
    };

     // Helper to render all relevant lists - call after data changes
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
