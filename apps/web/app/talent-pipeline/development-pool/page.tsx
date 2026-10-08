import {
  renderTalentPipelinePage,
  type TalentPipelinePageProps,
} from "../TalentPipelinePage";

export default function DevelopmentPoolPage({ searchParams }: TalentPipelinePageProps) {
  return renderTalentPipelinePage("development-pool", searchParams);
}
