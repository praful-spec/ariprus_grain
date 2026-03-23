// @ts-nocheck
import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";

const B = {
  blue:"#1d4ed8", teal:"#0891b2", green:"#059669", purple:"#7c3aed",
  orange:"#d97706", red:"#dc2626", amber:"#92400e", yellow:"#ca8a04",
  grey:"#f8fafc", border:"#e2e8f0", text:"#0f172a", sub:"#64748b", light:"#94a3b8",
};

// ATEX dust explosion risk levels
const ATEX_LEVELS = { safe:0, low:1, medium:2, high:3, critical:4 };

const EQUIPMENT = [
  {
    id:"SL-101", name:"Grain Silo A", type:"Grain Storage & Silo", location:"Storage Zone",
    icon:"🌾", color:B.amber, status:"running",
    kpis:{ capacity:"92%", moisture:"13.2%", temperature:"24C", co2:"380 ppm" },
    atexLevel:1, atexLabel:"LOW", dustConc:12, dustLimit:50,
    aiAlert:"Grain temperature nominal. Moisture 0.2% above optimal — AI recommends partial ventilation to prevent spoilage.",
    health:88, vibration:{ val:0.4, warn:2.0, crit:4.0, unit:"mm/s" },
    aiAction:"Monitor",
  },
  {
    id:"BE-201", name:"Bucket Elevator 1", type:"Bucket Elevator", location:"Elevator Tower",
    icon:"⬆️", color:B.orange, status:"warning",
    kpis:{ speed:"1.8 m/s", load:"78%", spillRate:"0.4%", throughput:"42 t/hr" },
    atexLevel:3, atexLabel:"HIGH", dustConc:68, dustLimit:50,
    aiAlert:"DUST ALERT: Concentration 68 g/m3 — above 50 g/m3 threshold. Bearing temperature rising. Dust suppression activated.",
    health:72, vibration:{ val:4.8, warn:4.0, crit:7.0, unit:"mm/s" },
    aiAction:"Action Required",
  },
  {
    id:"HM-301", name:"Hammer Mill 1", type:"Hammer Mill", location:"Milling Hall",
    icon:"⚙️", color:B.blue, status:"running",
    kpis:{ throughput:"28 t/hr", screenSize:"2.0 mm", motorLoad:"82%", particleSize:"450 micron" },
    atexLevel:2, atexLabel:"MEDIUM", dustConc:34, dustLimit:50,
    aiAlert:"Motor load 82% - within spec. Screen wear index 0.68 — replacement in 8 days. Vibration nominal.",
    health:81, vibration:{ val:3.2, warn:4.5, crit:7.0, unit:"mm/s" },
    aiAction:"Maintenance Due",
  },
  {
    id:"DC-401", name:"Dust Collector 1", type:"Dust Collection System", location:"Milling Hall",
    icon:"💨", color:B.purple, status:"warning",
    kpis:{ filterDP:"142 Pa", efficiency:"99.2%", dustLoad:"18 kg/hr", fanSpeed:"1,440 RPM" },
    atexLevel:4, atexLabel:"CRITICAL", dustConc:95, dustLimit:50,
    aiAlert:"CRITICAL: Dust concentration 95 g/m3 — near explosive limit. Filter pressure drop elevated. AI requesting immediate inspection.",
    health:61, vibration:{ val:2.1, warn:3.0, crit:5.0, unit:"mm/s" },
    aiAction:"IMMEDIATE",
  },
  {
    id:"DR-501", name:"Grain Dryer", type:"Dryer & Conditioning", location:"Processing Zone",
    icon:"🌡️", color:B.teal, status:"running",
    kpis:{ inletTemp:"140C", outletTemp:"68C", moisture:"in 18% / out 13%", throughput:"35 t/hr" },
    atexLevel:1, atexLabel:"LOW", dustConc:8, dustLimit:50,
    aiAlert:"Drying efficiency 94.1%. Outlet moisture 13.2% vs 13.0% target. AI adjusting residence time by 4 minutes.",
    health:91, vibration:{ val:1.2, warn:3.0, crit:5.0, unit:"mm/s" },
    aiAction:"Auto-adjusted",
  },
];

