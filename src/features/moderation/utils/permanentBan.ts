// Kalıcı ban durumunu UI ve hook katmanlarında güvenilir şekilde ayırt eder.
export const PERMANENT_BAN_CODE = "PERMANENT_BAN";

export class PermanentBanError extends Error {
  readonly code = PERMANENT_BAN_CODE;

  constructor(message = "Hesap kalıcı olarak banlandı.") {
    super(message);
    this.name = "PermanentBanError";
  }
}

export const isPermanentBanError = (error: unknown) =>
  error instanceof PermanentBanError ||
  (error instanceof Error && "code" in error && error.code === PERMANENT_BAN_CODE);
