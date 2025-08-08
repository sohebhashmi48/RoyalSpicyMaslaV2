export const formatCurrency = (amount) => {
  const numAmount = Number(amount) || 0;
  return `₹${numAmount.toFixed(2)}`;
};

export const formatDate = (dateStr) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

export const formatQuantity = (qty) => {
  const numQty = Number(qty) || 0;
  return numQty.toFixed(3);
};

export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};
