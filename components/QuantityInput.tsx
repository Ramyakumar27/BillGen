
import React from 'react';

interface QuantityInputProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  small?: boolean; // For a more compact version
}

const QuantityInput: React.FC<QuantityInputProps> = ({ value, onChange, min = 0, max = 500, small = false }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let numValue = parseInt(e.target.value, 10);
    if (isNaN(numValue)) {
      numValue = min; 
    }
    if (numValue < min) numValue = min;
    if (numValue > max) numValue = max;
    onChange(numValue);
  };

  const inputClass = small 
    ? "w-16 text-center text-base" // Changed from text-sm
    : "w-20 text-center text-lg";  // Changed from text-md (assuming effective text-base)

  return (
    <div>
      <input
        type="number"
        value={value === 0 ? '' : value}
        onChange={handleChange}
        min={min}
        max={max}
        className={`${inputClass} p-1 border border-[#72a7e8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#fd8152] focus:border-[#fd8152] bg-white text-black`} /* Border, Focus Ring, Text, BG */
        aria-label="Current quantity"
        placeholder={min === 0 ? "0" : String(min)}
      />
    </div>
  );
};

export default QuantityInput;
