import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Eye, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";

interface PreviewProject {
  id: number;
  title: string;
  provider: string;
  artifactTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PreviewArtifact extends PreviewProject {
  artifactContent: string | null;
}

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: Array<{ id: Viewport; label: string; width: string }> = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "mobile", label: "Mobile", width: "375px" },
];

export default function AiPreviewPage() {
  const [projects, setProjects] = useState<PreviewProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PreviewArtifact | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingArtifact, setLoadingArtifact] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/studio/projects", { credentials: "include" })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load saved AI projects.");
        return response.json() as Promise<PreviewProject[]>;
      })
      .then(rows => {
        if (!active) return;
        const withArtifacts = rows.filter(project => project.artifactTitle);
        setProjects(withArtifacts);
        setSelectedId(current => current ?? withArtifacts[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setError("Saved AI previews could not be loaded. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setSelectedProject(null);
      return undefined;
    }
    let active = true;
    setLoadingArtifact(true);
    setError(null);
    fetch(`/api/studio/projects/${selectedId}`, { credentials: "include" })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load this AI preview.");
        return response.json() as Promise<PreviewArtifact>;
      })
      .then(project => {
        if (active) setSelectedProject(project);
      })
      .catch(() => {
        if (active) {
          setSelectedProject(null);
          setError("This AI preview could not be loaded. Try selecting it again.");
        }
      })
      .finally(() => {
        if (active) setLoadingArtifact(false);
      });
    return () => { active = false; };
  }, [selectedId]);

  const filteredProjects = projects.filter(project => {
    const query = search.trim().toLowerCase();
    return !query || `${project.title} ${project.artifactTitle ?? ""} ${project.provider}`.toLowerCase().includes(query);
  });
  const selectedViewport = VIEWPORTS.find(item => item.id === viewport)!;

  return (
    <div className="min-h-full px-4 py-6 md:px-7 md:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Studio</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-display font-bold text-white">
              <Eye className="h-5 w-5 text-cyan-200" /> AI Preview
            </h1>
            <p className="mt-1 text-sm text-white/45">Preview saved AI builds across desktop, tablet, and mobile sizes.</p>
          </div>
          <Link href="/studio" className="inline-flex h-9 items-center justify-center gap-2 border border-white/10 px-3 text-xs font-medium text-white/65 transition-colors hover:border-cyan-200/20 hover:text-white">
            <Sparkles className="h-3.5 w-3.5" /> Open Studio
          </Link>
        </header>

        <div className="grid min-h-[65vh] gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="flex min-h-[240px] flex-col border border-white/[0.08] bg-black/20 lg:min-h-0">
            <div className="border-b border-white/[0.07] p-3">
              <label className="flex h-9 items-center gap-2 border border-white/[0.08] px-2.5 text-white/35 focus-within:border-cyan-200/30">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Find a preview"
                  className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/25"
                  aria-label="Find a saved AI preview"
                />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingList ? (
                <div className="flex min-h-32 items-center justify-center text-white/35"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                  <Eye className="h-7 w-7 text-white/20" />
                  <p className="mt-3 text-sm font-medium text-white/65">{projects.length ? "No matching previews" : "No saved previews yet"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/35">{projects.length ? "Try a different search." : "Build an artifact in Studio and save the project to see it here."}</p>
                  {!projects.length && <Link href="/studio" className="mt-4 text-xs font-medium text-cyan-100 hover:text-white">Go to Studio</Link>}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredProjects.map(project => {
                    const active = project.id === selectedId;
                    return (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(project.id)}
                          aria-current={active ? "page" : undefined}
                          className={`w-full border-l-2 px-3 py-3 text-left transition-colors ${active ? "border-cyan-200 bg-cyan-200/[0.06]" : "border-transparent hover:bg-white/[0.04]"}`}
                        >
                          <span className="block truncate text-xs font-medium text-white/80">{project.artifactTitle}</span>
                          <span className="mt-1 block truncate text-[11px] text-white/40">{project.title}</span>
                          <span className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-wider text-white/30">
                            <span>{project.provider}</span>
                            <span>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(project.updatedAt))}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section className="flex min-h-[60vh] min-w-0 flex-col overflow-hidden border border-white/[0.08] bg-black/25 lg:min-h-0" aria-label="AI project preview">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white/80">{selectedProject?.artifactTitle ?? "Preview"}</p>
                {selectedProject && <p className="truncate text-[10px] text-white/35">{selectedProject.title}</p>}
              </div>
              <div className="flex items-center gap-1">
                <div className="flex border border-white/[0.08]" aria-label="Preview size">
                  {VIEWPORTS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setViewport(item.id)}
                      aria-pressed={viewport === item.id}
                      className={`h-7 px-2 text-[10px] ${viewport === item.id ? "bg-cyan-200/10 text-cyan-100" : "text-white/40 hover:text-white/75"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <button type="button" title="Refresh preview" aria-label="Refresh preview" onClick={() => setRefreshKey(value => value + 1)} disabled={!selectedProject?.artifactContent} className="grid h-8 w-8 place-items-center text-white/40 hover:bg-white/[0.05] hover:text-white disabled:opacity-25">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {selectedProject && <Link href="/studio" title="Open Studio" aria-label="Open Studio" className="grid h-8 w-8 place-items-center text-white/40 hover:bg-white/[0.05] hover:text-white"><ExternalLink className="h-3.5 w-3.5" /></Link>}
              </div>
            </div>
            <div className="flex flex-1 items-stretch justify-center overflow-auto bg-[hsl(0_0%_3%)] p-2 sm:p-4">
              {loadingArtifact ? (
                <div className="flex flex-col items-center justify-center gap-2 text-xs text-white/40"><Loader2 className="h-4 w-4 animate-spin" />Loading preview</div>
              ) : error ? (
                <div className="m-auto max-w-sm text-center text-sm text-rose-100/80" role="alert">{error}</div>
              ) : selectedProject?.artifactContent ? (
                <div className="h-[62vh] min-h-[360px] max-h-[900px] shrink-0 overflow-hidden border border-white/10 bg-white shadow-2xl" style={{ width: selectedViewport.width, maxWidth: "100%" }}>
                  <iframe
                    key={`${selectedProject.id}-${refreshKey}-${viewport}`}
                    title={`${selectedProject.artifactTitle ?? "AI build"} preview`}
                    srcDoc={selectedProject.artifactContent}
                    sandbox="allow-scripts allow-forms"
                    referrerPolicy="no-referrer"
                    className="h-full w-full border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="m-auto max-w-sm text-center">
                  <Eye className="mx-auto h-8 w-8 text-white/20" />
                  <p className="mt-3 text-sm text-white/60">Select a saved AI build to preview it.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}