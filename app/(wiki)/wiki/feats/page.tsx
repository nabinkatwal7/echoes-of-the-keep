import ReusableTitle from "@/app/components/ReusableTitle";
import { Prose } from "@/app/components/Prose";
import { getFeats } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feats" };

export default async function FeatsPage() {
  const feats = await getFeats();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Feats" />
      {feats.map((f) => (
        <section key={f.index} id={f.index} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{f.name}</h2>
          {f.prerequisite && <p className="text-sm text-muted">Prerequisite: {f.prerequisite}</p>}
          <Prose text={f.description} />
        </section>
      ))}
    </div>
  );
}
