import type { Customer } from "../../../types";

// Auto-classify customer segment based on business rules
export const classifyCustomer = (customer: Customer): Customer["segment"] => {
  const points = customer.loyaltyPoints || 0;
  const spent = customer.totalSpent || 0;
  const visits = customer.visitCount || 0;
  const lastVisit = customer.lastVisit
    ? new Date(customer.lastVisit)
    : new Date();
  const daysSinceLastVisit = Math.floor(
    (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
  );

  // VIP: >= 5000 points OR >= 20M spent OR >= 20 visits
  if (points >= 5000 || spent >= 20000000 || visits >= 20) {
    return "VIP";
  }

  // Loyal: >= 2000 points OR >= 10M spent OR >= 10 visits
  if (points >= 2000 || spent >= 10000000 || visits >= 10) {
    return "Loyal";
  }

  // Lost: No visit in 180+ days (6 months)
  if (daysSinceLastVisit > 180 && visits > 0) {
    return "Lost";
  }

  // At Risk: No visit in 90+ days (3 months) but not lost yet
  if (daysSinceLastVisit > 90 && visits > 0) {
    return "At Risk";
  }

  // Potential: Has visited 2-9 times
  if (visits >= 2 && visits < 10) {
    return "Potential";
  }

  // New: First time or very few visits
  return "New";
};
