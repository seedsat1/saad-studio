import { useState, useCallback, useEffect, useRef, useMemo, createContext, useContext, useReducer } from "react";

/* ═══════════════════════════════════════════════════════════════
   HOLLYWOOD AI STUDIO — Complete Single-Page Production Suite
   Matching Saad Studio brand: deep navy, purple accents, glass UI
   ═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────
const SCENE_STATUSES = ["draft","generating","ready","error","locked"];
const MOODS = ["neutral","happy","serious","angry","sad","excited","mysterious","tense"];
const INSPECTOR_TABS = ["script","storyboard","characters","voice","camera","lighting","motion","transitions","presets","render"];
const RENDER_STATUSES = ["queued","processing","encoding","complete","failed"];
const JOB_TYPES = ["image","video","audio","transition","render"];

// ────────────────────────────────────────────────────────────
// MODEL ROUTING CONFIG (Central)
// ────────────────────────────────────────────────────────────
const MODEL_ROUTING = {
  scriptWriting:     { primary: "gpt-5.4",           fallback: "gpt-5.4-mini",      provider: "OpenAI" },
  promptRefinement:  { primary: "gpt-5.4-mini",      fallback: "gpt-5.4",           provider: "OpenAI" },
  continuityQA:     { primary: "gpt-5.4-mini",      fallback: null,                 provider: "OpenAI" },
  imageGenPrimary:   { primary: "Imagen 4 Ultra",    fallback: "FLUX",               provider: "Google Vertex" },
  imageGenSecondary: { primary: "FLUX",              fallback: "Imagen 4 Ultra",     provider: "Configured" },
  imageEditing:      { primary: "NanoBanana Pro",    fallback: "Imagen 4 Ultra",     provider: "NanoBanana" },
  videoGenPrimary:   { primary: "Kling 3",           fallback: "Seedance 2",         provider: "Kling" },
  videoGenSecondary: { primary: "Seedance 2",        fallback: "Sora 2",             provider: "Seedance" },
  videoGenFallback:  { primary: "Sora 2 Pro",        fallback: "Sora 2",             provider: "OpenAI" },
  ttsPrimary:        { primary: "eleven_v3",         fallback: "eleven_turbo_v2_5",  provider: "ElevenLabs" },
  ttsFast:           { primary: "eleven_turbo_v2_5", fallback: "eleven_v3",          provider: "ElevenLabs" },
  voiceCloning:      { primary: "ElevenLabs PVC",    fallback: null,                 provider: "ElevenLabs" },
  transcription:     { primary: "gpt-4o-transcribe", fallback: null,                 provider: "OpenAI" },
};

// ────────────────────────────────────────────────────────────
// CAMERA CATALOG
// ────────────────────────────────────────────────────────────
const CAMERA_CATALOG = {
  shotTypes: [
    { id:"est",  name:"Establishing",   desc:"Wide environmental context",   icon:"🏙️" },
    { id:"wide", name:"Wide Shot",      desc:"Full body in environment",     icon:"📐" },
    { id:"med",  name:"Medium Shot",    desc:"Waist up, conversational",     icon:"👤" },
    { id:"cu",   name:"Close-Up",       desc:"Face fills frame",            icon:"🔍" },
    { id:"ecu",  name:"Extreme Close",  desc:"Detail: eyes, hands, object", icon:"👁️" },
    { id:"ots",  name:"Over-Shoulder",  desc:"Dialogue framing",            icon:"🗣️" },
    { id:"pov",  name:"POV",            desc:"Character perspective",        icon:"👀" },
    { id:"aerial",name:"Aerial/Drone",  desc:"Bird's eye overhead",         icon:"🦅" },
    { id:"dutch",name:"Dutch Angle",    desc:"Tilted unease",               icon:"📐" },
    { id:"2shot",name:"Two Shot",       desc:"Two subjects together",        icon:"👥" },
  ],
  lensPresets: [
    { id:"14mm", name:"14mm Ultra Wide", fov:"114°", feel:"Distorted, epic" },
    { id:"24mm", name:"24mm Wide",       fov:"84°",  feel:"Environmental" },
    { id:"35mm", name:"35mm Standard",   fov:"63°",  feel:"Natural, documentary" },
    { id:"50mm", name:"50mm Normal",     fov:"47°",  feel:"Human eye, intimate" },
    { id:"85mm", name:"85mm Portrait",   fov:"28°",  feel:"Flattering, compressed" },
    { id:"135mm",name:"135mm Tele",      fov:"18°",  feel:"Isolated, voyeuristic" },
    { id:"200mm",name:"200mm Long",      fov:"12°",  feel:"Surveillance, distant" },
  ],
};

// ────────────────────────────────────────────────────────────
// LIGHTING CATALOG
// ────────────────────────────────────────────────────────────
const LIGHTING_CATALOG = [
  { id:"key-high",    name:"High Key",       desc:"Bright, minimal shadows", mood:"Happy, clean", icon:"☀️" },
  { id:"key-low",     name:"Low Key",        desc:"Deep shadows, dramatic",  mood:"Noir, mystery", icon:"🌑" },
  { id:"rembrandt",   name:"Rembrandt",      desc:"Triangle cheek shadow",   mood:"Artistic, classic", icon:"🎨" },
  { id:"butterfly",   name:"Butterfly",      desc:"Shadow under nose",       mood:"Glamour, beauty", icon:"🦋" },
  { id:"split",       name:"Split Light",    desc:"Half face lit",           mood:"Duality, conflict", icon:"◐" },
  { id:"rim",         name:"Rim/Back Light", desc:"Edge glow, separation",   mood:"Ethereal, heroic", icon:"✨" },
  { id:"practical",   name:"Practical",      desc:"In-scene light sources",  mood:"Naturalistic", icon:"💡" },
  { id:"neon",        name:"Neon Noir",      desc:"Colored neon wash",       mood:"Cyberpunk, urban", icon:"🔮" },
  { id:"golden",      name:"Golden Hour",    desc:"Warm sunset tones",       mood:"Romantic, warm", icon:"🌅" },
  { id:"moonlight",   name:"Moonlight",      desc:"Cool blue ambient",       mood:"Dreamy, night", icon:"🌙" },
];

// ────────────────────────────────────────────────────────────
// TRANSITION CATALOG
// ────────────────────────────────────────────────────────────
const TRANSITION_CATALOG = [
  { id:"cut",      name:"Hard Cut",      desc:"Instant switch",         timing:"0ms",   icon:"✂️" },
  { id:"dissolve", name:"Cross Dissolve",desc:"Smooth blend",           timing:"500ms", icon:"🌊" },
  { id:"fade-b",   name:"Fade to Black", desc:"Dramatic pause",         timing:"800ms", icon:"⬛" },
  { id:"fade-w",   name:"Fade to White", desc:"Dream/flashback",        timing:"800ms", icon:"⬜" },
  { id:"whip",     name:"Whip Pan",      desc:"Fast energy transfer",   timing:"300ms", icon:"💨" },
  { id:"match",    name:"Match Cut",     desc:"Visual similarity link", timing:"200ms", icon:"🔗" },
  { id:"j-cut",    name:"J-Cut",         desc:"Audio precedes video",   timing:"var",   icon:"🎵" },
  { id:"l-cut",    name:"L-Cut",         desc:"Audio carries over",     timing:"var",   icon:"🎶" },
  { id:"flash",    name:"Flash Cut",     desc:"Quick white flash",      timing:"100ms", icon:"⚡" },
  { id:"glitch",   name:"Glitch",        desc:"Digital distortion",     timing:"400ms", icon:"📺" },
  { id:"zoom",     name:"Zoom Punch",    desc:"Rapid zoom transition",  timing:"250ms", icon:"🔎" },
  { id:"morph",    name:"Morph",         desc:"Shape transformation",   timing:"600ms", icon:"🫧" },
];

// ────────────────────────────────────────────────────────────
// PRESETS (8 complete production presets)
// ────────────────────────────────────────────────────────────
const PRESETS = [
  { id:"cinematic",  name:"Cinematic Blockbuster", icon:"🎬", accent:"#D4A855",
    visual:{ar:"21:9",color:"teal-orange",grain:0.3,bloom:0.5},
    camera:{default:"wide",lens:"35mm",dof:"shallow"},
    lighting:{default:"rembrandt",contrast:"high"},
    motion:{speed:1,drift:true,parallax:true},
    transition:{default:"dissolve",pace:"slow"},
    audio:{music:"orchestral",sfx:true,ambience:"cinematic-hum"},
    voice:{model:"eleven_v3",style:"narrator",speed:0.95},
    pacing:{beatsPerMin:24,holdTime:3,buildUp:true}},
  { id:"news",       name:"TV News Report",        icon:"📰", accent:"#3B82F6",
    visual:{ar:"16:9",color:"neutral",grain:0,bloom:0},
    camera:{default:"med",lens:"50mm",dof:"deep"},
    lighting:{default:"key-high",contrast:"low"},
    motion:{speed:1,drift:false,parallax:false},
    transition:{default:"cut",pace:"fast"},
    audio:{music:"subtle-bed",sfx:false,ambience:"newsroom"},
    voice:{model:"eleven_v3",style:"anchor",speed:1.1},
    pacing:{beatsPerMin:30,holdTime:1.5,buildUp:false}},
  { id:"drama",      name:"Emotional Drama",       icon:"🎭", accent:"#EF4444",
    visual:{ar:"2.35:1",color:"warm-desaturated",grain:0.2,bloom:0.3},
    camera:{default:"cu",lens:"85mm",dof:"shallow"},
    lighting:{default:"key-low",contrast:"medium"},
    motion:{speed:0.8,drift:true,parallax:false},
    transition:{default:"dissolve",pace:"slow"},
    audio:{music:"piano-strings",sfx:true,ambience:"room-tone"},
    voice:{model:"eleven_v3",style:"emotional",speed:0.9},
    pacing:{beatsPerMin:20,holdTime:4,buildUp:true}},
  { id:"truecrime", name:"True Crime",             icon:"🔍", accent:"#F59E0B",
    visual:{ar:"16:9",color:"cold-desaturated",grain:0.4,bloom:0},
    camera:{default:"med",lens:"35mm",dof:"medium"},
    lighting:{default:"split",contrast:"high"},
    motion:{speed:1,drift:false,parallax:false},
    transition:{default:"cut",pace:"medium"},
    audio:{music:"tension-drone",sfx:true,ambience:"static"},
    voice:{model:"eleven_v3",style:"investigator",speed:1},
    pacing:{beatsPerMin:26,holdTime:2,buildUp:true}},
  { id:"fantasy",   name:"Fantasy Epic",           icon:"⚔️", accent:"#10B981",
    visual:{ar:"21:9",color:"vibrant-fantasy",grain:0.1,bloom:0.7},
    camera:{default:"aerial",lens:"24mm",dof:"deep"},
    lighting:{default:"golden",contrast:"high"},
    motion:{speed:0.9,drift:true,parallax:true},
    transition:{default:"morph",pace:"slow"},
    audio:{music:"epic-choir",sfx:true,ambience:"wind-magic"},
    voice:{model:"eleven_v3",style:"epic-narrator",speed:0.9},
    pacing:{beatsPerMin:22,holdTime:3.5,buildUp:true}},
  { id:"techpromo", name:"Tech Promo",             icon:"💻", accent:"#06B6D4",
    visual:{ar:"16:9",color:"clean-modern",grain:0,bloom:0.2},
    camera:{default:"med",lens:"50mm",dof:"medium"},
    lighting:{default:"key-high",contrast:"low"},
    motion:{speed:1.2,drift:false,parallax:true},
    transition:{default:"zoom",pace:"fast"},
    audio:{music:"electronic-upbeat",sfx:true,ambience:"none"},
    voice:{model:"eleven_turbo_v2_5",style:"confident",speed:1.05},
    pacing:{beatsPerMin:32,holdTime:1.5,buildUp:false}},
  { id:"anime",     name:"Anime Stylized",         icon:"✨", accent:"#F472B6",
    visual:{ar:"16:9",color:"saturated-anime",grain:0,bloom:0.6},
    camera:{default:"med",lens:"35mm",dof:"shallow"},
    lighting:{default:"rim",contrast:"high"},
    motion:{speed:1.1,drift:false,parallax:true},
    transition:{default:"flash",pace:"fast"},
    audio:{music:"j-pop-orchestral",sfx:true,ambience:"anime-fx"},
    voice:{model:"eleven_v3",style:"anime-narrator",speed:1},
    pacing:{beatsPerMin:28,holdTime:2,buildUp:true}},
  { id:"trailer",   name:"Trailer Mode",           icon:"🎞️", accent:"#8B5CF6",
    visual:{ar:"21:9",color:"high-contrast",grain:0.2,bloom:0.4},
    camera:{default:"wide",lens:"24mm",dof:"deep"},
    lighting:{default:"neon",contrast:"extreme"},
    motion:{speed:1.3,drift:true,parallax:true},
    transition:{default:"whip",pace:"aggressive"},
    audio:{music:"trailer-braams",sfx:true,ambience:"bass-rumble"},
    voice:{model:"eleven_v3",style:"trailer-voice",speed:1.15},
    pacing:{beatsPerMin:36,holdTime:1,buildUp:true}},
];

// ────────────────────────────────────────────────────────────
// MOCK DATA
// ────────────────────────────────────────────────────────────
const mkFrames = (sid,n=3) => Array.from({length:n},(_,i)=>({
  id:`f-${sid}-${i}`,sceneId:sid,order:i,prompt:`Frame ${i+1} visual description`,
  cameraAngle:["wide","medium","close-up"][i%3],notes:"",shotType:"med",lens:"50mm",
  lighting:"rembrandt",transition:i>0?"dissolve":"cut"
}));

const INIT_SCENES = [
  {id:"s1",order:0,title:"Opening",script:"The film opens with a sweeping aerial shot of a vast desert landscape at golden hour. Wind carries sand across ancient ruins as the narrator introduces the story.",duration:8,status:"ready",locked:false,tags:["intro","establishing"],characterIds:[],storyboardFrames:mkFrames("s1"),version:1,versions:[]},
  {id:"s2",order:1,title:"Character Introduction",script:"We meet the protagonist in a bustling marketplace. The camera follows them through narrow alleys, capturing the energy and chaos of the world they inhabit.",duration:12,status:"ready",locked:false,tags:["character","world-building"],characterIds:["c1","c2"],storyboardFrames:mkFrames("s2"),version:1,versions:[]},
  {id:"s3",order:2,title:"The Turning Point",script:"A mysterious message arrives that changes everything. Close-up on the protagonist's face as they read, emotions shifting from confusion to determination.",duration:6,status:"generating",locked:false,tags:["plot","tension"],characterIds:["c1"],storyboardFrames:mkFrames("s3"),version:1,versions:[]},
  {id:"s4",order:3,title:"Confrontation",script:"The final confrontation in an open arena. Dramatic lighting, swelling music, two figures face each other across the dust-filled air.",duration:15,status:"draft",locked:false,tags:["climax","action"],characterIds:["c1","c2"],storyboardFrames:mkFrames("s4"),version:1,versions:[]},
];

const INIT_CHARS = [
  {id:"c1",name:"Youssef",description:"Ambitious young man in his 30s",appearance:"Black hair, light beard, sharp eyes, weathered coat",mood:"serious",voiceProfileId:"v1"},
  {id:"c2",name:"Layla",description:"Brilliant and brave journalist",appearance:"Brown hair, green eyes, formal attire, press badge",mood:"neutral",voiceProfileId:"v2"},
];

const VOICES = [
  {id:"v1",name:"Ahmed — Narrator",type:"preset",lang:"en",model:"eleven_v3"},
  {id:"v2",name:"Sara — Anchor",type:"preset",lang:"en",model:"eleven_v3"},
  {id:"v3",name:"Khaled — Dramatic",type:"preset",lang:"en",model:"eleven_v3"},
  {id:"v4",name:"Alex — Calm",type:"preset",lang:"en",model:"eleven_turbo_v2_5"},
  {id:"v5",name:"Nina — Epic",type:"preset",lang:"en",model:"eleven_v3"},
];

// ────────────────────────────────────────────────────────────
// CONTEXT
// ────────────────────────────────────────────────────────────
const Ctx = createContext(null);
const useStudio = () => useContext(Ctx);

// ────────────────────────────────────────────────────────────
// SVG ICON SYSTEM
// ────────────────────────────────────────────────────────────
const I = ({d,s=16,c=""})=>(
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d={d}/></svg>
);
const IC = {
  save:"M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  play:"M5 3l14 9-14 9V3z",pause:"M6 4h4v16H6zM14 4h4v16h-4z",
  plus:"M12 5v14M5 12h14",copy:"M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2",
  refresh:"M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M22.99 14.01l-4.64 4.36A9 9 0 013.51 15",
  x:"M18 6L6 18M6 6l12 12",check:"M20 6L9 17l-5-5",
  film:"M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5M2 2h20v20H2z",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
  mic:"M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6z",
  layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  menu:"M3 12h18M3 6h18M3 18h18",
  chevDown:"M6 9l6 6 6-6",chevLeft:"M15 18l-6-6 6-6",chevRight:"M9 18l6-6-6-6",
  grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  zap:"M13 2L3 14h9l-1 10 10-12h-9l1-10z",
  clock:"M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  camera:"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
  sun:"M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
  move:"M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20",
  scissors:"M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12M6 3a3 3 0 100 6 3 3 0 000-6zM6 15a3 3 0 100 6 3 3 0 000-6z",
  sliders:"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  terminal:"M4 17l6-6-6-6M12 19h8",
  lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  unlock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1",
  volume:"M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07",
  image:"M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  monitor:"M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4",
};

// Status helpers
const stColor = {draft:"#5C5A55",generating:"#F0A840",ready:"#3DD68C",error:"#F0564A",locked:"#3B82F6"};
const stLabel = {draft:"Draft",generating:"Generating",ready:"Ready",error:"Error",locked:"Locked"};

// ════════════════════════════════════════════════════════════
// TOP CONTROL BAR
// ════════════════════════════════════════════════════════════
function TopBar(){
  const {saveStatus,startRender,setMobilePanel,jobConsoleOpen,setJobConsoleOpen,activePreset} = useStudio();
  const svL = {saved:"Saved",saving:"Saving...",unsaved:"Unsaved",error:"Save Error"};
  const svI = {saved:"✓",saving:"↻",unsaved:"●",error:"✕"};
  const p = PRESETS.find(p=>p.id===activePreset);
  return(
    <header className="topbar">
      <div className="tb-section">
        <button className="mobile-menu-btn" onClick={()=>setMobilePanel("timeline")} aria-label="Menu">
          <I d={IC.menu}/>
        </button>
        <div className="project-badge">
          <span className="logo-icon">🎬</span>
          <span className="project-name">Saad Studio</span>
        </div>
        <div className="project-title-edit">Journey to the Unknown</div>
        <div className={`save-ind save-${saveStatus}`}>
          <span className="save-ic">{svI[saveStatus]}</span>
          <span className="save-lb">{svL[saveStatus]}</span>
        </div>
      </div>
      <div className="tb-section">
        {p && <div className="preset-pill" style={{"--pill-c":p.accent}}>{p.icon} {p.name}</div>}
        <div className="credits-pill"><I d={IC.zap} s={12}/><span>320 Credits</span></div>
        <div className="plan-pill">PRO</div>
        <button className="console-btn" onClick={()=>setJobConsoleOpen(!jobConsoleOpen)}>
          <I d={IC.terminal} s={14}/><span>Console</span>
        </button>
        <button className="render-btn" onClick={startRender}>
          <I d={IC.download} s={14}/><span>Render</span>
        </button>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE TIMELINE (Left Rail)
// ════════════════════════════════════════════════════════════
function SceneCard({scene,active}){
  const {setActiveSceneId,duplicateScene,removeScene,regenerateScene,updateScene} = useStudio();
  const [hover,setHover] = useState(false);
  return(
    <div className={`sc-card${active?" sc-card--active":""}`}
      onClick={()=>setActiveSceneId(scene.id)}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&setActiveSceneId(scene.id)}>
      <div className="sc-thumb">
        <div className="sc-thumb-inner"><I d={IC.film} s={18}/></div>
        <span className="sc-dur">{scene.duration}s</span>
        {scene.locked && <span className="sc-lock"><I d={IC.lock} s={10}/></span>}
      </div>
      <div className="sc-info">
        <span className="sc-title">{scene.title}</span>
        <div className="sc-meta">
          <span className="sc-status" style={{color:stColor[scene.status]}}>
            {scene.status==="generating"&&<span className="pulse-dot"/>}
            {stLabel[scene.status]}
          </span>
          {scene.tags?.slice(0,2).map(t=><span key={t} className="sc-tag">{t}</span>)}
        </div>
      </div>
      {hover && !scene.locked && (
        <div className="sc-actions" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>regenerateScene(scene.id)} title="Regenerate"><I d={IC.refresh} s={12}/></button>
          <button onClick={()=>duplicateScene(scene.id)} title="Duplicate"><I d={IC.copy} s={12}/></button>
          <button onClick={()=>updateScene(scene.id,{locked:!scene.locked})} title="Lock"><I d={IC.lock} s={12}/></button>
          <button onClick={()=>removeScene(scene.id)} title="Delete" className="btn-dng"><I d={IC.trash} s={12}/></button>
        </div>
      )}
    </div>
  );
}

function SceneTimeline(){
  const {scenes,activeSceneId,addScene} = useStudio();
  const total = scenes.reduce((a,s)=>a+s.duration,0);
  return(
    <aside className="panel pn-timeline" role="navigation" aria-label="Scenes">
      <div className="pn-hdr">
        <h2 className="pn-title">Scene Stack</h2>
        <span className="pn-badge">{scenes.length}</span>
        <span className="pn-total">{total}s total</span>
      </div>
      <div className="sc-list">
        {scenes.map(s=><SceneCard key={s.id} scene={s} active={s.id===activeSceneId}/>)}
      </div>
      <button className="add-sc-btn" onClick={addScene}>
        <I d={IC.plus} s={14}/><span>Add Scene</span>
      </button>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════
// PREVIEW CANVAS (Center Stage)
// ════════════════════════════════════════════════════════════
function PreviewCanvas(){
  const {activeScene,activePreset} = useStudio();
  const [playing,setPlaying] = useState(false);
  const [time,setTime] = useState(0);
  const iv = useRef(null);

  useEffect(()=>{
    if(playing&&activeScene){
      iv.current=window.setInterval(()=>{
        setTime(t=>{if(t>=activeScene.duration){setPlaying(false);return 0;}return t+0.1;});
      },100);
    }
    return ()=>{if(iv.current)clearInterval(iv.current);};
  },[playing,activeScene]);

  const toggle = ()=>{if(!activeScene)return;setPlaying(p=>!p);};
  const preset = PRESETS.find(p=>p.id===activePreset);

  if(!activeScene) return(
    <main className="panel pn-preview">
      <div className="pv-empty"><I d={IC.film} s={48} c="muted"/><p>Select a scene to preview</p></div>
    </main>
  );

  const pct = activeScene.duration>0?(time/activeScene.duration)*100:0;
  const fi = Math.min(activeScene.storyboardFrames.length-1,
    Math.floor((time/activeScene.duration)*activeScene.storyboardFrames.length));
  const frame = activeScene.storyboardFrames[fi];

  return(
    <main className="panel pn-preview">
      <div className="pv-viewport">
        {activeScene.status==="generating"?(
          <div className="pv-gen"><div className="spinner"/><p>Generating scene...</p>
            <span className="pv-model">Using: {MODEL_ROUTING.imageGenPrimary.primary}</span></div>
        ):(
          <div className="pv-canvas">
            <div className="canvas-frame">
              {/* Safe zone guides */}
              <div className="safe-zone safe-action"/>
              <div className="safe-zone safe-title"/>
              <div className="crosshair ch-h"/><div className="crosshair ch-v"/>
              <I d={IC.film} s={56} c="muted"/>
              <p className="cf-title">{activeScene.title}</p>
              <p className="cf-frame">Frame {fi+1}/{activeScene.storyboardFrames.length}</p>
              {frame && <div className="cf-meta">
                <span className="cf-chip">{frame.shotType}</span>
                <span className="cf-chip">{frame.lens}</span>
                <span className="cf-chip">{frame.lighting}</span>
              </div>}
              {preset && <div className="cf-preset">{preset.icon} {preset.name}</div>}
            </div>
            <div className="sb-strip">
              {activeScene.storyboardFrames.map((f,i)=>(
                <div key={f.id} className={`strip-f${i===fi?" strip-f--act":""}`}
                  onClick={()=>setTime((i/activeScene.storyboardFrames.length)*activeScene.duration)}>
                  <span className="sf-num">{i+1}</span>
                  <span className="sf-angle">{f.cameraAngle}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="pv-controls">
        <button className="ctrl-b" onClick={()=>{setTime(0);setPlaying(false);}}><I d={IC.refresh} s={14}/></button>
        <button className="ctrl-b ctrl-play" onClick={toggle}>
          <I d={playing?IC.pause:IC.play} s={16}/>
        </button>
        <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
        <span className="time-disp">{time.toFixed(1)}s / {activeScene.duration}s</span>
      </div>
    </main>
  );
}

// ════════════════════════════════════════════════════════════
// INSPECTOR TABS (Right Rail)
// ════════════════════════════════════════════════════════════
const TAB_CFG = [
  {id:"script",     label:"Script",       icon:IC.film},
  {id:"storyboard", label:"Storyboard",   icon:IC.grid},
  {id:"characters", label:"Characters",   icon:IC.user},
  {id:"voice",      label:"Voice",        icon:IC.mic},
  {id:"camera",     label:"Camera",       icon:IC.camera},
  {id:"lighting",   label:"Lighting",     icon:IC.sun},
  {id:"motion",     label:"Motion",       icon:IC.move},
  {id:"transitions",label:"Transitions",  icon:IC.scissors},
  {id:"presets",    label:"Presets",       icon:IC.sliders},
  {id:"render",     label:"Render",       icon:IC.download},
];

// ── Script Tab ──
function ScriptTab(){
  const {activeScene,updateScene} = useStudio();
  if(!activeScene) return <EmptyTab label="Select a scene to edit script"/>;
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Script Lab</span>
        <span className="model-tag">{MODEL_ROUTING.scriptWriting.primary}</span>
      </div>
      <div className="fr"><label className="fl">Scene Title</label>
        <input className="fi" value={activeScene.title}
          onChange={e=>updateScene(activeScene.id,{title:e.target.value})}/></div>
      <div className="fr"><label className="fl">Script</label>
        <textarea className="ft" value={activeScene.script} rows={6}
          onChange={e=>updateScene(activeScene.id,{script:e.target.value})}
          placeholder="Write your scene script..."/></div>
      <div className="fr"><label className="fl">Duration (seconds)</label>
        <input className="fi" type="number" value={activeScene.duration} min={1} max={300}
          onChange={e=>updateScene(activeScene.id,{duration:Number(e.target.value)})}/></div>
      <div className="fr"><label className="fl">Tags</label>
        <input className="fi" value={(activeScene.tags||[]).join(", ")}
          onChange={e=>updateScene(activeScene.id,{tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})}
          placeholder="action, drama, intro..."/></div>
      <button className="btn-ai">
        <I d={IC.zap} s={14}/> AI Breakdown (Beats & Acts)
        {/* API_INTEGRATION_POINT: scriptWriting service */}
      </button>
    </div>
  );
}

