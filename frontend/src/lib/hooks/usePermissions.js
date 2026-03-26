'use client';

/**
 * Hook to read the current user's permissions from localStorage.
 * Populated at login from the AuthResponse.
 */
export function usePermissions() {
  if (typeof window === 'undefined') {
    return { can: () => false, canAny: () => false, role: null, username: null, permissions: [] };
  }

  const permissions = JSON.parse(localStorage.getItem('wms_permissions') || '[]');
  const role = localStorage.getItem('wms_role') || null;
  const username = localStorage.getItem('wms_username') || null;

  return {
    /** True if the user has the given permission string */
    can: (permission) => permissions.includes(permission),
    /** True if the user has ANY of the given permissions */
    canAny: (...perms) => perms.some((p) => permissions.includes(p)),
    role,
    username,
    permissions,
  };
}
