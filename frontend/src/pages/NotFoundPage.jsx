import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 overflow-hidden rounded-[2.5rem] border border-slate-800/80 bg-slate-950/95 p-6 sm:p-14 text-center shadow-[0_40px_120px_-40px_rgba(15,23,42,0.9)]">
    <div className="rounded-full bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.35em] text-indigo-200 shadow-inner shadow-slate-950/20">Page not found</div>
    <h1 className="text-6xl font-extrabold text-white">404</h1>
    <p className="max-w-xl text-slate-300">The page you were looking for doesn’t exist. Return to the lobby and continue playing.</p>
    <Link to="/" className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110">
      Return Home
    </Link>
  </div>
);

export default NotFoundPage;
