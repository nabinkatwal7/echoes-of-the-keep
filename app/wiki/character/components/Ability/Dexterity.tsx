import {
  ReusableDescription,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { getData } from "@/utils/getData";
import CharismaCard from "./Charisma/CharismaCard";

const Dexterity = async () => {
  const data = await getData("ability-scores/dex");

  return (
    <div className="flex flex-col gap-4">
      <ReusableSubtitle title={data?.full_name} subtitle={data?.name} />
      <div className="flex flex-col gap-2">
        {data?.desc?.map((desc: string) => (
          <ReusableDescription key={desc} description={desc} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {data?.skills?.map((skill: { name: string; index: string }) => (
          <CharismaCard
            key={skill.index}
            name={skill.name}
            className="bg-[#4CAF50]"
          />
        ))}
      </div>
    </div>
  );
};

export default Dexterity;
