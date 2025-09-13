import React from 'react';
import { BillItem, CustomerDetails, CompanyDetails } from '../types';
import { UNIFIED_HSN_CODE } from '../constants';

interface BillDisplayProps {
  billItems: BillItem[];
  customerDetails: CustomerDetails;
  companyDetails: CompanyDetails;
  billNumber: string;
  currentDate: string;
  rawSubtotal: number;
  discountPercentage: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  otherCharges: number;
  grandTotal: number;
}

const MIN_TABLE_ROWS = 16; 

const numberToWordsInRupees = (originalNum: number): string => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n: number, suffix: string = ''): string => {
      let str = "";
      if (n === 0 && suffix !== '') return ""; 
      if (n === 0 && suffix === '') return a[0]; 

      if (n > 19) {
          str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      } else {
          str += a[n];
      }
      if (suffix && str) {
          str += ' ' + suffix;
      }
      return str.trim(); 
  };
  
  if (originalNum === 0) return 'RUPEES ZERO ONLY';

  let numForWords = Math.floor(originalNum);
  let words = "";

  const crore = Math.floor(numForWords / 10000000);
  numForWords %= 10000000;
  const lakh = Math.floor(numForWords / 100000);
  numForWords %= 100000;
  const thousand = Math.floor(numForWords / 1000);
  numForWords %= 1000;
  const hundred = Math.floor(numForWords / 100);
  numForWords %= 100; 

  if (crore > 0) {
      words += toWords(crore, 'Crore') + ' ';
  }
  if (lakh > 0) {
      words += toWords(lakh, 'Lakh') + ' ';
  }
  if (thousand > 0) {
      words += toWords(thousand, 'Thousand') + ' ';
  }
  if (hundred > 0) {
      words += toWords(hundred, 'Hundred') + ' ';
  }
  if (numForWords > 0) { 
      words += toWords(numForWords);
  }
  
  let finalRupeeWords = words.trim();
  
  const paisaValue = Math.round((originalNum - Math.floor(originalNum)) * 100);
  let paisaWords = "";
  if (paisaValue > 0) {
      if (finalRupeeWords === "") {
          paisaWords = toWords(paisaValue).trim() + " Paisa";
      } else {
          paisaWords = "and " + toWords(paisaValue).trim() + " Paisa";
      }
  }
  
  let resultString: string;
  if (finalRupeeWords === "" && paisaWords === "") { 
      resultString = 'Rupees Zero Only';
  } else if (finalRupeeWords === "") { 
      resultString = `Rupees ${paisaWords} Only`;
  } else {
      resultString = `Rupees ${finalRupeeWords} ${paisaWords} Only`.replace(/\s\s+/g, ' ').trim();
  }
  return resultString.toUpperCase();
};


