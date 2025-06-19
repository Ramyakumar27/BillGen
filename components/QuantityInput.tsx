
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
        className={`${inputClass} p-1 border border-[#00CEC8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#FF9C5F] focus:border-[#FF9C5F] bg-white text-black`} /* Border, Focus Ring, Text, BG */
        aria-label="Current quantity"
        placeholder={min === 0 ? "0" : String(min)}
      />
    </div>
  );
};

export default QuantityInput;