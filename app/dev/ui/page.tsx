import { notFound } from "next/navigation";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { DiceChip } from "@/app/components/ui/DiceChip";
import { Input } from "@/app/components/ui/Input";

// Component gallery for development only.
export default function UiGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">UI gallery</h1>
      <div className="flex flex-wrap gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <Input placeholder="Input" />
      <div className="flex gap-2">
        <Badge>Evocation</Badge>
        <Badge>Concentration</Badge>
      </div>
      <div className="flex gap-2">
        <DiceChip expression="1d20+5" total={17} />
        <DiceChip expression="1d20+5" total={25} crit />
        <DiceChip expression="1d20+5" total={6} fumble />
      </div>
      <Card>Card content</Card>
    </main>
  );
}
