import { Position } from './types';

// This type omits the calculated financial fields, as they will be computed
// at runtime when the data is loaded into the application.
export type InitialPositionData = Omit<Position, 'totalSalary' | 'overheadCost' | 'totalCost' | 'revenue' | 'profit' | 'margin'>;

// Simple IDs for easier reference within the sample data.
const ceo = 'ceo';
const coo = 'coo';
const cd = 'cd';
const dd = 'dd';
const dcs = 'dcs';

/**
 * @description Provides a sample organizational structure for demonstration purposes.
 * This data is used as the initial state if no saved data is found in local storage
 * or provided via URL parameters. It represents a typical small-to-medium sized agency.
 */
export const initialData: InitialPositionData[] = [
    { id: ceo, role: 'CEO', salary: 250000, rate: 0, utilization: 0, managerId: null, roleType: 'nonBillable' },
    { id: coo, role: 'COO', salary: 200000, rate: 0, utilization: 0, managerId: ceo, roleType: 'nonBillable' },
    { id: cd, role: 'Creative Director', salary: 160000, rate: 300, utilization: 50, managerId: coo, roleType: 'billable' },
    { id: dd, role: 'Development Director', salary: 160000, rate: 300, utilization: 60, managerId: coo, roleType: 'billable' },
    { id: dcs, role: 'Director of Client Services', salary: 150000, rate: 275, utilization: 55, managerId: coo, roleType: 'billable' },
    { id: 'ad', role: 'Art Director', salary: 110000, rate: 200, utilization: 75, managerId: cd, roleType: 'billable' },
    { id: 'sc', role: 'Senior Copywriter', salary: 95000, rate: 180, utilization: 80, managerId: cd, roleType: 'billable' },
    { id: 'ld', role: 'Lead Developer', salary: 130000, rate: 250, utilization: 85, managerId: dd, roleType: 'billable' },
    { id: 'sd', role: 'Senior Developer', salary: 115000, rate: 225, utilization: 90, managerId: dd, roleType: 'billable' },
    { id: 'pm', role: 'Project Manager', salary: 90000, rate: 175, utilization: 80, managerId: dcs, roleType: 'billable' },
    { id: 'am', role: 'Account Manager', salary: 85000, rate: 150, utilization: 70, managerId: dcs, roleType: 'billable' },
    { id: 'uxd', role: 'UX Designer', salary: 105000, rate: 190, utilization: 80, managerId: cd, roleType: 'billable' },
    { id: 'jd', role: 'Junior Developer', salary: 75000, rate: 150, utilization: 95, managerId: 'ld', roleType: 'billable' },
];