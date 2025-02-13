"use client";
import { cn } from "@/utils/cn";
import { useState } from "react";
import { FaDiceD20 } from "react-icons/fa";
import { GiCrestedHelmet, GiSwordwoman } from "react-icons/gi";
import { IoHome } from "react-icons/io5";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/Sidebar";

const WikiSidebar = ({ children }: { children: React.ReactNode }) => {
  const links = [
    {
      label: "Home",
      href: "/",
      icon: (
        <IoHome className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Character",
      href: "/wiki/character",
      icon: (
        <GiSwordwoman className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Class",
      href: "/wiki/character",
      icon: (
        <GiCrestedHelmet className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row flex-1 overflow-hidden",
        "h-screen"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 gap-6 overflow-y-auto overflow-x-hidden">
            <FaDiceD20 className="text-[#1B1D2A] h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="w-full p-4 m-4 rounded-lg overflow-y-scroll">
        {children}
      </div>
    </div>
  );
};

export default WikiSidebar;
