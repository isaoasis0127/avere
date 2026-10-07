'use client';

import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

export type AdminCtx = { user: User; refreshOpenCount: () => void };
export const AdminContext = createContext<AdminCtx | null>(null);
export const useAdmin = () => useContext(AdminContext)!;
