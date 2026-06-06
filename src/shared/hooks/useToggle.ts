// Basit ac-kapat durumlarini tekrar kullanilabilir hale getirir.
import { useCallback, useState } from "react";

export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);
  const enable = useCallback(() => setValue(true), []);
  const disable = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((current) => !current), []);

  return { value, enable, disable, toggle, setValue };
};
