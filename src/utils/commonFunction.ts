export const getValidNumber = (value: any) => {
  if (value === "NaN" || Number.isNaN(value)) {
    return 0;
  }
  return value;
};