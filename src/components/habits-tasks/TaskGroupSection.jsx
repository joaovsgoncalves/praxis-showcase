import React from 'react';

export default function TaskGroupSection({ title, count, badge, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          {count != null && (
            <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
              {count}
            </span>
          )}
        </div>
        {badge}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
