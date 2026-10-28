import { MrmReport } from "@/features/mrm/MrmReport";

export default function MrmPage() {
  return <MrmReport initialReportingMonth={new Date().toISOString().slice(0, 7)} />;
}
