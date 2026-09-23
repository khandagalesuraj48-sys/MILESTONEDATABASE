import { ObjectId } from 'mongodb';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Module Registry Schema
export interface PlatformModule {
  _id?: ObjectId;
  id: string; // e.g., "interview-master", "employee-master"
  name: string;
  icon: string;
  description: string;
  route: string;
  status: 'active' | 'coming_soon' | 'maintenance';
  order: number;
  category: 'hr' | 'operations' | 'finance' | 'admin';
  version: string;
}

// Candidate Contact & Details
export interface PhoneNumber {
  number: string;
  type: 'primary' | 'secondary' | 'other';
  isPrimary: boolean;
}

export interface EmailAddress {
  address: string;
  type: 'primary' | 'secondary' | 'other';
  isPrimary: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Education {
  qualification: string;
  course: string;
  specialization: string;
  passingYear: string;
  institute?: string;
  percentageOrCgpa?: string;
}

export interface Experience {
  company: string;
  designation: string;
  fromYear: string;
  toYear: string;
  roleSummary: string;
  isCurrent?: boolean;
}

export interface CandidateDocument {
  _id?: ObjectId;
  interviewId: string; // e.g. "INT-2026-0001"
  name: string;
  phones: PhoneNumber[];
  emails: EmailAddress[];
  dob?: string;
  age?: number;
  currentAddress: Address;
  permanentAddress: Address;
  isPermanentSameAsCurrent: boolean;
  education: Education[];
  experience: Experience[];
  totalExperienceYears: number;
  currentCompany?: string;
  currentDesignation?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  skills: string[];
  roleApplied: string;
  department: string;
  interviewDate: string; // YYYY-MM-DD
  interviewTime?: string; // HH:mm
  interviewMode: string; // In-Person, Video Call, Phone
  interviewStatus: string; // Scheduled, Interviewed, Selected, Rejected, On Hold, Offer Sent
  remarks: string;
  resumeDocumentId?: ObjectId | string; // MongoDB GridFS File ID
  resumeFileName?: string;
  resumeFileSize?: number;
  whatsappOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CounterDocument {
  _id: string; // e.g. "interview_id_2026"
  seq: number;
}

export interface DropdownDocument {
  _id?: ObjectId;
  category: 'roles' | 'statuses' | 'interview_modes' | 'departments' | 'qualifications';
  values: string[];
  updatedAt: Date;
}

export interface AuditLogDocument {
  _id?: ObjectId;
  entityType: 'candidate' | 'interview' | 'document' | 'module' | 'employee' | 'setting';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'extract' | 'download';
  details?: any;
  timestamp: Date;
  ipAddress?: string;
}

export interface DashboardStats {
  totalCandidates: number;
  todayInterviews: number;
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
  recentCandidates: CandidateDocument[];
}

// Document Metadata for documents collection (GridFS linkage)
export interface DocumentMetadataDocument {
  _id?: ObjectId;
  resumeFileName: string;
  mimeType: string;
  fileSize: number;
  gridFsId: ObjectId;
  entityType: 'candidate' | 'employee';
  entityId: string; // interviewId or employeeId
  documentType: 'resume' | 'offer_letter' | 'id_proof' | 'contract' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

// Employee Model for future conversion and enterprise scaling
export interface EmployeeDocument {
  _id?: ObjectId;
  employeeId: string; // e.g. "EMP-2026-0001"
  candidateId?: string; // e.g. "INT-2026-0001"
  name: string;
  phones: PhoneNumber[];
  emails: EmailAddress[];
  dob?: string;
  age?: number;
  address: Address;
  department: string;
  designation: string;
  joiningDate: string; // YYYY-MM-DD
  salary?: string;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branch?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  documents: Array<{
    documentId: ObjectId | string;
    name: string;
    type: string;
  }>;
  status: 'active' | 'probation' | 'notice_period' | 'resigned' | 'terminated';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interview Event Model for interviews collection
export interface InterviewEventDocument {
  _id?: ObjectId;
  interviewId: string;
  candidateName: string;
  position: string;
  department: string;
  interviewDate: string;
  interviewTime?: string;
  interviewMode: string;
  interviewer?: string;
  status: string;
  recommendation?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Settings Model for settings collection
export interface SettingsDocument {
  _id?: ObjectId;
  key: string;
  value: any;
  category: 'platform' | 'interview_master' | 'general';
  updatedAt: Date;
}

