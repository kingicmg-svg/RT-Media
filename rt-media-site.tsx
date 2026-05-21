import { useState, useEffect, useRef } from "react";

/* ── Scroll reveal hook ─────────────────────────────────────────────────── */
function useInView(t = 0.1) {
  const ref = useRef(null);
  const [v, sv] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) sv(true); }, { threshold: t });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [t]);
  return [ref, v];
}

/* ── VIDEO CONFIG — swap in your own storage URLs here ─────────────────── */
const VIDEOS = {
  showreel: "./Web Reel.mov",   // e.g. "https://your-cdn.com/rt-showreel.mp4"
  work: [
    { id:1, src:"", poster:"", title:"ESCO — Live From Iron City", cat:"Music Video"  },
    { id:2, src:"", poster:"", title:"Northbound — Brand Film",    cat:"Commercial"   },
    { id:3, src:"", poster:"", title:"Caano — Story Sessions",     cat:"Music Video"  },
    { id:4, src:"", poster:"", title:"Summit — Launch Campaign",   cat:"Commercial"   },
    { id:5, src:"", poster:"", title:"Iron City — Movement",       cat:"Music Video"  },
    { id:6, src:"", poster:"", title:"Studio 905 — Corporate",     cat:"Commercial"   },
  ],
  studio: [
    { src:"", poster:"", label:"CYC Wall — Music Video"   },
    { src:"", poster:"", label:"CYC Wall — Brand Shoot"   },
    { src:"", poster:"", label:"CYC Wall — Campaign"      },
  ],
};

/* ── Logo ───────────────────────────────────────────────────────────────── */
const LOGO_SRC = "./RT MEDIA_animate 3.PNG";

/* ── Design constants ───────────────────────────────────────────────────── */
const BLOBS = [
  /* 1 — wide sweep left */   "62% 38% 46% 54% / 60% 44% 56% 40%",
  /* 2 — tall lean right */   "40% 60% 65% 35% / 55% 65% 35% 45%",
  /* 3 — heavy top-left */    "75% 25% 35% 65% / 65% 35% 55% 45%",
  /* 4 — mushroom cap */      "50% 50% 25% 75% / 70% 30% 65% 35%",
  /* 5 — flowing drip */      "35% 65% 70% 30% / 30% 70% 40% 60%",
  /* 6 — rhombus tilt */      "20% 80% 80% 20% / 55% 45% 55% 45%",
  /* 7 — kidney bean */       "45% 55% 55% 45% / 68% 32% 68% 32%",
  /* 8 — left-pinch */        "80% 20% 50% 50% / 45% 55% 45% 55%",
  /* 9 — organic pebble */    "55% 45% 60% 40% / 40% 60% 50% 50%",
  /* 10 — diagonal slash */   "30% 70% 60% 40% / 60% 40% 30% 70%",
  /* 11 — inflated wedge */   "70% 30% 45% 55% / 55% 45% 70% 30%",
  /* 12 — teardrop */         "65% 35% 65% 35% / 35% 65% 35% 65%",
];
const GRADS = [
  "linear-gradient(140deg,#FF7835,#FF3D6B)",
  "linear-gradient(140deg,#7B2FBE,#D91E8C)",
  "linear-gradient(140deg,#FF3D6B,#7B2FBE)",
  "linear-gradient(140deg,#D91E8C,#FF7835)",
  "linear-gradient(140deg,#FF7835,#7B2FBE)",
];
const SERVICES_DATA = [
  { title:"Music Videos",        desc:"Artist-first storytelling. Cinematic visuals built to amplify the record.",  gi:0, soon:false },
  { title:"Commercial & Brand",  desc:"High-impact campaigns that build brand equity and move audiences.",           gi:1, soon:false },
  { title:"Full Production",     desc:"End-to-end production. Strategy, shoot, and delivery under one roof.",       gi:2, soon:false },
  { title:"Docs & Short Film",   desc:"Long-form storytelling is next.",                                            gi:3, soon:true  },
];
const DURATIONS = [
  { key:"2hr", label:"2 Hours",   sub:"Minimum booking",       price:"TBD" },
  { key:"4hr", label:"Half Day",  sub:"4 hours",               price:"TBD" },
  { key:"8hr", label:"Full Day",  sub:"8 hours · best value",  price:"TBD" },
];
const CREW = ["Videographer / DP","Director","Production Assistant","Lighting Tech","Hair & Makeup"];

