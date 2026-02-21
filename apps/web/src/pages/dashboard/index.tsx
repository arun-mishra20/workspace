import { MainLayout } from "@/components/layouts";
import { NeumorphicLoader } from "@workspace/ui/components/ui/neumorphic-loader";

const Dashboard = () => {
  return <MainLayout>
    <div className="mt-52">
      <NeumorphicLoader />
    </div>
  </MainLayout>;
};

export default Dashboard;
