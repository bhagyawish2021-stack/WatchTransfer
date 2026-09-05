import { AlertCircle, RefreshCw } from 'lucide-react'
import Button from './Button'

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-red-50 rounded-full mb-4">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        Something went wrong
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5">
        {message || 'Unable to load data. Please check your connection and try again.'}
      </p>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
