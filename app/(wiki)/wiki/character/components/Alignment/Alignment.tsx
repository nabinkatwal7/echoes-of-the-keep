import ReusableTitle from "@/app/components/ReusableTitle";
import AlignmentContainer from "./AlignmentContainer";

const Alignment = () => {
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Player Alignments" />
      <AlignmentContainer url="alignments/chaotic-neutral" />
      <AlignmentContainer url="alignments/chaotic-evil" />
      <AlignmentContainer url="alignments/chaotic-good" />
      <AlignmentContainer url="alignments/lawful-neutral" />
      <AlignmentContainer url="alignments/lawful-evil" />
      <AlignmentContainer url="alignments/lawful-good" />
      <AlignmentContainer url="alignments/neutral" />
      <AlignmentContainer url="alignments/neutral-evil" />
      <AlignmentContainer url="alignments/neutral-evil" />
    </div>
  );
};

export default Alignment;