/* ── Global CSS ─────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#0D0D0D;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  a{text-decoration:none;color:inherit}
  :root{--o:#FF7835;--p:#FF3D6B;--pu:#7B2FBE;--m:#D91E8C;--ink:#0D0D0D}

  @keyframes splashIn{0%{opacity:0;transform:scale(.12) rotate(-14deg)}65%{opacity:1;transform:scale(1.06) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}

  .rv{opacity:0;transform:translateY(24px);transition:opacity .62s ease,transform .62s ease}
  .rv.v{opacity:1;transform:translateY(0)}
  .rs{opacity:0;transform:scale(.84);transition:opacity .55s ease,transform .55s cubic-bezier(.34,1.56,.64,1)}
  .rs.v{opacity:1;transform:scale(1)}

  .blob{transition:border-radius .7s ease,transform .35s ease,box-shadow .35s ease}
  .blob:hover{transform:scale(1.025);box-shadow:0 28px 64px rgba(0,0,0,.18)}

  nav{position:fixed;inset:0 0 auto;z-index:200;padding:22px 56px;display:flex;align-items:center;justify-content:space-between;transition:all .32s}
  nav.sc{background:rgba(255,255,255,.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 1px 0 rgba(0,0,0,.07)}
  .nl{font-size:13.5px;font-weight:500;letter-spacing:.02em;color:rgba(255,255,255,.68);transition:color .2s;cursor:pointer}
  nav.sc .nl{color:#555}
  .nl:hover{color:var(--p)!important}
  .nbtn{background:linear-gradient(135deg,var(--p),var(--o));border:none;border-radius:100px;padding:10px 26px;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:600;color:#fff;cursor:pointer;transition:opacity .2s,transform .2s;letter-spacing:.01em}
  .nbtn:hover{opacity:.83;transform:translateY(-1px)}

  .sec{padding:108px 56px}
  .sl{font-size:10px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;color:var(--p);margin-bottom:14px}
  .sl.lt{color:var(--o)}
  .sh{font-family:'Bebas Neue',sans-serif;font-size:clamp(54px,5.5vw,86px);letter-spacing:.01em;line-height:.93;color:#0D0D0D}
  .sh.lt{color:#fff}

  .chip{padding:8px 22px;border-radius:100px;border:1.5px solid #E0E0E0;background:transparent;color:#666;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
  .chip.on{background:#0D0D0D;color:#fff;border-color:#0D0D0D}

  .svc{background:#fff;border-radius:22px;padding:40px;border:1px solid #EBEBEB;transition:transform .3s,box-shadow .3s;overflow:hidden;position:relative}
  .svc:hover{transform:translateY(-5px);box-shadow:0 24px 52px rgba(0,0,0,.07)}

  .ri{font-family:'DM Sans',sans-serif;font-size:14.5px;border:1.5px solid #EAEAEA;border-radius:10px;padding:14px 16px;outline:none;width:100%;background:#fff;transition:border-color .2s;color:#0D0D0D}
  .ri:focus{border-color:var(--p)}
  textarea.ri{resize:vertical}
  select.ri{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}

  .bp{background:linear-gradient(135deg,var(--p),var(--o));color:#fff;border:none;border-radius:100px;padding:16px 40px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .2s,transform .2s;letter-spacing:.01em}
  .bp:hover{opacity:.83;transform:translateY(-2px)}
  .bs{background:transparent;color:rgba(255,255,255,.75);border:1.5px solid rgba(255,255,255,.28);border-radius:100px;padding:14px 34px;font-family:'DM Sans',sans-serif;font-size:15px;cursor:pointer;transition:all .2s}
  .bs:hover{background:rgba(255,255,255,.09);color:#fff}

  .tr{display:flex;gap:4px;background:#F2F2F0;border-radius:12px;padding:4px;width:fit-content;margin-bottom:52px}
  .tb{padding:12px 30px;border-radius:9px;border:none;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;background:transparent;color:#888}
  .tb.on{background:#fff;color:#0D0D0D;box-shadow:0 1px 6px rgba(0,0,0,.09)}

  .dc{padding:26px;border-radius:16px;border:2px solid #E8E8E8;cursor:pointer;transition:all .2s;text-align:left}
  .dc.on{border-color:var(--p);background:#FFF5F7}
  .dc:hover:not(.on){border-color:#ccc}

  .cp{padding:10px 20px;border-radius:100px;border:1.5px solid #E8E8E8;background:#fff;color:#555;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
  .cp.on{border-color:var(--p);background:#FFF5F7;color:var(--p)}

  .play{width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.22);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;transition:transform .2s,background .2s}
  .play:hover{transform:scale(1.14);background:rgba(255,255,255,.34)}
  .tri{width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:16px solid rgba(255,255,255,.9);margin-left:4px}

  .cat-tag{padding:4px 14px;border-radius:100px;background:rgba(255,255,255,.18);backdrop-filter:blur(6px);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#fff}
  .hero-stack>*{opacity:0;animation:fadeUp .72s ease forwards}
  .hero-stack>*:nth-child(1){animation-delay:.22s}
  .hero-stack>*:nth-child(2){animation-delay:.44s}
  .hero-stack>*:nth-child(3){animation-delay:.64s}
  .hero-stack>*:nth-child(4){animation-delay:.84s}

  @media(max-width:768px){
    nav{padding:16px 20px}
    .nav-links{display:none}
    .sec{padding:80px 20px}
    .sh{font-size:48px}
    .work-grid{grid-template-columns:1fr!important}
    .svc-grid{grid-template-columns:1fr!important}
    .dur-grid{grid-template-columns:1fr!important}
    .form-row{grid-template-columns:1fr!important}
    .studio-layout{flex-direction:column!important}
    .studio-side{flex-direction:row!important;flex-wrap:wrap}
    .cta-cards{grid-template-columns:1fr!important}
    .book-foot{flex-direction:column!important;gap:24px!important}
  }
`;

/* ── Play button ────────────────────────────────────────────────────────── */
const PlayBtn = () => (
  <div className="play"><div className="tri"/></div>
);

