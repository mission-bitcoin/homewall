import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as React from 'react'
import type { Hold } from '../types'
import { ROLES } from '../lib/roles'

interface WallCanvasProps {
  image: Blob
  imageWidth: number
  imageHeight: number
  holds: Hold[]
  editable?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onAdd?: (x: number, y: number) => void
  onMove?: (id: string, x: number, y: number) => void
  onResize?: (id: string, r: number) => void
}

interface Point {
  x: number
  y: number
}

interface Transform {
  scale: number
  tx: number
  ty: number
}

const MIN_SCALE = 0.4
const MAX_SCALE = 12
const TAP_SLOP = 8
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export default function WallCanvas({
  image,
  imageWidth,
  imageHeight,
  holds,
  editable = false,
  selectedId = null,
  onSelect,
  onAdd,
  onMove,
  onResize,
}: WallCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })

  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<{
    startDist: number
    startScale: number
    startTx: number
    startTy: number
    anchor: Point
  } | null>(null)
  const holdDrag = useRef<{ id: string; grabX: number; grabY: number } | null>(null)
  const resizeDrag = useRef<{ id: string } | null>(null)
  const tapStart = useRef<{ x: number; y: number; id: number } | null>(null)

  const objectUrl = useMemo(() => URL.createObjectURL(image), [image])
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const fit = useMemo(() => {
    if (size.w === 0 || size.h === 0) return { baseW: 0, baseH: 0, tx: 0, ty: 0 }
    const aspect = imageWidth / imageHeight
    let baseW = size.w
    let baseH = size.w / aspect
    if (baseH > size.h) {
      baseH = size.h
      baseW = size.h * aspect
    }
    return { baseW, baseH, tx: (size.w - baseW) / 2, ty: (size.h - baseH) / 2 }
  }, [size, imageWidth, imageHeight])

  useEffect(() => {
    setTransform({ scale: 1, tx: fit.tx, ty: fit.ty })
  }, [fit.tx, fit.ty, image])

  const local = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const toNorm = useCallback(
    (clientX: number, clientY: number) => {
      const p = local(clientX, clientY)
      return {
        x: (p.x - transform.tx) / transform.scale / (fit.baseW || 1),
        y: (p.y - transform.ty) / transform.scale / (fit.baseH || 1),
      }
    },
    [local, transform, fit],
  )

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    containerRef.current?.setPointerCapture(e.pointerId)
    const p = local(e.clientX, e.clientY)
    pointers.current.set(e.pointerId, p)
    if (holdDrag.current || resizeDrag.current) return
    if (pointers.current.size === 1) {
      tapStart.current = { x: p.x, y: p.y, id: e.pointerId }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startScale: transform.scale,
        startTx: transform.tx,
        startTy: transform.ty,
        anchor: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      tapStart.current = null
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = local(e.clientX, e.clientY)

    if (holdDrag.current) {
      const n = toNorm(e.clientX, e.clientY)
      onMove?.(
        holdDrag.current.id,
        clamp01(n.x - holdDrag.current.grabX),
        clamp01(n.y - holdDrag.current.grabY),
      )
      return
    }

    if (resizeDrag.current) {
      const target = holds.find((h) => h.id === resizeDrag.current?.id)
      if (target) {
        const dx = ((p.x - transform.tx) / transform.scale - target.x * fit.baseW)
        const dy = ((p.y - transform.ty) / transform.scale - target.y * fit.baseH)
        const r = Math.min(0.35, Math.max(0.005, Math.hypot(dx, dy) / (fit.baseW || 1)))
        onResize?.(target.id, r)
      }
      return
    }

    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, p)

    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const g = gesture.current
      const scale = clampScale(g.startScale * (dist / g.startDist))
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const cx = (g.anchor.x - g.startTx) / g.startScale
      const cy = (g.anchor.y - g.startTy) / g.startScale
      setTransform({ scale, tx: mid.x - cx * scale, ty: mid.y - cy * scale })
      return
    }

    if (pointers.current.size === 1) {
      setTransform((t) => ({ ...t, tx: t.tx + (p.x - prev.x), ty: t.ty + (p.y - prev.y) }))
    }
  }

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = local(e.clientX, e.clientY)
    const had = pointers.current.size
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current = null

    if (resizeDrag.current) {
      resizeDrag.current = null
      return
    }
    if (holdDrag.current) {
      holdDrag.current = null
      return
    }

    const tap = tapStart.current
    if (tap && tap.id === e.pointerId) {
      tapStart.current = null
      if (Math.hypot(p.x - tap.x, p.y - tap.y) < TAP_SLOP && had === 1) {
        if (editable && onAdd) {
          const n = toNorm(e.clientX, e.clientY)
          onAdd(clamp01(n.x), clamp01(n.y))
        } else {
          onSelect?.(null)
        }
      }
    }
  }

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const p = local(e.clientX, e.clientY)
    setTransform((t) => {
      const scale = clampScale(t.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
      const cx = (p.x - t.tx) / t.scale
      const cy = (p.y - t.ty) / t.scale
      return { scale, tx: p.x - cx * scale, ty: p.y - cy * scale }
    })
  }

  const startHoldDrag = (e: React.PointerEvent, h: Hold) => {
    if (!editable) return
    e.stopPropagation()
    e.preventDefault()
    containerRef.current?.setPointerCapture(e.pointerId)
    const n = toNorm(e.clientX, e.clientY)
    holdDrag.current = { id: h.id, grabX: n.x - h.x, grabY: n.y - h.y }
    onSelect?.(h.id)
  }

  const startResize = (e: React.PointerEvent, h: Hold) => {
    if (!editable) return
    e.stopPropagation()
    e.preventDefault()
    containerRef.current?.setPointerCapture(e.pointerId)
    resizeDrag.current = { id: h.id }
    onSelect?.(h.id)
  }

  const strokeWidth = Math.max(2, imageWidth * 0.004)
  const ordered = useMemo(
    () => [...holds].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)),
    [holds, selectedId],
  )

  return (
    <div
      ref={containerRef}
      className={`wall-canvas${editable ? ' editable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
    >
      {fit.baseW > 0 && (
        <div
          className="wall-canvas-content"
          style={{
            width: fit.baseW,
            height: fit.baseH,
            transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
          }}
        >
          <img src={objectUrl} alt="Climbing wall" draggable={false} />
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            width="100%"
            height="100%"
            style={{ pointerEvents: editable ? 'auto' : 'none' }}
          >
            {ordered.map((h) => {
              const meta = ROLES[h.role]
              const cx = h.x * imageWidth
              const cy = h.y * imageHeight
              const r = h.r * imageWidth
              const selected = h.id === selectedId
              return (
                <g key={h.id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={meta.fill}
                    stroke={meta.stroke}
                    strokeWidth={selected ? strokeWidth * 2 : strokeWidth}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={Math.max(r, imageWidth * 0.02)}
                    fill="transparent"
                    style={{ cursor: editable ? 'grab' : 'default' }}
                    onPointerDown={(e) => startHoldDrag(e, h)}
                  />
                  {selected && editable && (
                    <circle
                      cx={cx + r}
                      cy={cy}
                      r={imageWidth * 0.014}
                      fill="#ffffff"
                      stroke={meta.stroke}
                      strokeWidth={strokeWidth}
                      style={{ cursor: 'nwse-resize' }}
                      onPointerDown={(e) => startResize(e, h)}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}
