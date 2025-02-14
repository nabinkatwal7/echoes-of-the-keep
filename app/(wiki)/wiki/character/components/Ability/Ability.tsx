import ReusableTitle from "@/app/components/ReusableTitle";
import Charisma from "./Charisma/Charisma";
import Constitution from "./Constitution/Constitution";
import Dexterity from "./Dexterity";
import Intelligence from "./Intelligence";
import Strength from "./Strength";
import Wisdom from "./Wisdom";

const Ability = () => {
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Player Abilities" />
      <Charisma />
      <Constitution />
      <Dexterity />
      <Intelligence />
      <Strength />
      <Wisdom />
    </div>
  );
};

export default Ability;
