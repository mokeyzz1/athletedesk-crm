'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import Lenis from 'lenis'
import LiveDashboard from '@/components/landing/live-dashboard'
import ProductScroll from '@/components/landing/product-scroll'
import LifecycleFlow from '@/components/landing/lifecycle-flow'
import WorkflowRelay from '@/components/landing/workflow-relay'
import {
  DEMO_USER_EMAIL,
  DEMO_PASSWORD_HINT,
  SHOW_DEMO_CREDENTIALS,
  buildDemoAccessMailto,
} from '@/lib/demo'

const logoSrc = '/brand/athletedesk-logo-transparent.png'

const navItems = [
  { label: 'Difference', href: '#difference' },
  { label: 'Product', href: '#product' },
  { label: 'Workflow', href: '#workflow' },
]

const metrics = [
  { label: 'Active prospects', value: '128', delta: '+18 this week' },
  { label: 'Signed athletes', value: '30', delta: '12 in brand work' },
  { label: 'Follow-ups due', value: '24', delta: '7 high priority' },
]

const pipeline = [
  { stage: 'Contacted', count: '43', names: ['Jordan Cross', 'Tyler Ross', 'Mina Patel'], dot: 'bg-blue-500' },
  { stage: 'Interested', count: '19', names: ['Maya Brooks', 'Devon Hayes'], dot: 'bg-brand-500' },
  { stage: 'Signed', count: '30', names: ['Ari Collins', 'Marcus Lee'], dot: 'bg-emerald-500' },
]

const lifecycle = [
  ['01', 'Recruit', 'Import lists, qualify athletes, and move prospects through status.'],
  ['02', 'Represent', 'Keep emails, notes, tasks, meetings, and ownership tied to the athlete.'],
  ['03', 'Monetize', 'Track brand outreach, contracts, fees, payments, and revenue activity.'],
]

const productRows = [
  {
    label: 'Pipeline',
    title: 'Recruiting that looks like your agency actually works.',
    body: 'Filter by sport, school, class, region, scout, agent, marketing owner, and status without building a custom CRM from scratch.',
  },
  {
    label: 'Comms',
    title: 'Gmail is part of the athlete record.',
    body: 'Send, schedule, and log outreach without losing context in personal inboxes or side threads.',
  },
  {
    label: 'Revenue',
    title: 'Brand deals and payments stay attached to the athlete.',
    body: 'Know which relationships are active, which contracts are moving, and which payments still need attention.',
  },
]

/* ---------- motion helpers ---------- */

// word-by-word masked reveal (driven by GSAP on load)
function SplitReveal({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom" aria-hidden="true">
          <span className="split-word inline-block opacity-0 will-change-transform">
            {word}
            {i < text.split(' ').length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </span>
  )
}

// scroll-into-view fade/slide
function Reveal({
  children,
  className,
  delay = 0,
  y = 30,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// magnetic wrapper (cursor-follow) for hero buttons
function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35)
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35)
    }
    const reset = () => {
      xTo(0)
      yTo(0)
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', reset)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', reset)
    }
  }, [])
  return (
    <span ref={ref} className="inline-block will-change-transform">
      {children}
    </span>
  )
}

function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-11 overflow-hidden">
        <Image src={logoSrc} alt="AthleteDesk logo" fill sizes="44px" className="object-contain object-center" priority />
      </div>
      <span className={`text-[15px] font-bold uppercase tracking-tight ${dark ? 'text-white' : 'text-neutral-900'}`}>
        AthleteDesk
      </span>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 10.4 8 13.7 15.5 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- product mockup ---------- */

