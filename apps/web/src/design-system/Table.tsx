import React from 'react';
import { clsx } from 'clsx';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto border border-border-subtle rounded-xl bg-surface">
      <table
        className={clsx('w-full text-left text-sm text-slate-200 border-collapse', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <thead
      className={clsx(
        'bg-surface-elevated/80 border-b border-border-subtle text-xs font-semibold text-slate-400 uppercase tracking-wider',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tbody className={clsx('divide-y divide-border-subtle/60', className)} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tr className={clsx('hover:bg-surface-elevated/40 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <th className={clsx('px-4 py-3 text-xs font-semibold', className)} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <td className={clsx('px-4 py-3 text-sm align-middle', className)} {...props}>
      {children}
    </td>
  );
};
