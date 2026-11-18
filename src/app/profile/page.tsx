import { redirect } from "next/navigation";
import { getUserDoc, toPublic } from "@/lib/auth";
import { TOPICS } from "@/lib/papers";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const user = await getUserDoc();
  if (!user) redirect("/login?next=/profile");

  return (
    <ProfileClient
      user={toPublic(user)}
      initialBoards={user.boards}
      initialDigest={{
        enabled: user.digest.enabled,
        frequency: user.digest.frequency,
        topics: user.digest.topics,
        boardIds: user.digest.boardIds,
      }}
      topics={TOPICS.map((topic) => topic.name)}
    />
  );
}
