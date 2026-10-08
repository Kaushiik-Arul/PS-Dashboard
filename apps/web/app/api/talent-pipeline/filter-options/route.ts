import { getTalentPipeline } from '@/features/talent-pipeline/talent-pipeline.api';
import type { TalentPipelineQueryFilters } from '@/features/talent-pipeline/talent-pipeline.types';

const filterKeys = [
  'functionName',
  'orgUnit',
  'range',
  'location',
  'gender',
  'directOrIndirect',
] as const;

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters: TalentPipelineQueryFilters = {};
    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    return Response.json((await getTalentPipeline(filters)).filterOptions);
  } catch {
    return Response.json(
      { message: 'Unable to load Talent Landscape filter options' },
      { status: 500 },
    );
  }
}