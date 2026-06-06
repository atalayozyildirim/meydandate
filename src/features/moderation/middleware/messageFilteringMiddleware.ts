import { container } from "@/infrastructure/config/Container";
import type { Conversation, Message } from "@/domain/entities/Message";
import { sanitizePlainText } from "@/shared/utils/sanitize";

/**
 * Middleware for filtering messages before sending to chat
 * Applies content moderation and handles violations
 */
export async function messageFilteringMiddleware(
  conversationId: string,
  senderId: string,
  messageBody: string,
): Promise<{
  filteredBody: string;
  isBlocked: boolean;
  violations: any[];
  action?: "allow" | "warn" | "ban";
}> {
  const sanitizedBody = sanitizePlainText(messageBody);

  if (!sanitizedBody.trim()) {
    return {
      filteredBody: "",
      isBlocked: true,
      violations: [],
      action: "warn",
    };
  }

  try {
    // Check if user is banned
    const ban = await container.moderationRepository.checkIfBanned(senderId);
    if (ban) {
      return {
        filteredBody: sanitizedBody,
        isBlocked: true,
        violations: [],
        action: "ban",
      };
    }

    // Filter content
    const filterResult =
      container.contentModerationService.filterMessage(sanitizedBody);

    // Log filtered message
    if (!filterResult.isClean) {
      await container.moderationRepository.logAction({
        userId: senderId,
        action: "content_filtered",
        targetType: "message",
        details: {
          conversationId,
          violations: filterResult.violations,
          isBlocked: filterResult.shouldBlock,
        },
      });
    }

    // Handle high severity violations with permanent ban.
    if (
      filterResult.shouldBlock ||
      container.contentModerationService.shouldAutoBan(filterResult.violations)
    ) {
      await container.moderationRepository.banUser(
        senderId,
        "permanent",
        `Otomatik kalıcı ban: ${filterResult.violations.map((v) => v.type).join(", ")}`,
      );

      return {
        filteredBody: sanitizedBody,
        isBlocked: true,
        violations: filterResult.violations,
        action: "ban",
      };
    }

    // Handle medium/low severity violations
    if (!filterResult.isClean && filterResult.violations.length > 0) {
      // Issue warning for medium severity
      const severity = container.contentModerationService.getSeverity(
        filterResult.violations,
      );

      if (severity === "medium") {
        await container.moderationRepository.issueWarning(
          senderId,
          `Uygunsuz içerik: ${filterResult.violations.map((v) => v.type).join(", ")}`,
          "medium",
        );
      }
    }

    return {
      filteredBody: filterResult.filteredContent,
      isBlocked: false,
      violations: filterResult.violations,
      action: filterResult.violations.length > 0 ? "warn" : "allow",
    };
  } catch (error) {
    console.error("Message filtering middleware error:", error);

    return {
      filteredBody: sanitizedBody,
      isBlocked: true,
      violations: [],
      action: "warn",
    };
  }
}

/**
 * Check if conversation participants are banned
 */
export async function checkConversationParticipants(
  participant1Id: string,
  participant2Id: string,
): Promise<{ allowed: boolean; bannedUser?: string }> {
  const ban1 =
    await container.moderationRepository.checkIfBanned(participant1Id);
  const ban2 =
    await container.moderationRepository.checkIfBanned(participant2Id);

  if (ban1) {
    return { allowed: false, bannedUser: participant1Id };
  }
  if (ban2) {
    return { allowed: false, bannedUser: participant2Id };
  }

  return { allowed: true };
}
