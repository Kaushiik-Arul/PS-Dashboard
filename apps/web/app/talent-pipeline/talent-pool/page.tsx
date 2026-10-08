import {
  renderTalentPipelinePage,
  type TalentPipelinePageProps,
} from "../TalentPipelinePage";

export default function TalentPoolPage({ searchParams }: TalentPipelinePageProps) {
  return renderTalentPipelinePage("talent-pool", searchParams);
}
