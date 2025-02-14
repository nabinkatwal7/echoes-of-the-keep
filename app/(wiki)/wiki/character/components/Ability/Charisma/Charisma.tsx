import {
  ReusableDescription,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { getData } from "@/utils/getData";
import CharismaCard from "./CharismaCard";

const Charisma = async () => {
  const data = await getData("ability-scores/cha");
  return (
    <div className="flex flex-col gap-4">
      <ReusableSubtitle title={data?.full_name} subtitle={data?.name} />
      <ReusableDescription description={data?.desc} />
      <div className="flex flex-wrap gap-4">
        {data?.skills?.map((skill: { name: string; index: string }) => (
          <CharismaCard
            key={skill.index}
            name={skill.name}
            className="bg-[#FF69B4]"
          />
        ))}
      </div>
    </div>
  );
};

export default Charisma;
