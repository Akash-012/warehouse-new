'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PermissionGate from '@/components/PermissionGate';
import api from '@/lib/api';
import { P } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SheetFooter } from '@/components/ui/sheet';
import SlideOverForm from '@/components/ui/SlideOverForm';
import DynamicFormFields from '@/components/ui/DynamicFormFields';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const createRoleFields = useMemo(() => ([
    {
      name: 'roleName',
      label: 'Role Name',
      value: name,
      onChange: setName,
      placeholder: 'Example: QUALITY_MANAGER',
    },
  ]), [name]);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const createRole = useMutation({
    mutationFn: (payload) => api.post('/roles', payload),
    onSuccess: () => {
      toast.success('Role created');
      setName('');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'Failed to create role');
    },
  });

  const deleteRole = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success('Role deleted');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'Failed to delete role');
    },
  });

  const onCreate = (e) => {
    e.preventDefault();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    createRole.mutate({ name: name.toUpperCase(), permissions: [P.DASHBOARD_VIEW] });
  };

  return (
    <PermissionGate permission={P.USERS_MANAGE} fallback={<p className="text-sm text-muted-foreground">Super admin access required.</p>}>
      <div className="space-y-6">
        <PageHeader
          title="Roles"
          description="Create and delete roles. Manage permission checkboxes from Role Access page."
          actions={(
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5 mr-1.5" /> Create Role
            </Button>
          )}
        />

        <SlideOverForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Create Role"
          description="Create a new role with base dashboard access."
        >
            <form onSubmit={onCreate} className="space-y-4">
              <DynamicFormFields fields={createRoleFields} />
              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createRole.isPending}><Plus className="size-3.5 mr-1.5" />Create Role</Button>
              </SheetFooter>
            </form>
        </SlideOverForm>

        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Permissions</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-3" colSpan={3}>Loading...</td></tr>
              ) : roles.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2"><Badge variant="secondary">{r.name}</Badge></td>
                  <td className="px-3 py-2">{(r.permissions || []).length}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/roles/access">Access</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRole.mutate(r.id)}
                        disabled={deleteRole.isPending || r.name === 'SUPER_ADMIN'}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