function ProductVisual() {
  return (
    <div className="hero-product-inner relative">
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-to-tr from-brand-400/20 via-transparent to-blue-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          </div>
          <div className="rounded-md bg-white px-3 py-1 text-[11px] font-medium text-neutral-400 ring-1 ring-neutral-200">
            app.athletedesk.io/agency
          </div>
          <div className="w-10" />
        </div>

        <div className="grid grid-cols-[60px_1fr] bg-neutral-950">
          <aside className="flex flex-col items-center gap-2.5 border-r border-white/5 py-4">
            <div className="relative h-7 w-9">
              <Image src={logoSrc} alt="AthleteDesk logo" fill sizes="36px" className="object-contain" />
            </div>
            <div className="mt-3 flex flex-col items-center gap-2">
              {[0, 1, 2, 3, 4].map(item => (
                <div key={item} className={`h-7 w-7 rounded-lg ${item === 1 ? 'bg-brand-500' : 'bg-white/[0.06]'}`} />
              ))}
            </div>
          </aside>

          <div className="min-w-0 bg-neutral-50">
            <div className="border-b border-neutral-200 bg-white px-5 py-4">
              <div className="flex flex-row items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">Agency command</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">Maya Brooks</h2>
                  <p className="mt-1 text-sm text-neutral-500">Track &amp; Field · Ohio State · Junior · Midwest</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {metrics.map(metric => (
                    <div key={metric.label} className="min-w-[110px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{metric.label}</p>
                      <p className="mt-1 text-xl font-bold tracking-tight text-neutral-900">{metric.value}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-neutral-600">{metric.delta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1.1fr_0.9fr] gap-4 p-4">
              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Recruiting</p>
                    <h3 className="mt-1 text-base font-bold tracking-tight text-neutral-900">Pipeline movement</h3>
                  </div>
                  <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-300">Handoff ready</span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {pipeline.map(col => (
                    <div key={col.stage} className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                          <p className="text-xs font-bold text-neutral-700">{col.stage}</p>
                        </div>
                        <span className="text-xs font-semibold text-neutral-400">{col.count}</span>
                      </div>
                      <div className="space-y-2 p-2">
                        {col.names.map(name => (
                          <div key={name} className="rounded-md border border-neutral-200 bg-white p-2 shadow-sm">
                            <p className="text-xs font-bold text-neutral-800">{name}</p>
                            <p className="mt-1 text-[11px] text-neutral-500">Next: follow-up email</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Timeline</p>
                    <h3 className="mt-1 text-base font-bold tracking-tight text-neutral-900">Athlete record</h3>
                  </div>
                  <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Interested</span>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ['9:12 AM', 'Scout marked athlete interested'],
                    ['10:04 AM', 'Agent assigned automatically'],
                    ['11:30 AM', 'Note added by agent'],
                    ['Tomorrow', 'Scheduled Gmail follow-up'],
                    ['Friday', 'Intro call booked'],
                  ].map(([time, text]) => (
                    <div key={text} className="grid grid-cols-[72px_1fr] gap-3 text-sm">
                      <p className="text-xs font-semibold text-neutral-400">{time}</p>
                      <p className="border-l-2 border-brand-400 pl-3 text-neutral-700">{text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// renders the desktop mockup at a fixed width and scales it to fit any screen,
// so it always reads as a desktop app (never reflows to a phone layout)
function DesktopMock() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ scale: 1, height: 0 })

  useEffect(() => {
    const compute = () => {
      const wrap = wrapRef.current
      const inner = innerRef.current
      if (!wrap || !inner) return
      const scale = Math.min(1, wrap.clientWidth / 1000)
      setDims({ scale, height: inner.offsetHeight * scale })
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden" style={{ height: dims.height || undefined }}>
      <div className="absolute left-1/2" style={{ width: 1000, marginLeft: -500 }}>
        <div ref={innerRef} style={{ transform: `scale(${dims.scale})`, transformOrigin: 'top center' }}>
          <ProductVisual />
        </div>
      </div>
    </div>
  )
}

function WorkflowSection({ workflowRef }: { workflowRef: React.RefObject<HTMLElement> }) {
  return (
    <section ref={workflowRef} id="workflow" className="bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-brand-300">
            <span className="h-2 w-2 bg-brand-400" /> Agency workflow
          </p>
          <h2 className="mt-6 text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
            One athlete record, moving through the whole business.
          </h2>
          <p className="mt-5 text-lg leading-7 text-neutral-400">
            Scout to agent to marketing to admin — the same record carries every note, email,
            and status as it hands off. No re-typing, no lost context.
          </p>
        </div>

        <WorkflowRelay />
      </div>
    </section>
  )
}

/* ---------- page ---------- */

export default function Home() {
  const workflowRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const [pastHero, setPastHero] = useState(false)
  const [navHidden, setNavHidden] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.on('scroll', () => ScrollTrigger.update())
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      // hero entrance — gsap owns the start state so the % reveal is reliable
      gsap.set('.split-word', { yPercent: 110, opacity: 1 })
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.to('.split-word', { yPercent: 0, stagger: 0.05, duration: 0.95 }, 0.15)
        .fromTo('.hero-sub', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.6)
        .fromTo('.hero-cta', { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6 }, 0.72)
        .fromTo('.hero-chips', { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.6 }, 0.84)
        .fromTo('.hero-hint', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, 1.05)

      // nav matches the section it's over: dark on the hero, light on the body
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'bottom top+=66',
        onEnter: () => setPastHero(true),
        onLeaveBack: () => setPastHero(false),
      })

      // hide the landing nav while the dashboard takes over (so it doesn't cover it)
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: '36% top',
        onEnter: () => setNavHidden(true),
        onLeaveBack: () => setNavHidden(false),
      })

      // iOS-style sheet: the dashboard slides up and takes over (snappy), then holds
      // hold the hero (chips readable) for a beat, THEN slide the dashboard up.
      // linear ease = the sheet tracks scroll 1:1, so it feels dragged, not forced.
      const sheetST = { trigger: heroRef.current, start: '22% top', end: '46% top', scrub: 1.1 } as const
      gsap.fromTo(
        '.sheet',
        { yPercent: 100, opacity: 1 },
        { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: sheetST }
      )
      // the hero recedes gently behind it (subtle, so the blend reads soft)
      gsap.fromTo(
        '.hero-recede',
        { scale: 1, opacity: 1, filter: 'blur(0px)' },
        { scale: 0.95, opacity: 0.45, filter: 'blur(7px)', ease: 'none', scrollTrigger: sheetST }
      )

      // bring the dashboard to life as it takes over — all at once
      const liveTrigger = { trigger: heroRef.current, start: '38% top', once: true }

      gsap.utils.toArray<HTMLElement>('.ld-num').forEach(el => {
        const target = parseFloat(el.dataset.target || '0')
        const prefix = el.dataset.prefix || ''
        const obj = { v: 0 }
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: liveTrigger,
          onUpdate: () => {
            el.textContent = prefix + Math.round(obj.v).toLocaleString()
          },
        })
      })

      gsap.fromTo(
        '.ld-card',
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05, scrollTrigger: liveTrigger }
      )

      // workflow handoff relay — record travels Scout → Agent → Marketing → Admin
      const relay = document.querySelector('.relay-wrap')
      if (relay) {
        const lefts = ['12.5%', '37.5%', '62.5%', '87.5%']
        const statuses = [
          { label: 'New prospect', cls: 'bg-sky-100 text-sky-700' },
          { label: 'In conversation', cls: 'bg-amber-100 text-amber-700' },
          { label: 'Signed', cls: 'bg-violet-100 text-violet-700' },
          { label: 'Active client', cls: 'bg-emerald-100 text-emerald-700' },
        ]
        const stationEls = gsap.utils.toArray<HTMLElement>('.relay-station, .relay-station-v')
        const labelEls = gsap.utils.toArray<HTMLElement>('.relay-label')
        const textEls = gsap.utils.toArray<HTMLElement>('.relay-text')
        const recordEl = document.querySelector('.relay-record') as HTMLElement | null
        const statusEl = document.querySelector('.relay-record-status') as HTMLElement | null

        const activate = (idx: number) => {
          stationEls.forEach(el => el.classList.toggle('relay-on', Number(el.dataset.i) <= idx))
          labelEls.forEach((el, i) => el.classList.toggle('relay-label-on', i === idx))
          textEls.forEach((el, i) => { el.style.opacity = i <= idx ? '1' : '0.4' })
          if (statusEl) {
            const s = statuses[idx]
            statusEl.textContent = s.label
            statusEl.className =
              'relay-record-status mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' + s.cls
          }
        }
        activate(0)

        // line draw + record travel, scrubbed to scroll
        gsap.to('.relay-line-fg', {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: relay, start: 'top 62%', end: 'bottom 82%', scrub: 1 },
        })
        gsap.to('.relay-line-fg-v', {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: relay, start: 'top 70%', end: 'bottom 85%', scrub: 1 },
        })

        let current = -1
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: relay,
            start: 'top 60%',
            end: 'bottom 80%',
            scrub: 1,
            onUpdate: self => {
              const p = self.progress
              const idx = p < 0.26 ? 0 : p < 0.52 ? 1 : p < 0.78 ? 2 : 3
              if (idx !== current) { current = idx; activate(idx) }
            },
          },
        })
        if (recordEl) {
          for (let i = 1; i < lefts.length; i++) {
            tl.to(recordEl, { left: lefts[i], ease: 'power1.inOut', duration: 1 }).to({}, { duration: 0.4 })
          }
        }
      }

      // lifecycle flow — token travels Recruit → Represent → Monetize, line draws, stages light up
      const lifeWrap = document.querySelector('.life-wrap')
      const fg = document.querySelector('.life-line-fg') as SVGPathElement | null
      if (lifeWrap && fg) {
        const len = fg.getTotalLength()
        gsap.set(fg, { strokeDasharray: len, strokeDashoffset: len })
        const lifeST = { trigger: lifeWrap, start: 'top 78%', end: 'top 30%', scrub: 1 } as const
        gsap.to(fg, { strokeDashoffset: 0, ease: 'none', scrollTrigger: lifeST })
        gsap.to('.life-token', {
          motionPath: { path: '#lifePath', align: '#lifePath', alignOrigin: [0.5, 0.5] },
          ease: 'none',
          scrollTrigger: lifeST,
        })
        const nodes = gsap.utils.toArray<SVGCircleElement>('.life-node')
        const labels = gsap.utils.toArray<HTMLElement>('.life-label')
        ScrollTrigger.create({
          trigger: lifeWrap,
          start: 'top 78%',
          end: 'top 30%',
          scrub: 1,
          onUpdate: self => {
            ;[0, 0.5, 1].forEach((threshold, i) => {
              const active = self.progress >= threshold - 0.03
              const node = nodes[i]
              if (node) {
                node.setAttribute('fill', active ? '#0ea5e9' : '#ffffff')
                node.setAttribute('stroke', active ? '#0ea5e9' : '#d6d3cd')
              }
              if (labels[i]) labels[i].style.opacity = active ? '1' : '0.4'
            })
          },
        })
      }

      // horizontal product scroll — panels move sideways as you scroll down
      const track = document.querySelector('.hscroll-track') as HTMLElement | null
      const wrap = document.querySelector('.hscroll-wrap') as HTMLElement | null
      if (track && wrap) {
        const panelEls = gsap.utils.toArray<HTMLElement>('.hpanel')
        const dots = Array.from(document.querySelectorAll<HTMLElement>('.hp-dot'))

        const hTween = gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top top',
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: self => {
              const idx = Math.round(self.progress * (panelEls.length - 1))
              dots.forEach((d, i) => {
                d.classList.toggle('bg-sky-400', i === idx)
                d.classList.toggle('w-6', i === idx)
                d.classList.toggle('bg-white/25', i !== idx)
              })
            },
          },
        })

        panelEls.forEach(panel => {
          const enter = { trigger: panel, containerAnimation: hTween, start: 'left 82%' } as const
          const text = panel.querySelector('.hp-text')
          const visual = panel.querySelector('.hp-visual')
          const rises = panel.querySelectorAll('.hp-rise')
          const chart = panel.querySelector('.hp-chart')

          // dramatic entrance as the panel slides into view (vertical, stays in its lane)
          if (text) gsap.from(text, { y: 44, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: enter })
          if (visual) gsap.from(visual, { y: 56, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: enter })
          if (rises.length)
            gsap.from(rises, { y: 44, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: panel, containerAnimation: hTween, start: 'left 68%' } })
          if (chart)
            gsap.fromTo(chart, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power2.out', scrollTrigger: { trigger: panel, containerAnimation: hTween, start: 'left 62%' } })

          // parallax — visual and text drift vertically at different rates (Apple depth)
          const cross = { trigger: panel, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } as const
          if (visual) gsap.fromTo(visual, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: cross })
          if (text) gsap.fromTo(text, { yPercent: 4 }, { yPercent: -4, ease: 'none', scrollTrigger: cross })
        })
      }
    })

    return () => {
      ctx.revert()
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f4f4f1] text-neutral-900">
      {/* NAV */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          navHidden && !pastHero
            ? 'pointer-events-none -translate-y-full opacity-0'
            : pastHero
              ? 'border-b border-neutral-200 bg-[#f4f4f1]/95 backdrop-blur-xl'
              : 'border-b border-white/10 bg-neutral-950'
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandLogo dark={!pastHero} />
          <div className={`hidden items-center gap-8 text-sm font-semibold md:flex ${pastHero ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} className={`transition-colors ${pastHero ? 'hover:text-neutral-900' : 'hover:text-white'}`}>
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className={`inline-flex px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${pastHero ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-300 hover:text-white'}`}>
              Sign in
            </Link>
            <Link
              href="/api/demo"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-400"
            >
              Demo <ArrowIcon />
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO + iOS-style sheet takeover */}
      <section ref={heroRef} className="relative h-[190vh] bg-neutral-950 text-white">
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* hero layer — recedes behind the sheet */}
          <div className="hero-recede absolute inset-0 z-0 will-change-transform">
            {/* grid + glows */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
                maskImage: 'radial-gradient(ellipse 60% 50% at 50% 18%, black 30%, transparent 72%)',
                WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 18%, black 30%, transparent 72%)',
              }}
            />
            <div className="pointer-events-none absolute left-1/2 -top-32 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[140px]" />
            <div className="pointer-events-none absolute right-0 top-1/4 h-[420px] w-[420px] rounded-full bg-blue-600/12 blur-[130px]" />

            {/* centered headline — fills the first screen */}
            <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="mx-auto max-w-4xl text-[3.2rem] font-bold uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-[6rem]">
            <SplitReveal text="Run the full athlete business from one desk." />
          </h1>

          <p className="hero-sub mx-auto mt-8 max-w-2xl text-lg leading-8 text-neutral-300 opacity-0">
            AthleteDesk connects recruiting, Gmail outreach, handoffs, brand deals, tasks, and revenue around one athlete record. Built for agencies that need the whole team in the room.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic>
              <Link
                href="/api/demo"
                className="hero-cta inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-base font-bold text-white opacity-0 transition-colors hover:bg-brand-400"
              >
                Try the demo <ArrowIcon />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                href={buildDemoAccessMailto()}
                className="hero-cta inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.02] px-8 py-3.5 text-base font-bold text-white opacity-0 transition-colors hover:border-white/40 hover:bg-white/[0.06]"
              >
                Request access
              </Link>
            </Magnetic>
          </div>

          {SHOW_DEMO_CREDENTIALS && (
            <div className="hero-chips mx-auto mt-4 inline-flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-neutral-400 opacity-0 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-bold text-white">Manual sign in:</span>
              <code className="font-mono text-neutral-300">{DEMO_USER_EMAIL}</code>
              <span className="hidden text-white/20 sm:inline">/</span>
              <code className="font-mono text-neutral-300">{DEMO_PASSWORD_HINT}</code>
            </div>
          )}

          <div className="hero-chips mx-auto mt-11 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 opacity-0 sm:grid-cols-4">
            {['No per-seat tax', 'Athlete lifecycle', 'Gmail built in', 'Brand revenue'].map(item => (
              <div key={item} className="bg-neutral-950 px-4 py-4 text-left">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                  <CheckIcon />
                </span>
                <p className="mt-2.5 text-sm font-bold text-neutral-200">{item}</p>
              </div>
            ))}
          </div>
            </div>

            {/* pull-up hint — signals the dashboard slides up */}
            <div className="hero-hint absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0">
              <span className="h-1.5 w-11 rounded-full bg-white/30" />
              <svg className="h-4 w-4 animate-bounce text-white/45" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 14l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* dashboard sheet — slides up and takes over (iOS-style) */}
          <div className="sheet absolute inset-0 z-10 opacity-0 will-change-transform">
            <div className="flex h-full flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-white shadow-[0_-30px_90px_rgba(0,0,0,0.55)]">
              {/* iOS grabber */}
              <div className="flex flex-shrink-0 justify-center bg-white pt-2.5 pb-1.5">
                <span className="h-1.5 w-11 rounded-full bg-slate-300" />
              </div>
              <div className="min-h-0 flex-1">
                <LiveDashboard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFFERENCE — light */}
      <section id="difference" className="bg-[#f4f4f1]">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <Reveal className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
              <span className="h-2 w-2 bg-brand-500" /> Why AthleteDesk
            </p>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
              Generic CRMs manage contacts. NIL agencies manage athlete lifecycles.
            </h2>
          </Reveal>

          {/* animated lifecycle flow */}
          <LifecycleFlow />

          <div className="mt-14 grid gap-4 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-neutral-300 bg-white p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-400">Generic CRM</p>
                <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-neutral-400">Contacts, companies, deals, and more seats.</h3>
                <ul className="mt-7">
                  {['Pricing rises as the team grows', 'NIL workflow needs custom fields and workarounds', 'Recruiting, email, deals, and revenue drift apart'].map((item, i) => (
                    <li key={item} className={`flex gap-3 py-3.5 text-neutral-500 ${i > 0 ? 'border-t border-neutral-200' : ''}`}>
                      <span className="mt-0.5 font-bold text-neutral-300">×</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-2xl border border-neutral-900 bg-neutral-950 p-8 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">AthleteDesk</p>
                <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight">Athletes, handoffs, communication, and revenue in one layer.</h3>
                <ul className="mt-7">
                  {['Invite scouts, agents, marketing, interns, and admins', 'Built around recruit -> represent -> monetize', 'Every email, task, deal, and dollar stays attached to the athlete'].map((item, i) => (
                    <li key={item} className={`flex gap-3 py-3.5 text-neutral-200 ${i > 0 ? 'border-t border-white/10' : ''}`}>
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"><CheckIcon /></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PRODUCT — white */}
      {/* PRODUCT — title + horizontal-scroll showcase together */}
      <ProductScroll />

      <WorkflowSection workflowRef={workflowRef} />

      {/* PRICING / CTA — dark with a blue glow (blends workflow → cta → footer) */}
      <section className="relative overflow-hidden bg-neutral-950">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/15 blur-[130px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Pricing philosophy</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-6xl">
                Bring the whole team. Don&apos;t pay a tax on collaboration.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-400">
                AthleteDesk is positioned for agency workspaces, usage, and growth, not charging you every time a scout or marketer needs access.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/api/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-400"
                >
                  Try the demo <ArrowIcon />
                </Link>
                <Link
                  href={buildDemoAccessMailto('AthleteDesk - Access Request')}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.02] px-7 py-3.5 text-base font-bold text-white transition-colors hover:border-white/40 hover:bg-white/[0.06]"
                >
                  Request access
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <BrandLogo dark />
          <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-neutral-400">
            <Link href="/api/demo" className="transition-colors hover:text-white">Demo</Link>
            <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
            <Link href={buildDemoAccessMailto('AthleteDesk - Contact')} className="transition-colors hover:text-white">Contact</Link>
          </div>
          <p className="text-xs font-semibold text-neutral-500">© {new Date().getFullYear()} AthleteDesk</p>
        </div>
      </footer>
    </main>
  )
}
