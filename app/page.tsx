import WikiSidebar from "./components/layout/WikiSidebar";
import ReusableTitle from "./components/ReusableTitle";

export default async function Home() {
  return (
    <WikiSidebar>
      <ReusableTitle title="Dungeons and Dragons!" />
    </WikiSidebar>
  );
}
