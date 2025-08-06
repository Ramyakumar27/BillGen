import React from 'react';
import { BillItem } from '../types';
import QuantityInput from './QuantityInput';

interface CartDisplayProps {
  cartItems: BillItem[];
  onUpdateQuantity: (sareeId: string, newQuantity: number) => void;
  onRemoveItem: (sareeId: string) => void;
  onUpdateItemPrice: (sareeId: string, newPrice: number) => void;
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
  onProceedToBill: () => void;
  customerName: string;
  customerAddress: string;
}

const CartDisplay: React.FC<CartDisplayProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemPrice,
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
  onProceedToBill,
  customerName,
  customerAddress,
}) => {
  const trimmedName = customerName.trim();
  const isProceedDisabled = 
    cartItems.length === 0 || 
    trimmedName.length === 0 || 
    customerAddress.trim() === '';

  if (cartItems.length === 0) {
    return (
      <div className="text-center text-black py-10"> {/* Text color updated */}
        <p>Your cart is empty.</p>
        <p className="mt-2 text-sm">Add sarees to get started.</p>
      </div>
    );
  }

  const handlePriceChange = (itemId: string, newPriceStr: string) => {
    if (newPriceStr.trim() === '') {
      onUpdateItemPrice(itemId, 0);
      return;
    }
    const newPrice = parseFloat(newPriceStr);
    if (!isNaN(newPrice)) {
      onUpdateItemPrice(itemId, Math.max(0, newPrice));
    }
  };

  const formatRate = (rate: number) => rate.toFixed(rate % 1 === 0 ? 0 : 2);

  return (
    <div className="space-y-4">
      <div className="max-h-[30rem] overflow-y-auto space-y-3 pr-2">
        {cartItems.map(item => (
          <div key={item.id} className="bg-[#72a7e8] p-3 rounded-lg shadow flex flex-col gap-2"> {/* Card BG */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xl font-medium text-black truncate flex-grow" title={item.name}>{item.name}</p> {/* Card Text updated */}
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 text-xs p-1 flex-shrink-0" /* Red icon color, Darker red on hover */
                title="Remove Item"
                aria-label={`Remove ${item.name} from cart`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <label htmlFor={`price-${item.id}`} className="text-xs text-black">Price (₹):</label> {/* Card Text updated */}
                <input
                  type="number"
                  id={`price-${item.id}`}
                  value={item.price === 0 ? '' : item.price.toString()}
                  onChange={(e) => handlePriceChange(item.id, e.target.value)}
                  onBlur={(e) => { 
                    if (e.target.value.trim() === '') {
                      onUpdateItemPrice(item.id, 0);
                    }
                  }}
                  min="0"
                  step="0.01"
                  className="w-20 p-1 border border-[#72a7e8] rounded-md text-sm focus:ring-1 focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black" /* Border, Focus Ring, BG, Text */
                  aria-label={`Price for ${item.name}`}
                  placeholder="0"
                />
              </div>
              <QuantityInput
                value={item.quantity}
                onChange={(newVal) => onUpdateQuantity(item.id, newVal)}
                min={0}
                max={500}
                small={true}
              />
            </div>
            <p className="text-xs font-semibold text-black text-right"> {/* Card Text updated */}
              Total: ₹{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#72a7e8] pt-4 space-y-1 text-xl"> {/* Border */}
        {discountPercentage > 0 && (
          <div className="flex justify-between font-medium">
            <span className="text-black">Gross Total:</span> {/* Text color updated */}
            <span className="text-black">₹{rawSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
          </div>
        )}
        {discountPercentage > 0 && (
          <div className="flex justify-between">
            <span className="text-black">Discount ({formatRate(discountPercentage)}%):</span> {/* Text color updated */}
            <span className="text-black">- ₹{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span className="text-black">Taxable Value:</span> {/* Text color updated */}
          <span className="text-black">₹{subtotalAfterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
        </div>
        {cgstRate > 0 && (
          <div className="flex justify-between">
            <span className="text-black">CGST ({formatRate(cgstRate)}%):</span> {/* Text color updated */}
            <span className="text-black">₹{cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
          </div>
        )}
        {sgstRate > 0 && (
          <div className="flex justify-between">
            <span className="text-black">SGST ({formatRate(sgstRate)}%):</span> {/* Text color updated */}
            <span className="text-black">₹{sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
          </div>
        )}
        {igstRate > 0 && (
          <div className="flex justify-between">
            <span className="text-black">IGST ({formatRate(igstRate)}%):</span> {/* Text color updated */}
            <span className="text-black">₹{igstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
          </div>
        )}
         {otherCharges !== 0 && (
          <div className="flex justify-between">
            <span className="text-black">Other Charges:</span> {/* Text color updated */}
            <span className="text-black">₹{otherCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {/* Text color updated */}
          </div>
        )}
        <div className="flex justify-between text-md font-bold text-black border-t border-[#72a7e8] pt-2 mt-2"> {/* Text updated, Border */}
          <span>Grand Total:</span>
          <span>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <button
        onClick={onProceedToBill}
        disabled={isProceedDisabled}
        className={`w-full mt-4 font-semibold py-2.5 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fd8152] 
          ${isProceedDisabled 
            ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
            : 'bg-[#72a7e8] text-white hover:bg-[#fd8152] hover:text-white transform hover:scale-105' 
          }`}
        aria-label="Proceed to Generate Bill"
      >
        Proceed to Generate Bill
      </button>
    </div>
  );
};

export default CartDisplay;
