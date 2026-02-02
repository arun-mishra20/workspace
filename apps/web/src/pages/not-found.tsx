import { BlankLayout } from "@/components/layouts";
import { Link } from "react-router-dom";

export const NotFoundPage = () => {
  return (
    <BlankLayout>
      <div className="mt-52 flex flex-col items-center font-semibold">
        <h1>404 - Not Found</h1>
        <p>Sorry, the page you are looking for does not exist.</p>
        <Link to="/" replace className="text-blue-600 hover:underline">
          Go to Home
        </Link>
      </div>
    </BlankLayout>
  );
};
