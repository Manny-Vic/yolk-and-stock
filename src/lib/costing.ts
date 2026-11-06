/** Weighted-average cost per case after receiving new stock (all centavos). */
export function weightedAverageCost(onHand: number, currentCost: number, addedQty: number, addedCost: number): number {
  const stock = Math.max(0, onHand);
  if (addedQty <= 0) return currentCost;
  if (stock === 0) return addedCost;
  return Math.round((stock * currentCost + addedQty * addedCost) / (stock + addedQty));
}

/** Landed cost per case for one purchase line: item cost plus an even share of delivery. */
export function landedCostPerCase(itemCost: number, deliveryCost: number, totalAcceptedCases: number): number {
  if (totalAcceptedCases <= 0) return itemCost;
  return itemCost + Math.round(deliveryCost / totalAcceptedCases);
}
