import ProfilClient from "./ProfilClient";

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <ProfilClient userId={userId} />;
}