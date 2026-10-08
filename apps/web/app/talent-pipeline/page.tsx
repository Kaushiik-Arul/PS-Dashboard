import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TalentPipelinePage({ searchParams }: Props) {
  const query = await searchParams;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item) params.append(key, item);
    });
  });
  const queryString = params.toString();
  redirect(`/talent-pipeline/talent-pool${queryString ? `?${queryString}` : ""}`);
}