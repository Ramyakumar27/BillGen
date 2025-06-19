
import React, { useState, useEffect } from 'react';
import { Saree } from '../types';
import QuantityInput from './QuantityInput';

interface SareeItemDisplayProps {
  saree: Saree;
  onAddToBill: (saree: Saree, quantity: number) => void; // Manages adding/updating/removing from cart
  currentQuantityInBill: number; // Represents quantity in cart
}

const SareeItemDisplay: React.FC<SareeItemDisplayProps> = ({ saree, onAddToBill, currentQuantityInBill }) => {
  const [quantity, setQuantity] = useState<number>(currentQuantityInBill);

  useEffect(() => {
    setQuantity(currentQuantityInBill);
  }, [currentQuantityInBill]);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  const handleActionClick = () => {
    onAddToBill(saree, quantity);
  };
  
  let buttonText = "Add to Cart";
  // Base style for active, non-disabled button
  let buttonBaseStyle = "bg-[#FF9C5F] text-[#014D6D] hover:bg-[#FFFBDE] hover:text-[#014D6D] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#FF9C5F] focus:ring-offset-[#00CEC8]"; 

  if (currentQuantityInBill > 0) { // Item is in cart
    if (quantity === 0) {
      buttonText = "Remove from Cart";
    } else if (quantity !== currentQuantityInBill) {
      buttonText = "Update Cart";
    } else { // quantity === currentQuantityInBill (and > 0)
      buttonText = "In Cart"; 
    }
  } else { // Item not in cart
    if (quantity > 0) {
      buttonText = "Add to Cart";
    } else { // quantity is 0, item not in cart
      buttonText = "Add to Cart"; 
    }
  }

  const isButtonDisabled = (currentQuantityInBill === 0 && quantity === 0) || 
                           (currentQuantityInBill > 0 && quantity === currentQuantityInBill && buttonText === "In Cart");

  const buttonFinalStyle = isButtonDisabled 
    ? "bg-gray-500 text-gray-300 cursor-not-allowed" // Disabled style (standard)
    : buttonBaseStyle;


  return (
    <div className="bg-[#00CEC8] rounded-lg shadow-md overflow-hidden p-3 flex flex-row items-center justify-between gap-4"> {/* Card BG */}
      {/* Left: Saree Info (Name, Price) */}
      <div className="flex-grow min-w-0">
        <h3 className="text-lg font-semibold text-[#014D6D] truncate" title={saree.name}>{saree.name}</h3> {/* Card Text updated */}
        <p className="text-md font-bold text-[#014D6D]">₹{saree.price.toLocaleString()}</p> {/* Card Text updated */}
      </div>
      
      {/* Right: Controls (QuantityInput and Button) */}
      <div className="flex items-center gap-2 flex-shrink-0"> {/* Ensure flex-shrink-0 for this container */}
        <QuantityInput 
          value={quantity} 
          onChange={handleQuantityChange} 
          min={0}
          small={true}
        />
        <button
          onClick={handleActionClick}
          disabled={isButtonDisabled}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-colors duration-150 ease-in-out whitespace-nowrap ${buttonFinalStyle}`}
          aria-label={buttonText}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default SareeItemDisplay;