// ── Storyboard Tab ──
function StoryboardTab(){
  const {activeScene,updateScene} = useStudio();
  if(!activeScene) return <EmptyTab label="Select a scene for storyboard"/>;
  const frames = activeScene.storyboardFrames;
  const uf = (fid,u) => updateScene(activeScene.id,{
    storyboardFrames:frames.map(f=>f.id===fid?{...f,...u}:f)});
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Storyboard Lab</span>
        <button className="btn-s" onClick={()=>{
          const nf = {id:`f-${Date.now()}`,sceneId:activeScene.id,order:frames.length,
            prompt:"",cameraAngle:"wide",notes:"",shotType:"med",lens:"50mm",
            lighting:"rembrandt",transition:"cut"};
          updateScene(activeScene.id,{storyboardFrames:[...frames,nf]});
        }}><I d={IC.plus} s={12}/> Add Frame</button>
      </div>
      <span className="model-tag">{MODEL_ROUTING.imageGenPrimary.primary}</span>
      {frames.map((f,i)=>(
        <div key={f.id} className="frame-card">
          <div className="fc-hdr">
            <span className="fc-num">#{i+1}</span>
            <select className="fs" value={f.shotType} onChange={e=>uf(f.id,{shotType:e.target.value})}>
              {CAMERA_CATALOG.shotTypes.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
            <select className="fs" value={f.lens} onChange={e=>uf(f.id,{lens:e.target.value})}>
              {CAMERA_CATALOG.lensPresets.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <textarea className="ft ft-sm" value={f.prompt} rows={2}
            onChange={e=>uf(f.id,{prompt:e.target.value})} placeholder="Visual description..."/>
          <div className="fc-row">
            <select className="fs" value={f.lighting} onChange={e=>uf(f.id,{lighting:e.target.value})}>
              {LIGHTING_CATALOG.map(l=><option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
            </select>
            <select className="fs" value={f.transition} onChange={e=>uf(f.id,{transition:e.target.value})}>
              {TRANSITION_CATALOG.map(t=><option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
          </div>
          <button className="btn-ai btn-ai-sm">
            <I d={IC.zap} s={12}/> Generate Frame
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Characters Tab ──
function CharactersTab(){
  const {characters,setCharacters} = useStudio();
  const [editId,setEditId] = useState(null);
  const uc = (id,u)=>setCharacters(p=>p.map(c=>c.id===id?{...c,...u}:c));
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Character Lab</span>
        <button className="btn-s" onClick={()=>{
          const nc = {id:`c-${Date.now()}`,name:"New Character",description:"",appearance:"",mood:"neutral"};
          setCharacters(p=>[...p,nc]); setEditId(nc.id);
        }}><I d={IC.plus} s={12}/> Add</button>
      </div>
      {characters.map(c=>(
        <div key={c.id} className="char-card">
          <div className="cc-hdr" onClick={()=>setEditId(editId===c.id?null:c.id)}>
            <div className="cc-av"><I d={IC.user} s={18}/></div>
            <div className="cc-sum">
              <span className="cc-name">{c.name}</span>
              <span className="cc-mood">{c.mood}</span>
            </div>
            <I d={editId===c.id?IC.chevDown:IC.chevRight} s={14}/>
          </div>
          {editId===c.id&&(
            <div className="cc-form">
              <div className="fr"><label className="fl">Name</label>
                <input className="fi" value={c.name} onChange={e=>uc(c.id,{name:e.target.value})}/></div>
              <div className="fr"><label className="fl">Description</label>
                <input className="fi" value={c.description} onChange={e=>uc(c.id,{description:e.target.value})}/></div>
              <div className="fr"><label className="fl">Appearance</label>
                <textarea className="ft ft-sm" value={c.appearance} rows={2}
                  onChange={e=>uc(c.id,{appearance:e.target.value})}/></div>
              <div className="fr"><label className="fl">Mood</label>
                <select className="fs" value={c.mood} onChange={e=>uc(c.id,{mood:e.target.value})}>
                  {MOODS.map(m=><option key={m} value={m}>{m}</option>)}
                </select></div>
              <div className="fr"><label className="fl">Voice Profile</label>
                <select className="fs" value={c.voiceProfileId||""} onChange={e=>uc(c.id,{voiceProfileId:e.target.value||undefined})}>
                  <option value="">None</option>
                  {VOICES.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                </select></div>
              <button className="btn-ai btn-ai-sm">
                <I d={IC.image} s={12}/> Generate Avatar
                {/* API_INTEGRATION_POINT: characterService.generateAvatar */}
              </button>
              <button className="btn-dng-sm" onClick={()=>setCharacters(p=>p.filter(x=>x.id!==c.id))}>
                <I d={IC.trash} s={12}/> Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Voice Tab ──
function VoiceTab(){
  const [consent,setConsent] = useState(false);
  const [cloneMode,setCloneMode] = useState(false);
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Voice Lab</span>
        <span className="model-tag">{MODEL_ROUTING.ttsPrimary.primary}</span>
      </div>
      <div className="fr"><label className="fl">Narrator Voice</label>
        <select className="fs">
          <option value="">Select voice...</option>
          {VOICES.map(v=><option key={v.id} value={v.id}>{v.name} ({v.model})</option>)}
        </select></div>
      <div className="fr"><label className="fl">Speed</label>
        <input type="range" className="f-range" min="0.5" max="2" step="0.05" defaultValue="1"/></div>
      <div className="fr"><label className="fl">Pitch</label>
        <input type="range" className="f-range" min="0.5" max="2" step="0.05" defaultValue="1"/></div>
      <hr className="divider"/>
      <div className="fr">
        <button className="btn-s" onClick={()=>setCloneMode(!cloneMode)}>
          <I d={IC.mic} s={12}/> {cloneMode?"Cancel":"Clone Voice"}
        </button>
        <span className="model-tag sm">{MODEL_ROUTING.voiceCloning.primary}</span>
      </div>
      {cloneMode&&(
        <div className="clone-pn">
          <p className="clone-info">Upload a voice sample (min 30 seconds) to clone.</p>
          <div className="upload-zone"><I d={IC.mic} s={20}/><p>Drop audio file or click to upload</p>
            {/* API_INTEGRATION_POINT: voiceService.cloneVoice */}
          </div>
          <div className="consent-row">
            <input type="checkbox" id="vc" checked={consent} onChange={e=>setConsent(e.target.checked)} className="consent-cb"/>
            <label htmlFor="vc" className="consent-lb">
              I confirm I have rights to use this voice and agree to the cloning terms.
            </label>
          </div>
          <button className="btn-primary" disabled={!consent}>Start Cloning</button>
        </div>
      )}
      <hr className="divider"/>
      <button className="btn-s"><I d={IC.play} s={12}/> Preview TTS</button>
    </div>
  );
}

// ── Camera Tab ──
function CameraTab(){
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Camera Lab</span></div>
      <h4 className="sec-sub">Shot Types</h4>
      <div className="catalog-grid">
        {CAMERA_CATALOG.shotTypes.map(s=>(
          <div key={s.id} className="cat-card">
            <span className="cat-icon">{s.icon}</span>
            <span className="cat-name">{s.name}</span>
            <span className="cat-desc">{s.desc}</span>
          </div>
        ))}
      </div>
      <h4 className="sec-sub">Lens Presets</h4>
      <div className="lens-list">
        {CAMERA_CATALOG.lensPresets.map(l=>(
          <div key={l.id} className="lens-row">
            <span className="lens-name">{l.name}</span>
            <span className="lens-fov">{l.fov}</span>
            <span className="lens-feel">{l.feel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lighting Tab ──
function LightingTab(){
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Lighting Lab</span></div>
      <div className="catalog-grid">
        {LIGHTING_CATALOG.map(l=>(
          <div key={l.id} className="cat-card">
            <span className="cat-icon">{l.icon}</span>
            <span className="cat-name">{l.name}</span>
            <span className="cat-desc">{l.desc}</span>
            <span className="cat-mood">{l.mood}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Motion Tab ──
function MotionTab(){
  const motionTypes = [
    {id:"static",name:"Static",desc:"Locked camera, no movement",icon:"📌"},
    {id:"pan",name:"Pan",desc:"Horizontal sweep left/right",icon:"↔️"},
    {id:"tilt",name:"Tilt",desc:"Vertical sweep up/down",icon:"↕️"},
    {id:"dolly",name:"Dolly",desc:"Camera moves forward/back",icon:"🎥"},
    {id:"crane",name:"Crane",desc:"Vertical lift up/down",icon:"🏗️"},
    {id:"handheld",name:"Handheld",desc:"Organic shake, documentary feel",icon:"✋"},
    {id:"steadicam",name:"Steadicam",desc:"Smooth floating follow",icon:"🎯"},
    {id:"orbit",name:"Orbit",desc:"360° around subject",icon:"🔄"},
    {id:"zoom",name:"Zoom In/Out",desc:"Focal length change",icon:"🔍"},
    {id:"whip",name:"Whip Pan",desc:"Ultra-fast snap rotation",icon:"💨"},
  ];
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Motion Lab</span></div>
      <div className="catalog-grid">
        {motionTypes.map(m=>(
          <div key={m.id} className="cat-card">
            <span className="cat-icon">{m.icon}</span>
            <span className="cat-name">{m.name}</span>
            <span className="cat-desc">{m.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Transitions Tab ──
function TransitionsTab(){
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Transition Lab</span></div>
      <div className="catalog-grid cols-2">
        {TRANSITION_CATALOG.map(t=>(
          <div key={t.id} className="cat-card">
            <span className="cat-icon">{t.icon}</span>
            <span className="cat-name">{t.name}</span>
            <span className="cat-desc">{t.desc}</span>
            <span className="cat-timing">{t.timing}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Presets Tab ──
function PresetsTab(){
  const {activePreset,setPreset} = useStudio();
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Preset Lab</span></div>
      <div className="preset-grid">
        {PRESETS.map(p=>(
          <button key={p.id} className={`pst-card${activePreset===p.id?" pst-card--act":""}`}
            onClick={()=>setPreset(p.id)} style={{"--pst-c":p.accent}}>
            <span className="pst-icon">{p.icon}</span>
            <span className="pst-name">{p.name}</span>
            <div className="pst-details">
              <span>AR: {p.visual.ar}</span>
              <span>Cam: {p.camera.default}</span>
              <span>Light: {p.lighting.default}</span>
              <span>Pace: {p.pacing.beatsPerMin}bpm</span>
            </div>
            {activePreset===p.id&&<span className="pst-check"><I d={IC.check} s={14}/></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Render Tab ──
function RenderTab(){
  const {renderJobs,startRender,cancelRender} = useStudio();
  const rsl = {queued:"Queued",processing:"Processing",encoding:"Encoding",complete:"Complete",failed:"Failed"};
  return(
    <div className="tab-c">
      <div className="t-hdr"><span>Render Lab</span>
        <button className="btn-s btn-accent" onClick={startRender}>
          <I d={IC.download} s={12}/> New Render
        </button>
      </div>
      <div className="render-cfg">
        <div className="fr"><label className="fl">Resolution</label>
          <select className="fs"><option>720p</option><option>1080p</option><option>4K</option></select></div>
        <div className="fr"><label className="fl">Format</label>
          <select className="fs"><option>MP4</option><option>WebM</option><option>MOV</option></select></div>
        <div className="fr"><label className="fl">Video Model</label>
          <select className="fs">
            <option>{MODEL_ROUTING.videoGenPrimary.primary}</option>
            <option>{MODEL_ROUTING.videoGenSecondary.primary}</option>
            <option>{MODEL_ROUTING.videoGenFallback.primary}</option>
          </select></div>
      </div>
      <h4 className="sec-sub">Render Queue</h4>
      {renderJobs.length===0?(
        <div className="empty-sm"><I d={IC.layers} s={20} c="muted"/><p>No render jobs</p></div>
      ):(
        <div className="rq">{renderJobs.map(j=>(
          <div key={j.id} className={`rj rj--${j.status}`}>
            <div className="rj-hdr"><span className="rj-lbl">{j.resolution} · {j.format}</span>
              <span className="rj-st">{rsl[j.status]}</span></div>
            <div className="rj-bar"><div className="rj-fill" style={{width:`${j.progress}%`}}/></div>
            <div className="rj-ft"><span>{Math.round(j.progress)}%</span>
              {j.status!=="complete"&&j.status!=="failed"&&
                <button className="btn-xs" onClick={()=>cancelRender(j.id)}>Cancel</button>}
              {j.status==="complete"&&<button className="btn-xs btn-accent"><I d={IC.download} s={10}/> Download</button>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

// ── Empty Tab ──
function EmptyTab({label}){
  return <div className="tab-empty"><I d={IC.layers} s={28} c="muted"/><p>{label}</p></div>;
}

// ── Inspector Shell ──
function Inspector(){
  const {activeTab,setActiveTab} = useStudio();
  const tabs = {script:<ScriptTab/>,storyboard:<StoryboardTab/>,characters:<CharactersTab/>,
    voice:<VoiceTab/>,camera:<CameraTab/>,lighting:<LightingTab/>,motion:<MotionTab/>,
    transitions:<TransitionsTab/>,presets:<PresetsTab/>,render:<RenderTab/>};
  return(
    <aside className="panel pn-inspector">
      <div className="insp-tabs">
        {TAB_CFG.map(t=>(
          <button key={t.id} className={`insp-tab${activeTab===t.id?" insp-tab--act":""}`}
            onClick={()=>setActiveTab(t.id)} title={t.label}>
            <I d={t.icon} s={14}/><span className="tab-lb">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="insp-body">{tabs[activeTab]}</div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════
// JOB CONSOLE (Bottom Dock)
// ════════════════════════════════════════════════════════════
function JobConsole(){
  const {jobConsoleOpen,setJobConsoleOpen,jobLogs} = useStudio();
  if(!jobConsoleOpen) return null;
  return(
    <div className="job-console">
      <div className="jc-hdr">
        <span className="jc-title"><I d={IC.terminal} s={14}/> Job Console</span>
        <span className="jc-count">{jobLogs.length} entries</span>
        <button className="jc-close" onClick={()=>setJobConsoleOpen(false)}><I d={IC.x} s={14}/></button>
      </div>
      <div className="jc-body">
        {jobLogs.length===0?<p className="jc-empty">No jobs yet. Actions will appear here.</p>:
          jobLogs.map((log,i)=>(
            <div key={i} className={`jc-entry jc-${log.type}`}>
              <span className="jc-time">{log.time}</span>
              <span className={`jc-badge jc-b-${log.status}`}>{log.status}</span>
              <span className="jc-model">[{log.model}]</span>
              <span className="jc-msg">{log.message}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TOAST OVERLAY
// ════════════════════════════════════════════════════════════
function ToastOverlay(){
  const {toasts,dismissToast} = useStudio();
  if(!toasts.length) return null;
  const tc = {success:"var(--c-green)",error:"var(--c-red)",info:"var(--c-blue)",warning:"var(--c-amber)"};
  return(
    <div className="toast-wrap">
      {toasts.map(t=>(
        <div key={t.id} className="toast" style={{borderLeftColor:tc[t.type]}}>
          <span>{t.message}</span>
          <button onClick={()=>dismissToast(t.id)}><I d={IC.x} s={12}/></button>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILE NAV
// ════════════════════════════════════════════════════════════
function MobileNav(){
  const {mobilePanel,setMobilePanel} = useStudio();
  return(
    <nav className="mob-nav">
      {[["timeline","Scenes",IC.layers],["preview","Preview",IC.eye],["inspector","Tools",IC.settings]].map(([p,l,ic])=>(
        <button key={p} className={`mn-btn${mobilePanel===p?" mn-btn--act":""}`}
          onClick={()=>setMobilePanel(p)}>
          <I d={ic} s={18}/><span>{l}</span>
        </button>
      ))}
    </nav>
  );
}

// ════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════
export default function HollywoodStudio(){
  const [scenes,setScenes] = useState(INIT_SCENES);
  const [activeSceneId,setActiveSceneId] = useState("s1");
  const [characters,setCharacters] = useState(INIT_CHARS);
  const [activeTab,setActiveTab] = useState("script");
  const [activePreset,setPreset] = useState("cinematic");
  const [toasts,setToasts] = useState([]);
  const [saveStatus,setSaveStatus] = useState("saved");
  const [renderJobs,setRenderJobs] = useState([]);
  const [mobilePanel,setMobilePanel] = useState(null);
  const [jobConsoleOpen,setJobConsoleOpen] = useState(false);
  const [jobLogs,setJobLogs] = useState([]);

  const activeScene = useMemo(()=>scenes.find(s=>s.id===activeSceneId)??null,[scenes,activeSceneId]);

  const addToast = useCallback((t)=>{
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    setToasts(p=>[...p,{...t,id}]);
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),t.duration||4000);
  },[]);
  const dismissToast = useCallback(id=>setToasts(p=>p.filter(t=>t.id!==id)),[]);

  const addLog = useCallback((log)=>{
    const time = new Date().toLocaleTimeString("en",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"});
    setJobLogs(p=>[{...log,time},...p].slice(0,100));
  },[]);

  // Scene CRUD
  const addScene = useCallback(()=>{
    const ns = {id:`s-${Date.now()}`,order:scenes.length,title:`Scene ${scenes.length+1}`,
      script:"",duration:6,status:"draft",locked:false,tags:[],characterIds:[],
      storyboardFrames:[],version:1,versions:[]};
    setScenes(p=>[...p,ns]); setActiveSceneId(ns.id); setSaveStatus("unsaved");
    addToast({type:"success",message:"New scene added"});
    addLog({type:"scene",status:"success",model:"System",message:"Scene created"});
  },[scenes.length,addToast,addLog]);

  const duplicateScene = useCallback(id=>{
    setScenes(p=>{const src=p.find(s=>s.id===id);if(!src)return p;
      return[...p,{...src,id:`s-${Date.now()}`,order:p.length,title:`${src.title} (copy)`,status:"draft",locked:false}];});
    setSaveStatus("unsaved"); addToast({type:"info",message:"Scene duplicated"});
  },[addToast]);

  const removeScene = useCallback(id=>{
    setScenes(p=>{const n=p.filter(s=>s.id!==id);if(activeSceneId===id)setActiveSceneId(n[0]?.id??null);return n;});
    setSaveStatus("unsaved"); addToast({type:"warning",message:"Scene deleted"});
  },[activeSceneId,addToast]);

  const updateScene = useCallback((id,u)=>{
    setScenes(p=>p.map(s=>s.id===id?{...s,...u}:s)); setSaveStatus("unsaved");
  },[]);

  const regenerateScene = useCallback(id=>{
    updateScene(id,{status:"generating"});
    addToast({type:"info",message:"Regenerating scene..."});
    addLog({type:"image",status:"pending",model:MODEL_ROUTING.imageGenPrimary.primary,message:`Regenerating scene ${id}`});
    setTimeout(()=>{
      updateScene(id,{status:"ready"});
      addToast({type:"success",message:"Scene regenerated"});
      addLog({type:"image",status:"success",model:MODEL_ROUTING.imageGenPrimary.primary,message:`Scene ${id} complete`});
    },3000);
  },[updateScene,addToast,addLog]);

  // Render
  const startRender = useCallback(()=>{
    const job = {id:`rj-${Date.now()}`,status:"queued",progress:0,resolution:"1080p",format:"MP4",estimatedTime:120};
    setRenderJobs(p=>[job,...p]);
    addToast({type:"info",message:"Render job queued"});
    addLog({type:"render",status:"pending",model:MODEL_ROUTING.videoGenPrimary.primary,message:"Render started"});
    setActiveTab("render");
    const iv = setInterval(()=>{
      setRenderJobs(prev=>prev.map(j=>{
        if(j.id!==job.id)return j;
        const np = Math.min(100,j.progress+Math.random()*10);
        const ns = np>=100?"complete":np>75?"encoding":"processing";
        if(np>=100){clearInterval(iv);
          addLog({type:"render",status:"success",model:MODEL_ROUTING.videoGenPrimary.primary,message:"Render complete"});
        }
        return{...j,progress:np,status:ns};
      }));
    },2000);
  },[addToast,addLog]);

  const cancelRender = useCallback(id=>{
    setRenderJobs(p=>p.map(j=>j.id===id?{...j,status:"failed"}:j));
    addToast({type:"warning",message:"Render cancelled"});
    addLog({type:"render",status:"error",model:"System",message:"Render cancelled by user"});
  },[addToast,addLog]);

  // Autosave
  useEffect(()=>{
    if(saveStatus!=="unsaved")return;
    const t=setTimeout(()=>{setSaveStatus("saving");setTimeout(()=>setSaveStatus("saved"),1200);},2000);
    return ()=>clearTimeout(t);
  },[saveStatus]);

  const ctx = {
    scenes,setScenes,activeSceneId,setActiveSceneId,activeScene,
    characters,setCharacters,activeTab,setActiveTab,
    activePreset,setPreset,toasts,addToast,dismissToast,
    saveStatus,renderJobs,startRender,cancelRender,
    addScene,duplicateScene,removeScene,updateScene,regenerateScene,
    mobilePanel,setMobilePanel,jobConsoleOpen,setJobConsoleOpen,jobLogs,addLog,
  };

  return(
    <Ctx.Provider value={ctx}>
      <div className="studio-root">
        <style>{STYLES}</style>
        <TopBar/>
        <div className="studio-body">
          <div className={`pw pw-tl${mobilePanel==="timeline"?" pw--ms":""}`}><SceneTimeline/></div>
          <div className={`pw pw-pv${mobilePanel==="preview"||mobilePanel===null?" pw--ms":""}`}><PreviewCanvas/></div>
          <div className={`pw pw-in${mobilePanel==="inspector"?" pw--ms":""}`}><Inspector/></div>
        </div>
        <JobConsole/>
        <MobileNav/>
        <ToastOverlay/>
      </div>
    </Ctx.Provider>
  );
}

// ════════════════════════════════════════════════════════════
// STYLES — Matching Saad Studio brand palette
// ════════════════════════════════════════════════════════════
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --c-bg:         #0B0D18;
  --c-surface-0:  #0F1123;
  --c-surface-1:  #161830;
  --c-surface-2:  #1C1F3A;
  --c-surface-3:  #252847;
  --c-surface-4:  #2E3258;
  --c-border:     #2A2D4A;
  --c-border-l:   #353868;

  --c-text:       #E8EAF6;
  --c-text-sec:   #8B8FA8;
  --c-text-mut:   #555878;

  --c-accent:     #7C3AED;
  --c-accent-dim: rgba(124,58,237,0.15);
  --c-accent-glow:rgba(124,58,237,0.35);
  --c-accent-2:   #6D28D9;

  --c-green:  #34D399;
  --c-red:    #F43F5E;
  --c-blue:   #3B82F6;
  --c-amber:  #F59E0B;
  --c-cyan:   #06B6D4;
  --c-pink:   #EC4899;

  --sp-xs:4px; --sp-sm:6px; --sp-md:10px; --sp-lg:14px; --sp-xl:20px; --sp-2xl:28px;
  --r-sm:5px; --r-md:8px; --r-lg:12px; --r-xl:16px;
  --shadow-sm:0 1px 3px rgba(0,0,0,.5);
  --shadow-md:0 4px 12px rgba(0,0,0,.6);
  --shadow-lg:0 8px 30px rgba(0,0,0,.7);
  --shadow-glow:0 0 20px var(--c-accent-dim);

  --font-main:'DM Sans',system-ui,sans-serif;
  --font-mono:'IBM Plex Mono',monospace;

  --topbar-h:46px;
  --timeline-w:240px;
  --inspector-w:320px;
  --console-h:180px;
  --mob-nav-h:52px;
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
.studio-root{
  font-family:var(--font-main); color:var(--c-text); background:var(--c-bg);
  height:100vh; width:100vw; display:flex; flex-direction:column;
  overflow:hidden; font-size:12px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--c-surface-3);border-radius:10px;}

/* ── TOPBAR ── */
.topbar{
  height:var(--topbar-h); background:var(--c-surface-0);
  border-bottom:1px solid var(--c-border);
  display:flex; align-items:center; justify-content:space-between;
  padding:0 var(--sp-lg); flex-shrink:0; z-index:50; gap:var(--sp-md);
}
.tb-section{display:flex;align-items:center;gap:var(--sp-md);min-width:0;}
.project-badge{display:flex;align-items:center;gap:var(--sp-sm);}
.logo-icon{font-size:16px;}
.project-name{font-weight:700;font-size:13px;color:var(--c-text);white-space:nowrap;}
.project-title-edit{
  font-size:12px;color:var(--c-text-sec);
  background:var(--c-surface-1);border:1px solid var(--c-border);
  padding:3px 10px;border-radius:var(--r-sm);
  max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.save-ind{display:flex;align-items:center;gap:3px;font-size:10px;
  color:var(--c-text-mut);padding:2px 8px;border-radius:var(--r-sm);background:var(--c-surface-1);}
.save-saved .save-ic{color:var(--c-green);}
.save-saving .save-ic{color:var(--c-amber);animation:spin 1s linear infinite;}
.save-unsaved .save-ic{color:var(--c-amber);}
.save-error .save-ic{color:var(--c-red);}
@keyframes spin{to{transform:rotate(360deg);}}
.credits-pill{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--c-amber);
  padding:2px 8px;background:rgba(245,158,11,.08);border-radius:var(--r-sm);}
.plan-pill{font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 7px;
  border-radius:var(--r-sm);background:linear-gradient(135deg,var(--c-accent),var(--c-accent-2));color:#fff;}
.preset-pill{font-size:10px;padding:2px 8px;border-radius:var(--r-sm);
  border:1px solid var(--pill-c,var(--c-accent));color:var(--pill-c,var(--c-accent));
  background:color-mix(in srgb,var(--pill-c,var(--c-accent)) 8%,transparent);white-space:nowrap;}
.console-btn,.render-btn{
  display:flex;align-items:center;gap:4px;padding:4px 12px;border-radius:var(--r-md);
  border:none;cursor:pointer;font-family:var(--font-main);font-size:11px;font-weight:600;
  transition:all .2s;
}
.console-btn{background:var(--c-surface-2);color:var(--c-text-sec);border:1px solid var(--c-border);}
.console-btn:hover{background:var(--c-surface-3);color:var(--c-text);}
.render-btn{background:linear-gradient(135deg,var(--c-accent),var(--c-accent-2));color:#fff;}
.render-btn:hover{filter:brightness(1.15);box-shadow:var(--shadow-glow);}
.mobile-menu-btn{display:none;background:none;border:none;color:var(--c-text);cursor:pointer;padding:var(--sp-xs);}

/* ── BODY ── */
.studio-body{flex:1;display:flex;overflow:hidden;min-height:0;}
.pw{display:flex;flex-shrink:0;}
.pw-tl{width:var(--timeline-w);}
.pw-pv{flex:1;min-width:0;}
.pw-in{width:var(--inspector-w);}

.panel{display:flex;flex-direction:column;height:100%;width:100%;overflow:hidden;}
.pn-timeline{background:var(--c-surface-0);border-right:1px solid var(--c-border);}
.pn-preview{background:var(--c-bg);}
.pn-inspector{background:var(--c-surface-0);border-left:1px solid var(--c-border);}

.pn-hdr{display:flex;align-items:center;gap:var(--sp-sm);
  padding:var(--sp-md) var(--sp-lg);border-bottom:1px solid var(--c-border);flex-shrink:0;}
.pn-title{font-size:12px;font-weight:600;}
.pn-badge{font-size:10px;font-weight:600;background:var(--c-surface-2);color:var(--c-text-sec);
  width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.pn-total{font-size:10px;color:var(--c-text-mut);margin-left:auto;font-family:var(--font-mono);}

/* ── SCENE LIST ── */
.sc-list{flex:1;overflow-y:auto;padding:var(--sp-sm);display:flex;flex-direction:column;gap:2px;}
.sc-card{display:flex;align-items:center;gap:var(--sp-sm);padding:var(--sp-sm) var(--sp-md);
  border-radius:var(--r-md);cursor:pointer;transition:all .15s;position:relative;
  border:1px solid transparent;}
.sc-card:hover{background:var(--c-surface-1);}
.sc-card--active{background:var(--c-surface-2);border-color:var(--c-accent-dim);
  box-shadow:inset 3px 0 0 var(--c-accent);}
.sc-thumb{width:48px;height:32px;border-radius:var(--r-sm);background:var(--c-surface-2);
  display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;
  overflow:hidden;color:var(--c-text-mut);}
.sc-thumb-inner{display:flex;align-items:center;justify-content:center;}
.sc-dur{position:absolute;bottom:1px;right:1px;font-size:8px;font-weight:600;
  background:rgba(0,0,0,.7);padding:0 3px;border-radius:2px;font-family:var(--font-mono);}
.sc-lock{position:absolute;top:1px;right:1px;color:var(--c-blue);}
.sc-info{flex:1;min-width:0;}
.sc-title{display:block;font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sc-meta{display:flex;align-items:center;gap:3px;margin-top:1px;flex-wrap:wrap;}
.sc-status{font-size:9px;display:flex;align-items:center;gap:3px;}
.sc-tag{font-size:8px;padding:0 4px;border-radius:3px;background:var(--c-surface-3);color:var(--c-text-mut);}
.pulse-dot{width:5px;height:5px;border-radius:50%;background:var(--c-amber);animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.4);}}
.sc-actions{position:absolute;right:var(--sp-sm);top:50%;transform:translateY(-50%);
  display:flex;gap:1px;animation:fadeIn .15s;}
.sc-actions button{background:var(--c-surface-3);border:none;color:var(--c-text-sec);
  padding:3px;border-radius:var(--r-sm);cursor:pointer;transition:all .15s;}
.sc-actions button:hover{color:var(--c-text);background:var(--c-surface-4);}
.sc-actions .btn-dng:hover{color:var(--c-red);}
@keyframes fadeIn{from{opacity:0;transform:translateY(-50%) translateX(4px);}}
.add-sc-btn{display:flex;align-items:center;justify-content:center;gap:var(--sp-sm);
  padding:var(--sp-md);margin:var(--sp-sm);border-radius:var(--r-md);
  border:1px dashed var(--c-border);background:transparent;color:var(--c-text-mut);
  font-family:var(--font-main);font-size:11px;cursor:pointer;transition:all .2s;flex-shrink:0;}
.add-sc-btn:hover{border-color:var(--c-accent);color:var(--c-accent);background:var(--c-accent-dim);}

/* ── PREVIEW ── */
.pv-viewport{flex:1;display:flex;align-items:center;justify-content:center;padding:var(--sp-lg);min-height:0;}
.pv-empty,.pv-gen{display:flex;flex-direction:column;align-items:center;gap:var(--sp-md);color:var(--c-text-mut);}
.pv-model{font-size:10px;font-family:var(--font-mono);color:var(--c-accent);margin-top:var(--sp-sm);}
.spinner{width:32px;height:32px;border:3px solid var(--c-surface-2);border-top-color:var(--c-accent);
  border-radius:50%;animation:spin .8s linear infinite;}
.pv-canvas{display:flex;flex-direction:column;align-items:center;gap:var(--sp-md);width:100%;max-width:800px;}
.canvas-frame{width:100%;aspect-ratio:16/9;background:var(--c-surface-1);
  border:1px solid var(--c-border);border-radius:var(--r-lg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:var(--sp-sm);color:var(--c-text-mut);position:relative;overflow:hidden;}
.canvas-frame::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at center,var(--c-accent-dim) 0%,transparent 70%);opacity:.2;}
/* Safe zones */
.safe-zone{position:absolute;border:1px dashed rgba(255,255,255,.06);pointer-events:none;}
.safe-action{inset:3%;}.safe-title{inset:8%;}
.crosshair{position:absolute;background:rgba(255,255,255,.04);}
.ch-h{left:0;right:0;top:50%;height:1px;}.ch-v{top:0;bottom:0;left:50%;width:1px;}
.cf-title{font-size:16px;font-weight:600;color:var(--c-text);position:relative;z-index:1;}
.cf-frame{font-size:10px;font-family:var(--font-mono);position:relative;z-index:1;}
.cf-meta{display:flex;gap:var(--sp-xs);position:relative;z-index:1;}
.cf-chip{font-size:9px;padding:1px 6px;border-radius:var(--r-sm);background:var(--c-surface-3);
  color:var(--c-text-sec);font-family:var(--font-mono);}
.cf-preset{position:absolute;top:var(--sp-md);right:var(--sp-md);font-size:10px;
  padding:2px 8px;border-radius:var(--r-sm);background:var(--c-accent-dim);color:var(--c-accent);z-index:1;}
.sb-strip{display:flex;gap:var(--sp-sm);overflow-x:auto;padding:var(--sp-sm) 0;width:100%;}
.strip-f{flex-shrink:0;width:70px;height:44px;background:var(--c-surface-1);
  border:1px solid var(--c-border);border-radius:var(--r-sm);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  cursor:pointer;transition:all .2s;gap:1px;}
.strip-f:hover{border-color:var(--c-text-mut);}
.strip-f--act{border-color:var(--c-accent);box-shadow:0 0 8px var(--c-accent-dim);}
.sf-num{font-size:11px;font-weight:600;}.sf-angle{font-size:8px;color:var(--c-text-mut);}
.pv-controls{display:flex;align-items:center;gap:var(--sp-md);
  padding:var(--sp-sm) var(--sp-xl);background:var(--c-surface-0);
  border-top:1px solid var(--c-border);flex-shrink:0;}
.ctrl-b{background:var(--c-surface-2);border:none;color:var(--c-text-sec);
  padding:5px;border-radius:var(--r-sm);cursor:pointer;transition:all .15s;
  display:flex;align-items:center;justify-content:center;}
.ctrl-b:hover{color:var(--c-text);background:var(--c-surface-3);}
.ctrl-play{width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,var(--c-accent),var(--c-accent-2));color:#fff;}
.ctrl-play:hover{filter:brightness(1.15);color:#fff;}
.prog-bar{flex:1;height:3px;background:var(--c-surface-2);border-radius:2px;overflow:hidden;}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--c-accent),var(--c-accent-2));
  border-radius:2px;transition:width .1s linear;}
.time-disp{font-size:10px;font-family:var(--font-mono);color:var(--c-text-sec);min-width:72px;text-align:center;}

/* ── INSPECTOR ── */
.insp-tabs{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--c-border);flex-shrink:0;
  padding:2px var(--sp-xs);gap:1px;}
.insp-tab{display:flex;flex-direction:column;align-items:center;gap:1px;
  padding:var(--sp-xs) var(--sp-sm);border:none;background:none;color:var(--c-text-mut);
  font-family:var(--font-main);font-size:9px;cursor:pointer;transition:all .15s;
  position:relative;border-radius:var(--r-sm) var(--r-sm) 0 0;min-width:0;}
.insp-tab:hover{color:var(--c-text-sec);background:var(--c-surface-1);}
.insp-tab--act{color:var(--c-accent);background:var(--c-surface-1);}
.insp-tab--act::after{content:'';position:absolute;bottom:-1px;left:15%;right:15%;height:2px;
  background:var(--c-accent);border-radius:2px 2px 0 0;}
.tab-lb{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50px;}
.insp-body{flex:1;overflow-y:auto;}

/* ── TAB CONTENT ── */
.tab-c{padding:var(--sp-lg);}
.tab-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:var(--sp-md);padding:var(--sp-2xl);color:var(--c-text-mut);text-align:center;min-height:160px;}
.t-hdr{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:var(--sp-lg);font-weight:600;font-size:12px;}
.model-tag{font-size:9px;font-family:var(--font-mono);padding:1px 6px;border-radius:var(--r-sm);
  background:var(--c-accent-dim);color:var(--c-accent);}
.model-tag.sm{font-size:8px;margin-left:var(--sp-sm);}
.sec-sub{font-size:11px;font-weight:600;margin:var(--sp-lg) 0 var(--sp-md);color:var(--c-text-sec);}

/* ── FORMS ── */
.fl{display:block;font-size:10px;font-weight:500;color:var(--c-text-sec);margin-bottom:2px;}
.fi,.ft,.fs{width:100%;background:var(--c-surface-1);border:1px solid var(--c-border);
  border-radius:var(--r-sm);color:var(--c-text);font-family:var(--font-main);font-size:11px;
  padding:var(--sp-sm) var(--sp-md);transition:border-color .2s;outline:none;}
.fi:focus,.ft:focus,.fs:focus{border-color:var(--c-accent);box-shadow:0 0 0 2px var(--c-accent-dim);}
.ft{resize:vertical;min-height:48px;line-height:1.5;}.ft-sm{min-height:36px;}
.fs{cursor:pointer;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555878' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 8px center;padding-right:24px;}
.fr{margin-bottom:var(--sp-md);}
.f-range{width:100%;accent-color:var(--c-accent);margin-top:2px;}

/* ── BUTTONS ── */
.btn-s{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:var(--r-sm);
  border:1px solid var(--c-border);background:var(--c-surface-1);color:var(--c-text-sec);
  font-family:var(--font-main);font-size:10px;cursor:pointer;transition:all .15s;white-space:nowrap;}
.btn-s:hover{color:var(--c-text);border-color:var(--c-text-mut);}
.btn-accent{background:var(--c-accent-dim);color:var(--c-accent);border-color:transparent;}
.btn-accent:hover{background:var(--c-accent);color:#fff;}
.btn-ai{display:flex;align-items:center;justify-content:center;gap:var(--sp-sm);
  width:100%;padding:7px;border-radius:var(--r-md);border:1px solid var(--c-accent);
  background:var(--c-accent-dim);color:var(--c-accent);font-family:var(--font-main);
  font-size:11px;font-weight:500;cursor:pointer;transition:all .2s;margin-top:var(--sp-md);}
.btn-ai:hover{background:var(--c-accent);color:#fff;box-shadow:var(--shadow-glow);}
.btn-ai-sm{padding:5px;font-size:10px;margin-top:var(--sp-sm);}
.btn-primary{display:flex;align-items:center;justify-content:center;gap:var(--sp-sm);
  padding:7px 16px;border-radius:var(--r-md);border:none;
  background:linear-gradient(135deg,var(--c-accent),var(--c-accent-2));color:#fff;
  font-family:var(--font-main);font-weight:600;font-size:11px;cursor:pointer;
  transition:all .2s;width:100%;}
.btn-primary:hover:not(:disabled){filter:brightness(1.15);box-shadow:var(--shadow-glow);}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;}
.btn-dng-sm{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;
  border-radius:var(--r-sm);border:1px solid rgba(244,63,94,.2);
  background:rgba(244,63,94,.06);color:var(--c-red);font-family:var(--font-main);
  font-size:10px;cursor:pointer;transition:all .15s;margin-top:var(--sp-sm);}
.btn-dng-sm:hover{background:rgba(244,63,94,.12);}
.btn-xs{padding:1px 6px;font-size:9px;border-radius:var(--r-sm);
  border:1px solid var(--c-border);background:var(--c-surface-1);color:var(--c-text-sec);
  font-family:var(--font-main);cursor:pointer;}

/* ── CATALOG GRIDS ── */
.catalog-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-sm);}
.catalog-grid.cols-2{grid-template-columns:repeat(2,1fr);}
.cat-card{background:var(--c-surface-1);border:1px solid var(--c-border);border-radius:var(--r-md);
  padding:var(--sp-md);display:flex;flex-direction:column;gap:2px;transition:all .15s;cursor:pointer;}
.cat-card:hover{border-color:var(--c-accent-dim);background:var(--c-surface-2);}
.cat-icon{font-size:18px;margin-bottom:2px;}
.cat-name{font-size:11px;font-weight:600;}
.cat-desc{font-size:9px;color:var(--c-text-mut);line-height:1.3;}
.cat-mood{font-size:9px;color:var(--c-accent);font-style:italic;}
.cat-timing{font-size:9px;color:var(--c-text-mut);font-family:var(--font-mono);}
.lens-list{display:flex;flex-direction:column;gap:2px;}
.lens-row{display:flex;align-items:center;gap:var(--sp-sm);padding:var(--sp-sm) var(--sp-md);
  background:var(--c-surface-1);border:1px solid var(--c-border);border-radius:var(--r-sm);
  font-size:10px;cursor:pointer;transition:all .15s;}
.lens-row:hover{border-color:var(--c-accent-dim);background:var(--c-surface-2);}
.lens-name{font-weight:600;min-width:90px;}.lens-fov{color:var(--c-text-mut);min-width:36px;font-family:var(--font-mono);}
.lens-feel{color:var(--c-text-sec);flex:1;}

/* ── FRAME CARD ── */
.frame-card{background:var(--c-surface-1);border:1px solid var(--c-border);
  border-radius:var(--r-md);padding:var(--sp-md);margin-bottom:var(--sp-sm);}
.fc-hdr{display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-sm);}
.fc-num{font-weight:700;font-size:11px;color:var(--c-accent);font-family:var(--font-mono);}
.fc-row{display:flex;gap:var(--sp-sm);margin-top:var(--sp-sm);}
.fc-row .fs{flex:1;}

/* ── CHARACTER CARD ── */
.char-card{background:var(--c-surface-1);border:1px solid var(--c-border);
  border-radius:var(--r-md);margin-bottom:var(--sp-sm);overflow:hidden;}
.cc-hdr{display:flex;align-items:center;gap:var(--sp-sm);padding:var(--sp-md);
  cursor:pointer;transition:background .15s;}
.cc-hdr:hover{background:var(--c-surface-2);}
.cc-av{width:28px;height:28px;border-radius:50%;background:var(--c-surface-3);
  display:flex;align-items:center;justify-content:center;color:var(--c-text-mut);flex-shrink:0;}
.cc-sum{flex:1;min-width:0;}.cc-name{display:block;font-weight:600;font-size:11px;}
.cc-mood{display:block;font-size:9px;color:var(--c-text-mut);}
.cc-form{padding:0 var(--sp-md) var(--sp-md);border-top:1px solid var(--c-border);
  padding-top:var(--sp-md);animation:slideDown .2s;}
@keyframes slideDown{from{opacity:0;transform:translateY(-6px);}}

/* ── VOICE ── */
.clone-pn{background:var(--c-surface-1);border:1px solid var(--c-border);
  border-radius:var(--r-md);padding:var(--sp-lg);margin:var(--sp-md) 0;}
.clone-info{font-size:10px;color:var(--c-text-sec);margin-bottom:var(--sp-md);}
.upload-zone{border:2px dashed var(--c-border);border-radius:var(--r-md);padding:var(--sp-xl);
  text-align:center;color:var(--c-text-mut);font-size:11px;margin-bottom:var(--sp-md);
  display:flex;flex-direction:column;align-items:center;gap:var(--sp-sm);
  transition:all .2s;cursor:pointer;}
.upload-zone:hover{border-color:var(--c-accent);color:var(--c-accent);background:var(--c-accent-dim);}
.consent-row{display:flex;align-items:flex-start;gap:var(--sp-sm);margin-bottom:var(--sp-md);}
.consent-cb{accent-color:var(--c-accent);margin-top:2px;flex-shrink:0;}
.consent-lb{font-size:10px;color:var(--c-text-sec);line-height:1.4;}

/* ── PRESETS ── */
.preset-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-sm);}
.pst-card{display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:var(--sp-md) var(--sp-sm);border-radius:var(--r-md);
  border:1px solid var(--c-border);background:var(--c-surface-1);
  cursor:pointer;transition:all .2s;text-align:center;position:relative;
  font-family:var(--font-main);color:var(--c-text);}
.pst-card:hover{border-color:var(--pst-c,var(--c-accent));}
.pst-card--act{border-color:var(--pst-c,var(--c-accent));
  box-shadow:0 0 12px color-mix(in srgb,var(--pst-c,var(--c-accent)) 20%,transparent);
  background:var(--c-surface-2);}
.pst-icon{font-size:20px;}
.pst-name{font-size:11px;font-weight:600;}
.pst-details{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;}
.pst-details span{font-size:8px;color:var(--c-text-mut);padding:0 3px;
  background:var(--c-surface-3);border-radius:2px;font-family:var(--font-mono);}
.pst-check{position:absolute;top:var(--sp-sm);right:var(--sp-sm);
  color:var(--pst-c,var(--c-accent));}

/* ── RENDER QUEUE ── */
.render-cfg{margin-bottom:var(--sp-md);}
.empty-sm{text-align:center;padding:var(--sp-xl);color:var(--c-text-mut);
  display:flex;flex-direction:column;align-items:center;gap:var(--sp-sm);}
.rq{display:flex;flex-direction:column;gap:var(--sp-sm);}
.rj{background:var(--c-surface-1);border:1px solid var(--c-border);
  border-radius:var(--r-md);padding:var(--sp-md);}
.rj--complete{border-color:rgba(52,211,153,.2);}
.rj--failed{border-color:rgba(244,63,94,.2);}
.rj-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-sm);font-size:10px;}
.rj-lbl{font-weight:600;}.rj-st{color:var(--c-text-mut);font-family:var(--font-mono);font-size:9px;}
.rj-bar{height:3px;background:var(--c-surface-3);border-radius:2px;overflow:hidden;margin-bottom:var(--sp-sm);}
.rj-fill{height:100%;background:linear-gradient(90deg,var(--c-accent),var(--c-accent-2));
  border-radius:2px;transition:width .3s ease-out;}
.rj--complete .rj-fill{background:var(--c-green);}
.rj--failed .rj-fill{background:var(--c-red);}
.rj-ft{display:flex;justify-content:space-between;align-items:center;
  font-size:9px;color:var(--c-text-mut);font-family:var(--font-mono);}

/* ── JOB CONSOLE ── */
.job-console{height:var(--console-h);background:var(--c-surface-0);
  border-top:1px solid var(--c-border);flex-shrink:0;display:flex;flex-direction:column;
  z-index:40;animation:slideUp .2s;}
@keyframes slideUp{from{transform:translateY(100%);}}
.jc-hdr{display:flex;align-items:center;gap:var(--sp-md);padding:var(--sp-sm) var(--sp-lg);
  border-bottom:1px solid var(--c-border);flex-shrink:0;}
.jc-title{font-size:11px;font-weight:600;display:flex;align-items:center;gap:var(--sp-sm);}
.jc-count{font-size:9px;color:var(--c-text-mut);font-family:var(--font-mono);}
.jc-close{margin-left:auto;background:none;border:none;color:var(--c-text-mut);cursor:pointer;}
.jc-body{flex:1;overflow-y:auto;padding:var(--sp-sm) var(--sp-lg);font-family:var(--font-mono);font-size:10px;}
.jc-empty{color:var(--c-text-mut);padding:var(--sp-lg);text-align:center;}
.jc-entry{display:flex;align-items:center;gap:var(--sp-sm);padding:2px 0;border-bottom:1px solid var(--c-surface-1);}
.jc-time{color:var(--c-text-mut);min-width:60px;}
.jc-badge{padding:0 4px;border-radius:2px;font-size:8px;font-weight:600;text-transform:uppercase;}
.jc-b-pending{background:rgba(245,158,11,.1);color:var(--c-amber);}
.jc-b-success{background:rgba(52,211,153,.1);color:var(--c-green);}
.jc-b-error{background:rgba(244,63,94,.1);color:var(--c-red);}
.jc-model{color:var(--c-accent);min-width:100px;}
.jc-msg{color:var(--c-text-sec);flex:1;}

/* ── DIVIDER ── */
.divider{border:none;border-top:1px solid var(--c-border);margin:var(--sp-lg) 0;}

/* ── TOASTS ── */
.toast-wrap{position:fixed;bottom:calc(var(--sp-xl) + var(--mob-nav-h));right:var(--sp-xl);
  display:flex;flex-direction:column;gap:var(--sp-sm);z-index:100;max-width:340px;}
.toast{background:var(--c-surface-1);border:1px solid var(--c-border);
  border-left:3px solid var(--c-accent);border-radius:var(--r-md);
  padding:var(--sp-md) var(--sp-lg);display:flex;align-items:center;
  justify-content:space-between;gap:var(--sp-md);font-size:11px;
  box-shadow:var(--shadow-lg);animation:toastIn .3s;}
.toast button{background:none;border:none;color:var(--c-text-mut);cursor:pointer;padding:2px;}
@keyframes toastIn{from{opacity:0;transform:translateY(8px);}}

/* ── MOBILE NAV ── */
.mob-nav{display:none;background:var(--c-surface-0);border-top:1px solid var(--c-border);
  flex-shrink:0;height:var(--mob-nav-h);z-index:40;}
.mn-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:2px;background:none;border:none;color:var(--c-text-mut);
  font-family:var(--font-main);font-size:9px;cursor:pointer;}
.mn-btn--act{color:var(--c-accent);}

/* ── HELPERS ── */
.muted{color:var(--c-text-mut);}

/* ── RESPONSIVE ── */
@media(max-width:1024px){
  .mobile-menu-btn{display:flex;}
  .mob-nav{display:flex;}
  .project-title-edit{display:none;}
  .preset-pill{display:none;}
  .studio-body{position:relative;}
  .pw{position:absolute;inset:0;width:100%!important;display:none;z-index:10;}
  .pw--ms{display:flex;}
  .toast-wrap{right:var(--sp-md);left:var(--sp-md);max-width:none;bottom:calc(var(--sp-md)+var(--mob-nav-h));}
  .catalog-grid{grid-template-columns:repeat(2,1fr);}
  .preset-grid{grid-template-columns:repeat(2,1fr);}
  .canvas-frame{aspect-ratio:4/3;}
  .insp-tabs{overflow-x:auto;flex-wrap:nowrap;}
}

@media(max-width:600px){
  .topbar{padding:0 var(--sp-md);}
  .project-name{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .credits-pill span{display:none;}
  .console-btn span{display:none;}
  .render-btn span{display:none;}
  .catalog-grid{grid-template-columns:1fr;}
  .preset-grid{grid-template-columns:1fr;}
  .fc-hdr{flex-wrap:wrap;}
  .fc-hdr .fs{font-size:10px;}
}
`;
