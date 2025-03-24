
import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function AuthProvider({ children }: { children: ReactNode }) {
  useAuth(); // Initialize auth context
  return <>{children}</>;
}
