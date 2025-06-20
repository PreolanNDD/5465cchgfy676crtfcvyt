/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers
 * @param arr1 First array of numbers
 * @param arr2 Second array of numbers
 * @returns Correlation coefficient between -1 and 1, or null if calculation is not possible
 */
export function calculatePearsonCorrelation(arr1: number[], arr2: number[]): number | null {
  // Validate inputs
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) {
    return null;
  }
  
  if (arr1.length !== arr2.length) {
    return null;
  }
  
  const n = arr1.length;
  
  // Need at least 2 data points for correlation
  if (n < 2) {
    return null;
  }
  
  // Calculate means
  const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate numerator and denominators
  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }
  
  // Calculate correlation coefficient
  const denominator = Math.sqrt(sumSq1 * sumSq2);
  
  // Avoid division by zero
  if (denominator === 0) {
    return null;
  }
  
  const correlation = numerator / denominator;
  
  // Ensure result is within valid range due to floating point precision
  return Math.max(-1, Math.min(1, correlation));
}