const ATEX_ZONES = [
  { zone:"Zone 0", desc:"Explosive atmosphere — continuous or long periods", color:"#7f1d1d", textColor:"#fff", example:"Inside silos, dust hoppers" },
  { zone:"Zone 1", desc:"Explosive atmosphere — likely during normal operation", color:B.red, textColor:"#fff", example:"Around bucket elevators" },
  { zone:"Zone 2", desc:"Explosive atmosphere — unlikely, only briefly", color:B.orange, textColor:"#fff", example:"Milling halls, conveyor areas" },
  { zone:"Zone 22",desc:"Dust cloud occasionally in normal operation",          color:B.yellow, textColor:"#0f172a", example:"Weighing, loading areas" },
];

const DUST_EVENTS = [
  { time:"10:42",id:"BE-201",event:"Dust concentration exceeded 50 g/m3 threshold",level:"HIGH",action:"Dust suppression activated. Operator alerted.",resolved:false },
  { time:"10:38",id:"DC-401",event:"Filter differential pressure 142 Pa — near 150 Pa limit",level:"CRITICAL",action:"Immediate inspection triggered. Bypass valve opened.",resolved:false },
  { time:"09:15",id:"HM-301",event:"Dust concentration spike to 58 g/m3 — transient",level:"MEDIUM",action:"AI identified feed rate surge. Feed rate reduced 8%.",resolved:true },
  { time:"08:44",id:"BE-201",event:"Bearing temp rise detected — 68C vs 55C baseline",level:"HIGH",action:"Lubrication alert issued. Maintenance dispatched.",resolved:true },
  { time:"Yesterday",id:"SL-101",event:"CO2 level rise in Silo A — hotspot risk",level:"MEDIUM",action:"Ventilation increased. Temperature probes checked.",resolved:true },
];

const genDustTrend = () => Array.from({length:24},(_,i)=>({
  hr:`${i}:00`,
  BE201: Math.max(5, Math.min(120, 35+Math.sin(i*0.6)*20+(i>18?30:0)+Math.random()*8)),
  DC401: Math.max(5, Math.min(130, 45+Math.sin(i*0.5)*25+(i>18?40:0)+Math.random()*10)),
  limit:50,
}));

const genVibTrend = () => Array.from({length:30},(_,i)=>({
  sample:`S${i+1}`,
  BE201: +(3.8+Math.sin(i*0.4)*0.8+(i>22?0.8:0)+Math.random()*0.3).toFixed(2),
  HM301: +(2.8+Math.cos(i*0.3)*0.6+Math.random()*0.4).toFixed(2),
  warn:4.0,
}));

const genMoistureTrend = () => Array.from({length:30},(_,i)=>({
  day:`D${i+1}`,
  inlet: +(17.5+Math.random()*1.5).toFixed(1),
  outlet: +(13.0+Math.random()*0.6-(i>20?0.3:0)).toFixed(1),
  target:13.0,
}));

const DUST_TREND = genDustTrend();
const VIB_TREND = genVibTrend();
const MOISTURE_TREND = genMoistureTrend();

const ATEXBadge = ({ level }) => {
  const cfg = { LOW:["#f0fdf4","#059669"], MEDIUM:["#fffbeb","#d97706"], HIGH:["#fff5f5","#dc2626"], CRITICAL:["#7f1d1d","#fff"] };
  const [bg,col] = cfg[level]||["#f8fafc","#94a3b8"];
  return <span style={{background:bg,color:col,border:`1px solid ${col}40`,borderRadius:4,padding:"2px 8px",fontSize:9,fontWeight:700,letterSpacing:0.8}}>ATEX {level}</span>;
};

const CT = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
      <div style={{color:"#64748b",fontWeight:600,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=>(<div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}</div>))}
    </div>
  );
};

