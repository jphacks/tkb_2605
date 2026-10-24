import { useContext } from "react";
import { Link, type LinkProps } from "react-router";
import { PendingNavigationContext, pendingDestination } from "../features/home/navigation.ts";
import { paths } from "../routes.ts";

// Keep the intended URLs in one reusable link until destination screens are ready.
export function PendingLink({ to, ...props }: Omit<LinkProps, "to" | "onClick"> & { to: string }) {
  const showNotice = useContext(PendingNavigationContext);
  if (to === paths.exercises || to === paths.recommendations || to === paths.chats) {
    return <Link {...props} to={to} />;
  }
  return <Link {...props} to={to} onClick={(event) => {
    event.preventDefault();
    showNotice(`${pendingDestination(to)}は準備中です。`);
  }} />;
}
