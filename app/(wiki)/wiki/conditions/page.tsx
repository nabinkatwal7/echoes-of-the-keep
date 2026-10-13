import ReusableTitle from "@/app/components/ReusableTitle";
import { Prose } from "@/app/components/Prose";
import { getConditions } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conditions" };

export default async function ConditionsPage() {
  const conditions = await getConditions();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Conditions" />
      {conditions.map((c) => (
        <section key={c.index} id={c.index} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{c.name}</h2>
          <Prose text={c.description} />
        </section>
      ))}
    </div>
  );
}
