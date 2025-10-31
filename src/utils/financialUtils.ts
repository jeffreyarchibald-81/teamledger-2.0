import { Position } from '../types';

/**
 * Calculates all financial metrics for a given position based on global settings.
 * This is a pure function, central to the application's logic.
 * @param positionInput An object containing the core inputs: salary, rate, and utilization.
 * @param benefitsMultiplier A multiplier for salary to account for benefits, taxes, etc. (e.g., 1.3 for 30%).
 * @param overheadMultiplier A multiplier for total salary to account for operational overhead (e.g., 0.15 for 15%).
 * @param annualBillableHours The total number of billable hours in a year for a fully utilized employee.
 * @returns An object with all calculated financial metrics.
 */
export const calculateFinancials = (
  positionInput: { salary: number; rate: number; utilization: number; roleType: 'billable' | 'nonBillable'; },
  benefitsMultiplier: number,
  overheadMultiplier: number,
  annualBillableHours: number,
): Pick<Position, 'totalSalary' | 'overheadCost' | 'totalCost' | 'revenue' | 'profit' | 'margin'> => {
  const totalSalary = positionInput.salary * benefitsMultiplier;
  const overheadCost = totalSalary * overheadMultiplier;
  const totalCost = totalSalary + overheadCost;
  
  let revenue = 0;
  // Only calculate revenue for billable roles
  if (positionInput.roleType === 'billable') {
    revenue = positionInput.rate * (positionInput.utilization / 100) * annualBillableHours;
  }

  const profit = revenue - totalCost;
  // Calculate margin as a percentage. Handle cases with no revenue to avoid division by zero.
  const margin = revenue > 0 ? (profit / revenue) * 100 : (totalCost > 0 ? -100 : 0);

  return { totalSalary, overheadCost, totalCost, revenue, profit, margin };
};

/**
 * Helper to process raw position data, ensuring `roleType` is set and financials are correct.
 * This is used during initial data loading from local storage or URL parameters.
 * @param positions The array of raw position objects.
 * @returns An array of processed Position objects.
 */
export const processPositions = (positions: any[]): Position[] => {
    return positions.map(p => {
        let position: Partial<Position> = { ...p };
        // Backwards compatibility: if roleType isn't set, infer it.
        if (!position.roleType) {
            const cSuiteRegex = /^(ceo|coo|cfo|cto|cmo|chief)/i;
            position.roleType = cSuiteRegex.test(position.role || '') ? 'nonBillable' : 'billable';
        }
        // Ensure non-billable roles have no rate/utilization, as they don't directly generate revenue.
        if (position.roleType === 'nonBillable') {
            position.rate = 0;
            position.utilization = 0;
        }
        return position as Position;
    });
};

/**
 * Formats a number as a USD currency string.
 * @param {number} value The number to format.
 * @returns {string} The formatted currency string (e.g., "$1,234,567").
 */
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
};

/**
 * Formats a number as a percentage string.
 * @param {number} value The number to format (e.g., 85.5).
 * @returns {string} The formatted percentage string (e.g., "86%").
 */
export const formatPercent = (value: number) => {
    return `${value.toFixed(0)}%`;
};