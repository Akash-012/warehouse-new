'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Hook to read the current user's permissions from localStorage.
 * Populated at login from the AuthResponse.
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(localStorage.getItem('wms_permissions') || '[]');
      setPermissions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPermissions([]);
    }
    setRole(localStorage.getItem('wms_role') || null);
    setUsername(localStorage.getItem('wms_username') || null);
    setLoaded(true);
  }, []);

  return useMemo(() => ({
    /** True if the user has the given permission string */
    can: (permission) => permissions.includes(permission),
    /** True if the user has ANY of the given permissions */
    canAny: (...perms) => perms.some((p) => permissions.includes(p)),
    role,
    username,
    permissions,
    loaded,
  }), [loaded, permissions, role, username]);
}
