
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
  const [customerList, setCustomerList] = useState<CustomerDetails[]>([]);
  const [billNumber, setBillNumber] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  
  const [cgstRate, setCgstRate] = useState<number>(0); 
  const [sgstRate, setSgstRate] = useState<number>(0); 
  const [igstRate, setIgstRate] = useState<number>(0); 
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Changed initial state from "All" to null
  const [currentView, setCurrentView] = useState<'selection' | 'bill'>('selection');
  const [selectionStep, setSelectionStep] = useState<'customerInfo' | 'sareeSelection'>('customerInfo');
  const [appMessage, setAppMessage] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // New states for file upload
  const [appScreen, setAppScreen] = useState<'upload' | 'main'>('upload');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [categoryInteractionMade, setCategoryInteractionMade] = useState<boolean>(false);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileError("No file selected. Please select an Excel file to load data.");
      setFileName(null);
      setAppMessage({type: 'info', message: 'File selection cancelled or no file chosen.'});
      return;
    }

    setFileName(file.name);
    setIsLoadingData(true);
    setFileError(null);
    setAppMessage(null); 
    setCategoryInteractionMade(false);
    setSelectedSarees(new Map());
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Failed to read file data.");
        
        const workbook = window.XLSX.read(data, { type: 'array' });

        // --- Process Sarees Sheet (Required) ---
        const sareeWorksheet = workbook.Sheets['Sarees'];
        if (!sareeWorksheet) {
          throw new Error("Excel file must contain a sheet named 'Sarees'. Please check the sheet name.");
        }
        const sareeJsonData = window.XLSX.utils.sheet_to_json(sareeWorksheet, { header: 1 });

        if (sareeJsonData.length < 2) {
          throw new Error("The 'Sarees' sheet is empty or has no data rows. Ensure it has headers (name, price, category) and at least one data row.");
        }

        const sareeHeaders = (sareeJsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
        const sareeNameIndex = sareeHeaders.indexOf('name');
        const priceIndex = sareeHeaders.indexOf('price');
        const categoryIndex = sareeHeaders.indexOf('category');

        if (sareeNameIndex === -1 || priceIndex === -1 || categoryIndex === -1) {
          throw new Error("The 'Sarees' sheet header row must contain 'name', 'price', and 'category' columns.");
        }

        const parsedSarees: Saree[] = (sareeJsonData.slice(1) as any[][]).map((rowArray: any[], index: number) => {
          const name = rowArray[sareeNameIndex];
          const price = parseFloat(String(rowArray[priceIndex]));
          const category = rowArray[categoryIndex];
          if (!name || isNaN(price) || price < 0 || !category) return null;
          return { id: `excel_saree_${Date.now()}_${index}`, name: String(name).trim(), price, category: String(category).trim(), hsn: UNIFIED_HSN_CODE };
        }).filter(Boolean) as Saree[];

        if (parsedSarees.length === 0) {
          throw new Error("No valid saree data found in the 'Sarees' sheet after processing.");
        }

        // --- Process Customers Sheet (Optional) ---
        const customerWorksheet = workbook.Sheets['Customers'];
        let parsedCustomers: CustomerDetails[] = [];
        let customerLoadMessage = ''; // FIX: Declare variable to hold customer loading status.
        
        if (customerWorksheet) {
          const customerJsonData = window.XLSX.utils.sheet_to_json(customerWorksheet, { header: 1 });
          if (customerJsonData.length > 1) {
            const custHeaders = (customerJsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
            const gstinIndex = custHeaders.indexOf('gstin');
            const nameIndex = custHeaders.indexOf('name');
            const addressIndex = custHeaders.indexOf('address');

            if (gstinIndex !== -1 && nameIndex !== -1 && addressIndex !== -1) {
              parsedCustomers = (customerJsonData.slice(1) as any[][]).map((row: any[]) => {
                const gstin = row[gstinIndex], name = row[nameIndex], address = row[addressIndex];
                if (gstin && name && address) return { gstin: String(gstin).trim(), name: String(name).trim(), address: String(address).trim() };
                return null;
              }).filter(Boolean) as CustomerDetails[];
              
              if (parsedCustomers.length > 0) {
                customerLoadMessage = `Successfully loaded ${parsedCustomers.length} customers for autofill.`;
              } else {
                customerLoadMessage = "Found 'Customers' sheet, but no valid customer data was loaded.";
              }

            } else {
              customerLoadMessage = "Warning: 'Customers' sheet is missing required headers: 'gstin', 'name', 'address'. Autofill disabled.";
            }
          } else {
            customerLoadMessage = "Found 'Customers' sheet, but it appears to be empty.";
          }
        }
        
        // --- Final State Updates ---
        setSareesToDisplay(parsedSarees);
        const uniqueCategories = Array.from(new Set(parsedSarees.map(s => s.category)));
        setCurrentSareeCategories(["All", ...uniqueCategories.sort()]);
        setCustomerList(parsedCustomers);
        setSelectedCategory(null);
        setCategoryInteractionMade(false);
        setAppScreen('main'); // Switch screen automatically
        setCurrentView('selection');
        setSelectionStep('customerInfo');
        setFileError(null);
        setAppMessage(null);

        const successMessage = `Loaded ${parsedSarees.length} sarees. ${customerLoadMessage}`.trim();
        console.log(successMessage); // Log success to console

      } catch (error: any) {
        console.error("Error processing Excel file:", error);
        const userFriendlyMessage = error.message || 'Could not process the Excel file.';
        setFileError(userFriendlyMessage);
        
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
  
    if (name === 'gstin') {
      // Updater function ensures we're working with the latest state
      setCustomerDetails(prev => {
        const uppercaseGstin = value.toUpperCase().trim();
        const foundCustomer = customerList.find(c => c.gstin?.toUpperCase().trim() === uppercaseGstin);
        
        if (foundCustomer) {
          // On match, autofill name and address
          return {
            name: foundCustomer.name,
            address: foundCustomer.address,
            gstin: value, // Use the user's input casing for the field
          };
        }
        // On no match, just update the gstin field but preserve existing name/address
        return { ...prev, gstin: value };
      });
    } else {
      // For manual changes to name/address, update that specific field.
      // This allows users to override the autofill.
      setCustomerDetails(prev => ({ ...prev, [name]: value }));
    }
  }, [customerList]); // Dependency on customerList is crucial for the autofill logic

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
    setSareesToDisplay(DEFAULT_SAREE_DATA_LIST);
    setCurrentSareeCategories(DEFAULT_SAREE_CATEGORIES);
    setSelectedSarees(new Map());
    setCustomerDetails({ name: '', address: '', gstin: '' });
    setCustomerList([]);
    setBillNumber('');
    setCurrentDate('');
    setCgstRate(0);
    setSgstRate(0);
    setIgstRate(0);
    setDiscountPercentage(0);
    setOtherCharges(0);
    setAppMessage(null);
    setFileError(null);
    setFileName(null);
    setSelectedCategory(null); // Changed from "All"
    setCategoryInteractionMade(false); // Reset interaction flag
  };

  const renderSareeSelectionContent = () => {
    // Priority 1: Check if any sarees are loaded at all.
    if (sareesToDisplay.length === 0) {
      if (currentSareeCategories.length <= 1) { // Typically just ["All"]
        return <p className="text-black text-center py-4">No sarees loaded. Please go back and load saree data from an Excel file.</p>;
      } else {
        // This means categories might exist from a previous load, but the current data is empty.
        return <p className="text-black text-center py-4">No sarees available in the loaded data. Try loading a new file.</p>;
      }
    }
  
    // Priority 2: Check if a category button has been clicked.
    if (!categoryInteractionMade) {
      return <p className="text-black text-center py-4">Please select a category above to view sarees.</p>;
    }
  
    // Priority 3: Sarees are loaded AND a category button has been clicked. Filter and display.
    const filteredSarees = selectedCategory === "All" || selectedCategory === null
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
      // Sarees exist overall (checked by sareesToDisplay.length > 0), but not in this specific selected category.
      return <p className="text-black text-center py-4">No sarees found in the '{selectedCategory}' category.</p>;
    }
  };

  if (appScreen === 'upload') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
        <header className="mb-8 text-center w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-black">
            {COMPANY_DETAILS.name} - Bill Generator
          </h1>
          <p className="text-black mt-2">Load saree and customer data from an Excel file to begin.</p>
        </header>

        <section className="bg-white/80 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-lg border border-[#72a7e8] w-full max-w-lg">
          <h2 className="text-2xl font-semibold mb-6 text-black border-b border-[#72a7e8] pb-3 text-center">Load Data from Excel</h2>
          <div className="space-y-4">
              <>
                <div>
                  <label htmlFor="sareeFile" className="block text-xl font-medium text-black mb-2">
                    Upload Excel File <span className="text-sm">(.xlsx, .xls)</span>:
                  </label>
                  <input
                    type="file"
                    id="sareeFile"
                    accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    className="block w-full text-lg text-black
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-md file:border-0
                               file:text-sm file:font-semibold
                               file:bg-[#72a7e8] file:text-white
                               hover:file:bg-[#fd8152] hover:file:text-white
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152] focus:ring-offset-white/80 cursor-pointer"
                    aria-describedby="file-instructions"
                  />
                  {fileName && !fileError && <p className="text-sm text-black mt-2">Selected file: {fileName}</p>}
                </div>
                 <div id="file-instructions" className="text-sm text-black p-3 bg-[#72a7e8]/20 border border-[#72a7e8] rounded-md space-y-3">
                  <div>
                    <p className="font-semibold">Sheet 1: "Sarees" (Required)</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Sheet name must be exactly <strong>Sarees</strong>.</li>
                      <li>Required columns: <strong>name</strong> (Text), <strong>price</strong> (Number), <strong>category</strong> (Text).</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold">Sheet 2: "Customers" (Optional)</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Sheet name must be exactly <strong>Customers</strong>.</li>
                      <li>Required columns: <strong>gstin</strong>, <strong>name</strong>, <strong>address</strong>.</li>
                      <li>If provided, typing a known GSTIN will autofill customer details.</li>
                    </ul>
                  </div>
                  <p className="text-xs pt-2 border-t border-[#72a7e8]/50">Column headers are case-insensitive. The first row in each sheet must be the header row.</p>
                </div>

                {isLoadingData && (
                  <div className="flex items-center justify-center text-black mt-4 py-2">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#72a7e8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing file... Please wait.
                  </div>
                )}
                
                {fileError && (
                  <p className="mt-4 text-center text-red-700 bg-red-100 p-3 rounded-md border border-red-300 shadow" role="alert">{fileError}</p>
                )}
                {appMessage && !fileError && appMessage.type === 'info' && (
                   <div className="mt-4 p-3 rounded-md text-sm text-center shadow bg-blue-100 text-black border border-blue-300" role="status">
                     {appMessage.message}
                   </div>
                )}
              </>
          </div>
        </section>

        <footer className="text-center mt-12 py-6 border-t border-[#72a7e8]/50 w-full max-w-4xl">
          <p className="text-sm text-black">&copy; {new Date().getFullYear()} {COMPANY_DETAILS.name}. All rights reserved.</p>
          <p className="text-xs text-black opacity-75 mt-1">Designed with Passion for Saree Craftsmanship</p>
        </footer>
      </div>
    );
  }


  return (
    <div className="min-h-screen p-4 md:p-8">
       <header className="mb-6 text-center relative">
        <h1 className="text-4xl md:text-5xl font-bold text-black">
          {COMPANY_DETAILS.name} - Bill Generator
        </h1>
        <p className="text-black mt-2">Create and manage your saree bills with ease.</p>
         <button
            onClick={handleSwitchToUploadScreen}
            className="absolute top-0 right-0 mt-2 mr-2 md:mt-0 md:mr-0 px-3 py-1.5 bg-[#fd8152] text-black text-xs font-semibold rounded-md shadow-sm hover:bg-[#72a7e8] hover:text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#fd8152]"
            title="Load new saree data from Excel"
          >
            Load New Data
          </button>
      </header>
      
      {appMessage && (
        <div className={`max-w-xl mx-auto mb-6 p-3 rounded-md text-sm text-center shadow
          ${appMessage.type === 'success' ? 'bg-green-100 text-black border border-green-300' : 
            appMessage.type === 'error' ? 'bg-red-100 text-black border border-red-300' :
            'bg-blue-100 text-black border border-blue-300'}`}
            role={appMessage.type === 'error' ? 'alert' : 'status'}>
          {appMessage.message}
        </div>
      )}

      <div className="container mx-auto">
        {currentView === 'selection' ? (
          <>
            {selectionStep === 'customerInfo' ? (
              <div className="max-w-xl mx-auto space-y-8">
                <section className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-[#72a7e8]">
                  <h2 className="text-2xl font-semibold mb-6 text-black border-b border-[#72a7e8] pb-3">Customer & Invoice Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
                    <div>
                      <label htmlFor="billNumber" className="block text-xl font-medium text-black mb-1">Invoice No: *</label>
                      <input type="text" id="billNumber" name="billNumber" value={billNumber} onChange={handleBillNumberChange} onKeyDown={(e) => handleInputKeyDown(e, 'currentDate')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="Enter Invoice Number" required />
                    </div>
                    <div>
                      <label htmlFor="currentDate" className="block text-xl font-medium text-black mb-1">Date: *</label>
                      <input type="date" id="currentDate" name="currentDate" value={currentDate} onChange={handleDateChange} onKeyDown={(e) => handleInputKeyDown(e, 'customerName')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="Select Date" required />
                    </div>
                    <div>
                      <label htmlFor="customerGstin" className="block text-xl font-medium text-black mb-1">GSTIN</label>
                      <input type="text" id="customerGstin" name="gstin" value={customerDetails.gstin || ''} onChange={handleCustomerDetailChange} onKeyDown={(e) => handleInputKeyDown(e, 'customerAddress')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="Type to autofill name & address" />
                    </div>
                    <div>
                      <label htmlFor="customerName" className="block text-xl font-medium text-black mb-1">Customer Name *</label>
                      <input type="text" id="customerName" name="name" value={customerDetails.name} onChange={handleCustomerDetailChange} onKeyDown={(e) => handleInputKeyDown(e, 'customerGstin')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="Enter customer's Name" required />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="customerAddress" className="block text-xl font-medium text-black mb-1">Address *</label>
                      <input type="text" id="customerAddress" name="address" value={customerDetails.address} onChange={handleCustomerDetailChange} onKeyDown={(e) => handleInputKeyDown(e, 'cgstRate')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="Enter customer's address" required />
                    </div>
                    
                    <div>
                      <label htmlFor="cgstRate" className="block text-xl font-medium text-black mb-1">CGST Rate (%):</label>
                      <input type="number" id="cgstRate" value={cgstRate === 0 && document.activeElement !== document.getElementById('cgstRate') ? '' : cgstRate.toString()} onChange={handleRateChange(setCgstRate)} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setCgstRate(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'sgstRate')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="e.g., 2.5" min="0" step="0.01" />
                    </div>
                    <div>
                      <label htmlFor="sgstRate" className="block text-xl font-medium text-black mb-1">SGST Rate (%):</label>
                      <input type="number" id="sgstRate" value={sgstRate === 0 && document.activeElement !== document.getElementById('sgstRate') ? '' : sgstRate.toString()} onChange={handleRateChange(setSgstRate)} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setSgstRate(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'igstRate')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="e.g., 2.5" min="0" step="0.01" />
                    </div>
                    <div>
                      <label htmlFor="igstRate" className="block text-xl font-medium text-black mb-1">IGST Rate (%):</label>
                      <input type="number" id="igstRate" value={igstRate === 0 && document.activeElement !== document.getElementById('igstRate') ? '' : igstRate.toString()} onChange={handleRateChange(setIgstRate)} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setIgstRate(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'discountPercentage')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="e.g., 5" min="0" step="0.01" />
                    </div>
                    <div>
                      <label htmlFor="discountPercentage" className="block text-xl font-medium text-black mb-1">Discount (%):</label>
                      <input type="number" id="discountPercentage" value={discountPercentage === 0 && document.activeElement !== document.getElementById('discountPercentage') ? '' : discountPercentage.toString()} onChange={handleDiscountChange} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setDiscountPercentage(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'otherCharges')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="e.g., 10" min="0" step="0.01" />
                    </div>
                     <div>
                      <label htmlFor="otherCharges" className="block text-xl font-medium text-black mb-1">Other Charges (₹):</label>
                      <input type="number" id="otherCharges" value={otherCharges === 0 && document.activeElement !== document.getElementById('otherCharges') ? '' : otherCharges.toString()} onChange={handleOtherChargesChange} onFocus={(e) => e.target.value === '0' ? e.target.value = '' : null} onBlur={(e) => e.target.value === '' ? setOtherCharges(0) : null} onKeyDown={(e) => handleInputKeyDown(e, 'proceedToSareeSelectionButton')} className="w-full p-2 border border-[#72a7e8] rounded-md shadow-sm focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black text-lg" placeholder="e.g., 50 or -20" step="0.01" />
                    </div>
                  </div>
                   <button
                    id="proceedToSareeSelectionButton"
                    onClick={handleProceedToSareeSelection}
                    disabled={!isCustomerInfoValid}
                    className={`mt-6 w-full font-semibold py-2.5 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152] 
                      ${!isCustomerInfoValid
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : 'bg-[#72a7e8] text-white hover:bg-[#fd8152] hover:text-white transform hover:scale-105'
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
                      className="mb-4 px-4 py-2 bg-white/80 text-black border border-[#72a7e8] rounded-lg hover:bg-[#fd8152] hover:text-white transition-colors duration-150 ease-in-out flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Customer & Invoice Details
                    </button>
                  <section className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-[#72a7e8]">
                    <h2 className="text-2xl font-semibold mb-4 text-black border-b border-[#72a7e8] pb-2">Select Sarees & Build Cart</h2>
                    <div className="mb-6 flex flex-wrap gap-2">
                      {currentSareeCategories.map(category => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setCategoryInteractionMade(true);
                          }}
                          className={`px-4 py-2 text-xl font-medium rounded-lg transition-colors duration-150 ease-in-out focus:outline-none 
                            ${selectedCategory === category 
                              ? 'bg-[#72a7e8] text-white shadow-md ring-2 ring-offset-1 ring-[#fd8152] ring-offset-white/80'
                              : 'bg-white/80 text-black border border-[#72a7e8] hover:bg-[#fd8152] hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152]'
                            }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-6">
                      {renderSareeSelectionContent()}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  <section className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-[#72a7e8] sticky top-8">
                    <h2 className="text-2xl font-semibold mb-4 text-black border-b border-[#72a7e8] pb-2">Shopping Cart</h2>
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
            <section className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-[#72a7e8] max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b border-[#72a7e8] pb-3">
                <h2 className="text-3xl font-semibold text-black">Final Bill</h2>
                <button
                  onClick={handleBackToEdit}
                  className="px-4 py-2 bg-white/80 text-black border border-[#72a7e8] rounded-lg hover:bg-[#fd8152] hover:text-white transition-colors duration-150 ease-in-out flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152]"
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
                  className="mt-8 w-full bg-[#72a7e8] text-white hover:bg-[#fd8152] hover:text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152]"
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
       <footer className="text-center mt-12 py-6 border-t border-[#72a7e8]/50">
        <p className="text-sm text-black">&copy; {new Date().getFullYear()} {COMPANY_DETAILS.name}. All rights reserved.</p>
        <p className="text-xs text-black opacity-75 mt-1">Designed with Passion for Saree Craftsmanship</p>
      </footer>
    </div>
  );
};

export default App;
