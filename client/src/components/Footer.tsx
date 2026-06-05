export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-muted)]">
      <p>
        土豆 · VRChat 回憶相冊 ·{" "}
        <a
          href="https://vrc.mcwind.cloud"
          className="text-[var(--color-accent-2)] hover:underline"
        >
          vrc.mcwind.cloud
        </a>
      </p>
      <p className="mt-2 text-xs opacity-60">珍藏在VRChat的點點滴滴</p>
    </footer>
  );
}
