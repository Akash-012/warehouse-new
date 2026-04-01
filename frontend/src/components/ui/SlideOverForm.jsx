'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function SlideOverForm({
  open,
  onOpenChange,
  title,
  description,
  contentClassName = 'w-full sm:max-w-lg overflow-y-auto',
  bodyClassName = 'px-4 pb-4',
  children,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={contentClassName}>
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className={bodyClassName}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}
