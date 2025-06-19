
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


export const COMPANY_DETAILS: CompanyDetails = {
  name: "KUMAR HANDLOOMS",
  proprietorName: "K.KUMAR",
  address: "540, East Street, ELAIYUR (Post) - 621 806",
  addressLine2: "Jayankondam (Via), Ariyalur (Dt), Tamil Nadu.", // Added additional address line
  email: "kumarhandlooms17@gmail.com",
  gstin: "33BHQPK4317N1ZY",
  phone: "+91 98422 30554 , +91 74483 30554", // Added phone number
  bankDetails: {
    accountName: "Kumar Handlooms", 
    accountNumber: "0734256000002",
    bankName: "Canara Bank",
    branchName: "Elaiyur",
    ifscCode: "CNRB0000734"
  }
};

export const GST_RATE: number = 0.05; // 5% GST (Note: This is a general rate, actual rates are entered in UI)
export const UNIFIED_HSN_CODE: string = '5208'; // Default HSN for all sarees
