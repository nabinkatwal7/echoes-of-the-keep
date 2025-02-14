import {
  ReusableDescription,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { getData } from "@/utils/getData";

const AlignmentContainer = async ({ url }: { url: string }) => {
  const data = await getData(url);
  return (
    <div className="flex flex-col gap-4">
      <ReusableSubtitle title={data?.name} subtitle={data?.abbreviation} />
      <ReusableDescription description={data?.desc} />
    </div>
  );
};

export default AlignmentContainer;
