import { trpc } from "@/lib/trpc";
import { AlertCircle, Archive, CheckCircle2, Cloud, Download, File, FileImage, FileText, HardDrive, LogOut, Search, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

type AuthMode = "login" | "signup";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-[#3156D8]" />;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return <Archive className="h-5 w-5 text-[#D27A3B]" />;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return <FileText className="h-5 w-5 text-[#DF5B5B]" />;
  return <File className="h-5 w-5 text-[#3156D8]" />;
}

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const authUtils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await authUtils.auth.me.invalidate();
      toast.success("Welcome back to your file shelf.");
    },
    onError: error => toast.error(error.message),
  });
  const signup = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      await authUtils.auth.me.invalidate();
      toast.success("Account created. Your private shelf is ready.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "login") login.mutate({ email, password });
    else signup.mutate({ name, email, password });
  };

  const pending = login.isPending || signup.isPending;
  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#17213A]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 lg:px-10">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#DEE3F0] bg-white shadow-[0_24px_80px_rgba(39,58,111,0.12)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden bg-[#17213A] p-8 text-white sm:p-12 lg:p-16">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[42px] border-[#3156D8]/35" />
            <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border-[42px] border-[#65D2BB]/20" />
            <div className="relative flex h-full flex-col justify-between gap-20">
              <div>
                <div className="mb-12 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#3156D8] shadow-lg shadow-[#3156D8]/30"><Cloud className="h-5 w-5" /></span><span className="text-lg font-semibold tracking-tight">Cloud Files</span></div>
                <p className="mb-5 max-w-md text-sm font-medium uppercase tracking-[0.22em] text-[#9FAAC5]">Your private file shelf</p>
                <h1 className="max-w-lg text-4xl font-semibold leading-[1.06] tracking-[-0.04em] sm:text-5xl">Upload once.<br /><span className="text-[#65D2BB]">Find it fast.</span></h1>
                <p className="mt-7 max-w-md text-base leading-7 text-[#C8D0E2]">A calm, secure home for the files you reach for every day. Direct-to-storage uploads keep the path private and fast.</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-[#C8D0E2]"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><ShieldCheck className="h-4 w-4 text-[#65D2BB]" /> Private by design</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><UploadCloud className="h-4 w-4 text-[#9FB5FF]" /> 50 MB per file</span></div>
            </div>
          </section>
          <section className="p-7 sm:p-12 lg:p-16">
            <div className="mx-auto max-w-sm">
              <div className="mb-9"><p className="mb-2 text-sm font-medium text-[#3156D8]">{mode === "login" ? "Good to see you" : "Make a private shelf"}</p><h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#17213A]">{mode === "login" ? "Sign in to Cloud Files" : "Create your account"}</h2><p className="mt-3 text-sm leading-6 text-[#6F7890]">{mode === "login" ? "Your files are waiting where you left them." : "Start with a name, email, and password."}</p></div>
              <form className="space-y-4" onSubmit={submit}>
                {mode === "signup" && <label className="block"><span className="mb-2 block text-sm font-medium text-[#39435D]">Your name</span><input value={name} onChange={event => setName(event.target.value)} className="field" placeholder="Avery Morgan" autoComplete="name" required /></label>}
                <label className="block"><span className="mb-2 block text-sm font-medium text-[#39435D]">Email</span><input value={email} onChange={event => setEmail(event.target.value)} className="field" placeholder="you@example.com" type="email" autoComplete="email" required /></label>
                <label className="block"><span className="mb-2 block text-sm font-medium text-[#39435D]">Password</span><input value={password} onChange={event => setPassword(event.target.value)} className="field" placeholder="At least 8 characters" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
                <button disabled={pending} className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-[#3156D8] text-sm font-semibold text-white shadow-lg shadow-[#3156D8]/20 transition hover:bg-[#2748BB] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Opening your shelf…" : mode === "login" ? "Sign in" : "Create account"}</button>
              </form>
              <div className="mt-8 border-t border-[#E5E8F0] pt-6 text-center text-sm text-[#6F7890]">{mode === "login" ? "New to Cloud Files?" : "Already have an account?"} <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-semibold text-[#3156D8] hover:underline">{mode === "login" ? "Create an account" : "Sign in instead"}</button></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function uploadWithProgress(url: string, file: globalThis.File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Storage rejected the upload."));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

function Dashboard({ user }: { user: { name: string | null; email: string | null } }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "name">("date");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const authUtils = trpc.useUtils();
  const filesQuery = trpc.files.list.useQuery({ search, sort });
  const createUpload = trpc.files.createUpload.useMutation();
  const completeUpload = trpc.files.completeUpload.useMutation();
  const downloadUrl = trpc.files.downloadUrl.useMutation();
  const deleteFile = trpc.files.delete.useMutation({ onSuccess: () => { filesQuery.refetch(); toast.success("File removed from your shelf."); }, onError: error => toast.error(error.message) });
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { await authUtils.auth.me.invalidate(); toast.success("You have been signed out."); } });

  const handleFiles = async (fileList: FileList | File[]) => {
    const file = fileList[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error("That file is too large. Choose a file up to 50 MB."); return; }
    setUploadProgress(0);
    try {
      const pending = await createUpload.mutateAsync({ fileName: file.name, size: file.size, mimeType: file.type || "application/octet-stream" });
      await uploadWithProgress(pending.uploadUrl, file, setUploadProgress);
      await completeUpload.mutateAsync({ fileId: pending.fileId, storageKey: pending.storageKey });
      await filesQuery.refetch();
      toast.success(`${file.name} is ready in your shelf.`);
    } catch (error: any) {
      toast.error(error?.message || "Upload failed. Please try again.");
    } finally {
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const usedBytes = filesQuery.data?.usedBytes || 0;
  const files = filesQuery.data?.files || [];
  const sessionExpired = filesQuery.error?.data?.code === "UNAUTHORIZED";

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#17213A]">
      <header className="border-b border-[#E2E6F0] bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#3156D8] text-white shadow-lg shadow-[#3156D8]/20"><Cloud className="h-5 w-5" /></span><div><p className="text-base font-semibold tracking-tight">Cloud Files</p><p className="text-xs text-[#7B849B]">Private file shelf</p></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-[#39435D]">{user.name || "Your shelf"}</p><p className="text-xs text-[#8991A4]">{user.email}</p></div><button onClick={() => logout.mutate()} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E2E6F0] text-[#667089] transition hover:border-[#C5CDE0] hover:bg-[#F7F8FC]" title="Sign out"><LogOut className="h-4 w-4" /></button></div></div></header>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        {sessionExpired && <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-sm text-[#A43D3D]"><AlertCircle className="h-4 w-4" /> Your session expired. Please sign in again.</div>}
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-[#3156D8]">Workspace</p><h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#17213A]">Your files, in one quiet place.</h1><p className="mt-3 text-base text-[#737D95]">Upload a file or find something you already saved.</p></div><button onClick={() => inputRef.current?.click()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3156D8] px-5 text-sm font-semibold text-white shadow-lg shadow-[#3156D8]/20 transition hover:bg-[#2748BB]"><UploadCloud className="h-4 w-4" /> Upload file</button></div>
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <section onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }} className="relative overflow-hidden rounded-[1.5rem] border border-dashed border-[#B9C4E1] bg-[#F5F7FF] p-7 sm:p-9"><div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#3156D8]/[0.06]" /><div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[#3156D8] shadow-sm"><UploadCloud className="h-6 w-6" /></div><div><h2 className="text-lg font-semibold text-[#25304A]">Drop files here to upload</h2><p className="mt-1 text-sm leading-6 text-[#737D95]">Images, PDFs, documents, and ZIPs up to 50 MB. Files go directly to private storage.</p><button onClick={() => inputRef.current?.click()} className="mt-3 text-sm font-semibold text-[#3156D8] hover:underline">Choose from your device</button></div></div>{uploadProgress !== null && <div className="relative mt-7"><div className="mb-2 flex items-center justify-between text-xs font-medium text-[#5D6882]"><span>{uploadProgress < 100 ? "Uploading securely…" : "Finalizing file…"}</span><span>{uploadProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#3156D8] transition-all duration-200" style={{ width: `${uploadProgress}%` }} /></div></div>}<input ref={inputRef} type="file" className="hidden" onChange={event => { if (event.target.files) void handleFiles(event.target.files); }} /></section>
          <aside className="rounded-[1.5rem] border border-[#E2E6F0] bg-white p-6 shadow-[0_10px_30px_rgba(39,58,111,0.04)]"><div className="mb-5 flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF8F5] text-[#218F7E]"><HardDrive className="h-5 w-5" /></span><span className="rounded-full bg-[#EAF8F5] px-2.5 py-1 text-xs font-semibold text-[#218F7E]">Private</span></div><p className="text-sm font-medium text-[#7C869C]">Storage used</p><p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#17213A]">{formatBytes(usedBytes)}</p><div className="mt-5 border-t border-[#EEF0F5] pt-4 text-sm text-[#7C869C]"><span className="font-semibold text-[#39435D]">{files.length}</span> {files.length === 1 ? "file" : "files"} in your shelf</div></aside>
        </div>
        <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#E2E6F0] bg-white shadow-[0_10px_30px_rgba(39,58,111,0.04)]"><div className="flex flex-col gap-4 border-b border-[#E9ECF3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-lg font-semibold text-[#25304A]">File register</h2><p className="mt-1 text-sm text-[#8991A4]">Only you can see these files.</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA3B6]" /><input value={search} onChange={event => setSearch(event.target.value)} className="field h-10 w-full pl-9 sm:w-56" placeholder="Search files" /></label><select value={sort} onChange={event => setSort(event.target.value as "date" | "name")} className="field h-10 sm:w-40"><option value="date">Newest first</option><option value="name">Name A–Z</option></select></div></div>
          {filesQuery.isLoading ? <div className="space-y-3 p-6"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : files.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F2F4FA] text-[#8691A8]"><File className="h-6 w-6" /></div><h3 className="mt-5 text-base font-semibold text-[#39435D]">{search ? "No matching files" : "Your shelf is empty"}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8991A4]">{search ? "Try a different name or type." : "Drop your first file above and it will appear here."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#FBFCFE] text-xs font-semibold uppercase tracking-[0.12em] text-[#929BAE]"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Size</th><th className="px-6 py-4">Uploaded</th><th className="px-6 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#EEF0F5]">{files.map(file => <tr key={file.id} className="group transition hover:bg-[#FBFCFE]"><td className="px-6 py-4"><div className="flex items-center gap-3">{fileIcon(file.mimeType)}<span className="max-w-[260px] truncate text-sm font-semibold text-[#39435D]" title={file.fileName}>{file.fileName}</span></div></td><td className="px-6 py-4 text-sm text-[#7B849B]">{file.mimeType.split("/").pop() || "file"}</td><td className="px-6 py-4 text-sm text-[#7B849B]">{formatBytes(file.size)}</td><td className="px-6 py-4 text-sm text-[#7B849B]">{formatDate(file.uploadedAt)}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={async () => { try { const result = await downloadUrl.mutateAsync({ fileId: file.id }); const link = document.createElement("a"); link.href = result.url; link.download = result.fileName; link.target = "_blank"; link.rel = "noreferrer"; document.body.appendChild(link); link.click(); link.remove(); } catch (error: any) { toast.error(error?.message || "Download failed."); } }} className="grid h-9 w-9 place-items-center rounded-lg border border-[#E2E6F0] text-[#667089] transition hover:border-[#B9C4E1] hover:bg-[#F5F7FF] hover:text-[#3156D8]" title="Download"><Download className="h-4 w-4" /></button><button onClick={() => { if (window.confirm(`Remove ${file.fileName} from your shelf?`)) deleteFile.mutate({ fileId: file.id }); }} className="grid h-9 w-9 place-items-center rounded-lg border border-[#E2E6F0] text-[#667089] transition hover:border-[#F0C8C8] hover:bg-[#FFF5F5] hover:text-[#C35252]" title="Delete"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
        </section>
        <p className="mt-5 flex items-center gap-2 text-xs text-[#929BAE]"><CheckCircle2 className="h-4 w-4 text-[#56B9A7]" /> Uploads use temporary signed URLs and never pass through the application server.</p>
      </div>
    </main>
  );
}

export default function Home() {
  const me = trpc.auth.me.useQuery();
  if (me.isLoading) return <div className="grid min-h-screen place-items-center bg-[#F7F8FC]"><div className="flex items-center gap-3 text-sm font-medium text-[#667089]"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#3156D8]" /> Loading your shelf…</div></div>;
  if (!me.data) return <AuthScreen />;
  return <Dashboard user={me.data} />;
}
