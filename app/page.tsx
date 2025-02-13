import { getData } from "@/utils/getData";

export default async function Home() {
  const data = await getData("monsters");
  return (
    <div>
      {data?.results?.map((monster: any) => (
        <p key={monster.index}>{monster.name}</p>
      ))}
    </div>
  );
}
