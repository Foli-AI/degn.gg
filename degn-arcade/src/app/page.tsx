import { Navbar } from "@/components/navbar";
import { GameGrid } from "@/components/game-grid";
import { ActivityFeed } from "@/components/activity-feed";
import { LeaderboardPreview } from "@/components/leaderboard-preview";
import { Footer } from "@/components/Footer";
import { Starfield } from "@/components/starfield";

export default function LobbyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Starfield />

      {/* Animated grid background */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Radial gradient overlays for depth */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-secondary-foreground">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main content area */}
            <div className="flex-1 space-y-6 lg:max-w-5xl">
              <GameGrid />
              <LeaderboardPreview />
            </div>

            {/* Sidebar - pushed right with larger width */}
            <aside className="lg:w-96 xl:w-[420px] lg:ml-auto">
              <ActivityFeed />
            </aside>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
