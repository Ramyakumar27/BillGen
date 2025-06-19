
import React, { useState, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { Saree, BillItem, CustomerDetails } from './types';
import { DEFAULT_SAREE_DATA_LIST, COMPANY_DETAILS, DEFAULT_SAREE_CATEGORIES, UNIFIED_HSN_CODE } from './constants';
import SareeItemDisplay from './components/SareeItemDisplay';
import BillDisplay from './components/BillDisplay';
import CartDisplay from './components/CartDisplay';

const App: React.FC = () => {
  const [sareesToDisplay, setSareesToDisplay] = useState<Saree[]>(DEFAULT_SAREE_DATA_LIST);
  const [currentSareeCategories, setCurrentSareeCategories] = useState<string[]>(DEFAULT_SAREE_CATEGORIES);
  const [selectedSarees, setSelectedSarees] = useState<Map<string, BillItem>>(new Map());
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({ name: '', address: '', gstin: '' });
  const [billNumber, setBillNumber] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  
  const [cgstRate, setCgstRate] = useState<number>(0); 
  const [sgstRate, setSgstRate] = useState<number>(0); 
  const [igstRate, setIgstRate] = useState<number>(0); 
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);

  const [selectedCategory, setSelectedCategory] = useState<string | null>("All");
  const [currentView, setCurrentView] = useState<'selection' | 'bill'>('selection');
  const [selectionStep, setSelectionStep] = useState<'customerInfo' | 'sareeSelection'>('customerInfo');
  const [appMessage, setAppMessage] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // New states for file upload
  const [appScreen, setAppScreen] = useState<'upload' | 'main'>('upload');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSareesToDisplay(DEFAULT_SAREE_DATA_LIST);
      setCurrentSareeCategories(DEFAULT_SAREE_CATEGORIES);
      setSelectedCategory("All");
      setFileError("No file selected. Please select an Excel file to load data.");
      setFileName(null);
      setAppMessage({type: 'info', message: 'File selection cancelled or no file chosen.'});
      return;
    }

    setFileName(file.name);
    setIsLoadingData(true);
    setFileError(null);
    setAppMessage(null); // Clear previous app messages

    // Reset cart and related states for a new data load
    setSelectedSarees(new Map());
    // Optionally reset customer details, bill number, rates if desired when a new file is loaded
    // For now, let's keep them as they might be pre-filled for the next bill with new data.

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Failed to read file data.");
        }
        const workbook = window.XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error("No sheets found in the Excel file.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          throw new Error("Excel file is empty or has no data rows. Ensure it has a header row (e.g., name, price, category) and at least one data row.");
        }

        const headers = (jsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
        const nameIndex = headers.indexOf('name');
        const priceIndex = headers.indexOf('price');
        const categoryIndex = headers.indexOf('category');

        if (nameIndex === -1 || priceIndex === -1 || categoryIndex === -1) {
          throw new Error("Excel file header row must contain 'name', 'price', and 'category' columns. Please check column spellings.");
        }

        const parsedSarees: Saree[] = (jsonData.slice(1) as any[][]).map((rowArray: any[], index: number) => {
          const name = rowArray[nameIndex];
          const priceStr = rowArray[priceIndex];
          const category = rowArray[categoryIndex];

          if (name === undefined || name === null || String(name).trim() === "") return null;
          if (priceStr === undefined || priceStr === null) return null;
          if (category === undefined || category === null || String(category).trim() === "") return null;
          
          const price = parseFloat(String(priceStr));
          if (isNaN(price) || price < 0) {
            console.warn(`Skipping row ${index + 2} in Excel: Invalid price ('${priceStr}'). Price must be a non-negative number.`);
            return null;
          }
          
          return {
            id: `excel_saree_${Date.now()}_${index}`,
            name: String(name).trim(),
            price,
            category: String(category).trim(),
            hsn: UNIFIED_HSN_CODE,
          };
        }).filter(Boolean) as Saree[];

        if (parsedSarees.length === 0) {
          throw new Error("No valid saree data found in the Excel file after processing. Please check the data rows and ensure they match the required format (name, price, category).");
        }

        setSareesToDisplay(parsedSarees);
        const uniqueCategories = Array.from(new Set(parsedSarees.map(s => s.category)));
        setCurrentSareeCategories(["All", ...uniqueCategories.sort()]);
        setSelectedCategory("All"); // Default to "All" category selected
        setAppScreen('main');
        setCurrentView('selection'); // Start at selection screen
        setSelectionStep('customerInfo'); // Start at customer info step within selection
        setAppMessage({ type: 'success', message: `${parsedSarees.length} sarees loaded successfully from ${file.name}!` });
        setFileError(null); // Clear any previous file error on success
      } catch (error: any) {
        console.error("Error processing Excel file:", error);
        const userFriendlyMessage = error.message || 'Could not process the Excel file. Please ensure it is a valid .xlsx or .xls file and in the correct format.';
        setFileError(userFriendlyMessage);
        setSareesToDisplay(DEFAULT_SAREE_DATA_LIST); // Reset to empty
        setCurrentSareeCategories(DEFAULT_SAREE_CATEGORIES); // Reset to ["All"]
        setAppMessage({ type: 'error', message: `Failed to load data: ${userFriendlyMessage}` });
      } finally {
        setIsLoadingData(false);
      }
    };
    reader.onerror = () => {
      setIsLoadingData(false);
      const errorMessage = "Failed to read the file. It might be corrupted or inaccessible.";
      setFileError(errorMessage);
      setAppMessage({ type: 'error', message: errorMessage });
    };
    reader.readAsArrayBuffer(file);
  };


  const handleAddSareeToBill = useCallback((saree: Saree, quantity: number) => {
    setSelectedSarees(prev => {
      const newSelectedSarees = new Map(prev);
      if (quantity <= 0) {
        if (newSelectedSarees.has(saree.id)) {
          newSelectedSarees.delete(saree.id);
        }
      } else {
        const existingItem = newSelectedSarees.get(saree.id);
        const priceToUse = existingItem?.price ?? saree.price;
        const totalPrice = priceToUse * quantity;
        if (existingItem) {
          newSelectedSarees.set(saree.id, { ...existingItem, quantity, totalPrice, price: priceToUse });
        } else {
          newSelectedSarees.set(saree.id, { ...saree, quantity, totalPrice, price: priceToUse });
        }
      }
      return newSelectedSarees;
    });
  }, []);

  const handleUpdateSareeQuantityInBill = useCallback((sareeId: string, newQuantity: number) => {
    setSelectedSarees(prev => {
      const newSelectedSarees = new Map(prev);
      const item = newSelectedSarees.get(sareeId);
      if (item) {
        if (newQuantity <= 0) {
          newSelectedSarees.delete(sareeId);
        } else {
          newSelectedSarees.set(sareeId, { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity });
        }
      }
      return newSelectedSarees;
    });
  }, []);
  
  const handleUpdateSareePrice = useCallback((sareeId: string, newPrice: number) => {
    setSelectedSarees(prev => {
      const newSelectedSarees = new Map(prev);
      const item = newSelectedSarees.get(sareeId);
      if (item) {
        const validatedPrice = Math.max(0, newPrice);
        newSelectedSarees.set(sareeId, { 
          ...item, 
          price: validatedPrice, 
          totalPrice: validatedPrice * item.quantity 
        });
      }
      return newSelectedSarees;
    });
  }, []);

  const handleRemoveSareeFromBill = useCallback((sareeId: string) => {
    setSelectedSarees(prev => {
      const newSelectedSarees = new Map(prev);
      newSelectedSarees.delete(sareeId);
      return newSelectedSarees;
    });
  }, []);

  const handleCustomerDetailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleBillNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillNumber(e.target.value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDate(e.target.value); 
  };

  const handleRateChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setter(0);
      return;
    }
    const newRate = parseFloat(value);
    if (!isNaN(newRate) && newRate >= 0) {
      setter(newRate);
    } else if (isNaN(newRate)) {
      setter(0);
    }
  };
  
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setDiscountPercentage(0);
      return;
    }
    const newDiscount = parseFloat(value);
    if (!isNaN(newDiscount) && newDiscount >= 0) {
      setDiscountPercentage(newDiscount);
    } else {
      setDiscountPercentage(0); 
    }
  };

  const handleOtherChargesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '-') {
        setOtherCharges(0); 
        return;
    }
    const charges = parseFloat(value);
    if (!isNaN(charges)) {
        setOtherCharges(charges);
    } else {
        setOtherCharges(0);
    }
  };


  const billItemsArray = Array.from(selectedSarees.values());

  const rawSubtotal = billItemsArray.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = rawSubtotal * (discountPercentage / 100);
  const subtotalAfterDiscount = rawSubtotal - discountAmount;
  
  const cgstAmount = subtotalAfterDiscount * (cgstRate / 100);
  const sgstAmount = subtotalAfterDiscount * (sgstRate / 100);
  const igstAmount = subtotalAfterDiscount * (igstRate / 100);
  const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
  
  const grandTotal = subtotalAfterDiscount + totalGstAmount + otherCharges;

  const handleDownloadPdf = async () => {
    const billElement = document.getElementById('bill-content');
    if (billElement && window.html2canvas && window.jspdf) {
      setTimeout(async () => {
        try {
          const canvas = await window.html2canvas(billElement, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
          const imgData = canvas.toDataURL('image/png');
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgProps = pdf.getImageProperties(imgData);
          const imgWidth = imgProps.width;
          const imgHeight = imgProps.height;
          let newImgWidth = imgWidth;
          let newImgHeight = imgHeight;
          const margin = 20;

          if (imgWidth / imgHeight > (pdfWidth - 2 * margin) / (pdfHeight - 2 * margin)) {
              newImgWidth = pdfWidth - 2 * margin;
              newImgHeight = (imgHeight * newImgWidth) / imgWidth;
          } else {
              newImgHeight = pdfHeight - 2 * margin;
              newImgWidth = (imgWidth * newImgHeight) / imgHeight;
          }
          const x = margin + (pdfWidth - 2 * margin - newImgWidth) / 2;
          const y = margin;
          pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
          pdf.save(`Bill-${billNumber}-${customerDetails.name || 'Customer'}.pdf`);
        } catch (error) {
          console.error("Error generating PDF:", error);
          alert("Failed to generate PDF. Please check console for details.");
        }
      }, 300); 
    } else {
      alert("Bill content not found or PDF libraries not loaded.");
    }
  };
  
  const isRateValid = (rate: number) => !isNaN(rate) && rate >= 0;

  const isCustomerInfoValid = 
    customerDetails.name.trim().length > 0 &&
    customerDetails.address.trim().length > 0 &&
    billNumber.trim().length > 0 &&
    currentDate.trim().length > 0 &&
    isRateValid(cgstRate) && isRateValid(sgstRate) && isRateValid(igstRate) &&
    isRateValid(discountPercentage) &&
    !isNaN(otherCharges);


  const handleProceedToSareeSelection = () => {
    if (!customerDetails.name.trim()) { alert("Customer name is required."); return; }
    if (!customerDetails.address.trim()) { alert("Please enter customer address to proceed."); return; }
    if (!billNumber.trim()) { alert("Please ensure Invoice Number is filled."); return; }
    if (!currentDate.trim()) { alert("Please ensure Date is filled."); return; }
    if (!isRateValid(cgstRate) || !isRateValid(sgstRate) || !isRateValid(igstRate)) {
      alert("Please enter valid non-negative GST Rates (CGST, SGST, IGST)."); return;
    }
    if (!isRateValid(discountPercentage)) {
      alert("Please enter a valid non-negative Discount Percentage."); return;
    }
    if (isNaN(otherCharges)) {
        alert("Please enter a valid number for Other Charges."); return;
    }
    setSelectionStep('sareeSelection');
  };

  const handleBackToCustomerInfo = () => {
    setSelectionStep('customerInfo');
  };
  
  const handleProceedToBill = () => {
    if (billItemsArray.length === 0) { alert("Your cart is empty. Please add sarees to proceed."); return; }
    if (!customerDetails.name.trim()) { alert("Customer name is required. Please go back and edit customer details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return; }
    if (!customerDetails.address.trim()) { alert("Customer address is missing. Please go back and edit customer details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return; }
    if (!billNumber.trim()) { alert("Invoice Number is missing. Please go back and edit invoice details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return; }
    if (!currentDate.trim()) { alert("Date is missing. Please go back and edit invoice details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return; }
    if (!isRateValid(cgstRate) || !isRateValid(sgstRate) || !isRateValid(igstRate)) {
      alert("GST Rates are invalid. Please go back and edit invoice details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return;
    }
    if (!isRateValid(discountPercentage)) {
      alert("Discount Percentage is invalid. Please go back and edit invoice details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return;
    }
     if (isNaN(otherCharges)) {
        alert("Other Charges value is invalid. Please go back and edit invoice details."); setCurrentView('selection'); setSelectionStep('customerInfo'); return;
    }
    setCurrentView('bill');
  };

  const handleBackToEdit = () => {
    setCurrentView('selection');
    setSelectionStep('sareeSelection'); 
  };
  
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>, nextFieldId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  const handleSwitchToUploadScreen = () => {
    setAppScreen('upload');
    // Clear potentially sensitive or session-specific data when going back to upload
    setSareesToDisplay(DEFAULT_SAREE_DATA_LIST);
    setCurrentSareeCategories(DEFAULT_SAREE_CATEGORIES);
    setSelectedSarees(new Map());
    setCustomerDetails({ name: '', address: '', gstin: '' });
    setBillNumber('');
    setCurrentDate('');
    // Reset tax rates, discount, other charges to defaults
    setCgstRate(0);
    setSgstRate(0);
    setIgstRate(0);
    setDiscountPercentage(0);
    setOtherCharges(0);
    setAppMessage(null);
    setFileError(null);
    setFileName(null);
    setSelectedCategory("All");
  };

  if (appScreen === 'upload') {
    return (
      <div className="min-h-screen bg-[#FFFBDE] p-4 md:p-8 flex flex-col items-center justify-center">
        <header className="mb-8 text-center w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-[#014D6D]">
            {COMPANY_DETAILS.name} - Bill Generator
          </h1>
          <p className="text-[#014D6D] mt-2">Load saree data from an Excel file to begin.</p>
        </header>

        <section className="bg-[#FFFBDE] p-6 md:p-8 rounded-xl shadow-lg border border-[#00CEC8] w-full max-w-lg">
          <h2 className="text-2xl font-semibold mb-6 text-[#014D6D] border-b border-[#00CEC8] pb-3 text-center">Load Saree Data</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="sareeFile" className="block text-xl font-medium text-[#014D6D] mb-2">
                Upload Excel File <span className="text-sm">(.xlsx, .xls)</span>:
              </label>
              <input
                type="file"
                id="sareeFile"
                accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileUpload}
                className="block w-full text-lg text-[#014D6D]
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-semibold
                           file:bg-[#00CEC8] file:text-[#FFFBDE]
                           hover:file:bg-[#FF9C5F] hover:file:text-[#014D6D]
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9C5F] focus:ring-offset-[#FFFBDE] cursor-pointer"
                aria-describedby="file-instructions"
              />
              {fileName && <p className="text-sm text-[#014D6D] mt-2">Selected file: {fileName}</p>}
            </div>
            <div id="file-instructions" className="text-sm text-[#014D6D] p-3 bg-[#e6fffa] border border-[#00CEC8] rounded-md">
              <p className="font-semibold mb-1">Excel File Format Instructions:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>The first row must be a header row.</li>
                <li>Required column headers: <strong>name</strong> (Text), <strong>price</strong> (Number), <strong>category</strong> (Text).</li>
                <li>Column names are case-insensitive (e.g., 'Name' or 'name' is fine).</li>
                <li>Ensure data rows under these columns are correctly formatted.</li>
              </ul>
            </div>

            {isLoadingData && (
              <div className="flex items-center justify-center text-[#014D6D] mt-4 py-2">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#00CEC8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing file... Please wait.
              </div>
            )}
            
            {/* Display fileError first as it's more specific to the upload action */}
            {fileError && (
              <p className="mt-4 text-center text-red-700 bg-red-100 p-3 rounded-md border border-red-300 shadow" role="alert">{fileError}</p>
            )}
            {/* Then display general appMessage if no specific fileError or if it's a success message related to upload */}
            {appMessage && !fileError && appMessage.type === 'success' && (
               <div className={`mt-4 p-3 rounded-md text-sm text-center shadow bg-green-100 text-[#014D6D] border border-green-300`} role="status">
                 {appMessage.message}
               </div>
            )}
             {appMessage && appMessage.type === 'info' && (
                <div className={`mt-4 p-3 rounded-md text-sm text-center shadow bg-blue-100 text-[#014D6D] border border-blue-300`} role="status">
                    {appMessage.message}
                </div>
            )}
          </div>
        </section>

        <footer className="text-center mt-12 py-6 border-t border-[#00CEC8] w-full max-w-4xl">
          <p className="text-sm text-[#014D6D]">&copy; {new Date().getFullYear()} {COMPANY_DETAILS.name}. All rights reserved.</p>
          <p className="text-xs text-[#014D6D] opacity-75 mt-1">Designed with Passion for Saree Craftsmanship</p>
        </footer>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#FFFBDE] p-4 md:p-8">
       <header className="mb-6 text-center relative">
        <h1 className="text-4xl md:text-5xl font-bold text-[#014D6D]">
          {COMPANY_DETAILS.name} - Bill Generator
        </h1>
        <p className="text-[#014D6D] mt-2">Create and manage your saree bills with ease.</p>
         <button
            onClick={handleSwitchToUploadScreen}
            className="absolute top-0 right-0 mt-2 mr-2 md:mt-0 md:mr-0 px-3 py-1.5 bg-[#FF9C5F] text-[#014D6D] text-xs font-semibold rounded-md shadow-sm hover:bg-[#00CEC8] hover:text-[#FFFBDE] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#FF9C5F]"
            title="Load new saree data from Excel"
          >
            Load New Data
          </button>
      </header>
      
      {appMessage && (
        <div className={`max-w-xl mx-auto mb-6 p-3 rounded-md text-sm text-center shadow
          ${appMessage.type === 'success' ? 'bg-green-100 text-[#014D6D] border border-green-300' : 
            appMessage.type === 'error' ? 'bg-red-100 text-[#014D6D] border border-red-300' :
            'bg-blue-100 text-[#014D6D] border border-blue-300'}`}
            role={appMessage.type === 'error' ? 'alert' : 'status'}>
          {appMessage.message}
        </div>
      )}

      <div className="container mx-auto">
        {currentView === 'selection' ? (
          <>
            {selectionStep === 'customerInfo' ? (
              <div className="max-w-xl mx-auto space-y-8">
                <section className="bg-[#FFFBDE] p-6 rounded-xl shadow-lg border border-[#00CEC8]">
                  <h2 className="text-2xl font-semibold mb-6 text-[#014D6D] border-b border-[#00CEC8] pb-3">Customer & Invoice Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
                    <div>
                      <label htmlFor="billNumber" className="block text-xl font-medium text-[#014D6D] mb-1">Invoice No: *</label>
                      <input type="text" id="billNumber" name="billNumber" value={billNumber} onChange={handleBillNumberChange} onKeyDown={(e) => handleInputKeyDown(e, 'currentDate')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="Enter Invoice Number" required />
                    </div>
                    <div>
                      <label htmlFor="currentDate" className="block text-xl font-medium text-[#014D6D] mb-1">Date: *</label>
                      <input type="date" id="currentDate" name="currentDate" value={currentDate} onChange={handleDateChange} onKeyDown={(e) => handleInputKeyDown(e, 'customerName')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="Select Date" required />
                    </div>
                    <div>
                      <label htmlFor="customerName" className="block text-xl font-medium text-[#014D6D] mb-1">Customer Name *</label>
                      <input type="text" id="customerName" name="name" value={customerDetails.name} onChange={handleCustomerDetailChange} onKeyDown={(e) => handleInputKeyDown(e, 'customerGstin')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="Enter customer's Name" required />
                    </div>
                    <div>
                      <label htmlFor="customerGstin" className="block text-xl font-medium text-[#014D6D] mb-1">GSTIN</label>
                      <input type="text" id="customerGstin" name="gstin" value={customerDetails.gstin || ''} onChange={handleCustomerDetailChange} onKeyDown={(e) => handleInputKeyDown(e, 'customerAddress')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="Enter customer's GSTIN" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="customerAddress" className="block text-xl font-medium text-[#014D6D] mb-1">Address *</label>
                      <input type="text" id="customerAddress" name="address" value={customerDetails.address} onChange={handleCustomerDetailChange} onKeyDown={(e) => handleInputKeyDown(e, 'cgstRate')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="Enter customer's address" required />
                    </div>
                    
                    <div>
                      <label htmlFor="cgstRate" className="block text-xl font-medium text-[#014D6D] mb-1">CGST Rate (%):</label>
                      <input type="number" id="cgstRate" value={cgstRate === 0 && document.activeElement !== document.getElementById('cgstRate') ? '' : cgstRate.toString()} onChange={handleRateChange(setCgstRate)} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setCgstRate(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'sgstRate')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="e.g., 2.5" min="0" step="0.01" />
                    </div>
                    <div>
                      <label htmlFor="sgstRate" className="block text-xl font-medium text-[#014D6D] mb-1">SGST Rate (%):</label>
                      <input type="number" id="sgstRate" value={sgstRate === 0 && document.activeElement !== document.getElementById('sgstRate') ? '' : sgstRate.toString()} onChange={handleRateChange(setSgstRate)} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setSgstRate(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'igstRate')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="e.g., 2.5" min="0" step="0.01" />
                    </div>
                    <div>
                      <label htmlFor="igstRate" className="block text-xl font-medium text-[#014D6D] mb-1">IGST Rate (%):</label>
                      <input type="number" id="igstRate" value={igstRate === 0 && document.activeElement !== document.getElementById('igstRate') ? '' : igstRate.toString()} onChange={handleRateChange(setIgstRate)} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setIgstRate(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'discountPercentage')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="e.g., 5" min="0" step="0.01" />
                    </div>
                    <div>
                      <label htmlFor="discountPercentage" className="block text-xl font-medium text-[#014D6D] mb-1">Discount (%):</label>
                      <input type="number" id="discountPercentage" value={discountPercentage === 0 && document.activeElement !== document.getElementById('discountPercentage') ? '' : discountPercentage.toString()} onChange={handleDiscountChange} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setDiscountPercentage(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'otherCharges')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="e.g., 10" min="0" step="0.01" />
                    </div>
                     <div>
                      <label htmlFor="otherCharges" className="block text-xl font-medium text-[#014D6D] mb-1">Other Charges (₹):</label>
                      <input type="number" id="otherCharges" value={otherCharges === 0 && document.activeElement !== document.getElementById('otherCharges') ? '' : otherCharges.toString()} onChange={handleOtherChargesChange} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setOtherCharges(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'proceedToSareeSelectionButton')} className="w-full p-2 border border-[#00CEC8] rounded-md shadow-sm focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black text-lg" placeholder="e.g., 50 or -20" step="0.01" />
                    </div>
                  </div>
                   <button
                    id="proceedToSareeSelectionButton"
                    onClick={handleProceedToSareeSelection}
                    disabled={!isCustomerInfoValid}
                    className={`mt-6 w-full font-semibold py-2.5 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9C5F] 
                      ${!isCustomerInfoValid
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : 'bg-[#00CEC8] text-[#FFFBDE] hover:bg-[#FF9C5F] hover:text-[#014D6D] transform hover:scale-105'
                      }`}
                  >
                    Select Sarees
                  </button>
                </section>
              </div>
            ) : ( 
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                   <button
                      onClick={handleBackToCustomerInfo}
                      className="mb-4 px-4 py-2 bg-[#FFFBDE] text-[#014D6D] border border-[#00CEC8] rounded-lg hover:bg-[#FF9C5F] hover:text-[#014D6D] transition-colors duration-150 ease-in-out flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9C5F]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Customer & Invoice Details
                    </button>
                  <section className="bg-[#FFFBDE] p-6 rounded-xl shadow-lg border border-[#00CEC8]">
                    <h2 className="text-2xl font-semibold mb-4 text-[#014D6D] border-b border-[#00CEC8] pb-2">Select Sarees & Build Cart</h2>
                    <div className="mb-6 flex flex-wrap gap-2">
                      {currentSareeCategories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-4 py-2 text-xl font-medium rounded-lg transition-colors duration-150 ease-in-out focus:outline-none 
                            ${selectedCategory === category 
                              ? 'bg-[#00CEC8] text-[#FFFBDE] shadow-md ring-2 ring-offset-1 ring-[#FF9C5F] ring-offset-[#FFFBDE]'
                              : 'bg-[#FFFBDE] text-[#014D6D] border border-[#00CEC8] hover:bg-[#FF9C5F] hover:text-[#014D6D] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9C5F]'
                            }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-6">
                      {currentSareeCategories.length <= 1 && sareesToDisplay.length === 0 ? (
                        <p className="text-[#014D6D] text-center py-4">No sarees loaded. Please go back and load saree data from an Excel file.</p>
                      ): selectedCategory === null || (selectedCategory === "All" && sareesToDisplay.length === 0) ? (
                        <p className="text-[#014D6D] text-center py-4">
                          {sareesToDisplay.length === 0 ? "No sarees available in the loaded data." : "Please select a category to view sarees."}
                        </p>
                      ) : (
                        (() => {
                          const filteredSarees = selectedCategory === "All" 
                            ? sareesToDisplay 
                            : sareesToDisplay.filter(saree => saree.category === selectedCategory);
                          if (filteredSarees.length > 0) {
                            return filteredSarees.map(saree => (
                              <SareeItemDisplay
                                key={saree.id}
                                saree={saree}
                                onAddToBill={handleAddSareeToBill}
                                currentQuantityInBill={selectedSarees.get(saree.id)?.quantity || 0}
                              />
                            ));
                          } else {
                            return <p className="text-[#014D6D] text-center py-4">No sarees found in the '{selectedCategory}' category.</p>;
                          }
                        })()
                      )}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  <section className="bg-[#FFFBDE] p-6 rounded-xl shadow-lg border border-[#00CEC8] sticky top-8">
                    <h2 className="text-2xl font-semibold mb-4 text-[#014D6D] border-b border-[#00CEC8] pb-2">Shopping Cart</h2>
                    <CartDisplay
                      cartItems={billItemsArray}
                      onUpdateQuantity={handleUpdateSareeQuantityInBill}
                      onRemoveItem={handleRemoveSareeFromBill}
                      onUpdateItemPrice={handleUpdateSareePrice} 
                      rawSubtotal={rawSubtotal}
                      discountPercentage={discountPercentage}
                      discountAmount={discountAmount}
                      subtotalAfterDiscount={subtotalAfterDiscount}
                      cgstRate={cgstRate}
                      sgstRate={sgstRate}
                      igstRate={igstRate}
                      cgstAmount={cgstAmount}
                      sgstAmount={sgstAmount}
                      igstAmount={igstAmount}
                      otherCharges={otherCharges}
                      grandTotal={grandTotal}
                      onProceedToBill={handleProceedToBill}
                      customerName={customerDetails.name} 
                      customerAddress={customerDetails.address}
                    />
                  </section>
                </div>
              </div>
            )}
          </>
        ) : ( 
          <div className="space-y-6">
            <section className="bg-[#FFFBDE] p-6 rounded-xl shadow-lg border border-[#00CEC8] max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b border-[#00CEC8] pb-3">
                <h2 className="text-3xl font-semibold text-[#014D6D]">Final Bill</h2>
                <button
                  onClick={handleBackToEdit}
                  className="px-4 py-2 bg-[#FFFBDE] text-[#014D6D] border border-[#00CEC8] rounded-lg hover:bg-[#FF9C5F] hover:text-[#014D6D] transition-colors duration-150 ease-in-out flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9C5F]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Edit
                </button>
              </div>
              <BillDisplay
                billItems={billItemsArray}
                customerDetails={customerDetails}
                companyDetails={COMPANY_DETAILS}
                billNumber={billNumber}
                currentDate={currentDate} 
                rawSubtotal={rawSubtotal}
                discountPercentage={discountPercentage}
                discountAmount={discountAmount}
                subtotalAfterDiscount={subtotalAfterDiscount}
                cgstRate={cgstRate}
                sgstRate={sgstRate}
                igstRate={igstRate}
                cgstAmount={cgstAmount}
                sgstAmount={sgstAmount}
                igstAmount={igstAmount}
                otherCharges={otherCharges}
                grandTotal={grandTotal}
              />
              {billItemsArray.length > 0 && (
                <button
                  onClick={handleDownloadPdf}
                  className="mt-8 w-full bg-[#00CEC8] text-[#FFFBDE] hover:bg-[#FF9C5F] hover:text-[#014D6D] font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9C5F]"
                  aria-label="Download Bill as PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Bill (PDF)
                </button>
              )}
            </section>
          </div>
        )}
      </div>
       <footer className="text-center mt-12 py-6 border-t border-[#00CEC8]">
        <p className="text-sm text-[#014D6D]">&copy; {new Date().getFullYear()} {COMPANY_DETAILS.name}. All rights reserved.</p>
        <p className="text-xs text-[#014D6D] opacity-75 mt-1">Designed with Passion for Saree Craftsmanship</p>
      </footer>
    </div>
  );
};

export default App;
