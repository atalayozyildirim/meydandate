// Tarihleri kullanici dostu kisa metinlere donusturur.
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

export const formatDateTime = (value: string) => dateFormatter.format(new Date(value));
