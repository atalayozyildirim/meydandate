export const normalizePhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90${digits}`;
  }

  return `+${digits}`;
};

export const formatPhoneNumberInput = (value: string): string => {
  const normalized = normalizePhoneNumber(value);

  if (normalized.startsWith("+90")) {
    const local = normalized.slice(3, 13);
    const groups = [
      local.slice(0, 3),
      local.slice(3, 6),
      local.slice(6, 8),
      local.slice(8, 10),
    ].filter(Boolean);

    return `+90${groups.length > 0 ? ` ${groups.join(" ")}` : ""}`;
  }

  const countryAndNumber = normalized.slice(1, 16);
  return countryAndNumber ? `+${countryAndNumber.replace(/(\d{3})(?=\d)/g, "$1 ").trim()}` : "";
};

export const normalizeOtp = (value: string): string => value.replace(/\D/g, "").slice(0, 6);

export const formatOtpInput = (value: string): string => {
  const otp = normalizeOtp(value);
  return otp.length > 3 ? `${otp.slice(0, 3)} ${otp.slice(3)}` : otp;
};

