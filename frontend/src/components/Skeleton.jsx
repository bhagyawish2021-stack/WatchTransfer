export function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return <div className={`skeleton ${width} ${height} rounded`} />
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <SkeletonLine width="w-1/3" height="h-5" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? 'w-full' : 'w-2/3'} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width="w-24" height="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="px-6 py-4 border-b border-slate-50 flex gap-4 items-center"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine
              key={c}
              width={c === 0 ? 'w-32' : 'w-20'}
              height="h-3"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
export default SkeletonTable
