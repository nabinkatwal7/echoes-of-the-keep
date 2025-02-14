import {
  ReusableDescriptionArray,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { getData } from "@/utils/getData";
import CharismaCard from "./Charisma/CharismaCard";

const Wisdom = async () => {
  const data = await getData("ability-scores/wis");
  return (
    <div className="flex flex-col gap-4">
      <ReusableSubtitle title={data?.full_name} subtitle={data?.name} />
      <ReusableDescriptionArray description={data?.desc} />
      <div className="flex flex-wrap gap-4">
        {data?.skills?.map((skill: { name: string; index: string }) => (
          <CharismaCard
            key={skill.index}
            name={skill.name}
            className="bg-[#2C3E50]"
          />
        ))}
      </div>
    </div>
  );
};

export default Wisdom;
