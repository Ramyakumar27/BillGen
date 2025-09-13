
export interface Saree {
  id: string;
  name: string;
  price: number;
  category: string; // Added category
  hsn?: string; // HSN code is optional, will use a unified one
}

export interface BillItem extends Saree {
  quantity: number;
  totalPrice: number;
}

export interface CustomerDetails {
  name: string;
  address: string;
  gstin?: string; // Optional GSTIN for customer
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string; // Added branch name
  ifscCode: string;
}

export interface CompanyDetails {
  name: string;
  address: string;
  addressLine2?: string; // New field for the additional address line
  email: string;
  gstin?: string; // Optional GSTIN
  phone?: string; // Optional Phone number
  proprietorName?: string; // Optional Proprietor Name
  bankDetails?: BankDetails; // Optional Bank Details
} 

// Declaration for global libraries loaded via CDN
declare global {
  interface Window {
    jspdf: any; // Namespace for jsPDF, e.g., window.jspdf.jsPDF
    html2canvas: any;
    XLSX: any; // Added for SheetJS library
  }
}