const BillDisplay: React.FC<BillDisplayProps> = ({
  billItems,
  customerDetails,
  companyDetails,
  billNumber,
  currentDate,
  rawSubtotal,
  discountPercentage,
  discountAmount,
  subtotalAfterDiscount,
  cgstRate,
  sgstRate,
  igstRate,
  cgstAmount,
  sgstAmount,
  igstAmount,
  otherCharges,
  grandTotal,
}) => {

  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return 'N/A';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) {
        return isoDate;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        const parts = isoDate.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate; 
  };

  const emptyRowCount = Math.max(0, MIN_TABLE_ROWS - billItems.length);

  if (billItems.length === 0 && emptyRowCount === MIN_TABLE_ROWS) { 
    return (
      <div id="bill-content" className="bg-white p-6 md:p-8 border-2 border-black rounded-lg shadow-sm text-black flex flex-col justify-center items-center min-h-[800px]">
        <div className="text-center text-black py-10">
          <p className="text-lg">No items in the bill to display.</p>
          <p className="mt-2 text-base">Please go back and add items to your cart.</p>
        </div>
      </div>
    );
  }
  
  const grandTotalInWords = numberToWordsInRupees(grandTotal);
  const formatRate = (rate: number) => rate.toFixed(rate % 1 === 0 ? 0 : 2);

  const phoneNumbers = companyDetails.phone ? companyDetails.phone.split(',').map(num => num.trim()) : [];

  return (
    <div 
      id="bill-content" 
      className="bg-white p-4 md:p-6 border-2 border-black rounded-lg shadow-sm text-black flex flex-col min-h-[800px]"
    >
      {/* Bill Header */}
      <div className="mb-2">
        <div className="flex justify-between items-start mb-1">
          {/* GSTIN - Left Aligned */}
          <div className="text-left" style={{ flexBasis: '30%', minWidth: '150px' }}>
            {companyDetails.gstin && (
              <p className="text-sm font-semibold text-black">GSTIN: {companyDetails.gstin}</p>
            )}
          </div>

          {/* Company Identification Block - Center Aligned */}
          <div className="flex-1 text-center mx-4">
            <p className="text-xs text-black font-medium mb-0.5">Sri Murugan Thunai</p>
            <p className="text-base font-semibold text-black mb-0">CASH / CREDIT</p>
            <p className="text-lg font-bold text-black underline mb-0">TAX INVOICE</p>
            <h2 className="text-3xl font-bold text-black mb-0 whitespace-nowrap">
              {companyDetails.name}
            </h2>
            {companyDetails.proprietorName && (
              <p className="text-xl font-semibold text-black mt-0">
                (Prop: {companyDetails.proprietorName})
              </p>
            )}
            <p className="text-sm text-black mt-0">{companyDetails.address}</p>
            {companyDetails.addressLine2 && (
               <p className="text-sm text-black mb-0">{companyDetails.addressLine2}</p>
            )}
          </div>

          {/* Phone - Right Aligned */}
          <div className="text-right" style={{ flexBasis: '30%', minWidth: '150px' }}>
            {phoneNumbers.length > 0 && (
              <>
                <p className="text-sm font-semibold text-black">
                  Phone: {phoneNumbers[0]}
                </p>
                {phoneNumbers.slice(1).map((phone, index) => (
                  <p key={index} className="text-sm font-semibold text-black">
                    <span className="invisible">Phone: </span>{phone}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Separator Line */}
      <div className="w-full border-b-2 border-black my-3"></div>

      {/* Bill Info and Customer Details */}
      <div className="flex justify-between mb-6 text-base">
        <div className="w-1/2 flex items-start">
          <h4 className="font-semibold text-black mr-2">M/s.</h4>
          <div>
            <p className="text-black">{customerDetails.name || 'N/A'}</p>
            <p className="text-black">{customerDetails.address || 'N/A'}</p>
            {customerDetails.gstin && <p className="text-black">GSTIN: {customerDetails.gstin}</p>}
          </div>
        </div>
        <div className="text-right w-1/2">
          <p><span className="font-semibold text-black">Invoice No:</span> {billNumber}</p>
          <p><span className="font-semibold text-black">Date:</span> {formatDateForDisplay(currentDate)}</p>
        </div>
      </div>

      {/* Items Table Section */}
       <div className="flex-grow flex flex-col mb-0">
        <div 
          className="overflow-x-auto border-l-2 border-r-2 border-black" 
          style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        >
          <table className="w-full text-base text-left text-black" style={{ flexGrow: 1 }}>
            <thead className="text-sm text-black uppercase">
              <tr className="border-t-2 border-b-2 border-black">
                <th scope="col" className="px-0.5 py-2 md:px-1 md:py-2 text-center border-r-2 border-black" style={{ textAlign: 'center' }}>Sno</th>
                <th scope="col" className="w-[50%] px-3 py-2 text-center border-r-2 border-black" style={{ textAlign: 'center' }}>Particulars</th>
                <th scope="col" className="px-1 py-2 md:px-2 md:py-2 text-center border-r-2 border-black" style={{ textAlign: 'center' }}>HSN</th>
                <th scope="col" className="px-1 py-2 md:px-2 md:py-2 text-center border-r-2 border-black" style={{ textAlign: 'center' }}>Qty</th>
                <th scope="col" className="px-0.5 py-2 md:px-0.5 md:py-2 text-center border-r-2 border-black" style={{ textAlign: 'center' }}>Rate (₹)</th>
                <th scope="col" className="px-0.5 py-2 md:px-1 md:py-2 text-center" style={{ textAlign: 'center' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {billItems.map((item, index) => (
                <tr key={item.id} className="bg-white hover:bg-gray-50">
                  <td className="px-0.5 py-1 md:px-1 md:py-1 text-center border-r-2 border-black">{index + 1}</td>
                  <td className="px-3 py-1 font-medium text-black border-r-2 border-black">{item.name}</td>
                  <td className="px-1 py-1 md:px-2 md:py-1 text-center border-r-2 border-black">{UNIFIED_HSN_CODE}</td>
                  <td className="px-1 py-1 md:px-2 md:py-1 text-center border-r-2 border-black">{item.quantity}</td>
                  <td className="px-0.5 py-1 md:px-0.5 md:py-1 text-right border-r-2 border-black">
                    {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-0.5 py-1 md:px-1 md:py-1 text-right">
                    {item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {Array.from({ length: emptyRowCount }).map((_, index) => (
                <tr key={`empty-${index}`} className="bg-white">
                  <td className="px-0.5 py-1 md:px-1 md:py-1 text-center border-r-2 border-black h-[32px]">&nbsp;</td>
                  <td className="px-3 py-1 border-r-2 border-black">&nbsp;</td>
                  <td className="px-1 py-1 md:px-2 md:py-1 text-center border-r-2 border-black">&nbsp;</td>
                  <td className="px-1 py-1 md:px-2 md:py-1 text-center border-r-2 border-black">&nbsp;</td>
                  <td className="px-0.5 py-1 md:px-0.5 md:py-1 text-right border-r-2 border-black">&nbsp;</td>
                  <td className="px-0.5 py-1 md:px-1 md:py-1 text-right">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="w-full border-t-2 border-black"></div>

      <div className="mt-auto border-l-2 border-r-2 border-b-2 border-black rounded-b-md p-4 bg-white">
        <div className="flex justify-between items-start">
           <div className="w-3/5 pr-4 border-r-2 border-black">
            <div>
              <p className="text-sm font-semibold text-black mb-1">Amount in Words:</p>
              <p className="text-sm text-black leading-tight">
                {grandTotalInWords}
              </p>
            </div>
            {companyDetails.bankDetails && (
              <div className="mt-3" aria-label="Company bank account information">
                 <p className="text-sm font-semibold text-black mb-0.5">Bank Details:</p>
                 <p className="text-sm text-black leading-snug">
                    {companyDetails.bankDetails.bankName}<br />
                    {companyDetails.bankDetails.branchName}<br />
                    A/c No: {companyDetails.bankDetails.accountNumber}<br />
                    IFSC Code: {companyDetails.bankDetails.ifscCode}
                  </p>
              </div>
            )}
          </div>

          <div className="w-2/5 pl-4 space-y-1 text-base">
            {discountPercentage > 0 && (
              <div className="flex justify-between">
                <span className="text-black">Gross Total:</span>
                <span className="font-medium text-black">₹{rawSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {discountPercentage > 0 && (
              <div className="flex justify-between">
                <span className="text-black">Discount ({formatRate(discountPercentage)}%):</span>
                <span className="font-medium text-black">- ₹{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black">Taxable Value:</span>
              <span className="font-medium text-black">₹{subtotalAfterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">CGST ({formatRate(cgstRate)}%):</span>
              <span className="font-medium text-black">₹{cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">SGST ({formatRate(sgstRate)}%):</span>
              <span className="font-medium text-black">₹{sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">IGST ({formatRate(igstRate)}%):</span>
              <span className="font-medium text-black">₹{igstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-black">Others :</span>
                <span className="font-medium text-black">₹{otherCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-black border-t-2 border-black pt-1 mt-1">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-6 text-base"> 
        <div className="flex justify-between"> 
          <div className="text-left">
            <p className="font-semibold text-black mb-8 invisible">For {companyDetails.name}</p>
            <div className="border-t-2 border-black w-48"></div>
            <p className="mt-1 text-black">Receiver's Signature & Seal</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-black mb-8">For {companyDetails.name}</p>
            <div className="border-t-2 border-black w-48 ml-auto"></div>
            <p className="mt-1 text-black w-48 ml-auto text-center">Proprietor Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDisplay;
