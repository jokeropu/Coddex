import { useMemo } from 'react';
import { NavLink } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Check, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn, problemNo, topicHue } from '../design/cn';
import { DifficultyMark } from '../design/primitives';
import { useGround } from '../design/ground';

const GRID_MD = 'md:grid-cols-[26px_46px_minmax(0,1fr)_96px_150px_18px]';

const SortHeader = ({ column, label, align }) => {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ChevronUp : sorted === 'desc' ? ChevronDown : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      aria-label={`Sort by ${label}${sorted ? `, currently ${sorted}ending` : ''}`}
      className={cn(
        't-micro flex items-center gap-1 rounded transition-colors hover:text-ink',
        sorted ? 'text-line' : 'text-ink-3',
        align === 'center' && 'justify-center'
      )}
    >
      {label}
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
};

const PlainHeader = ({ label, align }) => (
  <span className={cn('t-micro text-ink-3', align === 'center' && 'text-center')}>{label}</span>
);

export default function ProblemTable({ problems, solvedIds, sorting, onSortingChange }) {
  const { ground } = useGround();
  const columns = useMemo(
    () => [
      {
        id: 'status',

        header: () => <span aria-hidden />,
        cell: ({ row }) => {
          const solved = solvedIds.has(row.original._id);
          return (
            <span title={solved ? 'Accepted' : 'Not yet solved'}>
              {solved ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-[5px] border border-approved bg-approved/15">
                  <Check className="h-2.5 w-2.5 text-approved" strokeWidth={3} />
                </span>
              ) : (
                <span className="block h-4 w-4 rounded-[5px] border border-rule" aria-hidden />
              )}
              <span className="sr-only">{solved ? 'Solved' : 'Unsolved'}</span>
            </span>
          );
        },
        meta: { cell: 'md:col-start-1 md:row-start-1 md:justify-self-center', group: 'lead' },
      },
      {
        id: 'number',
        accessorKey: 'problemNumber',
        enableSorting: true,

        sortDescFirst: false,
        header: ({ column }) => <SortHeader column={column} label="No." />,
        cell: ({ getValue }) => (
          <span className="t-data tabular-nums text-ink-3 group-hover:text-ink-2">
            {problemNo(getValue())}
          </span>
        ),
        meta: { cell: 'md:col-start-2 md:row-start-1', group: 'meta' },
      },
      {
        id: 'title',
        accessorKey: 'title',
        enableSorting: true,
        header: ({ column }) => <SortHeader column={column} label="Title" />,
        cell: ({ getValue }) => (
          <span className="t-body min-w-0 flex-1 truncate font-medium text-ink">{getValue()}</span>
        ),
        meta: { cell: 'md:col-start-3 md:row-start-1', group: 'lead' },
      },
      {
        id: 'difficulty',
        accessorKey: 'difficulty',
        enableSorting: false,
        header: () => <PlainHeader label="Diff" align="center" />,
        cell: ({ getValue }) => <DifficultyMark difficulty={getValue()} />,
        meta: { cell: 'md:col-start-4 md:row-start-1 md:justify-self-center', group: 'meta' },
      },
      {
        id: 'topic',
        accessorKey: 'tags',
        enableSorting: false,
        header: () => <PlainHeader label="Topic" />,
        cell: ({ getValue }) => {
          const v = getValue();
          const label = Array.isArray(v) ? v.join(', ') : v;
          const hue = topicHue(v, ground);
          return (
            <span
              className="t-micro inline-block max-w-full truncate rounded-full border px-2.5 py-1 font-semibold"
              style={{
                color: hue,
                borderColor: `color-mix(in srgb, ${hue} 38%, transparent)`,
                background: `color-mix(in srgb, ${hue} 12%, transparent)`,
              }}
            >
              {label}
            </span>
          );
        },
        meta: { cell: 'md:col-start-5 md:row-start-1 min-w-0', group: 'meta' },
      },
      {
        id: 'go',
        header: () => <span />,
        cell: () => (
          <ChevronRight
            className="hidden h-3.5 w-3.5 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-line md:block"
            strokeWidth={1.9}
            aria-hidden
          />
        ),
        meta: { cell: 'md:col-start-6 md:row-start-1', group: 'go' },
      },
    ],
    [solvedIds, ground]
  );

  const table = useReactTable({
    data: problems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    enableSortingRemoval: false,
    getRowId: (row) => row._id,
  });

  const headerGroup = table.getHeaderGroups()[0];
  const cellFor = (row, id) => row.getVisibleCells().find((c) => c.column.id === id);

  return (
    <>
      <div className={cn('hidden items-center gap-x-3 border-b border-rule-faint px-3 py-2 md:grid', GRID_MD)}>
        {headerGroup.headers.map((header) => (
          <div key={header.id} className={header.column.columnDef.meta?.headerClass}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
      </div>

      <ul>
        {table.getRowModel().rows.map((row) => (
          <li key={row.id} className="border-b border-rule-faint last:border-b-0">
            <NavLink
              to={`/problem/${row.original._id}`}
              className={cn(
                'group flex flex-col gap-1.5 px-3 py-2.5 transition-colors',
                'hover:bg-sheet-hover focus-visible:bg-sheet-hover',
                'md:grid md:items-center md:gap-x-3 md:gap-y-0 md:py-2',
                GRID_MD
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5 md:contents">
                {['status', 'title'].map((id) => {
                  const cell = cellFor(row, id);
                  return (
                    <span key={id} className={cn('shrink-0', cell.column.columnDef.meta?.cell, id === 'title' && 'min-w-0 flex-1')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  );
                })}
              </span>

              <span className="flex min-w-0 items-center gap-3 pl-[26px] md:contents">
                {['number', 'difficulty', 'topic'].map((id) => {
                  const cell = cellFor(row, id);
                  return (
                    <span key={id} className={cn('shrink-0', cell.column.columnDef.meta?.cell)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  );
                })}
              </span>

              {(() => {
                const cell = cellFor(row, 'go');
                return (
                  <span className={cell.column.columnDef.meta?.cell}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </span>
                );
              })()}
            </NavLink>
          </li>
        ))}
      </ul>
    </>
  );
}
