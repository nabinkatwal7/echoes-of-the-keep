import { TabNav } from "@/app/components/layout/TabNav";
import { characterTabData } from "@/data/pageTabData/CharacterTabData";
import Ability from "./components/Ability/Ability";
import Alignment from "./components/Alignment/Alignment";
import Background from "./components/Background/Background";

const Wiki = async ({
  searchParams,
}: {
  searchParams: Promise<{ tab: string }>;
}) => {
  const { tab } = (await searchParams) || "ability";
  return (
    <div className="flex flex-col gap-8">
      <TabNav data={characterTabData} />
      {tab === "ability" && <Ability />}
      {tab === "alignment" && <Alignment />}
      {tab === "background" && <Background />}
    </div>
  );
};

export default Wiki;
