import WikiSidebar from "../components/layout/WikiSidebar";

const WikiLayout = ({ children }: { children: React.ReactNode }) => {
  return <WikiSidebar>{children}</WikiSidebar>;
};

export default WikiLayout;
