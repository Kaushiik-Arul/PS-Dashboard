import { connection } from "next/server";
import Link from "next/link";
import { MrmReport } from "@/features/mrm/MrmReport";
import { getMrmMonths, getMrmReport } from "@/features/mrm/mrm.api";

type Props = { searchParams: Promise<{ month?: string | string[] }> };

export default async function MrmPage({ searchParams }: Props) {
  await connection();
  let report: Awaited<ReturnType<typeof getMrmReport>>;
  let months: Awaited<ReturnType<typeof getMrmMonths>>["months"];
  try {
    const [query, history] = await Promise.all([searchParams, getMrmMonths()]);
    const requested = Array.isArray(query.month) ? query.month[0] : query.month;
    const selectedMonth = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested)
      ? requested
      : history.currentMonth;
    report = await getMrmReport(selectedMonth);
    months = history.months.some((month) => month.reportingMonth === selectedMonth)
      ? history.months
      : [{ reportingMonth: selectedMonth, dataMonth: report.dataMonth, status: report.status, sourceStatus: report.sourceStatus }, ...history.months];
  } catch (error) {
    console.error("Unable to load MRM", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>MRM report could not be loaded</h1>
      <p>Confirm the API service and MRM migration are available, then reload this page.</p>
      <Link className="a-button a-button--primary" href="/mrm"><span className="a-button__label">Reload page</span></Link>
    </main>;
  }
  return <MrmReport key={report.reportingMonth} initialReport={report} months={months} />;
}
