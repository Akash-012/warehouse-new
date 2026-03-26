'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Layers3, Loader2, LockKeyhole, UserRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoPasswords, setShowDemoPasswords] = useState(false);

  // Clear any stale/expired token when landing on login
  useEffect(() => {
    localStorage.removeItem('wms_token');
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'admin123',
    },
  });

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post('/auth/login', values);
      localStorage.setItem('wms_token', data.token);
      localStorage.setItem('wms_username', data.username);
      localStorage.setItem('wms_role', data.role);
      localStorage.setItem('wms_permissions', JSON.stringify(data.permissions ?? []));
      toast.success('Signed in successfully');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid username or password');
    }
  };

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card hidden rounded-[2rem] p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-background/60 px-4 py-2 text-sm text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Layers3 className="size-4" />
              </span>
              WMS Pro Control Tower
            </div>
            <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight text-foreground">
              Warehouse software UI focused on speed, operator flow, and reusable surfaces.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              Monitor inbound, inventory, picking, packing, and shipping from one fast operational workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Fast routing', 'Low-friction operator workflows'],
              ['Reusable blocks', 'Shared patterns for each module'],
              ['Live visibility', 'KPIs and queue states in one place'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="glass-card rounded-[2rem] border-none py-6 shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <LockKeyhole className="size-6" />
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Use your warehouse credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="username" className="pl-9" {...register('username')} />
                </div>
                {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Continue to dashboard
              </Button>

              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Demo Credentials</p>
                  <button
                    type="button"
                    onClick={() => setShowDemoPasswords((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showDemoPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                {[
                  { role: 'Super Admin', user: 'superadmin', pass: 'superadmin123' },
                  { role: 'Admin',       user: 'admin',      pass: 'admin123'      },
                  { role: 'Manager',     user: 'manager',    pass: 'manager123'    },
                  { role: 'Worker',      user: 'worker',     pass: 'worker123'     },
                ].map(({ role, user, pass }) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => {
                      setValue('username', user);
                      setValue('password', pass);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 hover:bg-muted transition-colors text-left"
                  >
                    <span className="text-xs text-muted-foreground w-24">{role}</span>
                    <span className="font-mono text-xs text-foreground">
                      {user} / {showDemoPasswords ? pass : '•'.repeat(pass.length)}
                    </span>
                  </button>
                ))}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
