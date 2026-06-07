// Ozel davet hedef ismini locale farklarindan bagimsiz eslestirir.
const turkishCharacterMap: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

export const normalizePersonName = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (character) => turkishCharacterMap[character] ?? character)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const isZeynepCisemAlias = (value: string) => {
  const normalized = normalizePersonName(value);

  if (!normalized) {
    return false;
  }

  const tokens = normalized.split(" ");
  const hasZeynep = tokens.includes("zeynep");
  const hasCisem = tokens.includes("cisem");
  const hasDogan = tokens.includes("dogan");

  if (
    ["cisem", "zeynep cisem", "zeynep dogan", "cisem dogan", "zeynep cisem dogan"].includes(
      normalized,
    )
  ) {
    return true;
  }

  if (hasCisem && tokens.length <= 5 && (tokens.length === 1 || hasZeynep || hasDogan)) {
    return true;
  }

  return hasZeynep && hasDogan && tokens.length <= 5;
};
