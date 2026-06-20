import { Redirect, useLocalSearchParams } from "expo-router";

export default function FeedPostRoute() {
  const { postId } = useLocalSearchParams<{ postId: string }>();

  return (
    <Redirect
      href={{
        pathname: "/tabs/feed/[postId]",
        params: { postId: postId ?? "" },
      }}
    />
  );
}
