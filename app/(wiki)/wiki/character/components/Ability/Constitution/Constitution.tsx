import {
  ReusableDescription,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { getData } from "@/utils/getData";

const Constitution = async () => {
  const data = await getData("ability-scores/con");
  return (
    <div className="flex flex-col gap-4">
      <ReusableSubtitle title={data?.full_name} subtitle={data?.name} />
      <div className="flex flex-col gap-2">
        {data?.desc?.map((desc: string) => (
          <ReusableDescription key={desc} description={desc} />
        ))}
      </div>
    </div>
  );
};

export default Constitution;
