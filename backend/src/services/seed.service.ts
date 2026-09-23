import { getCandidatesCollection, getDropdownsCollection, getModulesCollection } from '../config/db';
import { PlatformModule, DropdownDocument } from '../models/types';

export const PLATFORM_MODULES_SEED: Omit<PlatformModule, '_id'>[] = [
  {
    id: 'interview-master',
    name: 'INTERVIEW MASTER',
    icon: 'user-check',
    description: 'Candidate screening, Gemini resume parsing, interview scheduling, and hiring lifecycle.',
    route: '/modules/interview-master',
    status: 'active',
    order: 1,
    category: 'hr',
    version: '1.0.0',
  },
  {
    id: 'employee-master',
    name: 'EMPLOYEE MASTER',
    icon: 'users',
    description: 'Comprehensive staff database, profiles, designations, and departmental allocations.',
    route: '/modules/employee-master',
    status: 'coming_soon',
    order: 2,
    category: 'hr',
    version: '1.0.0',
  },
  {
    id: 'offer-letter',
    name: 'OFFER LETTER',
    icon: 'file-text',
    description: 'Automated offer letter generation, salary breakdowns, and digital acceptance tracking.',
    route: '/modules/offer-letter',
    status: 'coming_soon',
    order: 3,
    category: 'hr',
    version: '1.0.0',
  },
  {
    id: 'attendance',
    name: 'ATTENDANCE',
    icon: 'calendar',
    description: 'Daily clock-in/out records, shift schedules, leaves, and biometric integration.',
    route: '/modules/attendance',
    status: 'coming_soon',
    order: 4,
    category: 'hr',
    version: '1.0.0',
  },
  {
    id: 'payroll',
    name: 'PAYROLL',
    icon: 'dollar-sign',
    description: 'Monthly payroll processing, statutory deductions (PF, ESI, TDS), and pay slip generation.',
    route: '/modules/payroll',
    status: 'coming_soon',
    order: 5,
    category: 'finance',
    version: '1.0.0',
  },
  {
    id: 'document-management',
    name: 'DOCUMENT MANAGEMENT',
    icon: 'folder',
    description: 'Centralized repository for corporate contracts, compliance documents, and employee archives.',
    route: '/modules/document-management',
    status: 'coming_soon',
    order: 6,
    category: 'admin',
    version: '1.0.0',
  },
  {
    id: 'reports',
    name: 'REPORTS & ANALYTICS',
    icon: 'bar-chart-2',
    description: 'Cross-module executive business intelligence, performance KPIs, and exportable reports.',
    route: '/modules/reports',
    status: 'coming_soon',
    order: 7,
    category: 'admin',
    version: '1.0.0',
  },
  {
    id: 'expense-management',
    name: 'EXPENSE MANAGEMENT',
    icon: 'credit-card',
    description: 'Staff expense claims, multi-level approvals, receipt scanning, and reimbursements.',
    route: '/modules/expense-management',
    status: 'coming_soon',
    order: 8,
    category: 'finance',
    version: '1.0.0',
  },
  {
    id: 'asset-management',
    name: 'ASSET MANAGEMENT',
    icon: 'laptop',
    description: 'Tracking IT hardware, office furniture, depreciation schedules, and employee allocations.',
    route: '/modules/asset-management',
    status: 'coming_soon',
    order: 9,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'vehicle-management',
    name: 'VEHICLE MANAGEMENT',
    icon: 'truck',
    description: 'Fleet tracking, fuel logs, maintenance schedules, insurance, and driver assignments.',
    route: '/modules/vehicle-management',
    status: 'coming_soon',
    order: 10,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'machinery-management',
    name: 'MACHINERY MANAGEMENT',
    icon: 'cpu',
    description: 'Industrial machinery uptime, preventative servicing logs, warranties, and calibration.',
    route: '/modules/machinery-management',
    status: 'coming_soon',
    order: 11,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'vendor-master',
    name: 'VENDOR MASTER',
    icon: 'briefcase',
    description: 'Supplier directory, contracts, GST/tax registrations, ratings, and payment terms.',
    route: '/modules/vendor-master',
    status: 'coming_soon',
    order: 12,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'project-management',
    name: 'PROJECT MANAGEMENT',
    icon: 'layers',
    description: 'Milestone tracking, deliverables, resource allocation, and budget oversight.',
    route: '/modules/project-management',
    status: 'coming_soon',
    order: 13,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'task-management',
    name: 'TASK MANAGEMENT',
    icon: 'check-square',
    description: 'Delegated tasks, subtasks, priorities, real-time status updates, and deadline reminders.',
    route: '/modules/task-management',
    status: 'coming_soon',
    order: 14,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'purchase',
    name: 'PURCHASE',
    icon: 'shopping-cart',
    description: 'Purchase requisitions, quotation comparisons, PO generation, and invoice matching.',
    route: '/modules/purchase',
    status: 'coming_soon',
    order: 15,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'inventory',
    name: 'INVENTORY',
    icon: 'package',
    description: 'Stock levels, warehouse bins, reorder thresholds, and material dispatch records.',
    route: '/modules/inventory',
    status: 'coming_soon',
    order: 16,
    category: 'operations',
    version: '1.0.0',
  },
  {
    id: 'compliance',
    name: 'COMPLIANCE',
    icon: 'shield',
    description: 'Labor law compliance, safety certifications, tax audits, and regulatory document expiry alerts.',
    route: '/modules/compliance',
    status: 'coming_soon',
    order: 17,
    category: 'admin',
    version: '1.0.0',
  },
];

