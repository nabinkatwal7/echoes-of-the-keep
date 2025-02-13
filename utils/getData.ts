export const getData = async (url: string) => {
  const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/${url}/`;
  const res = await fetch(endpoint);
  return res.json();
};
