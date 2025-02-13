import WikiSidebar from "../components/layout/WikiSidebar";

const WikiLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className=" ">
      <WikiSidebar>{children}</WikiSidebar>
    </div>
  );
};

export default WikiLayout;
