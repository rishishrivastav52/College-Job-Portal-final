import { type ReactNode } from 'react';
import { BriefcaseBusiness, Check, ChevronRight, CircleUserRound, FileText, LogOut, Search, Sparkles, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { Application, Job, User } from '@workspace/api-client-react';

export function Brand() {
  return <Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark"><span>CH</span></span><span>CampusHire</span></Link>;
}

export function AppShell({ children, user, onLogout }: { children: ReactNode; user?: User; onLogout?: () => void }) {
  const [location] = useLocation();
  const isCompany = user?.role === 'company';
  return <div className="app-shell noise">
    <header className="topbar">
      <Brand />
      {user && <nav className="nav-links" aria-label="Primary navigation">
        <Link href={isCompany ? '/company/dashboard' : '/jobs'} className={`nav-link ${location.startsWith(isCompany ? '/company' : '/jobs') ? 'active' : ''}`} data-testid="link-nav-home">{isCompany ? 'Overview' : 'Find roles'}</Link>
        {!isCompany && <Link href="/profile" className={`nav-link ${location === '/profile' ? 'active' : ''}`} data-testid="link-nav-profile">My profile</Link>}
      </nav>}
      <span className="topbar-spacer" />
      {user ? <div style={{display:'flex', alignItems:'center', gap:'.7rem'}}>
        <div className="avatar" data-testid="text-avatar">{(user.name || user.email).slice(0, 2).toUpperCase()}</div>
        <button className="btn btn-ghost" onClick={onLogout} data-testid="button-logout"><LogOut size={15} /> <span className="hide-mobile">Sign out</span></button>
      </div> : <Link href="/signup" className="btn btn-primary" data-testid="link-signup-top">Create account <ChevronRight size={15} /></Link>}
    </header>
    {children}
  </div>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title reveal" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'1rem', marginBottom:'2rem', flexWrap:'wrap'}}>
    <div>{eyebrow && <div className="eyebrow" style={{marginBottom:'.55rem'}}>{eyebrow}</div>}<h1 className="display" style={{fontSize:'clamp(2rem, 5vw, 3.35rem)', lineHeight:1.02, margin:0}}>{title}</h1>{description && <p className="muted" style={{fontSize:'1rem', maxWidth:'610px', margin:'.85rem 0 0', lineHeight:1.65}}>{description}</p>}</div>
    {action}
  </div>;
}

export function EmptyState({ title, description, icon = 'spark', action }: { title: string; description: string; icon?: 'spark' | 'file' | 'briefcase'; action?: ReactNode }) {
  const Icon = icon === 'file' ? FileText : icon === 'briefcase' ? BriefcaseBusiness : Sparkles;
  return <div className="empty-state"><div className="empty-mark"><Icon size={26} /></div><h3 className="display" style={{fontSize:'1.2rem', margin:'0 0 .45rem'}}>{title}</h3><p className="muted" style={{maxWidth:'360px', margin:'0 0 1.1rem', lineHeight:1.55}}>{description}</p>{action}</div>;
}

export function LoadingList({ count = 3 }: { count?: number }) {
  return <div className="loading-stack">{Array.from({length: count}).map((_, i) => <div className="card" style={{padding:'1.2rem', display:'grid', gap:'.8rem'}} key={i}><div className="skeleton" style={{height:18, width:'45%'}} /><div className="skeleton" style={{height:13, width:'72%'}} /><div className="skeleton" style={{height:36, width:'100%'}} /></div>)}</div>;
}

export function StatusPill({ status }: { status: Application['status'] }) {
  const labels: Record<Application['status'], string> = { pending:'Submitted', reviewed:'In review', interview:'Interview', rejected:'Closed' };
  return <span className={`pill ${status === 'interview' ? 'pill-coral' : status === 'reviewed' ? 'pill-primary' : ''}`} data-testid={`status-application-${status}`}>{status === 'interview' && <Check size={12} style={{marginRight:'.25rem'}} />}{labels[status]}</span>;
}

export function JobCard({ job, onSelect }: { job: Job; onSelect: (job: Job) => void }) {
  return <article className="card reveal" style={{padding:'1.2rem', cursor:'pointer', transition:'transform .2s, box-shadow .2s'}} onClick={() => onSelect(job)} onKeyDown={(event) => { if (event.key === 'Enter') onSelect(job); }} tabIndex={0} data-testid={`card-job-${job.id}`}>
    <div style={{display:'flex', alignItems:'flex-start', gap:'.85rem'}}>
      <div className="avatar" style={{width:42, height:42, borderRadius:12, background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}} data-testid={`text-company-initials-${job.id}`}>{job.companyInitials}</div>
      <div style={{minWidth:0, flex:1}}><div className="muted" style={{fontSize:'.78rem', fontWeight:700}}>{job.companyName}</div><h3 className="display" style={{fontSize:'1.08rem', margin:'.18rem 0 .55rem'}}>{job.title}</h3><div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}><span className="pill">{job.location}</span><span className="pill">{job.type}</span></div></div>
      <ChevronRight size={18} className="muted" />
    </div>
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.8rem', borderTop:'1px solid hsl(var(--border))', marginTop:'1rem', paddingTop:'.85rem', fontSize:'.78rem'}}><span className="muted">{job.salary || 'Compensation shared during process'}</span>{job.hasApplied ? <span className="pill pill-primary">Applied</span> : <span className="muted">{job.applicantsCount} applicants</span>}</div>
  </article>;
}

