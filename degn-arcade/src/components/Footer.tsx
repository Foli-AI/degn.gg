import { Twitter, MessageCircle, Send, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0B10] px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-center lg:text-left">
            <h4 className="text-xl font-semibold tracking-[0.35em] text-white">DEGN.GG</h4>
            <p className="text-xs uppercase tracking-[0.35em] text-muted">
              Play • Bet • Win • Earn
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted lg:justify-end">
            <a href="#fairness" className="transition hover:text-white">
              Provably Fair
            </a>
            <a href="#responsible" className="transition hover:text-white">
              Responsible Gaming
            </a>
            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </div>
        <div className="grid gap-6 text-sm text-muted sm:grid-cols-2 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total Wagered" value="$58,204" />
            <Stat label="Players Online" value="2,431" />
            <Stat label="Average RTP" value="97%" />
          </div>
          <div className="flex items-center justify-center gap-4 lg:justify-end">
            <a
              href="https://x.com"
              target="_blank"
              className="rounded-full border border-white/10 p-2 text-muted transition hover:border-neon/40 hover:text-white"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              className="rounded-full border border-white/10 p-2 text-muted transition hover:border-neon/40 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              className="rounded-full border border-white/10 p-2 text-muted transition hover:border-neon/40 hover:text-white"
            >
              <Send className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-center text-xs text-muted lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-center gap-2 uppercase tracking-[0.3em] text-muted">
            <Shield className="h-3.5 w-3.5 text-neon" />
            Provably Fair • Solana Powered • Anti-Bot Protected
          </div>
          <p>© {new Date().getFullYear()} DEGN.gg. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center shadow-[0_20px_35px_-25px_rgba(20,184,166,0.5)]">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

