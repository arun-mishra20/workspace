import { Cookie } from "lucide-react";
import { Link } from "react-router-dom";

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <Link to="/">
        <div className="rounded-full border-dotted border-border">
          <Cookie className="size-6" />
        </div>
      </Link>
    </div>
  );
};

export { Logo };
