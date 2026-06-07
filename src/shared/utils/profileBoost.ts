export const PROFILE_BOOST_DURATION_HOURS = 24;

export const getProfileBoostExpiry = (startedAt = new Date()) => {
  const expiresAt = new Date(startedAt);
  expiresAt.setHours(expiresAt.getHours() + PROFILE_BOOST_DURATION_HOURS);
  return expiresAt;
};

export const isProfileBoostActive = (
  boostedUntil?: string | null,
  nowMs = Date.now(),
) => {
  if (!boostedUntil) {
    return false;
  }

  const boostedUntilMs = new Date(boostedUntil).getTime();
  return Number.isFinite(boostedUntilMs) && boostedUntilMs > nowMs;
};

export const getProfileBoostRank = (
  boostedUntil?: string | null,
  nowMs = Date.now(),
) => {
  if (!isProfileBoostActive(boostedUntil, nowMs)) {
    return 0;
  }

  return new Date(boostedUntil ?? 0).getTime();
};

export const formatProfileBoostExpiry = (boostedUntil?: string | null) => {
  if (!boostedUntil) {
    return "";
  }

  const date = new Date(boostedUntil);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
