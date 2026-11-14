import { Suspense } from "react";
import Plan from "./plan";
type Props = { params: Promise<{ id: string }> };
async function PlanContent({ params }: Props) {
  return <Plan id={(await params).id} />;
}
export default function Page(props: Props) {
  return <Suspense fallback={<main className="plan-main"><p>Pulling up your table…</p></main>}><PlanContent {...props} /></Suspense>;
}