function SignInScreen({ onSubmit }) {
  const [form, setForm] = useState({ name:"", company:"", email:"" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const validate = () => {
    const e = {};
    if(!form.name.trim()) e.name="Required";
    if(!form.company.trim()) e.company="Required";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email="Valid email required";
    return e;
  };
  const handleSubmit = async () => {
    const e = validate(); if(Object.keys(e).length){setErrors(e);return;}
    setSubmitting(true);
    try {
      await fetch("https://formspree.io/f/xqeywrry",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({name:form.name,company:form.company,email:form.email,_subject:`AriLinc Grain/Milling Sign-in: ${form.name} from ${form.company}`})});
    } catch(_){}
    onSubmit(form);
  };
  const inp = k => ({width:"100%",padding:"11px 14px",borderRadius:8,fontSize:14,border:`1.5px solid ${errors[k]?"#fca5a5":"rgba(255,255,255,0.25)"}`,outline:"none",fontFamily:"Inter,sans-serif",color:"#0f172a",background:"#fff",marginTop:5});
  const lbl = {fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.75)",letterSpacing:0.3};
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#78350f 0%,#b45309 45%,#d97706 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,background:"rgba(255,255,255,0.15)",borderRadius:16,marginBottom:16,border:"1px solid rgba(255,255,255,0.25)"}}>
            <span style={{fontSize:28}}>🌾</span>
          </div>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:28,fontWeight:800,color:"#fff",marginBottom:4}}>AriLinc</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Grain & Milling Intelligence · by AriPrus</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.8)"}}>ATEX Dust Safety · Predictive Maintenance · Process Control</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.12)",backdropFilter:"blur(20px)",borderRadius:20,padding:"32px",border:"1px solid rgba(255,255,255,0.2)",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:20,fontWeight:800,color:"#fff",marginBottom:4,textAlign:"center"}}>User Sign In</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",textAlign:"center",marginBottom:24}}>Access the Grain & Milling Intelligence Platform</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><label style={lbl}>Full Name *</label><input style={inp("name")} value={form.name} onChange={set("name")} placeholder="Jane Smith"/>{errors.name&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.name}</div>}</div>
            <div><label style={lbl}>Company *</label><input style={inp("company")} value={form.company} onChange={set("company")} placeholder="Grain Mill / Flour Factory"/>{errors.company&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.company}</div>}</div>
            <div><label style={lbl}>Work Email *</label><input type="email" style={inp("email")} value={form.email} onChange={set("email")} placeholder="you@company.com"/>{errors.email&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.email}</div>}</div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={{width:"100%",marginTop:28,padding:"14px",background:submitting?"rgba(255,255,255,0.15)":"#fff",color:submitting?"rgba(255,255,255,0.4)":"#92400e",border:"none",borderRadius:10,fontSize:15,fontWeight:800,cursor:submitting?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
            {submitting?"Launching...":"Launch Platform"}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:14}}>Secure · <a href="mailto:info@ariprus.com" style={{color:"rgba(255,255,255,0.7)",textDecoration:"none",fontWeight:600}}>info@ariprus.com</a></div>
        </div>
        <div style={{textAlign:"center",marginTop:18,fontSize:12,color:"rgba(255,255,255,0.3)"}}>2026 AriPrus · <a href="https://ariprus.com" style={{color:"rgba(255,255,255,0.5)",textDecoration:"none"}}>ariprus.com</a></div>
      </div>
    </div>
  );
}

