'use client';

import { createContext, useContext, type ReactNode } from 'react';

const AdminContext = createContext(false);

export function AdminLocaleProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>;
}

export function useIsAdminLocale(): boolean {
  return useContext(AdminContext);
}
