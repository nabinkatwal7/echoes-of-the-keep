import { PageHeader } from "@/app/components/ui/PageHeader";
import { GiBrain } from "react-icons/gi";
import Ability from "./components/Ability/Ability";
import Alignment from "./components/Alignment/Alignment";
import Background from "./components/Background/Background";
import Language from "./components/Language/Language";

export const dynamic = "force-dynamic";
export const metadata = { title: "Core Rules" };

export default function CoreRulesPage() {
  return (
    <div className="flex flex-col gap-14">
      <PageHeader eyebrow="The Tome" title="Core Rules" subtitle="Abilities, alignments and backgrounds at a glance." icon={<GiBrain />} />
      <Ability />
      <Alignment />
      <Background />
      <Language />
    </div>
  );
}