export function SearchBox({ value, onChange, placeholder = 'Search roles, companies, or skills' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div style={{position:'relative', flex:1, minWidth:220}}><Search size={17} className="muted" style={{position:'absolute', left:'.9rem', top:'50%', transform:'translateY(-50%)'}} /><input className="input" style={{paddingLeft:'2.6rem'}} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} data-testid="input-search-jobs" /></div>;
}

export function ApplyDialog({ job, onClose, onSubmit, pending }: { job: Job; onClose: () => void; onSubmit: (file: File) => void; pending: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="apply-title">
    <div className="modal-head"><div><div className="eyebrow">One good next step</div><h2 className="display" id="apply-title" style={{margin:'.35rem 0 .25rem', fontSize:'1.65rem'}}>Apply to {job.title}</h2><p className="muted" style={{margin:0}}>{job.companyName} · {job.location}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close application dialog" data-testid="button-close-apply"><X size={17} /></button></div>
    <div className="modal-body"><div style={{padding:'1rem', background:'hsl(var(--secondary))', borderRadius:'.8rem', marginBottom:'1rem'}}><strong style={{fontSize:'.85rem'}}>Your profile is the first impression.</strong><p className="muted" style={{fontSize:'.8rem', margin:'.35rem 0 0', lineHeight:1.5}}>Attach a PDF resume so the hiring team can see the whole picture.</p></div><label className="field"><span>Resume PDF</span><input className="input" type="file" accept="application/pdf,.pdf" data-testid="input-resume" onChange={(event) => { const file = event.target.files?.[0]; if (file) onSubmit(file); }} /></label>{pending && <p className="muted" style={{fontSize:'.8rem', marginBottom:0}}>Sending your application…</p>}</div>
  </section></div>;
}

export function ErrorState({ message = 'That page did not load as expected.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="card" style={{padding:'2rem', textAlign:'center'}}><div className="eyebrow">A small detour</div><h3 className="display" style={{fontSize:'1.3rem', margin:'.45rem 0'}}>We could not bring this in.</h3><p className="muted" style={{margin:'0 auto 1rem', maxWidth:420}}>{message}</p>{onRetry && <button className="btn btn-secondary" onClick={onRetry} data-testid="button-retry">Try again</button>}</div>;
}

export function ProfileAvatar({ name, large = false }: { name?: string; large?: boolean }) {
  return <div className="avatar" style={large ? {width:72, height:72, fontSize:'1.15rem', borderRadius:22} : undefined} data-testid="text-profile-avatar">{(name || 'CH').split(' ').map((part) => part[0]).join('').slice(0,2).toUpperCase()}</div>;
}

export function MobileCloseButton({ onClick }: { onClick: () => void }) {
  return <button className="icon-btn" onClick={onClick} aria-label="Close" data-testid="button-close"><X size={17} /></button>;
}

export function WelcomeMark() {
  return <div className="empty-mark" style={{width:72, height:72}}><CircleUserRound size={30} /></div>;
}