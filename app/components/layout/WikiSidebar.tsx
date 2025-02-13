"use client";
import { cn } from "@/utils/cn";
import { useState } from "react";
import { IoHome } from "react-icons/io5";
import { RxAvatar } from "react-icons/rx";
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
        <RxAvatar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
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
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div></div>
        </SidebarBody>
      </Sidebar>
      <div className="w-full bg-gray-600 p-4 m-4 rounded-lg overflow-y-scroll">
        {children}
      </div>
    </div>
  );
};

export default WikiSidebar;
