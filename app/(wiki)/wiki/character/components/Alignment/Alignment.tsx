import ReusableTitle, {
  ReusableDescription,
  ReusableSubtitle,
} from "@/app/components/ReusableTitle";
import { getAlignments } from "@/lib/content/alignments";

const Alignment = async () => {
  const alignments = await getAlignments();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Player Alignments" />
      {alignments.map((a) => (
        <div key={a.index} className="flex flex-col gap-4">
          <ReusableSubtitle title={a.name} subtitle={a.abbreviation} />
          <ReusableDescription description={a.description} />
        </div>
      ))}
    </div>
  );
};

export default Alignment;
