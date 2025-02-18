import ReusableTitle, {
  ReusableDescription,
  ReusableDescriptionArray,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { type Background } from "@/types/Character/Background";
import { getData } from "@/utils/getData";

const Background = async () => {
  const data: Background = await getData("backgrounds/acolyte");
  console.log(data);
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Background" />
      <ReusableDescription description="Every story has a beginning. Your character's background reveals where you came from, how you became an adventurer, and your place in the world. Choosing a background provides you with important story cues about your character's identity. Here is a sample acolyte background." />
      <ReusableSubtitle title="Acolyte" />
      <div className="flex flex-col gap-2">
        <ReusableSubtitle title={data?.feature?.name} />
        <ReusableDescriptionArray description={data?.feature?.desc} />
      </div>
      <div className="flex flex-col gap-2">
        <ReusableSubtitle title={"Starting Proficiencies"} />
        {data?.starting_proficiencies?.map(
          (proficiency: { index: string; name: string }) => (
            <ReusableDescription
              key={proficiency.index}
              description={proficiency.name}
            />
          )
        )}
      </div>
      <div className="flex flex-col gap-2">
        <ReusableSubtitle title={"Language options"} />
        <ReusableDescription description="Check language tab for more information." />
      </div>
    </div>
  );
};

export default Background;
