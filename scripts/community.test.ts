import test from "node:test";
import assert from "node:assert/strict";
import { isAdultDate } from "../src/features/community/ageGate";
import {
  initialSpace,
  transitionSpace,
} from "../src/features/community/spaceModel";
import { useNetworkStore } from "../src/features/community/networkStore";

const admin = { id: "main-admin", role: "admin" as const };
const member = { id: "self", role: "member" as const };

test("age gate rejects missing, invalid, future and underage dates, accepts exact 18th birthday", () => {
  const today = "2026-10-27";
  for (const date of [
    "",
    "2008-10-28",
    "2027-01-01",
    "2000-02-30",
    "01/01/1990",
    "1900-01-01",
  ])
    assert.equal(isAdultDate(date, today), false, date);
  assert.equal(isAdultDate("2008-10-27", today), true);
  assert.equal(isAdultDate("2008-02-29", today), true);
});
test("member cannot end room, rename, promote, mute, remove, or impersonate admin", () => {
  const room = initialSpace();
  for (const command of [
    { type: "end" },
    { type: "reopen" },
    { type: "rename", title: "New topic" },
    ...["approve", "mute", "remove"].map((type) => ({
      type,
      participantId: "eren",
    })),
  ]) {
    assert.throws(
      () => transitionSpace(room, member, command as any),
      /ana admin/,
    );
    assert.throws(
      () =>
        transitionSpace(room, { id: "self", role: "admin" }, command as any),
      /ana admin/,
    );
  }
  assert.equal(room.status, "open");
});
test("listener can request own turn, only admin can approve, initial microphone stays muted", () => {
  let room = transitionSpace(initialSpace(), member, {
    type: "raise-hand",
    participantId: "self",
  });
  assert.equal(
    room.participants.find((p) => p.id === "self")?.handRaised,
    true,
  );
  assert.throws(() =>
    transitionSpace(room, member, {
      type: "raise-hand",
      participantId: "eren",
    }),
  );
  room = transitionSpace(room, admin, {
    type: "approve",
    participantId: "self",
  });
  assert.deepEqual(
    room.participants.find((p) => p.id === "self"),
    {
      id: "self",
      name: "Sen",
      stage: "speaker",
      muted: true,
      handRaised: false,
    },
  );
});
test("admin can moderate, cannot remove host, ending clears microphones and pending hands", () => {
  let room = initialSpace();
  assert.throws(() =>
    transitionSpace(room, admin, {
      type: "remove",
      participantId: "main-admin",
    }),
  );
  room = transitionSpace(room, admin, { type: "mute", participantId: "deniz" });
  assert.equal(room.participants.find((p) => p.id === "deniz")?.muted, true);
  room = transitionSpace(room, admin, {
    type: "remove",
    participantId: "eren",
  });
  assert.equal(
    room.participants.some((p) => p.id === "eren"),
    false,
  );
  room = transitionSpace(room, admin, { type: "end" });
  assert.equal(room.status, "ended");
  assert.ok(room.participants.every((p) => p.muted && !p.handRaised));
  assert.throws(
    () =>
      transitionSpace(room, member, {
        type: "raise-hand",
        participantId: "self",
      }),
    /sona erdi/,
  );
  assert.equal(transitionSpace(room, admin, { type: "reopen" }).status, "open");
});
test("matching requires age gate and mutual fixture, duplicate likes do not duplicate matches", () => {
  useNetworkStore.setState({
    ageConfirmed: false,
    liked: [],
    matches: [],
    passed: [],
  });
  assert.throws(() => useNetworkStore.getState().like("deniz"));
  useNetworkStore.getState().confirmAge();
  assert.equal(useNetworkStore.getState().like("eren"), false);
  assert.equal(useNetworkStore.getState().like("deniz"), true);
  assert.equal(useNetworkStore.getState().like("deniz"), false);
  assert.deepEqual(useNetworkStore.getState().matches, ["deniz"]);
});
