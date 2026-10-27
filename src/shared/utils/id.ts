// Benzersiz ve okunabilir istemci kimlikleri üretir.
const ID_RANDOM_RANGE = 100000;

export const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * ID_RANDOM_RANGE)}`;
