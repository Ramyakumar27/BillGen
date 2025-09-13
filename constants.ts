
import { Saree, CompanyDetails } from './types';

/**
 * @description DEFAULT_SAREE_DATA_LIST is now a minimal fallback.
 * Saree data is primarily loaded from an external API (e.g., sheet.best).
 * This list will be used only if the API call fails and a fallback is implemented.
 */
export const DEFAULT_SAREE_DATA_LIST: Saree[] = [];

// Dynamically create categories list with "All" from default data
// If DEFAULT_SAREE_DATA_LIST is empty, this will correctly result in ["All"]
const uniqueDefaultCategories = DEFAULT_SAREE_DATA_LIST.length > 0 
  ? Array.from(new Set(DEFAULT_SAREE_DATA_LIST.map(saree => saree.category))) 
  : [];
export const DEFAULT_SAREE_CATEGORIES: string[] = uniqueDefaultCategories.length > 0 
  ? ["All", ...uniqueDefaultCategories.sort()]
  : ["All"]; // Ensures "All" is present even if default list is empty


export const COMPANY_DETAILS = {
  name: import.meta.env.VITE_COMPANY_NAME,
  proprietorName: import.meta.env.VITE_PROPRIETOR_NAME,
  address: import.meta.env.VITE_ADDRESS_LINE1,
  addressLine2: import.meta.env.VITE_ADDRESS_LINE2,
  email: import.meta.env.VITE_EMAIL,
  phone: import.meta.env.VITE_PHONE,
  gstin: import.meta.env.VITE_GSTIN,
  bankDetails: {
    accountName: import.meta.env.VITE_ACCOUNT_NAME,
    accountNumber: import.meta.env.VITE_ACCOUNT_NUMBER,
    bankName: import.meta.env.VITE_BANK_NAME,
    branchName: import.meta.env.VITE_BRANCH_NAME,
    ifscCode: import.meta.env.VITE_IFSC_CODE
  }
};

export const GST_RATE: number = Number(import.meta.env.VITE_GST_RATE);
export const UNIFIED_HSN_CODE: string = import.meta.env.VITE_UNIFIED_HSN_CODE;



