import { useState, useEffect } from 'react'
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Activity,
  UserCheck,
  Bell,
  Clock,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import StatusBadge from '../components/StatusBadge'
import { getPatients, getPatientTimeline, getPatientResponsible } from '../api'

const steps = [
  { id: 1, label: 'Patient Admission', desc: 'Patient P001 admitted to Ward 4B' },
  { id: 2, label: 'Standing Request', desc: 'Notify on Potassium test result' },
  { id: 3, label: 'Clinical Handoffs', desc: 'Multiple shift transfers occur' },
  { id: 4, label: 'Result Available', desc: 'Lab emits result at 10:08 AM' },
  { id: 5, label: 'Timeline Reconstruct', desc: 'Sort events by true event_time' },
  { id: 6, label: 'Smart Routing', desc: 'Route notification to responsible clinician' },
]

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [outOfOrderMode, setOutOfOrderMode] = useState(false)
  const [animationStage, setAnimationStage] = useState(0) // 0: raw, 1: sorting, 2: resolved

  const resetDemo = () => {
    setCurrentStep(0)
    setIsRunning(false)
    setOutOfOrderMode(false)
    setAnimationStage(0)
  }

  const runOutOfOrderSimulation = () => {
    resetDemo()
    setOutOfOrderMode(true)
    setIsRunning(true)

    // Stage 1: Show out of order arrivals
    setAnimationStage(1)

    // Stage 2: After 2 seconds, trigger timeline sorting
    setTimeout(() => {
      setAnimationStage(2)
    }, 2000)

    // Stage 3: After 4 seconds, show resolved responsibility
    setTimeout(() => {
      setAnimationStage(3)
      setIsRunning(false)
    }, 4000)
  }

  const stepForward = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold mb-1">
            <Sparkles size={16} />
            <span>Interactive Presentation Mode</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            WatchTransfer Demo Simulator
          </h1>
          <p className="text-sm text-slate-500">
            See how responsibility-aware notification routing handles out-of-order events and shift handoffs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={resetDemo}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            icon={Play}
            onClick={runOutOfOrderSimulation}
            disabled={isRunning}
            className="shadow-sm"
          >
            {isRunning ? 'Processing Simulation...' : 'Run Out-of-Order Demo'}
          </Button>
        </div>
      </div>

      {/* Step Indicators */}
      <Card className="p-5 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {steps.map((step) => {
            const isCompleted = outOfOrderMode ? animationStage >= 3 : currentStep >= step.id
            const isCurrent = outOfOrderMode ? animationStage === Math.min(step.id, 3) : currentStep === step.id

            return (
              <div
                key={step.id}
                onClick={() => !outOfOrderMode && setCurrentStep(step.id)}
                className={`cursor-pointer rounded-lg p-3 transition-all border ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-mono font-bold ${
                      isCompleted ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    0{step.id}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isCurrent ? 'bg-blue-600 animate-ping' : 'bg-slate-300'
                      }`}
                    />
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug hidden lg:block">
                  {step.desc}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Out of Order Demonstration Mode */}
      {outOfOrderMode ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Ingestion order */}
            <Card className="p-6 border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-amber-500" />
                  <h3 className="font-semibold text-slate-900 text-sm">
                    1. Out-of-Order Ingestion (Real World Network Lag)
                  </h3>
                </div>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium border border-amber-200">
                  Arrived At Ingestion API
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px]">RECEIVED FIRST (10:09 AM)</span>
                    <span className="font-semibold text-slate-800">10:07 AM: Handoff C002 → C003</span>
                  </div>
                  <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">
                    Lagged 2 mins
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px]">RECEIVED SECOND (10:10 AM)</span>
                    <span className="font-semibold text-slate-800">10:05 AM: Handoff C001 → C002</span>
                  </div>
                  <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">
                    Delayed in transit
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px]">RECEIVED THIRD (10:11 AM)</span>
                    <span className="font-semibold text-purple-700">10:08 AM: Blood Test Result RES001</span>
                  </div>
                  <span className="text-[11px] text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded">
                    Critical Result
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                <p className="font-semibold mb-0.5">⚠️ The Naive Architecture Pitfall:</p>
                A standard system sorting by database storage timestamp (`created_at`) would misidentify the responsible clinician or notify the wrong doctor who already went off-duty.
              </div>
            </Card>

            {/* Box 2: Timeline Reconstruction */}
            <Card className="p-6 border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-slate-900 text-sm">
                    2. WatchTransfer Reconstructed Timeline
                  </h3>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                  Sorted by true event_time
                </span>
              </div>

              {animationStage >= 2 ? (
                <div className="space-y-3 font-mono text-xs animate-in fade-in duration-500">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-600 block text-[10px] font-sans font-semibold">T1: 10:05 AM (event_time)</span>
                      <span className="font-semibold text-slate-800">Dr. Sarah Smith (C001) → Dr. Alex Patel (C002)</span>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-600 block text-[10px] font-sans font-semibold">T2: 10:07 AM (event_time)</span>
                      <span className="font-semibold text-slate-800">Dr. Alex Patel (C002) → Dr. Clinician Three (C003)</span>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>

                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="text-purple-600 block text-[10px] font-sans font-semibold">RESULT EVENT: 10:08 AM</span>
                      <span className="font-bold text-purple-900">Serum Potassium: 2.8 mmol/L (CRITICAL LOW)</span>
                    </div>
                    <span className="bg-purple-600 text-white text-[10px] font-sans px-2 py-0.5 rounded font-medium">
                      Event Point
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-medium text-slate-600">Reconstructing timeline by event_time...</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Resolving temporal invariant across shifts</p>
                </div>
              )}

              {animationStage >= 2 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                  <span>Timeline perfectly ordered: At 10:08 AM, active clinician is <strong>C003</strong>.</span>
                </div>
              )}
            </Card>
          </div>

          {/* Box 3: Resolution Box (The Centerpiece) */}
          {animationStage >= 3 && (
            <Card className="p-8 border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-lg text-center animate-in zoom-in-95 duration-500">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-4">
                <CheckCircle2 size={15} />
                <span>RESPONSIBILITY RESOLVED</span>
              </div>

              <h2 className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight mb-1">
                C003
              </h2>
              <p className="text-lg font-semibold text-slate-700">
                Dr. Clinician Three (On-Duty Ward Physician)
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
                Evaluated against event time 10:08 AM. Notification routed instantly and saved to immutable NeonDB audit trail.
              </p>

              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-400 block">Resolution Method</span>
                  <span className="text-xs font-semibold text-slate-800">event_time timeline replay</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-400 block">Notification Status</span>
                  <span className="text-xs font-semibold text-emerald-600">CREATED & DELIVERED</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-400 block">Audit Log ID</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">AUD-RES-003</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Manual Step-by-Step Walkthrough */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono font-semibold text-blue-600">
                  STEP {currentStep === 0 ? '1 of 6' : `${currentStep} of 6`}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {currentStep === 0
                    ? 'Interactive Clinical Flow'
                    : steps[currentStep - 1]?.label}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={stepBackward}
                  disabled={currentStep <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={stepForward}
                  disabled={currentStep >= 6}
                >
                  {currentStep === 0 ? 'Start Walkthrough' : currentStep === 6 ? 'Finished' : 'Next Step'}
                </Button>
              </div>
            </div>

            {/* Step Explanation Cards */}
            {currentStep <= 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-4">
                  <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Step 1: Patient Admission</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Patient <strong>P001 (Eleanor Vance)</strong> is admitted with severe fatigue and hypokalemia risk. Dr. Sarah Smith (C001) takes initial primary responsibility.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg font-mono">
                  POST /patients/ &#123; "patient_id": "P001", "name": "Eleanor Vance" &#125;
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-4">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Step 2: Standing Request Registered</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Dr. Smith places a standing request: <em>"Notify me when the blood chemistry panel is published."</em> This request remains active across shifts until the lab publishes the result.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg font-mono">
                  POST /requests/ &#123; "patient_id": "P001", "result_type": "Blood Chemistry", "status": "ACTIVE" &#125;
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 flex items-start gap-4">
                  <div className="p-2.5 bg-amber-600 text-white rounded-lg">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Step 3: Clinical Handoffs</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Shift changes occur. Dr. Smith hands off care to Dr. Patel (C002) at 10:05. Then Dr. Patel hands off to Dr. Clinician Three (C003) at 10:07.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                    <span>10:05 AM — Handoff 1</span>
                    <span className="font-semibold text-slate-700">Dr. Smith (C001) → Dr. Patel (C002)</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                    <span>10:07 AM — Handoff 2</span>
                    <span className="font-semibold text-slate-700">Dr. Patel (C002) → Dr. Clinician Three (C003)</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex items-start gap-4">
                  <div className="p-2.5 bg-purple-600 text-white rounded-lg">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Step 4: Result Becomes Available</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      At 10:08 AM, the central pathology analyzer uploads the result: <strong>Potassium = 2.8 mmol/L (Critical)</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg font-mono">
                  POST /results/ &#123; "patient_id": "P001", "result_type": "Blood Chemistry", "event_time": "10:08:00" &#125;
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-4">
                  <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Step 5: Responsibility Resolution</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      The resolver inspects the reconstructed timeline specifically at <strong>10:08 AM</strong>. It determines that <strong>C003 (Dr. Clinician Three)</strong> is the active responsible clinician at that moment.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                  Resolver Decision: <strong>C003</strong> determined as target recipient.
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-100 flex items-start gap-4">
                  <div className="p-2.5 bg-teal-600 text-white rounded-lg">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Step 6: Targeted Notification & Audit</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      A high-priority alert is delivered directly to Dr. Clinician Three. Dr. Smith is not disturbed off-shift, preventing cognitive overload and missed critical findings.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                  ✓ Notification delivered to C003 &bull; ✓ Immutable Audit Record written &bull; ✓ Standing Request marked FULFILLED
                </div>
              </div>
            )}
          </Card>

          {/* Quick Value Proposition Card */}
          <div className="space-y-4">
            <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Zap size={14} />
                <span>The Core Innovation</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Temporal Responsibility Invariant
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Most clinical EHRs route to either the ordering clinician (who may be off-shift) or whoever happens to be on record when the packet arrives.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed mt-2">
                WatchTransfer guarantees that results are routed based on <strong>who was caring for the patient at the exact result timestamp</strong>, even when handoff records arrive out of order.
              </p>
            </Card>

            <Card className="p-5 bg-white border-slate-200">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Live Simulator Shortcut
              </h4>
              <p className="text-xs text-slate-600 mb-4">
                Ready for the hackathon pitch? Run the automated out-of-order scenario with realistic network lag simulation.
              </p>
              <Button
                variant="primary"
                className="w-full justify-center"
                icon={Play}
                onClick={runOutOfOrderSimulation}
              >
                Launch Out-of-Order Demo
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
