'use client';

import { usePermissions } from '@/lib/hooks/usePermissions';

/**
 * Conditionally renders children based on a permission check.
 *
 * Usage:
 *   <PermissionGate permission="ORDERS_CREATE">
 *     <Button>Create Order</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate anyOf={['MASTER_MANAGE', 'USERS_MANAGE']} fallback={<p>No access</p>}>
 *     ...
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, anyOf, children, fallback = null }) {
  const { can, canAny } = usePermissions();

  const hasAccess = anyOf ? canAny(...anyOf) : can(permission);

  return hasAccess ? children : fallback;
}
