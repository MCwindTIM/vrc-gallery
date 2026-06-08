import { motion } from "framer-motion";
import { formatMonthLabel } from "../lib/format";
import type { GalleryStats } from "../types";

interface HeroProps {
  stats: GalleryStats | null;
  onExplore: () => void;
}

export function Hero({ stats, onExplore }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 md:px-10 md:pt-24">
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-6xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-ui text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl"
        >
          <span className="bg-gradient-to-br from-[var(--color-accent)] via-[var(--color-text)] to-[var(--color-accent-2)] bg-clip-text text-transparent">
            喵哈囉，這裡是土豆呀
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="mt-4 max-w-xl text-lg text-[var(--color-muted)] md:text-xl"
        >
          VRChat: <a href="https://vrchat.com/home/user/usr_4f87a0f1-844b-4b84-a3fd-e4b729c75fb0" target="_blank" rel="noopener noreferrer" className="underline">土豆不是马铃薯</a><br></br>
          珍藏與大家在VRChat的點點滴滴
          <span className="mx-2 text-[var(--color-border)]">·</span>
          <span className="text-[var(--color-accent-2)]">Memories from the VRChat</span>
          <br></br>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <button
            type="button"
            onClick={onExplore}
            className="group relative overflow-hidden rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-[var(--color-on-accent)] shadow-[0_0_40px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] transition hover:brightness-105"
          >
            <span className="relative z-10">查看全部</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition group-hover:translate-x-full duration-700" />
          </button>
        </motion.div>

        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
            className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4"
          >
            <StatCard label="照片" value={String(stats.total)} />
            {(stats.months ?? []).slice(0, 2).map((m) => (
              <StatCard
                key={m.month}
                label={formatMonthLabel(m.month)}
                value={String(m.count)}
                sub="張"
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)]/60 p-4 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-text)] md:text-3xl">
        {value}
        {sub && (
          <span className="ml-1 text-sm font-normal text-[var(--color-muted)]">{sub}</span>
        )}
      </p>
    </div>
  );
}
