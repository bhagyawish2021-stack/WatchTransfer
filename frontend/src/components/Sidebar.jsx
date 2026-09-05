import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Bell,
  FileClock,
  Activity,
  Settings,
  ArrowRightLeft,
  X,
} from 'lucide-react'

const nav = [
  { to: '/',         label: 'Dashboard',         icon: LayoutDashboard },
  { to: '/patients', label: 'Patients',           icon: Users },
  { to: '/requests', label: 'Standing Requests',  icon: ClipboardList },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/audit',    label: 'Audit Trail',        icon: FileClock },
  { to: '/demo',     label: 'Demo Simulator',     icon: Activity },
]

function NavItem({ to, label, Icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
          {label}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ mobile = false, onClose }) {
  return (
    <div
      className={`
        flex flex-col h-full bg-white border-r border-slate-200
        ${mobile ? 'w-72' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ArrowRightLeft size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              WatchTransfer
            </span>
          </div>
          {mobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed pl-0.5">
          Right Patient → Right Clinician → Right Time
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            Icon={Icon}
            onClick={mobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3 space-y-0.5">
        <NavItem to="/settings" label="Settings" Icon={Settings} onClick={mobile ? onClose : undefined} />
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">C3</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">Dr. Clinician Three</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
