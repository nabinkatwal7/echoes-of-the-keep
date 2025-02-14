"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export const TabNav = ({
  data,
}: {
  data: { name: string; index: string }[];
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || data[0]?.index;

  useEffect(() => {
    if (!searchParams.get("tab") && data.length > 0) {
      router.replace(`?tab=${data[0].index}`);
    }
  }, [searchParams, router, data]);

  return (
    <div className="flex space-x-4 overflow-x-scroll hide-scrollbar">
      {data.map((tab) => (
        <Link
          key={tab.index}
          href={`?tab=${tab.index}`}
          className={`p-2 ${
            currentTab === tab.index
              ? "border-b-2 border-accentColor font-bold"
              : ""
          }`}
        >
          {tab.name}
        </Link>
      ))}
    </div>
  );
};
