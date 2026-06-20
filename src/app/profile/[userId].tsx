import { Redirect, useLocalSearchParams } from "expo-router";

export default function UserProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <Redirect
      href={{
        pathname: "/tabs/profile/[userId]",
        params: { userId: userId ?? "" },
      }}
    />
  );
}
