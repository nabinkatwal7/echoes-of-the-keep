const ReusableTitle = ({ title }: { title: string }) => {
  return <h2 className="text-3xl font-bold">{title}</h2>;
};

export default ReusableTitle;

export const ReusableSubtitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => {
  return (
    <p className="text-2xl">
      {title} <span className="text-neutral-400">({subtitle})</span>
    </p>
  );
};

export const ReusableDescription = ({
  description,
}: {
  description: string;
}) => {
  return <p className="text-lg">{description}</p>;
};

export const ReusableDescriptionArray = ({
  description,
}: {
  description: string[];
}) => {
  return (
    <div className="flex flex-col gap-2">
      {description?.map((desc: string) => (
        <p key={desc} className="text-lg">
          {desc}
        </p>
      ))}
    </div>
  );
};