export default function GrainMilling() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("equipment");
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date().toLocaleTimeString()),1000); return()=>clearInterval(t); },[]);

  useEffect(()=>{
    const el = document.createElement("style");
    el.textContent = [
      "*{box-sizing:border-box;margin:0;padding:0;}",
      ".card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);}",
      ".sec-btn{padding:12px 16px;border:none;background:none;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all 0.2s;white-space:nowrap;}",
      ".sec-btn:hover{color:#0f172a;background:#f1f5f9;}",
      ".g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}",
      ".g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}",
      ".g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}",
      ".hdr{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}",
      ".sec-bar{background:#fff;border-bottom:2px solid #e2e8f0;padding:0 24px;display:flex;overflow-x:auto;}",
      ".pp{padding:20px 24px 32px;}",
      ".fw{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;background:#fff;}",
      "@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}",
      "@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(1.1);}}",
      "@media(max-width:900px){.g3{grid-template-columns:repeat(2,1fr);}.g4{grid-template-columns:repeat(2,1fr);}.g2{grid-template-columns:1fr;}.pp{padding:14px 16px;}.hdr{padding:10px 14px;}.sec-bar{padding:0 12px;}}",
      "@media(max-width:600px){.g3{grid-template-columns:1fr;}.g4{grid-template-columns:repeat(2,1fr);}.g2{grid-template-columns:1fr;}.pp{padding:10px 12px;}.sec-btn{padding:10px 12px;font-size:12px;}.hdr{flex-direction:column;align-items:flex-start;}.fw{flex-direction:column;}}",
    ].join(" ");
    document.head.appendChild(el);
    return()=>{ document.head.removeChild(el); };
  },[]);

  if(!user) return <SignInScreen onSubmit={setUser}/>;

  const criticalCount = EQUIPMENT.filter(e=>e.atexLevel>=3).length;
  const warningCount = EQUIPMENT.filter(e=>e.status==="warning").length;

  const sections = [
    {key:"equipment", icon:"🏭", label:"Equipment Status"},
    {key:"atex",      icon:"💥", label:"ATEX Dust Safety"},
    {key:"maint",     icon:"🔧", label:"Predictive Maintenance"},
    {key:"process",   icon:"🌾", label:"Process Control"},
    {key:"analytics", icon:"📊", label:"Analytics"},
  ];

  const AMBER = "#b45309";

  return (
    <div style={{background:B.grey,minHeight:"100vh",color:B.text,fontFamily:"Inter,sans-serif"}}>
      <div className="hdr">
        <div style={{flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:AMBER}}>AriLinc <span style={{color:B.red}}>Grain</span> & Milling</div>
            {criticalCount>0&&<span style={{background:"#7f1d1d",color:"#fff",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,animation:"blink 1s infinite"}}>DUST CRITICAL</span>}
          </div>
          <div style={{fontSize:11,color:B.light,marginTop:2}}>Grain Milling Intelligence · ATEX Safety · Powered by AriPrus</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {criticalCount>0&&<div style={{background:"#7f1d1d",border:"1px solid #991b1b",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:"#fff",animation:"blink 1.5s infinite"}}>💥 {criticalCount} ATEX Critical</div>}
          {warningCount>0&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.orange}}>⚠ {warningCount} Warning</div>}
          <div style={{fontSize:12,color:B.light}}>{time}</div>
          <div style={{fontSize:12,color:B.light}}>👋 {user.name}</div>
          <button onClick={()=>setUser(null)} style={{fontSize:11,color:B.light,background:"none",border:`1px solid ${B.border}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>

      <div className="sec-bar">
        {sections.map(s=>(
          <button key={s.key} className="sec-btn"
            style={{color:section===s.key?AMBER:B.sub,borderBottom:`3px solid ${section===s.key?AMBER:"transparent"}`,fontWeight:section===s.key?800:600}}
            onClick={()=>setSection(s.key)}>{s.icon} {s.label}</button>
        ))}
      </div>

      <div className="pp">

        {section==="equipment" && (
          <div>
            {/* Critical ATEX banner */}
            <div style={{background:"#7f1d1d",border:"1px solid #991b1b",borderRadius:10,padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{fontSize:22,animation:"pulse 1.5s infinite"}}>💥</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:"#fff"}}>ATEX CRITICAL ALERT — DC-401 Dust Collector</div>
                <div style={{fontSize:12,color:"#fca5a5",marginTop:2}}>Dust concentration 95 g/m3 — approaching Lower Explosive Limit (LEL). Immediate inspection required. Suppression system active.</div>
              </div>
              <button onClick={()=>setSection("atex")} style={{background:"#fff",color:"#7f1d1d",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Inter,sans-serif",flexShrink:0}}>View ATEX Dashboard</button>
            </div>

            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🏭",label:"Equipment Monitored",value:"5 / 5",sub:"All ATEX zones covered",color:AMBER},
                {icon:"💥",label:"ATEX Critical",value:criticalCount,sub:"Immediate attention",color:B.red},
                {icon:"⚠️",label:"ATEX Warning",value:"1",sub:"Above 50 g/m3",color:B.orange},
                {icon:"🔧",label:"Maintenance Alerts",value:"2",sub:"Within 14 days",color:B.purple},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="g3">
              {EQUIPMENT.map(eq=>(
                <div key={eq.id} style={{background:"#fff",border:`2px solid ${eq.atexLevel>=4?"#991b1b":eq.atexLevel>=3?"#fde68a":eq.atexLevel>=2?"#fef3c7":"#e2e8f0"}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                  <div style={{padding:"12px 16px",borderBottom:`3px solid ${eq.color}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:18}}>{eq.icon}</span>
                        <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:B.text}}>{eq.id}</div>
                      </div>
                      <div style={{fontSize:11,color:B.sub}}>{eq.name}</div>
                      <div style={{fontSize:10,color:B.light}}>{eq.type}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                      <ATEXBadge level={eq.atexLabel}/>
                      <div style={{background:`${eq.health>=90?B.green:eq.health>=75?B.orange:B.red}15`,border:`1px solid ${eq.health>=90?B.green:eq.health>=75?B.orange:B.red}40`,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700,color:eq.health>=90?B.green:eq.health>=75?B.orange:B.red}}>Health {eq.health}</div>
                    </div>
                  </div>

                  {/* Dust concentration bar */}
                  <div style={{padding:"8px 14px",background:eq.dustConc>eq.dustLimit?"#fff5f5":"#fafafa",borderBottom:"1px solid #f1f5f9"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:10,color:B.light}}>Dust Concentration</span>
                      <span style={{fontSize:11,fontWeight:800,color:eq.dustConc>eq.dustLimit?B.red:eq.dustConc>eq.dustLimit*0.7?B.orange:B.green}}>{eq.dustConc} g/m3 {eq.dustConc>eq.dustLimit?"OVER LIMIT":""}</span>
                    </div>
                    <div style={{background:"#e2e8f0",borderRadius:4,height:8,position:"relative"}}>
                      <div style={{height:8,borderRadius:4,background:eq.dustConc>eq.dustLimit?B.red:eq.dustConc>eq.dustLimit*0.7?B.orange:B.green,width:`${Math.min(100,(eq.dustConc/100)*100)}%`,transition:"width 1s"}}/>
                      <div style={{position:"absolute",top:0,left:`${(eq.dustLimit/100)*100}%`,width:2,height:8,background:B.red,borderRadius:1}}/>
                    </div>
                    <div style={{fontSize:9,color:B.light,marginTop:2}}>LEL limit: {eq.dustLimit} g/m3</div>
                  </div>

                  <div style={{padding:"8px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,borderBottom:"1px solid #f1f5f9"}}>
                    {Object.entries(eq.kpis).map(([k,v])=>(
                      <div key={k} style={{background:"#f8fafc",borderRadius:6,padding:"4px 7px"}}>
                        <div style={{fontSize:8,color:B.light,textTransform:"capitalize"}}>{k.replace(/([A-Z])/g," $1").trim()}</div>
                        <div style={{fontSize:11,fontWeight:700,color:B.text}}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{padding:"8px 14px"}}>
                    <div style={{background:eq.atexLevel>=4?"#fff5f5":eq.atexLevel>=3?"#fffbeb":"#f0fdf4",border:`1px solid ${eq.atexLevel>=4?"#fecaca":eq.atexLevel>=3?"#fde68a":"#bbf7d0"}`,borderLeft:`3px solid ${eq.atexLevel>=4?B.red:eq.atexLevel>=3?B.orange:B.green}`,borderRadius:7,padding:"6px 10px",fontSize:11,color:B.text,lineHeight:1.5}}>
                      <strong style={{color:eq.atexLevel>=4?B.red:eq.atexLevel>=3?B.orange:B.green}}>AI: </strong>{eq.aiAlert}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section==="atex" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>ATEX Dust Explosion Safety Dashboard</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:16}}>Real-time dust monitoring · LEL tracking · Explosion prevention · ATEX zone management</div>

            {/* Critical alert banner */}
            <div style={{background:"linear-gradient(135deg,#7f1d1d,#991b1b)",borderRadius:12,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div style={{fontSize:28,animation:"pulse 1.5s infinite"}}>💥</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>DUST EXPLOSION RISK — DC-401 CRITICAL</div>
                <div style={{fontSize:12,color:"#fca5a5"}}>Concentration: 95 g/m3 (LEL: 50 g/m3). Suppression active. Isolate and inspect immediately. Do not restart until cleared by safety officer.</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:28,fontWeight:800,color:"#fff"}}>95</div>
                <div style={{fontSize:10,color:"#fca5a5"}}>g/m3 — 190% of LEL</div>
              </div>
            </div>

            <div className="g2" style={{marginBottom:16}}>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Dust Concentration Trend (24h) — BE-201 & DC-401</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={DUST_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="hr" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={3}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={38} unit=" g/m3"/>
                    <Tooltip content={<CT/>}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <ReferenceLine y={50} stroke={B.red} strokeDasharray="4 3" label={{value:"LEL 50 g/m3",fill:B.red,fontSize:9}}/>
                    <Line type="monotone" dataKey="BE201" stroke={B.orange} strokeWidth={2} dot={false} name="BE-201 Elevator"/>
                    <Line type="monotone" dataKey="DC401" stroke={B.red} strokeWidth={2.5} dot={false} name="DC-401 Dust Collector"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>ATEX Zone Classification</div>
                {ATEX_ZONES.map((z,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,padding:"8px 10px",background:"#f8fafc",borderRadius:8,border:`1px solid ${B.border}`}}>
                    <div style={{background:z.color,borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:800,color:z.textColor,flexShrink:0,minWidth:60,textAlign:"center"}}>{z.zone}</div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:B.text,marginBottom:2}}>{z.desc}</div>
                      <div style={{fontSize:10,color:B.light}}>e.g. {z.example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Real-Time Dust Events — Last 24 Hours</div>
              {DUST_EVENTS.map((ev,i)=>(
                <div key={i} style={{background:ev.resolved?"#f8fafc":"#fff5f5",border:`1px solid ${ev.resolved?B.border:"#fecaca"}`,borderLeft:`3px solid ${ev.level==="CRITICAL"?B.red:ev.level==="HIGH"?B.orange:B.yellow}`,borderRadius:8,padding:"10px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{background:ev.level==="CRITICAL"?"#7f1d1d":ev.level==="HIGH"?"#fff5f5":"#fffbeb",color:ev.level==="CRITICAL"?"#fff":ev.level==="HIGH"?B.red:B.orange,border:`1px solid ${ev.level==="CRITICAL"?"#991b1b":ev.level==="HIGH"?"#fecaca":"#fde68a"}`,borderRadius:4,padding:"1px 7px",fontSize:9,fontWeight:700}}>{ev.level}</span>
                        <span style={{fontSize:11,fontWeight:700,color:B.text}}>{ev.id} — {ev.event}</span>
                      </div>
                      <div style={{fontSize:11,color:B.sub}}>Action: {ev.action}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:B.light}}>{ev.time}</div>
                      <div style={{fontSize:10,fontWeight:700,color:ev.resolved?B.green:B.red,marginTop:2}}>{ev.resolved?"Resolved":"Active"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>AI Dust Explosion Prevention — How AriLinc Protects Your Facility</div>
              <div className="g3">
                {[
                  {icon:"📡",title:"Continuous LEL Monitoring",desc:"Dust concentration sensors on all ATEX zones. Real-time g/m3 readings. AI alert fires at 70% of LEL — before reaching dangerous levels.",color:B.orange},
                  {icon:"💨",title:"Automatic Suppression",desc:"When concentration exceeds threshold, AI triggers dust suppression systems automatically. No human latency. Alert to suppression in under 3 seconds.",color:B.red},
                  {icon:"🔥",title:"Ignition Source Prevention",desc:"AI monitors for sparks (bearing overheating, electrical faults, static buildup). Correlates ignition risk with dust concentration for combined risk score.",color:B.purple},
                  {icon:"📊",title:"ATEX Compliance Reporting",desc:"Automatic generation of ATEX zone inspection reports. Dust monitoring logs for regulatory compliance. Incident timeline for insurance and safety audits.",color:B.blue},
                  {icon:"⚡",title:"Process Rate Optimisation",desc:"AI reduces feed rate when dust concentration rises. Prevents explosive dust cloud formation through intelligent throughput management.",color:B.teal},
                  {icon:"🔔",title:"Escalating Alarm Logic",desc:"3-level alarm: Advisory (70% LEL) > Warning (90% LEL) > Emergency (100% LEL). Each level triggers different automated responses and notifications.",color:B.green},
                ].map((f,i)=>(
                  <div key={i} style={{background:`${f.color}08`,border:`1px solid ${f.color}25`,borderRadius:10,padding:"14px"}}>
                    <div style={{fontSize:22,marginBottom:6}}>{f.icon}</div>
                    <div style={{fontSize:13,fontWeight:800,color:f.color,marginBottom:6}}>{f.title}</div>
                    <div style={{fontSize:11,color:B.text,lineHeight:1.6}}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section==="maint" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Predictive Maintenance</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Vibration analysis · Bearing health · Screen & hammer wear · Remaining useful life</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🔧",label:"Assets Monitored",value:"18",sub:"Vibration + temp sensors",color:AMBER},
                {icon:"⚠️",label:"Alerts Active",value:"3",sub:"Action required",color:B.orange},
                {icon:"📅",label:"Urgent PM Due",value:"8 days",sub:"HM-301 screen replace",color:B.red},
                {icon:"💰",label:"Failures Prevented",value:"Rs 14.2L",sub:"Last 90 days",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Vibration Trend — BE-201 & HM-301 (30 Samples)</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={VIB_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="sample" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={4}/>
                  <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} unit=" mm/s"/>
                  <Tooltip content={<CT/>}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <ReferenceLine y={4.0} stroke={B.orange} strokeDasharray="4 3" label={{value:"Warning 4.0",fill:B.orange,fontSize:9}}/>
                  <ReferenceLine y={7.0} stroke={B.red} strokeDasharray="4 3" label={{value:"Critical 7.0",fill:B.red,fontSize:9}}/>
                  <Line type="monotone" dataKey="BE201" stroke={B.orange} strokeWidth={2} dot={false} name="BE-201 Elevator (mm/s)"/>
                  <Line type="monotone" dataKey="HM301" stroke={B.blue} strokeWidth={2} dot={false} name="HM-301 Hammer Mill (mm/s)" strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="g2">
              {[
                {icon:"⬆️",id:"BE-201",title:"Bucket Elevator — Bearing Failure Risk",detail:"Vibration 4.8 mm/s — above 4.0 mm/s warning threshold and trending upward. Bearing temperature 68C vs 55C baseline. Combined vibration+temperature pattern matches early-stage bearing failure. AI prediction: failure in 12–18 days without intervention. Dust concentration 68 g/m3 creates additional explosion risk from bearing spark.",severity:"HIGH",color:B.red,action:"Replace bearing within 7 days. Schedule during planned downtime. Do not exceed 5.5 mm/s vibration — auto-shutdown at 7.0 mm/s."},
                {icon:"⚙️",id:"HM-301",title:"Hammer Mill — Screen Wear Approaching Limit",detail:"Screen wear index 0.68 — replacement threshold is 0.75. At current throughput, threshold will be reached in 8 days. Particle size already showing 4% drift to coarser output. AI recommends scheduling screen replacement this weekend.",severity:"MEDIUM",color:B.orange,action:"Order replacement screen. Schedule 4-hour maintenance window within 8 days. No immediate safety risk."},
              ].map((a,i)=>(
                <div key={i} className="card">
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontSize:20}}>{a.icon}</span>
                    <div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:800,color:B.text}}>{a.id} — {a.title}</div>
                      <span style={{background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}40`,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{a.severity}</span>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:B.text,lineHeight:1.7,background:"#f8fafc",borderRadius:8,padding:"10px 12px",marginBottom:8}}>{a.detail}</div>
                  <div style={{background:`${a.color}08`,border:`1px solid ${a.color}25`,borderRadius:7,padding:"8px 12px",fontSize:11,fontWeight:600,color:a.color}}>Action: {a.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section==="process" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Process Control & Grain Quality</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Moisture · Temperature · Throughput · Particle size · Dryer efficiency</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"💧",label:"Outlet Moisture",value:"13.2%",sub:"Target: 13.0%",color:B.teal},
                {icon:"🌡️",label:"Dryer Efficiency",value:"94.1%",sub:"Saving 3.8% energy",color:B.orange},
                {icon:"⚙️",label:"Avg Particle Size",value:"450 micron",sub:"Within spec",color:B.blue},
                {icon:"📦",label:"Total Throughput",value:"153 t/hr",sub:"All lines combined",color:AMBER},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:24,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="g2">
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Grain Moisture In/Out — 30 Day Trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={MOISTURE_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} width={36} unit="%"/>
                    <Tooltip content={<CT/>}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <ReferenceLine y={13.0} stroke={B.green} strokeDasharray="4 3" label={{value:"Target 13%",fill:B.green,fontSize:9}}/>
                    <Line type="monotone" dataKey="inlet" stroke={B.orange} strokeWidth={2} dot={false} name="Inlet Moisture (%)"/>
                    <Line type="monotone" dataKey="outlet" stroke={B.teal} strokeWidth={2.5} dot={false} name="Outlet Moisture (%)"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>AI Process Optimisation — This Month</div>
                {[
                  {icon:"💧",label:"Dryer Energy Saving",value:"3.8%",note:"AI adjusted residence time based on inlet moisture — saved Rs 2.1L this month",color:B.teal},
                  {icon:"⚙️",label:"Mill Screen Optimisation",value:"+2.1%",note:"AI adjusted feed rate to optimise particle size distribution — reduced oversize by 2.1%",color:B.blue},
                  {icon:"🌾",label:"Silo Ventilation",value:"Auto",note:"AI triggered ventilation in Silo A to prevent moisture hotspot — grain quality maintained",color:AMBER},
                  {icon:"📦",label:"Throughput Optimisation",value:"+4.2%",note:"AI balanced load across 3 hammer mills — increased total throughput by 4.2% without energy increase",color:B.green},
                ].map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10,padding:"8px 10px",background:"#f8fafc",borderRadius:8}}>
                    <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:700,color:B.text}}>{f.label}</span>
                        <span style={{fontSize:13,fontWeight:800,color:f.color}}>{f.value}</span>
                      </div>
                      <div style={{fontSize:11,color:B.sub,marginTop:2}}>{f.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section==="analytics" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Analytics — 30 Day Trend</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>ATEX incidents · Maintenance · Throughput · Energy efficiency</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"💥",label:"ATEX Incidents",value:"4",sub:"All contained by AI",color:B.red},
                {icon:"📉",label:"LEL Exceedances",value:"2",sub:"Suppression activated",color:B.orange},
                {icon:"🔧",label:"Unplanned Downtime",value:"2.1 hrs",sub:"Down from 8.4 hrs",color:B.purple},
                {icon:"💰",label:"Total AI Savings",value:"Rs 22L",sub:"90 days",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:20,marginBottom:5}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="g2">
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Dust Concentration — 24h Rolling Average</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={DUST_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.red} stopOpacity={0.2}/><stop offset="95%" stopColor={B.red} stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="hr" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={3}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={38} unit=" g/m3"/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine y={50} stroke={B.red} strokeDasharray="4 3" label={{value:"LEL",fill:B.red,fontSize:9}}/>
                    <Area type="monotone" dataKey="DC401" stroke={B.red} fill="url(#dg)" strokeWidth={2} dot={false} name="DC-401 (g/m3)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Moisture Control — 30 Day</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={MOISTURE_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} unit="%"/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine y={13.0} stroke={B.green} strokeDasharray="4 3" label={{value:"Target",fill:B.green,fontSize:9}}/>
                    <Line type="monotone" dataKey="outlet" stroke={B.teal} strokeWidth={2.5} dot={false} name="Outlet Moisture (%)"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fw">
        <div style={{fontSize:12,color:B.light}}>AriLinc Grain & Milling Intelligence · ATEX Safety · Predictive Maintenance · Powered by AriPrus</div>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <a href="mailto:info@ariprus.com" style={{fontSize:12,color:B.sub,textDecoration:"none"}}>info@ariprus.com</a>
          <a href="https://arilinc.ariprus.com" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:AMBER,fontWeight:700,textDecoration:"none"}}>Explore AriLinc Platform</a>
        </div>
      </div>
    </div>
  );
}
