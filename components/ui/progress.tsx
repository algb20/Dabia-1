"use client"
// مكوّن Progress بسيط بدون أي تبعية خارجية (كان يعتمد على @radix-ui/react-progress
// الذي حُذف لأنه غير متوافق مع React 19 ويسبب فشل npm install بالكامل)
export function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={`relative overflow-hidden rounded-full bg-secondary ${className}`}>
      <div
        className="h-full bg-amber-400 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
