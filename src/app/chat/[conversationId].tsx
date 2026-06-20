import { Redirect, useLocalSearchParams } from "expo-router";

export default function ConversationRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  return (
    <Redirect
      href={{
        pathname: "/tabs/chat/[conversationId]",
        params: { conversationId: conversationId ?? "" },
      }}
    />
  );
}
