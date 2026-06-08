import { Hero } from "./components/Hero";
import { Gallery } from "./components/Gallery";
import { Footer } from "./components/Footer";
import { useGallery } from "./hooks/useGallery";

export default function App() {
  const gallery = useGallery();

  const scrollToGallery = () => {
    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mesh-bg min-h-dvh">
      <main>
        <Hero stats={gallery.stats} onExplore={scrollToGallery} />
        <Gallery
          stats={gallery.stats}
          photos={gallery.photos}
          displayTotal={gallery.displayTotal}
          month={gallery.month}
          setMonth={gallery.setMonth}
          loading={gallery.loading}
          loadingMore={gallery.loadingMore}
          hasMore={gallery.hasMore}
          error={gallery.error}
          onLoadMore={gallery.loadMore}
        />
      </main>

      <Footer />
    </div>
  );
}
