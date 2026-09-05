export default function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-slate-200 rounded-xl shadow-sm
        ${hover ? 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
