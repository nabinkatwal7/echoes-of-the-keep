import Link from "next/link";
import ReusableTitle, { ReusableDescription } from "@/app/components/ReusableTitle";
import { getBackgrounds } from "@/lib/content/reference";

const Background = async () => {
  const backgrounds = await getBackgrounds();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Background" />
      <ReusableDescription description="Every story has a beginning. Your character's background reveals where you came from, how you became an adventurer, and your place in the world." />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {backgrounds.map((b) => (
          <li key={b.index}>
            <Link
              href={`/wiki/backgrounds/${b.index}`}
              className="block rounded-lg border border-border bg-surface p-3 hover:border-accent"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Background;
