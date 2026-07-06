import { ArrowRight, Camera, Cloud, Images, LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/react";
import { Link } from "react-router-dom";

const showcase = [
  {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
    className: "col-span-2 row-span-2",
    alt: "A quiet mountain landscape",
  },
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=85",
    className: "col-span-1 row-span-1",
    alt: "Friends sharing a moment",
  },
  {
    src: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=700&q=85",
    className: "col-span-1 row-span-1",
    alt: "Golden sunset",
  },
  {
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85",
    className: "col-span-2 row-span-1",
    alt: "Sunlight through a forest",
  },
];

const features = [
  { icon: Cloud, title: "Effortless uploads", text: "Drop in one photo or a whole collection and keep moving." },
  { icon: LockKeyhole, title: "Private by default", text: "Your personal gallery is protected and belongs only to you." },
  { icon: Images, title: "Made for memories", text: "A calm, responsive space that lets every image breathe." },
];

export const HomePage = () => {
  const { isSignedIn } = useAuth();

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf8] text-slate-950">
    <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
      <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
          <Camera size={19} />
        </span>
        <span className="text-lg">Pixora</span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        {!isSignedIn && (
          <>
          <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">
            Sign in
          </Link>
          <Link to="/signup" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-violet-700">
            Start your gallery
          </Link>
          </>
        )}
        {isSignedIn && (
          <Link to="/gallery" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-violet-700">
            Open gallery
          </Link>
        )}
      </div>
    </nav>

    <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-28 pt-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pt-20">
      <div className="pointer-events-none absolute -left-64 top-0 h-[520px] w-[520px] rounded-full bg-violet-200/50 blur-3xl" />
      <div className="relative z-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
         
          A beautiful home for every moment
        </div>
        <h1 className="max-w-2xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-7xl">
          Keep life’s best moments <span className="text-violet-600">close.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
          Pixora is your private, beautifully simple photo library. Upload in seconds, revisit anytime, and let the memories take center stage.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          {!isSignedIn && (
            <>
            <Link to="/signup" className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-violet-700">
              Create your gallery
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </Link>
            <Link to="/login" className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              Open my photos
            </Link>
            </>
          )}
          {isSignedIn && (
            <Link to="/gallery" className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-violet-700">
              Go to my gallery
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/70 blur-2xl" />
        <div className="grid h-[500px] grid-cols-3 grid-rows-3 gap-3 rounded-[2rem] bg-white p-3 shadow-2xl shadow-slate-900/15 sm:h-[600px]">
          {showcase.map((photo) => (
            <div key={photo.src} className={`overflow-hidden rounded-[1.35rem] bg-slate-100 ${photo.className}`}>
              <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover transition duration-700 hover:scale-105" />
            </div>
          ))}
        </div>
        <div className="absolute -bottom-5 -left-5 rounded-2xl border border-white bg-white/90 px-5 py-4 shadow-xl backdrop-blur">
          <p className="text-2xl font-black tracking-tight">Your story.</p>
          <p className="text-sm text-slate-500">Always within reach.</p>
        </div>
      </div>
    </section>

    <section className="border-y border-slate-200/80 bg-white">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-20 sm:px-8 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-3xl border border-slate-100 bg-[#fbfaf8] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
            <span className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Icon size={21} /></span>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{text}</p>
          </article>
        ))}
      </div>
    </section>

    <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-sm text-slate-500 sm:px-8">
      <span>© 2026 Pixora</span>
      <span>Built for the moments that matter.</span>
    </footer>
    </main>
  );
};