export const DEFAULT_DROPDOWNS: Omit<DropdownDocument, '_id'>[] = [
  {
    category: 'roles',
    values: [
      'Software Engineer',
      'Senior Developer',
      'Full Stack Developer',
      'Mobile App Developer',
      'QA Engineer',
      'UI/UX Designer',
      'DevOps Engineer',
      'Project Manager',
      'Sales Executive',
      'HR Executive',
      'Operations Manager',
      'Accountant',
    ],
    updatedAt: new Date(),
  },
  {
    category: 'statuses',
    values: ['Scheduled', 'Interviewed', 'Selected', 'Rejected', 'On Hold', 'Offer Sent'],
    updatedAt: new Date(),
  },
  {
    category: 'interview_modes',
    values: ['In-Person', 'Video Call', 'Phone'],
    updatedAt: new Date(),
  },
  {
    category: 'departments',
    values: [
      'Engineering',
      'Product',
      'Design',
      'Quality Assurance',
      'Sales & Marketing',
      'Human Resources',
      'Finance & Accounts',
      'Operations',
    ],
    updatedAt: new Date(),
  },
  {
    category: 'qualifications',
    values: [
      'B.Tech / B.E.',
      'M.Tech / M.E.',
      'BCA',
      'MCA',
      'B.Sc',
      'M.Sc',
      'B.Com',
      'M.Com',
      'MBA / PGDM',
      'Diploma',
      'Higher Secondary (12th)',
      'Other',
    ],
    updatedAt: new Date(),
  },
];

export async function initializeDatabaseIndexesAndSeeds(): Promise<void> {
  try {
    const candidates = await getCandidatesCollection();
    const modules = await getModulesCollection();
    const dropdowns = await getDropdownsCollection();

    // 1. Indexes on Candidates
    await candidates.createIndex({ interviewId: 1 }, { unique: true });
    await candidates.createIndex({ 'phones.number': 1 });
    await candidates.createIndex({ 'emails.address': 1 });
    await candidates.createIndex({ createdAt: -1 });
    await candidates.createIndex({ interviewStatus: 1 });
    await candidates.createIndex({ roleApplied: 1 });
    await candidates.createIndex({
      name: 'text',
      roleApplied: 'text',
      skills: 'text',
      remarks: 'text',
    });

    // 2. Seed Modules
    for (const mod of PLATFORM_MODULES_SEED) {
      await modules.updateOne(
        { id: mod.id },
        {
          $setOnInsert: {
            name: mod.name,
            icon: mod.icon,
            description: mod.description,
            route: mod.route,
            status: mod.status,
            order: mod.order,
            category: mod.category,
            version: mod.version,
          },
        },
        { upsert: true }
      );
    }

    // 3. Seed Dropdowns
    for (const dd of DEFAULT_DROPDOWNS) {
      await dropdowns.updateOne(
        { category: dd.category },
        { $setOnInsert: { values: dd.values, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    console.log('[MongoDB] Collections, indexes, module registry and dropdown seeds verified successfully.');
  } catch (err: any) {
    console.error('[MongoDB] Warning during initialization:', err.message);
  }
}

