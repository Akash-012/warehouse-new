'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export default function DynamicFormFields({ fields }) {
  return (
    <>
      {fields.map((field) => (
        <div key={field.name} className={field.wrapperClassName ?? 'space-y-1'}>
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === 'select' ? (
            <select
              id={field.name}
              className={field.className ?? 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm'}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              disabled={field.disabled}
            >
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={field.name}
              type={field.type ?? 'text'}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder={field.placeholder}
              min={field.min}
              step={field.step}
              className={field.className}
              disabled={field.disabled}
            />
          )}
          <FieldError message={field.error} />
        </div>
      ))}
    </>
  );
}
