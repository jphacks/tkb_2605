import { Outlet } from "react-router";
import AccountControls from "../components/AccountControls.tsx";

export default function AppLayout() {
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8"><AccountControls /><Outlet /></main>;
}
