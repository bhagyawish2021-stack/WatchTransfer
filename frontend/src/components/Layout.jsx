import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Menu, Search, Bell } from 'lucide-react'
import Sidebar from './Sidebar'

const pageMeta = {
  '/':              { title: 'Dashboard',        desc: 'Clinical responsibility overview' },
  '/patients':      { title: 'Patients',          desc: 'Manage and monitor patient responsibility' },
  '/requests':      { title: 'Standing Requests', desc: 'Requests that remain active until their result condition occurs' },
  '/notifications': { title: 'Notifications',     desc: 'Stay informed about results requiring your attention' },
  '/audit':         { title: 'Audit Trail',       desc: 'Complete traceability of system decisions and events' },
  '/demo':          { title: 'Demo Simulator',    desc: 'See how responsibility-aware notification routing works' },
  '/settings':      { title: 'Settings',          desc: 'Manage your profile and preferences' },
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  const base = '/' + pathname.split('/')[1]
  const meta = pageMeta[base] || { title: 'WatchTransfer', desc: '' }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar mobile onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Left: hamburger + page title */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                  {meta.title}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">{meta.desc}</p>
              </div>
            </div>

            {/* Right: bell + avatar */}
            <div className="flex items-center gap-2">
              <Link
                to="/notifications"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative"
                title="View Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">C3</span>
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  C003
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto p-4 lg:p-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
