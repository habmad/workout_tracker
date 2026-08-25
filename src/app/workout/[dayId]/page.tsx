import { notFound } from "next/navigation";
import { WorkoutClient } from "@/components/WorkoutClient";
import { getDay, isDayId } from "@/data/routine";

type Props = { params: Promise<{ dayId: string }> };

export default async function WorkoutPage({ params }: Props) {
  const { dayId } = await params;
  if (!isDayId(dayId)) notFound();
  const day = getDay(dayId);
  if (!day) notFound();

  return <WorkoutClient day={day} />;
}