/* ── Blob thumbnail ─────────────────────────────────────────────────────── */
function BlobThumb({ grad, br, height = 300, src, poster, label, catTag, children }) {
  return (
    <div className="blob" style={{ borderRadius: br, background: grad, height, overflow:"hidden", position:"relative", cursor:"pointer" }}>
      {src
        ? <video src={src} poster={poster} muted loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
        : null
      }
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
        <PlayBtn/>
        {label && <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,.65)",fontWeight:300}}>{label}</span>}
      </div>
      {catTag && (
        <div style={{position:"absolute",top:18,left:18}}>
          <span className="cat-tag">{catTag}</span>
        </div>
      )}
      {children}
    </div>
  );
}

/* ══ WORK SECTION ═══════════════════════════════════════════════════════════ */
function WorkSection({ filter, setFilter, items }) {
  const [ref, inView] = useInView(0.1);
  return (
    <section id="work" className="sec" ref={ref} style={{background:"#fff"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <p className="sl">Selected Work</p>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:24,marginBottom:64}}>
          <h2 className="sh">The Work</h2>
          <div style={{display:"flex",gap:8}}>
            {["All","Music Video","Commercial"].map(f=>(
              <button key={f} className={`chip${filter===f?" on":""}`} onClick={()=>setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        <div className="work-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:36}}>
          {items.map((item,i)=>(
            <div key={item.id} className={`rs${inView?" v":""}`} style={{transitionDelay:`${i*.09}s`}}>
              <BlobThumb
                grad={GRADS[i%5]} br={BLOBS[i%5]}
                height={310} src={item.src} poster={item.poster}
                catTag={item.cat}
              />
              <div style={{marginTop:20,paddingLeft:2}}>
                <h3 style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:".04em",color:"#0D0D0D"}}>{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══ SERVICES SECTION ════════════════════════════════════════════════════════ */
function ServicesSection() {
  const [ref, inView] = useInView(0.1);
  return (
    <section id="services" className="sec" ref={ref} style={{background:"#F7F6F4"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <p className="sl">What We Do</p>
        <h2 className="sh" style={{marginBottom:64}}>Services</h2>
        <div className="svc-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:22}}>
          {SERVICES_DATA.map((s,i)=>(
            <div key={s.title} className={`svc rv${inView?" v":""}`} style={{transitionDelay:`${i*.1}s`,opacity:s.soon?.65:1}}>
              <div style={{width:38,height:4,borderRadius:4,background:GRADS[s.gi],marginBottom:28}}/>
              <h3 style={{fontFamily:"'Bebas Neue'",fontSize:26,letterSpacing:".04em",marginBottom:14,color:"#0D0D0D"}}>{s.title}</h3>
              <p style={{fontFamily:"'DM Sans'",fontSize:14.5,fontWeight:300,lineHeight:1.68,color:"#555"}}>{s.desc}</p>
              {s.soon&&(
                <span style={{position:"absolute",top:20,right:20,background:"#0D0D0D",color:"#fff",borderRadius:100,padding:"4px 12px",fontFamily:"'DM Sans'",fontSize:10,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase"}}>
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══ STUDIO SECTION ══════════════════════════════════════════════════════════ */
function StudioSection({ setTab }) {
  const [ref, inView] = useInView(0.08);
  return (
    <section id="studio" className="sec" ref={ref} style={{background:"#0D0D0D"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <p className="sl lt">The Studio</p>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:24,marginBottom:64}}>
          <h2 className="sh lt">CYC Wall &<br/>In-Studio</h2>
          <p style={{fontFamily:"'DM Sans'",fontSize:15.5,fontWeight:300,color:"rgba(255,255,255,.45)",maxWidth:380,lineHeight:1.72}}>
            A fully equipped infinity wall built for music videos, campaigns, and everything in between. Space + full lighting setup included.
          </p>
        </div>

        {/* Studio showcase */}
        <div className="studio-layout" style={{display:"flex",gap:20,marginBottom:72,alignItems:"stretch"}}>
          {/* Feature left */}
          <div className={`rs${inView?" v":""}`} style={{flex:2,minWidth:200,transitionDelay:"0s"}}>
            <BlobThumb grad={GRADS[0]} br={BLOBS[0]} height={440}
              src={VIDEOS.studio[0]?.src} poster={VIDEOS.studio[0]?.poster}
              label={VIDEOS.studio[0]?.label}
            />
          </div>
          {/* Two stacked right */}
          <div className="studio-side" style={{flex:1,minWidth:180,display:"flex",flexDirection:"column",gap:20}}>
            {VIDEOS.studio.slice(1).map((v,i)=>(
              <div key={i} className={`rs${inView?" v":""}`} style={{flex:1,transitionDelay:`${(i+1)*.12}s`}}>
                <BlobThumb grad={GRADS[i+2]} br={BLOBS[i+2]} height={210}
                  src={v.src} poster={v.poster} label={v.label}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Two CTA cards */}
        <div className="cta-cards" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
          {[
            {title:"Rent the CYC Wall", desc:"Bring your own director, your own crew — we set the stage. Space + full lighting setup, 2-hour minimum.", cta:"Check Availability", grad:GRADS[0], tab:"cyc"},
            {title:"Book a Production", desc:"CYC wall + your choice of Round Table Media crew. Select exactly what you need, we handle the rest.", cta:"Start a Project", grad:GRADS[1], tab:"production"},
          ].map((c,i)=>(
            <a key={i} href="#book" onClick={()=>setTab(c.tab)}>
              <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:22,padding:42,transition:"background .2s",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.09)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"}
              >
                <div style={{width:36,height:4,borderRadius:4,background:c.grad,marginBottom:26}}/>
                <h3 style={{fontFamily:"'Bebas Neue'",fontSize:32,letterSpacing:".04em",color:"#fff",marginBottom:14}}>{c.title}</h3>
                <p style={{fontFamily:"'DM Sans'",fontSize:14.5,fontWeight:300,color:"rgba(255,255,255,.46)",lineHeight:1.72,marginBottom:32}}>{c.desc}</p>
                <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:500,background:c.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                  {c.cta} →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══ BOOK SECTION ════════════════════════════════════════════════════════════ */
function BookSection({ tab, setTab, dur, setDur, addons, toggleAddon, cyc, setCyc, proj, setProj, done, setDone }) {
  const [ref, inView] = useInView(0.05);

  return (
    <section id="book" className="sec" ref={ref} style={{background:"#fff"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <p className="sl">Book</p>
        <h2 className="sh" style={{marginBottom:48}}>Let's Work<br/>Together</h2>

        <div className="tr">
          {[{id:"cyc",label:"Rent the CYC Wall"},{id:"production",label:"Book a Production"}].map(t=>(
            <button key={t.id} className={`tb${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {done ? (
          <div style={{textAlign:"center",padding:"72px 0"}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#FF7835,#FF3D6B)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:28,color:"#fff"}}>✓</div>
            <h3 style={{fontFamily:"'Bebas Neue'",fontSize:36,letterSpacing:".04em",marginBottom:12}}>Request Received</h3>
            <p style={{fontFamily:"'DM Sans'",color:"#888",fontSize:15.5}}>We'll be in touch within 24 hours.</p>
            <button className="bp" style={{marginTop:32}} onClick={()=>setDone(false)}>Submit Another</button>
          </div>
        ) : tab==="cyc" ? (
          <CYCForm dur={dur} setDur={setDur} cyc={cyc} setCyc={setCyc} onSubmit={()=>setDone(true)}/>
        ) : (
          <ProductionForm addons={addons} toggleAddon={toggleAddon} proj={proj} setProj={setProj} onSubmit={()=>setDone(true)}/>
        )}
      </div>
    </section>
  );
}

/* ── CYC Wall Form ──────────────────────────────────────────────────────── */
function CYCForm({ dur, setDur, cyc, setCyc, onSubmit }) {
  return (
    <div>
      {/* Duration */}
      <p style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:".06em",marginBottom:22,color:"#0D0D0D"}}>SELECT DURATION</p>
      <div className="dur-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:14}}>
        {DURATIONS.map(d=>(
          <button key={d.key} className={`dc${dur===d.key?" on":""}`} onClick={()=>setDur(d.key)}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:".04em",color:"#0D0D0D",marginBottom:4}}>{d.label}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#888",marginBottom:14}}>{d.sub}</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:26,letterSpacing:".04em",background:"linear-gradient(135deg,#FF7835,#FF3D6B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{d.price}</div>
          </button>
        ))}
      </div>
      <div style={{background:"#F7F6F4",borderRadius:12,padding:"14px 20px",marginBottom:44}}>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555",lineHeight:1.6}}>
          <strong style={{color:"#0D0D0D"}}>Included:</strong> Infinity wall + full lighting setup · 2-hour minimum · Additional crew available on request
        </p>
      </div>

      {/* Contact */}
      <p style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:".06em",marginBottom:22,color:"#0D0D0D"}}>YOUR DETAILS</p>
      <div className="form-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <input className="ri" placeholder="Full Name" value={cyc.name} onChange={e=>setCyc({...cyc,name:e.target.value})}/>
        <input className="ri" placeholder="Email" type="email" value={cyc.email} onChange={e=>setCyc({...cyc,email:e.target.value})}/>
      </div>
      <div className="form-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:44}}>
        <input className="ri" placeholder="Phone (optional)" value={cyc.phone} onChange={e=>setCyc({...cyc,phone:e.target.value})}/>
        <input className="ri" type="date" value={cyc.date} onChange={e=>setCyc({...cyc,date:e.target.value})}/>
      </div>

      <button className="bp" style={{width:"100%",padding:18,fontSize:16}} onClick={onSubmit}>Send Booking Request</button>
      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",textAlign:"center",marginTop:12}}>We'll confirm availability and send a rate card within 24 hours.</p>
    </div>
  );
}

/* ── Production Form ────────────────────────────────────────────────────── */
function ProductionForm({ addons, toggleAddon, proj, setProj, onSubmit }) {
  return (
    <div>
      <div className="form-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <input className="ri" placeholder="Full Name" value={proj.name} onChange={e=>setProj({...proj,name:e.target.value})}/>
        <input className="ri" placeholder="Email" type="email" value={proj.email} onChange={e=>setProj({...proj,email:e.target.value})}/>
      </div>
      <div className="form-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:44}}>
        <input className="ri" placeholder="Phone (optional)" value={proj.phone} onChange={e=>setProj({...proj,phone:e.target.value})}/>
        <select className="ri" value={proj.service} onChange={e=>setProj({...proj,service:e.target.value})}>
          <option value="">Project Type</option>
          <option>Music Video</option>
          <option>Commercial / Brand</option>
          <option>Full Production Package</option>
        </select>
      </div>

      <p style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:".06em",marginBottom:8,color:"#0D0D0D"}}>CREW ADD-ONS</p>
      <p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#888",marginBottom:20}}>Optional — select what you need, rates on quote</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:40}}>
        {CREW.map(c=>(
          <button key={c} className={`cp${addons.includes(c)?" on":""}`} onClick={()=>toggleAddon(c)}>{c}</button>
        ))}
      </div>

      <textarea className="ri" rows={5} placeholder="Tell us about the project — concept, timeline, references, budget range. The more context, the better." value={proj.message} onChange={e=>setProj({...proj,message:e.target.value})} style={{marginBottom:40}}/>

      <button className="bp" style={{width:"100%",padding:18,fontSize:16}} onClick={onSubmit}>Send Project Inquiry</button>
      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",textAlign:"center",marginTop:12}}>We'll be in touch within 24 hours to discuss next steps.</p>
    </div>
  );
}

/* ══ FOOTER ══════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{background:"#0D0D0D",padding:"60px 56px"}}>
      <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:32}}>
        <div>
          <div style={{marginBottom:10}}>
            <img src={LOGO_SRC} alt="Round Table Media" style={{height:48,width:"auto",objectFit:"contain"}}/>
          </div>
          <p style={{fontFamily:"'DM Sans'",fontSize:13,color:"rgba(255,255,255,.3)",fontWeight:300}}>Round Table Media · Toronto, ON</p>
        </div>

        <div style={{display:"flex",gap:34,flexWrap:"wrap"}}>
          {["Work","Services","Studio","Book"].map(l=>(
            <a key={l} href={`#${l.toLowerCase()}`}
              style={{fontFamily:"'DM Sans'",fontSize:13,color:"rgba(255,255,255,.4)",transition:"color .2s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.4)"}
            >{l}</a>
          ))}
        </div>

        <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,.2)"}}>
          © {new Date().getFullYear()} Round Table Media
        </p>
      </div>
    </footer>
  );
}

/* ══ ROOT ════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [scrolled, setScrolled]   = useState(false);
  const [filter,   setFilter]     = useState("All");
  const [tab,      setTab]        = useState("cyc");
  const [dur,      setDur]        = useState("2hr");
  const [addons,   setAddons]     = useState([]);
  const [cyc,      setCyc]        = useState({ name:"", email:"", phone:"", date:"" });
  const [proj,     setProj]       = useState({ name:"", email:"", phone:"", service:"", message:"" });
  const [done,     setDone]       = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const toggleAddon = a => setAddons(p => p.includes(a) ? p.filter(x=>x!==a) : [...p,a]);
  const filtered = filter === "All" ? VIDEOS.work : VIDEOS.work.filter(w => w.cat === filter);

  return (
    <>
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className={scrolled ? "sc" : ""}>
        <a href="#hero" style={{display:"flex",alignItems:"center"}}>
          <img src={LOGO_SRC} alt="Round Table Media" style={{height:48,width:"auto",objectFit:"contain",filter:scrolled?"none":"drop-shadow(0 1px 6px rgba(0,0,0,.55))",transition:"filter .3s"}}/>
        </a>
        <div className="nav-links" style={{display:"flex",gap:36,alignItems:"center"}}>
          {["Work","Services","Studio","Book"].map(l=>(
            <a key={l} href={`#${l.toLowerCase()}`} className="nl">{l}</a>
          ))}
          <a href="#book"><button className="nbtn">Book Now</button></a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section id="hero" style={{minHeight:"100vh",padding:0,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"#0D0D0D"}}>
        {VIDEOS.showreel
          ? <video autoPlay muted loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.45}} src={VIDEOS.showreel}/>
          : <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#0D0D0D 0%,#1c0a2e 55%,#0d0808 100%)"}}/>
        }

        {/* Background blob shapes — paint splash aesthetic from logo */}
        {[
          {top:"-12%",left:"-6%",sz:540,g:"linear-gradient(135deg,#FF783522,#FF3D6B35)",b:BLOBS[0],d:0},
          {top:"40%", right:"-8%",sz:430,g:"linear-gradient(135deg,#7B2FBE28,#D91E8C1c)",b:BLOBS[1],d:.18},
          {bottom:"-15%",left:"20%",sz:390,g:"linear-gradient(135deg,#D91E8C18,#FF783520)",b:BLOBS[2],d:.34},
        ].map((x,i)=>(
          <div key={i} className="blob" style={{
            position:"absolute",width:x.sz,height:x.sz,
            top:x.top,left:x.left,right:x.right,bottom:x.bottom,
            background:x.g,borderRadius:x.b,pointerEvents:"none",
            animation:`splashIn .95s cubic-bezier(.34,1.56,.64,1) ${x.d}s forwards`,opacity:0,
          }}/>
        ))}

        {/* Hero text */}
        <div className="hero-stack" style={{position:"relative",zIndex:3,textAlign:"center",padding:"0 24px",maxWidth:980}}>
          <p style={{fontFamily:"'DM Sans'",fontSize:10.5,fontWeight:600,letterSpacing:".28em",textTransform:"uppercase",color:"#FF7835",marginBottom:28}}>Round Table Media — Toronto</p>
          <h1 style={{fontFamily:"'Bebas Neue'",fontSize:"clamp(68px,10.5vw,136px)",letterSpacing:".01em",lineHeight:.87,color:"#fff",marginBottom:34}}>
            We Make<br/>
            <span style={{background:"linear-gradient(135deg,#FF7835,#FF3D6B,#D91E8C)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>It Move.</span>
          </h1>
          <p style={{fontFamily:"'DM Sans'",fontSize:17,fontWeight:300,color:"rgba(255,255,255,.52)",maxWidth:460,margin:"0 auto 46px",lineHeight:1.66}}>
            Music videos. Brand campaigns. Full productions.<br/>Built in Toronto, made for everywhere.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <a href="#work"><button className="bp">See Our Work</button></a>
            <a href="#book"><button className="bs">Book a Session</button></a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{position:"absolute",bottom:38,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:10,zIndex:3}}>
          <p style={{fontFamily:"'DM Sans'",fontSize:9.5,letterSpacing:".2em",color:"rgba(255,255,255,.28)",textTransform:"uppercase"}}>Scroll</p>
          <div style={{width:1,height:52,background:"linear-gradient(#FF3D6B80,transparent)"}}/>
        </div>
      </section>

      {/* ── SECTIONS ────────────────────────────────────────────── */}
      <WorkSection filter={filter} setFilter={setFilter} items={filtered}/>
      <ServicesSection/>
      <StudioSection setTab={setTab}/>
      <BookSection
        tab={tab} setTab={setTab}
        dur={dur} setDur={setDur}
        addons={addons} toggleAddon={toggleAddon}
        cyc={cyc} setCyc={setCyc}
        proj={proj} setProj={setProj}
        done={done} setDone={setDone}
      />
      <Footer/>
    </>
  );
}
