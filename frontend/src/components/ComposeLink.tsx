import { Link, useLocation, type LinkProps } from "react-router";
import type { ComposeLocationState } from "../features/posts/navigation.ts";
import { paths } from "../routes.ts";

type Props = Omit<LinkProps, "to" | "state" | "replace"> & {
  initialContent?: string;
};

export default function ComposeLink({ initialContent, ...props }: Props) {
  const location = useLocation();

  return (
    <Link
      {...props}
      to={paths.compose}
      state={{ backgroundLocation: location, initialContent } satisfies ComposeLocationState}
    />
  );
}
