export type SpaceRole = "admin" | "member";
export type StageRole = "host" | "speaker" | "listener";
export interface Participant {
  id: string;
  name: string;
  stage: StageRole;
  muted: boolean;
  handRaised: boolean;
}
export interface SpaceState {
  status: "open" | "ended";
  title: string;
  participants: Participant[];
  log: string[];
}
export type SpaceCommand =
  | { type: "raise-hand"; participantId: string }
  | { type: "approve" | "mute" | "remove"; participantId: string }
  | { type: "rename"; title: string }
  | { type: "end" }
  | { type: "reopen" };
export const initialSpace = (): SpaceState => ({
  status: "open",
  title: "Meydan · Birlikte konuşalım",
  participants: [
    {
      id: "main-admin",
      name: "Ana admin",
      stage: "host",
      muted: false,
      handRaised: false,
    },
    {
      id: "deniz",
      name: "Deniz",
      stage: "speaker",
      muted: false,
      handRaised: false,
    },
    {
      id: "eren",
      name: "Eren",
      stage: "listener",
      muted: true,
      handRaised: true,
    },
    {
      id: "self",
      name: "Sen",
      stage: "listener",
      muted: true,
      handRaised: false,
    },
  ],
  log: [],
});

// Space durum makinesi. Sunucu yetkilerini doğrular ve oda akışını yönetir.
export function transitionSpace(
  state: SpaceState,
  actor: { id: string; role: SpaceRole },
  command: SpaceCommand,
): SpaceState {
  const admin = actor.role === "admin" && actor.id === "main-admin";
  if (command.type !== "raise-hand" && !admin)
    throw new Error("Bu işlemi yalnızca ana admin yapabilir.");
  if (command.type === "reopen")
    return {
      ...initialSpace(),
      title: state.title,
      log: [...state.log, "Ana admin örnek odayı yeniden açtı."],
    };
  if (state.status === "ended") throw new Error("Oda sona erdi.");
  if (command.type === "end")
    return {
      ...state,
      status: "ended",
      participants: state.participants.map((p) => ({
        ...p,
        muted: true,
        handRaised: false,
      })),
      log: [...state.log, "Ana admin odayı sonlandırdı."],
    };
  if (command.type === "rename") {
    const title = command.title.trim();
    if (title.length < 5 || title.length > 80)
      throw new Error("Oda başlığı 5–80 karakter olmalı.");
    return { ...state, title, log: [...state.log, "Oda başlığı güncellendi."] };
  }
  const participant = state.participants.find(
    (p) => p.id === command.participantId,
  );
  if (!participant) throw new Error("Katılımcı bulunamadı.");
  if (participant.stage === "host" && command.type !== "raise-hand")
    throw new Error(
      "Ana admin odadan çıkarılamaz veya dinleyiciye düşürülemez.",
    );
  if (command.type === "raise-hand") {
    if (actor.id !== participant.id || participant.stage !== "listener")
      throw new Error("Yalnızca dinleyici kendi adına söz isteyebilir.");
    return {
      ...state,
      participants: state.participants.map((p) =>
        p.id === participant.id ? { ...p, handRaised: !p.handRaised } : p,
      ),
    };
  }
  if (
    command.type === "approve" &&
    (!participant.handRaised || participant.stage !== "listener")
  )
    throw new Error("Önce dinleyicinin söz istemesi gerekiyor.");
  if (command.type === "mute" && participant.stage !== "speaker")
    throw new Error("Yalnızca konuşmacının mikrofonu kapatılabilir.");
  return {
    ...state,
    participants:
      command.type === "remove"
        ? state.participants.filter((p) => p.id !== participant.id)
        : state.participants.map((p) =>
            p.id !== participant.id
              ? p
              : command.type === "approve"
                ? { ...p, stage: "speaker", muted: true, handRaised: false }
                : { ...p, muted: true },
          ),
    log: [
      ...state.log,
      `${participant.name}: ${command.type === "approve" ? "konuşmacı olarak onaylandı; mikrofon kapalı" : command.type === "mute" ? "mikrofonu kapatıldı" : "odadan çıkarıldı"}.`,
    ],
  };
}
