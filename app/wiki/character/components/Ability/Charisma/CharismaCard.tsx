import { cn } from "@/utils/cn";

const CharismaCard = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "bg-gray-800 text-white p-3 rounded-lg shadow-md text-center text-lg hover:scale-105 transition-transform",
        className
      )}
    >
      {name}
    </div>
  );
};

export default CharismaCard;
