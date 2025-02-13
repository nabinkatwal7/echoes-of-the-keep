import ReusableTitle from "@/app/components/ReusableTitle";
import Charisma from "./components/Ability/Charisma/Charisma";
import Constitution from "./components/Ability/Constitution/Constitution";
import Dexterity from "./components/Ability/Dexterity";
import Intelligence from "./components/Ability/Intelligence";
import Strength from "./components/Ability/Strength";
import Wisdom from "./components/Ability/Wisdom";

const Character = () => {
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

export default Character;
