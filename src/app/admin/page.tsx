"use client";

import { AdminApp } from "@/components/AdminApp";
import { useAuth } from "@/context/AuthProvider";

export default function AdminRoute() {
  const { signOut } = useAuth();
  return <AdminApp signOut={signOut} />;
}
