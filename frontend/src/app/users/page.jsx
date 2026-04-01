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
import { toast } from 'sonner';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const sortedRoles = useMemo(() => roles.map((r) => r.name).sort(), [roles]);
  const createUserFields = useMemo(() => ([
    {
      name: 'username',
      label: 'Username',
      value: username,
      onChange: setUsername,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      value: password,
      onChange: setPassword,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      value: role,
      onChange: setRole,
      options: [
        { value: '', label: 'Select role' },
        ...sortedRoles.map((name) => ({ value: name, label: name })),
      ],
    },
  ]), [password, role, sortedRoles, username]);

  const createUser = useMutation({
    mutationFn: (payload) => api.post('/users', payload),
    onSuccess: () => {
      toast.success('User created');
      setUsername('');
      setPassword('');
      setRole('');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'Failed to create user');
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/users/${id}`, payload),
    onSuccess: () => {
      toast.success('User updated');
      setEditingUserId(null);
      setEditingRole('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'Failed to update user');
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'Failed to delete user');
    },
  });

  const onCreate = (e) => {
    e.preventDefault();
    if (!username || !password || !role) {
      toast.error('Username, password and role are required');
      return;
    }
    createUser.mutate({ username, password, role });
  };

  return (
    <PermissionGate permission={P.USERS_VIEW} fallback={<p className="text-sm text-muted-foreground">Access denied.</p>}>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Create, update and manage users with dynamic role assignments."
          actions={(
            <PermissionGate permission={P.USERS_MANAGE}>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5 mr-1.5" /> Create User
              </Button>
            </PermissionGate>
          )}
        />

        <PermissionGate permission={P.USERS_MANAGE}>
          <SlideOverForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            title="Create User"
            description="Add a new user and assign a role."
          >
              <form onSubmit={onCreate} className="space-y-4">
                <DynamicFormFields fields={createUserFields} />
                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createUser.isPending}><Plus className="size-3.5 mr-1.5" />Create User</Button>
                </SheetFooter>
              </form>
          </SlideOverForm>
        </PermissionGate>

        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Username</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Permissions</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-3" colSpan={4}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td className="px-3 py-3" colSpan={4}>No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.username}</td>
                  <td className="px-3 py-2">
                    {editingUserId === u.id ? (
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2"
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value)}
                      >
                        {sortedRoles.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="secondary">{u.role}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(u.permissions || []).map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PermissionGate permission={P.USERS_MANAGE}>
                      <div className="inline-flex gap-2">
                        {editingUserId === u.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateUser.mutate({ id: u.id, payload: { role: editingRole } })}
                              disabled={updateUser.isPending}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingUserId(null); setEditingRole(''); }}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setEditingUserId(u.id); setEditingRole(u.role); }}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteUser.mutate(u.id)} disabled={deleteUser.isPending}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </PermissionGate>
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
