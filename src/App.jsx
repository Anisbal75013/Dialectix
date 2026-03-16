import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import { callClaude } from './claude.js';
import AcademyMap    from './AcademyMap.jsx';
import SophismDuel, { SEED_DUELS } from './SophismDuel.jsx';
import CompetitiveLobby from './CompetitiveLobby.jsx';
import ArchitectMode from './ArchitectMode.jsx';

/* ─── BACKEND URL ─────────────────────────────────────────────────────────────
 * Set VITE_BACKEND_URL in .env.development / .env.production.
 * Falls back to localhost for convenience during local dev.
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
import ArenaPage from './Arena.jsx';
import { getTier, generateAIArgument } from './arenaUtils.js';
import { RankTrendCard, PromotionIndicator, ReputationBadge, PeakRatingCard, RematchButton } from './engagementUtils.jsx';
import ArgumentCard  from './ArgumentCard.jsx';
import ScorePanel    from './ScorePanel.jsx';
import RankUpAnimation from './animations/RankUpAnimation.jsx';
import './styles/animations.css';
/* ─── RETENTION + MODULE IMPORTS ─────────────────────────────────────────── */
import ScoreExplanationCard  from './ScoreExplanationCard.jsx';
import NextObjectivePanel     from './NextObjectivePanel.jsx';
import { markUserDebatedTopic } from './NextObjectivePanel.jsx';
import RankProgressCard       from './RankProgressCard.jsx';
import TournamentSystem, { isAdmin } from './TournamentSystem.jsx';
import DialectixActu          from './DialectixActu.jsx';
import AdminWeeklyDebates     from './AdminWeeklyDebates.jsx';
import CheckmateOverlay, { isCheckmate } from './CheckmateSystem.jsx';
import RankProgressionSystem  from './RankProgressionSystem.jsx';
import DialectixProfileQuestionnaire, { hasCompletedProfile, savePlayerProfile } from './DialectixProfileQuestionnaire.jsx';
import BattlesPage, { savePublicBattle } from './BattlesPage.jsx';
import { storeProfileForMatchmaking } from './services/matchmakingService.js';
import { hasReachedWeeklyLimit, incrementUserWeekDebateCount, filterSafeTopics } from './services/weeklyDebateService.js';
import GuidesPage       from './GuidesPage.jsx';
import AdminDashboard   from './AdminDashboard.jsx';
import { isBetaBotBattle, hasReachedBotLimit, incrementBotBattleCount, remainingBotBattles } from './services/betaBotService.js';

/* ─── BOT STYLE MAP ───────────────────────────────────────────────────────────
 * Maps botConfig.style (App.jsx difficulty labels) → argumentStyle (arenaUtils)
 * Used when constructing the bot player object for generateAIArgument.
 * Falls back to 'logical' for any unknown style.
 * ─────────────────────────────────────────────────────────────────────────── */
const BOT_STYLE_MAP = {
  beginner:     'logical',
  intermediate: 'logical',    // Analyste
  expert:       'academic',   // Maître
};

/* ═══════════════════════════════════════════════════════════════
   DIALECTIX AI v6  ·  Competitive Debate Platform  ·  MVP
   ─────────────────────────────────────────────────────────────
   ?mode=obs  → OBS transparent overlay
   Pages : home | train | compete | rank | profile | daily | hall
═══════════════════════════════════════════════════════════════ */

const GF=`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');`;

/* ── CONSTANTS ─────────────────────────────────────────────── */
const CRITERIA=[
  {key:'relevance',label:'Pertinence',weight:.25},
  {key:'logic',    label:'Logique',   weight:.28},
  {key:'evidence', label:'Preuves',   weight:.22},
  {key:'rebuttal', label:'Réfutation',weight:.15},
  {key:'clarity',  label:'Clarté',    weight:.10},
];

const BADGES=[
  {id:'disciple',    label:'Disciple',           cls:'bd-disc',  min:0,    max:899,  icon:'📖',color:'#8A7A60'},
  {id:'scribe',      label:'Scribe',             cls:'bd-scr',   min:900,  max:1049, icon:'✍️', color:'#8A5A28'},
  {id:'rhetorician', label:'Rhéteur',            cls:'bd-rhet',  min:1050, max:1199, icon:'🗣', color:'#606060'},
  {id:'dialectician',label:'Dialecticien',       cls:'bd-dial',  min:1200, max:1349, icon:'⚖️', color:'#C6A15B'},
  {id:'logician',    label:'Logicien',           cls:'bd-log',   min:1350, max:1499, icon:'🔷',color:'#2C4A6E'},
  {id:'philosopher', label:'Philosophe',         cls:'bd-phi',   min:1500, max:1649, icon:'🦉',color:'#3A6E52'},
  {id:'archivist',   label:'Archiviste',         cls:'bd-arch',  min:1650, max:1799, icon:'📚',color:'#5A3A6E'},
  {id:'master',      label:'Maître Dialecticien',cls:'bd-mast',  min:1800, max:1999, icon:'🏛', color:'#A05A2C'},
  {id:'sage',        label:"Sage de l'Arène",    cls:'bd-sage',  min:2000, max:9999, icon:'⭐',color:'#C6A15B'},
];

const DEBATE_PHASES=['Exposé initial','Arguments','Réfutations','Conclusion'];

const FORMATS=[
  {id:'blitz',    label:'Blitz',    min:5,  desc:'5 min · ultra-rapide',
    readSec:30, writeSec:45,
    tooltip:'⚡ Blitz — Preuve par 3 · 30s lecture / 45s rédaction · Ultra-rapide'},
  {id:'rapid',    label:'Rapid',    min:10, desc:'10 min',
    readSec:60, writeSec:120,
    tooltip:'🏃 Rapid — 1 min lecture / 2 min rédaction'},
  {id:'standard', label:'Standard', min:20, desc:'20 min · recommandé',
    readSec:180, writeSec:300,
    tooltip:'📚 Standard — 3 min lecture / 5 min rédaction · Recommandé'},
  {id:'deep',     label:'Deep',     min:45, desc:'45 min · approfondi',
    readSec:420, writeSec:600,
    tooltip:'🔬 Deep — 7 min lecture / 10 min rédaction · Analyse approfondie'},
];

// ── Règles détaillées par format (affiché dans le modal de format) ─────────────
const FORMAT_RULES={
  blitz:{
    icon:'⚡', title:'Blitz — Preuve par 3',
    desc:'Le format ultra-rapide. Chaque argument doit être concis et percutant.',
    rules:[
      {icon:'📖',label:'Lecture du sujet','val':'30 secondes'},
      {icon:'✍️',label:'Rédaction de l\'argument','val':'45 secondes'},
      {icon:'⚔️',label:'Nombre de phases','val':'3 tours (Exposé, Réfutation, Conclusion)'},
      {icon:'⏱',label:'Durée totale estimée','val':'~5 minutes'},
      {icon:'🎯',label:'Conseil stratégique','val':'Allez droit au but — une seule idée forte par argument'},
    ],
    color:'var(--B)',
  },
  rapid:{
    icon:'🏃',title:'Rapid — Duel de Rhéteurs',
    desc:'Le format équilibré pour des débats techniques avec des arguments solides.',
    rules:[
      {icon:'📖',label:'Lecture du sujet','val':'1 minute'},
      {icon:'✍️',label:'Rédaction de l\'argument','val':'2 minutes'},
      {icon:'⚔️',label:'Nombre de phases','val':'4 tours complets'},
      {icon:'⏱',label:'Durée totale estimée','val':'~10 minutes'},
      {icon:'🎯',label:'Conseil stratégique','val':'Introduisez des preuves et anticipez les objections'},
    ],
    color:'var(--G)',
  },
  standard:{
    icon:'📚',title:'Standard — Format Recommandé',
    desc:'Le format canonique. Temps suffisant pour développer une argumentation structurée.',
    rules:[
      {icon:'📖',label:'Lecture du sujet','val':'3 minutes'},
      {icon:'✍️',label:'Rédaction de l\'argument','val':'5 minutes'},
      {icon:'⚔️',label:'Nombre de phases','val':'5 tours (Exposé, 2×Arguments, Réfutation, Conclusion)'},
      {icon:'⏱',label:'Durée totale estimée','val':'~20 minutes'},
      {icon:'🎯',label:'Conseil stratégique','val':'Structure : Thèse → Argument × 2 → Preuves → Conclusion'},
    ],
    color:'var(--A)',
  },
  deep:{
    icon:'🔬',title:'Deep — Analyse Approfondie',
    desc:'Réservé aux débatteurs expérimentés souhaitant explorer toute la complexité d\'un sujet.',
    rules:[
      {icon:'📖',label:'Lecture du sujet','val':'7 minutes'},
      {icon:'✍️',label:'Rédaction de l\'argument','val':'10 minutes'},
      {icon:'⚔️',label:'Nombre de phases','val':'6 tours + synthèse finale'},
      {icon:'⏱',label:'Durée totale estimée','val':'~45 minutes'},
      {icon:'🎯',label:'Conseil stratégique','val':'Développez une ontologie du sujet et réfutez point par point'},
    ],
    color:'var(--Y)',
  },
};

// ── Limite d'entraînement quotidien pour les comptes gratuits ──────────────────
const TRAINING_FREE_DAILY_LIMIT = 5;

/* ── BÊTA : 3 bots uniquement ──────────────────────────────────────────────
 * Débutant / Intermédiaire / Elite — couvre l'ensemble du spectre ELO bêta.
 * BOTS[1] (Analyste) est utilisé comme fallback matchmaking (mmPlayBot).
 * ─────────────────────────────────────────────────────────────────────── */
const BOTS=[
  {id:'beginner', name:'Apprenti', emoji:'📖',elo:900,  diff:1,color:'#3A6E52',style:'beginner',    desc:'Découvre les bases de l\'argumentation — idéal pour commencer'},
  {id:'analyste', name:'Analyste', emoji:'🎓',elo:1400, diff:2,color:'#2C4A6E',style:'intermediate',desc:'Arguments structurés et réfutations solides — niveau intermédiaire'},
  {id:'master',   name:'Maître',   emoji:'⚖️',elo:2000, diff:3,color:'#A05A2C',style:'expert',      desc:'Rhétorique avancée, sophismes détectés — défi élite'},
];

const TOPICS=[
  "L'IA va-t-elle détruire plus d'emplois qu'elle n'en créera ?",
  "La démocratie directe est-elle supérieure à la représentative ?",
  "Les données personnelles doivent-elles appartenir aux individus ?",
  "Le capitalisme est-il le meilleur système économique possible ?",
  "La nature humaine est-elle fondamentalement bonne ?",
  "Faut-il interdire les voitures dans les centres-villes ?",
  "Le sport professionnel mérite-t-il ses salaires astronomiques ?",
  "L'exploration spatiale est-elle une priorité pour l'humanité ?",
  "Le végétarisme devrait-il être encouragé par la loi ?",
  "Les réseaux sociaux appauvrissent-ils le débat démocratique ?",
];

const DAILY_TOPICS=[
  "L'IA représente-t-elle une menace existentielle pour l'humanité ?",
  "Le télétravail est-il bénéfique pour la société ?",
  "Faut-il instaurer un revenu universel de base ?",
  "La croissance est-elle compatible avec l'écologie ?",
  "L'école doit-elle enseigner la philosophie dès le primaire ?",
  "Le veganisme est-il un choix politique autant qu'éthique ?",
  "La liberté d'expression a-t-elle des limites morales ?",
];

const ACHIEVEMENTS_DEF=[
  {id:'first_debate',  icon:'🎙',name:'Premier Débat',       desc:'Terminez votre premier débat',            check:u=>u.debates>=1},
  {id:'first_win',     icon:'🏅',name:'Première Victoire',   desc:'Remportez votre premier débat',           check:u=>u.wins>=1},
  {id:'debates_5',     icon:'📋',name:'5 Débats',            desc:'Participez à 5 débats',                   check:u=>u.debates>=5},
  {id:'debates_10',    icon:'🔟',name:'10 Débats',           desc:'Participez à 10 débats',                  check:u=>u.debates>=10},
  {id:'debates_100',   icon:'💯',name:'Centurion',           desc:'100 débats au total',                     check:u=>u.debates>=100},
  {id:'streak_5',      icon:'🔥',name:'Série ×5',            desc:'5 victoires consécutives',                check:u=>(u.streak||0)>=5},
  {id:'streak_10',     icon:'⚡',name:'Invincible ×10',      desc:'10 victoires consécutives',               check:u=>(u.streak||0)>=10},
  {id:'perfect_logic', icon:'🧠',name:'Logique Parfaite',    desc:'Score logique de 10/10',                  check:u=>(u.bestLogic||0)>=9.5},
  {id:'perfect_reb',   icon:'🛡',name:'Réfutation Parfaite', desc:'Score réfutation de 10/10',               check:u=>(u.bestRebuttal||0)>=9.5},
  {id:'top100',        icon:'👑',name:'Élite Top 100',       desc:'Entrez dans le top 100 mondial',          check:u=>(u.globalRank||9999)<=100},
  {id:'args_100',      icon:'📜',name:'100 Arguments',       desc:'Soumettez 100 arguments au total',        check:u=>(u.totalArgs||0)>=100},
  {id:'rank_up_1',     icon:'🗣',name:'Rhéteur Certifié',    desc:'Atteignez le rang Rhéteur (1050)',        check:u=>u.elo>=1050},
  {id:'rank_up_2',     icon:'🦉',name:'Philosophe Certifié', desc:'Atteignez le rang Philosophe (1500)',     check:u=>u.elo>=1500},
];

/* ── CITATIONS DE SAGESSE (pop-up après victoire / défaite) ───────────────── */
const WISDOM_QUOTES={
  win:[
    {quote:"La victoire appartient au plus persévérant.",author:"Napoléon Bonaparte"},
    {quote:"Il n'y a pas de vent favorable pour celui qui ne sait pas où il va.",author:"Sénèque"},
    {quote:"Le courage, c'est de chercher la vérité et de la dire.",author:"Jean Jaurès"},
    {quote:"L'art de la rhétorique consiste à parler de façon à convaincre.",author:"Aristote"},
    {quote:"La parole est moitié à celui qui parle, moitié à celui qui écoute.",author:"Montaigne"},
    {quote:"Qui n'a pas l'esprit de son âge, de son âge a tout le malheur.",author:"Voltaire"},
    {quote:"Donnez-moi un point d'appui et un levier et je soulèverai le monde.",author:"Archimède"},
  ],
  loss:[
    {quote:"L'échec est le fondement de la réussite.",author:"Lao-Tseu"},
    {quote:"Un homme sage parle parce qu'il a quelque chose à dire ; un fou parce qu'il doit dire quelque chose.",author:"Platon"},
    {quote:"Connais-toi toi-même.",author:"Socrate"},
    {quote:"Celui qui apprend mais ne pense pas est perdu. Celui qui pense mais n'apprend pas est en grand danger.",author:"Confucius"},
    {quote:"On n'apprend pas de ses succès, on apprend de ses erreurs.",author:"Albert Einstein"},
    {quote:"La patience est la mère de toutes les vertus.",author:"Cicéron"},
    {quote:"Nul ne peut atteindre l'aube sans passer par le chemin de la nuit.",author:"Khalil Gibran"},
  ],
};

/* ── UTILS ─────────────────────────────────────────────────── */
const initS  =()=>({relevance:5,logic:5,evidence:5,rebuttal:5,clarity:5});
const gScore =s=>CRITERIA.reduce((a,c)=>a+(s[c.key]||5)*c.weight,0);
const fmt    =s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const clamp  =(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const lerp   =(a,b,t)=>a+(b-a)*t;
const uid    =()=>Math.random().toString(36).slice(2,9);
const rand4  =()=>Math.random().toString(36).slice(2,6).toUpperCase();
const fmtD   =d=>new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
const rnd    =(lo,hi)=>Math.floor(Math.random()*(hi-lo+1))+lo;
const pct    =(a,b)=>b?Math.round(a/b*100):0;

const SS=async(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const SG=async(k)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):null}catch{return null}};

/* ── SUPABASE CLIENT ───────────────────────────────────────────────────────────
 * Valeurs injectées depuis .env.production / .env.development au build Vite.
 * Ne jamais coller la service_role_key ici — uniquement l'anon key publique.
 * ─────────────────────────────────────────────────────────────────────────── */
const SB=createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Upsert profil utilisateur → table "profiles"
const sbUpsertProfile=async u=>{
  if(!u?.id)return;
  console.log('[SB] sbUpsertProfile appelé pour:', u.id, u.name);
  try{
    const {data,error}=await SB.from('profiles').upsert({
      id:u.id,name:u.name,email:u.email||null,avatar:u.avatar||null,
      elo:u.elo,debates:u.debates,wins:u.wins,losses:u.losses,draws:u.draws,
      streak:u.streak,xp:u.xp,level:u.level||1,
      total_args:u.totalArgs||0,best_logic:u.bestLogic||0,best_rebuttal:u.bestRebuttal||0,
      elo_history:u.eloHistory||[u.elo],
      achievements:u.achievements||[],
      academy_id:u.academyId||null,
      mvp_count:u.mvp_count||0,
      tier:u.tier||'Beginner',
      peak_elo:u.peak_elo||u.elo||1000,
      updated_at:new Date().toISOString()
    },{onConflict:'id'});
    if(error){console.error('[SB] ❌ profile error:',error.message,error.code,error.details);}
    else{console.log('[SB] ✅ profile upsert OK',data);}
  }catch(e){console.error('[SB] profile exception',e.message)}
};

// Sauvegarde débat → table "debates"
const sbSaveDebate=async(debId,cfg,report,scoresA,scoresB,elapsed,won,draw,deltaA)=>{
  console.log('[SB] sbSaveDebate appelé, debId:', debId);
  try{
    const {data,error}=await SB.from('debates').upsert({
      id:debId,topic:cfg.topic,format:cfg.format||'standard',mode:cfg.mode||'bot',
      player_a_name:cfg.nameA,player_b_name:cfg.nameB,
      bot_config:cfg.botConfig||null,
      score_a:scoresA,score_b:scoresB,
      winner_name:report?.winner||null,verdict:report?.verdict||null,
      result:won?'win':draw?'draw':'loss',
      elo_delta_a:deltaA||0,elapsed_seconds:elapsed,
      ended_at:new Date().toISOString()
    },{onConflict:'id'});
    if(error){console.error('[SB] ❌ debate error:',error.message,error.code,error.details);}
    else{console.log('[SB] ✅ debate upsert OK',data);}
  }catch(e){console.error('[SB] debate exception',e.message)}
};

// Sauvegarde messages (transcript) → table "debate_messages"
const sbSaveMessages=async(debId,tx)=>{
  if(!debId||!tx?.length)return;
  try{
    const rows=tx.map(e=>({
      debate_id:debId,side:e.side,raw:e.raw,formalized:e.formalized||null,
      type:e.type||null,phase:e.phase||null,time_elapsed:e.time||null,
      strength:e.strength||null,scores:e.scores||null
    }));
    const {data,error}=await SB.from('debate_messages').insert(rows);
    if(error){console.error('[SB] ❌ messages error:',error.message,error.code);}
    else{console.log('[SB] ✅ messages insert OK',rows.length,'lignes');}
  }catch(e){console.error('[SB] messages exception',e.message)}
};

// Sauvegarde scores finaux → table "debate_scores"
const sbSaveScores=async(debId,scoresA,scoresB)=>{
  if(!debId)return;
  try{
    const {data,error}=await SB.from('debate_scores').insert([
      {debate_id:debId,side:'A',relevance:scoresA.relevance,logic:scoresA.logic,evidence:scoresA.evidence,rebuttal:scoresA.rebuttal,clarity:scoresA.clarity,total:gScore(scoresA)},
      {debate_id:debId,side:'B',relevance:scoresB.relevance,logic:scoresB.logic,evidence:scoresB.evidence,rebuttal:scoresB.rebuttal,clarity:scoresB.clarity,total:gScore(scoresB)}
    ]);
    if(error){console.error('[SB] ❌ scores error:',error.message,error.code);}
    else{console.log('[SB] ✅ scores insert OK');}
  }catch(e){console.error('[SB] scores exception',e.message)}
};

// Sauvegarde historique ELO → table "elo_history"
const sbSaveElo=async(userId,debId,elo,delta)=>{
  if(!userId)return;
  try{
    const {data,error}=await SB.from('elo_history').insert({
      user_id:userId,debate_id:debId,elo,delta,
      created_at:new Date().toISOString()
    });
    if(error){console.error('[SB] ❌ elo_history error:',error.message,error.code);}
    else{console.log('[SB] ✅ elo_history insert OK');}
  }catch(e){console.error('[SB] elo_history exception',e.message)}
};

// Sauvegarde nouveaux achievements → table "achievements"
const sbSaveAchievements=async(userId,newAchIds)=>{
  if(!userId||!newAchIds?.length)return;
  try{
    const rows=newAchIds.map(achievement_id=>({
      user_id:userId,achievement_id,
      unlocked_at:new Date().toISOString()
    }));
    await SB.from('achievements').upsert(rows,{onConflict:'user_id,achievement_id',ignoreDuplicates:true});
  }catch(e){console.warn('[SB] achievements',e.message)}
};

const getBadge =elo=>BADGES.slice().reverse().find(b=>elo>=b.min)||BADGES[0];
const getNextB =elo=>{const i=BADGES.findIndex(b=>b.id===getBadge(elo).id);return i<BADGES.length-1?BADGES[i+1]:null};
const rankPct  =elo=>{const cur=getBadge(elo),nxt=getNextB(elo);if(!nxt)return 100;return Math.round(((elo-cur.min)/(nxt.min-cur.min))*100)};

function applyScore(prev,scores,alpha=.35){
  if(!scores)return prev;
  return Object.fromEntries(CRITERIA.map(c=>[c.key,clamp(lerp(prev[c.key]||5,scores[c.key]??prev[c.key]??5,alpha),0,10)]));
}

// ELO – K=40 (<10 debates), K=20 (<30), K=10 (30+)
function calcELO(rA,rB,sA,sB){
  const d=Math.abs(sA-sB);
  const s=d<0.3?0.5:d<1?(sA>sB?0.6:0.4):d<2?(sA>sB?0.75:0.25):(sA>sB?1:0);
  const eA=1/(1+Math.pow(10,(rB-rA)/400));
  return{sA:s,sB:1-s,eA,eB:1-eA};
}
function applyELO(rA,rB,sA,sB,eA,eB,dA,dB){
  const kA=dA<10?40:dA<30?20:10;
  const kB=dB<10?40:dB<30?20:10;
  return{newRA:Math.round(rA+kA*(sA-eA)),newRB:Math.round(rB+kB*(sB-eB)),deltaA:Math.round(kA*(sA-eA)),deltaB:Math.round(kB*(sB-eB))};
}

function checkAchievements(before,after){
  return ACHIEVEMENTS_DEF.filter(a=>!before.achievements?.includes(a.id)&&a.check(after)).map(a=>a.id);
}


/* ── ACADEMIES ─────────────────────────────────────────────── */
const ACADEMY_TYPES=[
  {id:'academy',label:'Académie',icon:'🏛'},
  {id:'university',label:'Université',icon:'📐'},
  {id:'school',label:'École',icon:'📖'},
  {id:'circle',label:'Cercle',icon:'◎'},
  {id:'society',label:'Société',icon:'⚜'},
];
const SEED_ACADEMIES=[
  {id:'ac1',name:'Académie Socratique',type:'academy',icon:'🏛',desc:'Débat philosophique au sens classique. La recherche de la vérité par le questionnement mutuel.',founder:'SocrateFR',members:['s1','s2','s4'],avgElo:1744,created:Date.now()-90*86400000,wins:234,debates:310},
  {id:'ac2',name:'École des Rhéteurs',type:'school',icon:'📜',desc:'Maîtrise de l\'art oratoire. Arguments percutants, style élaboré.',founder:'RhéteurX',members:['s3','s6'],avgElo:1609,created:Date.now()-60*86400000,wins:145,debates:198},
  {id:'ac3',name:'Cercle des Logiciens',type:'circle',icon:'⚖️',desc:'Rigueur formelle, démonstration par l\'absurde, logique déductive.',founder:'LogiqueClaire',members:['s5','s7','s8'],avgElo:1532,created:Date.now()-45*86400000,wins:98,debates:142},
  {id:'ac4',name:'Société Critique',type:'society',icon:'🔍',desc:'Esprit critique systématique. Déconstruction des argumentaires adverses.',founder:'AnaLyse7',members:['s9','s10'],avgElo:1214,created:Date.now()-20*86400000,wins:44,debates:67},
];
async function mockGoogleLogin(){
  // 🔴 BUG CORRIGÉ : l'ancienne logique réutilisait dix_mock_session_v6 de façon
  // permanente, ce qui faisait retourner TOUJOURS le premier utilisateur créé
  // (souvent "Alexandre Martin") même après déconnexion.
  //
  // Nouvelle logique : on réutilise la session mock SEULEMENT si elle est encore
  // valide du point de vue de la session Supabase courante. Si Supabase n'a pas
  // de session active, on crée un nouveau profil frais pour éviter la réutilisation.
  try{
    // Vérifier si une session Supabase est active
    const{data:{session}}=await SB.auth.getSession();
    if(!session){
      // Pas de session Supabase → créer un nouveau profil mock à chaque fois
      // (ne pas réutiliser l'ancien pour éviter d'afficher le mauvais utilisateur)
      localStorage.removeItem('dix_mock_session_v6');
    } else {
      // Session Supabase active → réutiliser seulement si c'est le même utilisateur
      const saved=localStorage.getItem('dix_mock_session_v6');
      if(saved){
        const parsed=JSON.parse(saved);
        if(parsed?.id&&(parsed.email===session.user?.email||parsed.id===session.user?.id)){
          return parsed; // même utilisateur : on garde le profil persistant
        }
        // Sinon : purge (session appartient à quelqu'un d'autre)
        localStorage.removeItem('dix_mock_session_v6');
      }
    }
  }catch{
    // En cas d'erreur Supabase, on repart sur un profil frais par sécurité
    localStorage.removeItem('dix_mock_session_v6');
  }
  const names=['Camille Dupont','Lucas Bernard','Emma Thomas','Nathan Petit','Sofia Garcia','Théo Rousseau','Jade Lefebvre'];
  const name=names[rnd(0,names.length-1)];
  const id=`mock_${Date.now()}_${uid()}`;
  const fresh={
    id,name,email:`${name.toLowerCase().replace(/ /g,'.')}@dialectix.app`,
    avatar:`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EAE3D6&color=2C4A6E&size=80`,
    elo:1000,debates:0,wins:0,losses:0,draws:0,streak:0,
    xp:0,level:1,totalArgs:0,bestLogic:0,bestRebuttal:0,
    achievements:[],history:[],eloHistory:[1000],
    joinedAt:Date.now(),dailyStreak:0,weeklyStreak:0,globalRank:null,
  };
  try{localStorage.setItem('dix_mock_session_v6',JSON.stringify(fresh));}catch{}
  return fresh;
}

/* ── AI CALLS ──────────────────────────────────────────────── */
async function aiAnalyze(raw,side,name,topic,hist,phase){
  // callClaude now returns a structured score object — map it to the shape
  // expected by submitEntry (formalized, type, scores, var_event, commentary, strength)
  // and also carry the new fields (overall_score, analysis, improvement_advice, etc.)
  try{
    const scored=await callClaude(raw,topic,700);
    if(!scored)return null;
    return{
      formalized:raw,
      type:scored.argument_style||'argument',
      scores:{relevance:scored.relevance,logic:scored.logic,evidence:scored.evidence,rebuttal:scored.rebuttal,clarity:scored.clarity},
      var_event:scored.fallacies?.length>0
        ?{detected:true,type:scored.fallacies[0],negative:true,explanation:scored.fallacies.join(', '),impact_criterion:'logic',impact_delta:-0.5}
        :{detected:false},
      commentary:scored.analysis,
      strength:scored.overall_score,
      // ── new Claude scoring fields ──
      overall_score:scored.overall_score,
      confidence:scored.confidence,
      analysis:scored.analysis,
      improvement_advice:scored.improvement_advice,
      strengths:scored.strengths||[],
      weaknesses:scored.weaknesses||[],
    };
  }catch{return null}
}

async function aiBotRespond(topic,botStyle,botName,history,humanLast){
  // Routes through the NestJS backend — API key stays server-side
  const h=history.slice(-6).map(e=>`[${e.side==='A'?'Humain':'Bot'}] ${e.formalized||e.raw}`).join('\n');
  try{
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),10_000);
    const res=await fetch(`${BACKEND_URL}/ai/respond`,{method:'POST',
      signal:controller.signal,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({argument:humanLast,style:botStyle,phase:'debate',topic,history:h,botName})});
    clearTimeout(timeoutId);
    if(!res.ok){console.error('[BOT] Backend HTTP',res.status);return 'Je maintiens ma position.';}
    const d=await res.json();
    return d.response||'Je maintiens ma position.';
  }catch{return 'Je maintiens ma position.'}
}

async function aiReport(tx,nA,nB,sA,sB,vars,topic,elapsed,format){
  // Routes through the NestJS backend — API key stays server-side
  // Pre-compute formatted values the backend needs to build the prompt
  const aA=tx.filter(e=>e.side==='A').map(e=>e.formalized||e.raw).join(' | ');
  const aB=tx.filter(e=>e.side==='B').map(e=>e.formalized||e.raw).join(' | ');
  try{
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),15_000);
    const res=await fetch(`${BACKEND_URL}/ai/report`,{method:'POST',
      signal:controller.signal,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        nA,nB,topic,
        format:format||'standard',
        scoreA:parseFloat(gScore(sA).toFixed(2)),
        scoreB:parseFloat(gScore(sB).toFixed(2)),
        elapsedFmt:fmt(elapsed),
        argsA:aA.slice(0,350),
        argsB:aB.slice(0,350),
        varCount:vars.length
      })});
    clearTimeout(timeoutId);
    if(!res.ok){console.error('[REPORT] Backend HTTP',res.status);return null;}
    return await res.json();
  }catch{return null}
}

/* ── SPEECH ────────────────────────────────────────────────── */
function useSpeech(onFinal,onInterim,onError=()=>{}){
  const ref=useRef(null);
  const [active,setActive]=useState(false);
  const start=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){onError('Reconnaissance vocale non disponible. Utilisez Chrome ou Edge.');return}
    if(ref.current)ref.current.stop();
    const r=new SR();r.lang='fr-FR';r.continuous=true;r.interimResults=true;
    r.onresult=e=>{let i='',f='';for(let x=e.resultIndex;x<e.results.length;x++){const t=e.results[x][0].transcript;if(e.results[x].isFinal)f+=t;else i+=t}if(i)onInterim(i);if(f.trim())onFinal(f.trim())};
    r.onerror=()=>setActive(false);r.onend=()=>setActive(false);
    r.start();ref.current=r;setActive(true);
  },[onFinal,onInterim]);
  const stop=useCallback(()=>{ref.current?.stop();setActive(false)},[]);
  const toggle=useCallback(()=>{active?stop():start()},[active,start,stop]);
  return{active,toggle,stop};
}

/* ══════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════ */
const CSS=`
${GF}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{${[
  '--bg:#F6F1E8','--s0:#F3EDE0','--s1:#EFE8D8','--s2:#EAE0CC','--s3:#E2D5BB','--s4:#D8C9A8',
  '--bd:#D4C8A8','--bd2:#C2B48A','--bd3:#A89868',
  '--txt:#1A1A1A','--dim:#5C4F38','--muted:#8A7860',
  '--A:#2C4A6E','--B:#8C3A30','--G:#3A6E52','--Y:#C6A15B','--O:#A05A2C','--P:#5A3A6E','--T2:#2C6E5A',
  '--Ag:rgba(44,74,110,.08)','--Bg:rgba(140,58,48,.08)','--Gg:rgba(58,110,82,.08)',
  '--glA:0 2px 12px rgba(44,74,110,.14)','--glB:0 2px 12px rgba(140,58,48,.14)','--glG:0 2px 12px rgba(58,110,82,.12)',
  "--fH:'Cinzel',serif","--fC:'Cormorant Garamond',serif","--fM:'JetBrains Mono',monospace","--fB:'Inter',sans-serif",
  '--sh:0 1px 3px rgba(40,28,8,.06),0 4px 16px rgba(40,28,8,.05)',
  '--sh2:0 2px 8px rgba(40,28,8,.08),0 12px 32px rgba(40,28,8,.06)',
  '--sh3:0 4px 20px rgba(40,28,8,.10),0 20px 60px rgba(40,28,8,.08)',
].join(';')}}
html,body{height:100%;background:var(--bg);color:var(--txt);font-family:var(--fB);overflow:hidden;font-size:14px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--s2)}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
input,button,textarea,select{font-family:inherit}
.app{display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden;background:var(--bg)}

/* ── NAV ── */
.nav{display:flex;align-items:center;height:54px;flex-shrink:0;border-bottom:1px solid var(--bd);background:rgba(246,241,232,.97);backdrop-filter:blur(20px);position:relative;z-index:50;padding:0 20px}
.nav-logo{font-family:var(--fH);font-size:.95rem;letter-spacing:.22em;color:var(--txt);margin-right:20px;cursor:pointer;flex-shrink:0;line-height:1;font-weight:600}
.nav-logo b{color:var(--Y)}
.nav-links{display:flex;align-items:stretch;height:100%;flex:1;gap:0}
.nl{display:flex;align-items:center;gap:5px;padding:0 14px;height:100%;cursor:pointer;font-family:var(--fB);font-size:.72rem;font-weight:500;letter-spacing:.01em;color:var(--muted);border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;border-top:none;border-left:none;border-right:none;background:transparent}
.nl:hover{color:var(--txt);background:rgba(40,28,8,.03)}
.nl.on{color:var(--A);border-bottom-color:var(--Y);font-weight:600}
.nl.hot{color:var(--O)}
.nav-r{display:flex;align-items:center;gap:10px;margin-left:auto}

/* ── BURGER MENU (mobile only) ── */
.nav-burger{display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:40px;height:40px;background:transparent;border:none;cursor:pointer;padding:6px;border-radius:6px;flex-shrink:0}
.nav-burger:hover{background:rgba(40,28,8,.05)}
.burger-line{display:block;width:22px;height:2px;background:var(--dim);border-radius:2px;transition:all .25s ease}
.burger-line.open:nth-child(1){transform:translateY(7px) rotate(45deg)}
.burger-line.open:nth-child(2){opacity:0;transform:scaleX(0)}
.burger-line.open:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
@media(max-width:767px){.nav-burger{display:flex}}

/* ── BUTTONS ── */
.btn{font-family:var(--fB);font-size:.72rem;font-weight:600;letter-spacing:.01em;padding:8px 18px;border-radius:5px;border:1px solid transparent;cursor:pointer;transition:all .18s;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;line-height:1}
.btn:disabled{opacity:.35;cursor:not-allowed}
.b-a{background:var(--A);color:#fff;border-color:var(--A);box-shadow:var(--glA)}
.b-a:hover:not(:disabled){background:#1d3352;border-color:#1d3352}
.b-b{background:transparent;color:var(--B);border-color:var(--B)}
.b-b:hover:not(:disabled){background:var(--B);color:#fff}
.b-g{background:var(--G);color:#fff;border-color:var(--G);box-shadow:var(--glG)}
.b-g:hover:not(:disabled){background:#2a5038;border-color:#2a5038}
.b-y{background:var(--Y);color:#fff;border-color:var(--Y)}
.b-y:hover:not(:disabled){background:#a8843a;border-color:#a8843a}
.b-ghost{background:transparent;color:var(--dim);border-color:var(--bd2)}
.b-ghost:hover:not(:disabled){color:var(--txt);border-color:var(--bd3);background:rgba(40,28,8,.04)}
.b-google{background:#fff;color:#111;border-color:var(--bd2);font-weight:600;box-shadow:var(--sh)}
.b-google:hover{background:var(--s1)}
.b-sm{padding:5px 12px;font-size:.67rem}
.b-lg{padding:11px 26px;font-size:.76rem}
.b-xl{padding:14px 34px;font-size:.82rem}

/* ── CHIPS ── */
.chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;border:1px solid var(--bd);background:rgba(246,241,232,.8);font-family:var(--fB);font-size:.64rem;font-weight:500;color:var(--dim);white-space:nowrap}
.chip-g{border-color:rgba(58,110,82,.3);background:rgba(58,110,82,.07);color:var(--G)}
.chip-y{border-color:rgba(198,161,91,.3);background:rgba(198,161,91,.08);color:var(--O)}
.chip-p{border-color:rgba(90,58,110,.3);background:rgba(90,58,110,.07);color:var(--P)}
.chip-r{border-color:rgba(140,58,48,.3);background:rgba(140,58,48,.07);color:var(--B)}
.chip-a{border-color:rgba(44,74,110,.3);background:rgba(44,74,110,.07);color:var(--A)}

/* ── CARDS ── */
.card{background:#FDFAF4;border:1px solid var(--bd);border-radius:8px;padding:18px;transition:all .2s;box-shadow:var(--sh)}
.card-a{border-color:rgba(44,74,110,.3);box-shadow:var(--glA);border-left:3px solid var(--A)}
.card-g{border-color:rgba(58,110,82,.28);box-shadow:var(--glG);border-left:3px solid var(--G)}

/* ── INPUTS ── */
.fi{width:100%;background:#FDFAF4;border:1px solid var(--bd2);border-radius:5px;padding:9px 13px;color:var(--txt);font-size:.84rem;outline:none;transition:all .2s;box-shadow:inset 0 1px 3px rgba(40,28,8,.05)}
.fi:focus{border-color:var(--A);box-shadow:0 0 0 3px rgba(44,74,110,.1),inset 0 1px 3px rgba(40,28,8,.04)}
.fi-label{font-family:var(--fB);font-size:.68rem;font-weight:600;color:var(--dim);margin-bottom:5px;display:block}

/* ── PAGES ── */
.page{flex:1;overflow-y:auto;padding:24px}

/* ── PROGRESS ── */
.prog{width:100%;height:2px;background:var(--bd);flex-shrink:0;overflow:hidden}
.prog-bar{height:100%;background:linear-gradient(90deg,var(--A),var(--G));transition:width .4s ease}
.xp-bar{height:4px;background:var(--bd);border-radius:3px;overflow:hidden}
.xp-fill{height:100%;background:linear-gradient(90deg,var(--Y),var(--O));border-radius:3px;transition:width .8s cubic-bezier(.4,0,.2,1)}

/* ── TOAST ── */
.toast{position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:700;background:#FDFAF4;border:1px solid var(--bd2);border-radius:8px;padding:10px 20px;font-family:var(--fB);font-size:.72rem;font-weight:500;color:var(--txt);animation:toastIn .25s ease;box-shadow:var(--sh2);display:flex;align-items:center;gap:8px;pointer-events:none;white-space:nowrap}
@keyframes toastIn{from{opacity:0;top:52px}to{opacity:1;top:62px}}

/* ── ANIMATIONS ── */
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes td{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
@keyframes mmPulse{0%{box-shadow:0 0 0 0 rgba(44,74,110,.3)}70%{box-shadow:0 0 0 20px rgba(44,74,110,0)}100%{box-shadow:0 0 0 0 rgba(44,74,110,0)}}
@keyframes promoIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
@keyframes recGlow{0%,100%{box-shadow:inset 0 0 0 2px rgba(140,58,48,.1)}50%{box-shadow:inset 0 0 0 2px rgba(140,58,48,.32)}}
@keyframes micPulse{0%,100%{box-shadow:0 0 6px rgba(140,58,48,.3)}50%{box-shadow:0 0 18px rgba(140,58,48,.55)}}
@keyframes mmRing{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes scoreBump{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes glow{0%,100%{opacity:1}50%{opacity:.7}}

.spin{display:inline-block;width:13px;height:13px;border:2px solid var(--bd2);border-top-color:var(--A);border-radius:50%;animation:spin .7s linear infinite}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:8px;padding:28px}
.empty-i{font-size:1.5rem;opacity:.25}
.empty-t{font-family:var(--fB);font-size:.66rem;font-weight:500;color:var(--muted);text-align:center}

/* ── BADGE SYSTEM ── */
.badge-pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:3px;font-family:var(--fB);font-size:.62rem;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.bd-disc{background:rgba(100,90,80,.08);color:#6A5A48;border:1px solid rgba(100,90,80,.2)}
.bd-scr {background:rgba(120,80,40,.09);color:#8A5A28;border:1px solid rgba(120,80,40,.22)}
.bd-rhet{background:rgba(80,80,90,.08);color:#505060;border:1px solid rgba(80,80,90,.2)}
.bd-dial{background:rgba(198,161,91,.12);color:#8A6A20;border:1px solid rgba(198,161,91,.3)}
.bd-log {background:rgba(44,74,110,.09);color:#2C4A6E;border:1px solid rgba(44,74,110,.25)}
.bd-phi {background:rgba(58,110,82,.09);color:#3A6E52;border:1px solid rgba(58,110,82,.24)}
.bd-arch{background:rgba(90,58,110,.09);color:#5A3A6E;border:1px solid rgba(90,58,110,.24)}
.bd-mast{background:rgba(160,90,44,.1);color:#A05A2C;border:1px solid rgba(160,90,44,.28)}
.bd-sage{background:linear-gradient(135deg,rgba(198,161,91,.15),rgba(90,58,110,.1));color:#8A6A20;border:1px solid rgba(198,161,91,.4);box-shadow:0 1px 4px rgba(198,161,91,.15)}

.av-wrap{position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:2px}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:2px solid var(--bd2)}
.av img{width:100%;height:100%;object-fit:cover}
.av-badge-tag{font-family:var(--fB);font-size:.42rem;text-transform:uppercase;letter-spacing:.04em;padding:1px 5px;border-radius:3px;font-weight:700;line-height:1.3}

.elo-box{display:inline-flex;flex-direction:column;align-items:center;padding:10px 18px;border-radius:8px;border:1px solid rgba(198,161,91,.3);background:rgba(198,161,91,.06);box-shadow:var(--sh)}
.elo-v{font-family:var(--fH);font-size:2rem;color:var(--Y);letter-spacing:.04em;line-height:1}
.elo-l{font-family:var(--fB);font-size:.6rem;font-weight:500;color:var(--muted);margin-top:3px;letter-spacing:.08em}
.elo-delta{font-family:var(--fM);font-size:.64rem;font-weight:700;padding:2px 8px;border-radius:4px}
.d-up{background:rgba(58,110,82,.1);color:var(--G);border:1px solid rgba(58,110,82,.22)}
.d-dn{background:rgba(140,58,48,.08);color:var(--B);border:1px solid rgba(140,58,48,.2)}

.rank-bar-wrap{display:flex;flex-direction:column;gap:5px}
.rank-bar-labels{display:flex;justify-content:space-between;font-family:var(--fB);font-size:.6rem;font-weight:500;color:var(--muted)}
.rank-bar-track{height:4px;background:var(--bd);border-radius:3px;overflow:hidden}
.rank-bar-fill{height:100%;border-radius:3px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}

/* ── PROMOTION OVERLAY ── */
.promo-overlay{position:fixed;inset:0;background:rgba(246,241,232,.92);backdrop-filter:blur(16px);z-index:800;display:flex;align-items:center;justify-content:center;animation:fadeIn .3s ease}
.promo-box{background:#FDFAF4;border-radius:12px;padding:44px;text-align:center;max-width:400px;width:100%;animation:promoIn .5s cubic-bezier(.22,1,.36,1);border:1px solid var(--bd2);box-shadow:var(--sh3)}
.promo-icon{font-size:3.8rem;animation:pulse 2s infinite;margin-bottom:16px}
.promo-t{font-family:var(--fC);font-size:1rem;font-style:italic;color:var(--muted)}
.promo-rank{font-family:var(--fH);font-size:2.4rem;letter-spacing:.14em;color:var(--txt);margin-top:10px}

/* ── ACHIEVEMENTS ── */
.ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:8px}
.ach-card{background:#FDFAF4;border:1px solid var(--bd);border-radius:7px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;transition:all .2s;box-shadow:var(--sh)}
.ach-card.unlocked{border-color:rgba(198,161,91,.35);background:rgba(198,161,91,.04);box-shadow:0 1px 8px rgba(198,161,91,.1)}
.ach-card.locked{opacity:.38;filter:grayscale(.8)}
.ach-icon{font-size:1.5rem}
.ach-name{font-family:var(--fB);font-size:.62rem;font-weight:700;color:var(--txt);letter-spacing:.02em}
.ach-desc{font-family:var(--fB);font-size:.58rem;color:var(--muted);line-height:1.55}

/* ── LEADERBOARD ── */
.lb-head{display:grid;grid-template-columns:44px 1fr 80px 80px 70px;gap:8px;padding:8px 16px;font-family:var(--fB);font-size:.65rem;font-weight:700;color:var(--muted);letter-spacing:.04em;border-bottom:2px solid var(--bd);margin-bottom:4px}
.lb-row{display:grid;grid-template-columns:44px 1fr 80px 80px 70px;gap:8px;align-items:center;padding:12px 16px;border-radius:6px;cursor:pointer;transition:all .18s;border:1px solid transparent}
.lb-row:hover{background:#FDFAF4;border-color:var(--bd);box-shadow:var(--sh)}
.lb-row.me{background:rgba(44,74,110,.05);border-color:rgba(44,74,110,.18)}
.lb-rank{font-family:var(--fH);font-size:1.1rem;text-align:center;line-height:1}
.rank-1{color:var(--Y)}.rank-2{color:#8A8A8A}.rank-3{color:#9A7040}

/* ── PHASE BAR ── */
.phase-bar{display:flex;align-items:center;gap:4px;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--bd);flex-shrink:0;overflow-x:auto}
.phase-step{display:flex;align-items:center;gap:5px;padding:3px 10px;border-radius:4px;font-family:var(--fB);font-size:.62rem;font-weight:500;transition:all .2s;white-space:nowrap}
.phase-done{color:var(--G);background:rgba(58,110,82,.07)}
.phase-active{color:var(--O);background:rgba(198,161,91,.12);border:1px solid rgba(198,161,91,.3)}
.phase-todo{color:var(--muted)}
.phase-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.phase-sep{color:var(--muted);font-size:.7rem;opacity:.35}

/* ── ARENA ── */
.arena{display:grid;grid-template-columns:1fr 284px 1fr;flex:1;overflow:hidden}
.pane{display:flex;flex-direction:column;overflow:hidden;border-right:1px solid var(--bd)}
.pane:last-child{border-right:none}
.ph{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--bd);background:var(--s1);flex-shrink:0}
.ph-t{font-family:var(--fH);font-size:.82rem;letter-spacing:.14em}
.ph-m{font-family:var(--fB);font-size:.62rem;font-weight:500;color:var(--muted)}
.pb{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
.entry{display:flex;gap:9px;padding:10px 12px;background:#FDFAF4;border-radius:7px;border-left:3px solid var(--bd);border:1px solid var(--bd);animation:slideUp .22s ease;box-shadow:var(--sh)}
.ea{border-left-color:var(--A)!important}.eb{border-left-color:var(--B)!important}
.emeta{flex-shrink:0;min-width:60px}
.ebadge{font-family:var(--fB);font-size:.64rem;font-weight:700;letter-spacing:.02em;padding:2px 7px;border-radius:3px;display:inline-block;white-space:nowrap}
.eba{background:rgba(44,74,110,.1);color:var(--A);border:1px solid rgba(44,74,110,.22)}
.ebb{background:rgba(140,58,48,.1);color:var(--B);border:1px solid rgba(140,58,48,.2)}
.etime{font-family:var(--fM);font-size:.52rem;color:var(--muted);margin-top:3px}
.etype{font-family:var(--fB);font-size:.56rem;font-weight:600;color:var(--O);margin-top:2px}
.etext{font-size:.8rem;line-height:1.68;color:var(--txt);flex:1;font-family:var(--fB)}
.eraw{font-size:.68rem;color:var(--muted);font-family:var(--fC);font-style:italic;margin-top:4px;padding-top:4px;border-top:1px solid var(--bd);line-height:1.6}
.escores{display:flex;gap:3px;margin-top:4px;flex-wrap:wrap}
.escr{font-family:var(--fM);font-size:.48rem;padding:2px 5px;border-radius:3px;background:var(--s2)}
.typing{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--s1);border-radius:7px;border-left:3px solid var(--bd);border:1px solid var(--bd)}
.td{width:5px;height:5px;border-radius:50%;background:var(--bd3);animation:td .9s infinite}
.td:nth-child(2){animation-delay:.2s}.td:nth-child(3){animation-delay:.4s}

/* ── VOICE ZONE ── */
.vzone{padding:10px 13px;border-top:1px solid var(--bd);flex-shrink:0;background:var(--s1)}
.vrow{display:flex;align-items:center;gap:9px}
.mic{width:38px;height:38px;border-radius:50%;border:2px solid;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.9rem;transition:all .2s;flex-shrink:0;background:transparent}
.mic-off{border-color:var(--bd2);color:var(--muted)}.mic-off:hover{border-color:var(--A);color:var(--A)}
.mic-on{border-color:var(--B);color:var(--B);animation:micPulse 1s infinite}
.man-row{display:flex;gap:6px;margin-top:7px}
.man-inp{flex:1;background:#FDFAF4;border:1px solid var(--bd2);border-radius:5px;padding:7px 10px;color:var(--txt);font-size:.8rem;outline:none;transition:all .2s;box-shadow:inset 0 1px 3px rgba(40,28,8,.05)}
.man-inp:focus{border-color:var(--A);box-shadow:0 0 0 3px rgba(44,74,110,.1)}
.sw-bar{display:flex;align-items:center;justify-content:center;gap:6px;padding:0 0 7px}
.sw-btn{flex:1;max-width:140px;padding:7px 10px;border-radius:5px;border:1px solid;cursor:pointer;font-family:var(--fB);font-size:.64rem;font-weight:600;transition:all .18s;background:transparent;display:flex;align-items:center;justify-content:center;gap:5px}
.sw-a{border-color:rgba(44,74,110,.3);color:var(--A)}.sw-a.sw-on{background:var(--Ag);border-color:var(--A)}
.sw-b{border-color:rgba(140,58,48,.3);color:var(--B)}.sw-b.sw-on{background:var(--Bg);border-color:var(--B)}

/* ── CENTER SCORES ── */
.shero{padding:13px;border-bottom:1px solid var(--bd);background:var(--s1)}
.svs{display:flex;align-items:center;gap:4px}
.ss{flex:1;text-align:center}
.sname{font-family:var(--fH);font-size:.8rem;letter-spacing:.1em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sname-a{color:var(--A)}.sname-b{color:var(--B)}
.sval{font-family:var(--fH);font-size:2.1rem;line-height:1;margin-top:3px}
.sval-a{color:var(--A)}.sval-b{color:var(--B)}
.sdelta{font-family:var(--fM);font-size:.54rem;margin-top:2px}
.sd-up{color:var(--G)}.sd-dn{color:var(--B)}.sd-eq{color:var(--muted)}
.svssep{font-family:var(--fC);font-size:1rem;color:var(--muted);flex-shrink:0;font-style:italic}
.sbar-wrap{margin-top:9px}
.sbar{height:3px;background:var(--bd);border-radius:2px;overflow:hidden;display:flex}
.sbar-a{background:linear-gradient(90deg,var(--A),rgba(44,74,110,.4));height:100%;transition:width .7s cubic-bezier(.4,0,.2,1)}
.sbar-b{background:linear-gradient(-90deg,var(--B),rgba(140,58,48,.4));height:100%;transition:width .7s cubic-bezier(.4,0,.2,1);margin-left:auto}
.sbar-lbl{display:flex;justify-content:space-between;font-family:var(--fM);font-size:.51rem;color:var(--muted);margin-top:3px}
.crits{display:flex;flex-direction:column;gap:5px;padding:8px}
.crit{background:#FDFAF4;border-radius:6px;padding:9px 11px;border:1px solid var(--bd);box-shadow:var(--sh)}
.crit-lbl{font-family:var(--fB);font-size:.58rem;font-weight:600;color:var(--muted);margin-bottom:5px;display:flex;justify-content:space-between}
.crit-w{font-size:.5rem;background:var(--s2);padding:1px 4px;border-radius:3px}
.crit-row{display:flex;align-items:center;gap:5px}
.cv{font-family:var(--fH);font-size:1.1rem;flex:0 0 32px;text-align:center}
.cv-a{color:var(--A)}.cv-b{color:var(--B)}
.cbar{flex:1;height:3px;background:var(--bd);border-radius:2px;overflow:hidden;display:flex}
.cba{background:var(--A);height:100%;border-radius:2px;transition:width .5s}
.cbb{background:var(--B);height:100%;border-radius:2px;margin-left:auto;transition:width .5s}
.feed-item{display:flex;gap:5px;padding:6px 8px;background:var(--s2);border-radius:5px;align-items:flex-start;border:1px solid var(--bd)}
.feed-txt{font-size:.68rem;color:var(--dim);flex:1;line-height:1.55;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-family:var(--fB)}
.tabs{display:flex;border-bottom:1px solid var(--bd);flex-shrink:0;background:var(--s1)}
.tab{flex:1;padding:8px 4px;font-family:var(--fB);font-size:.62rem;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s}
.tab.on{color:var(--A);border-color:var(--Y)}
.var-box{background:#FDFAF4;border-radius:7px;border:1px solid var(--bd);overflow:hidden;animation:slideUp .25s ease;box-shadow:var(--sh)}
.var-hd{display:flex;align-items:center;gap:7px;padding:8px 11px;border-bottom:1px solid var(--bd);background:rgba(198,161,91,.05)}
.var-num{font-family:var(--fB);font-size:.68rem;font-weight:700;padding:2px 7px;border-radius:3px;background:var(--Y);color:#fff}
.var-type{font-family:var(--fB);font-size:.62rem;font-weight:600;letter-spacing:.04em}
.var-neg{color:var(--B)}.var-pos{color:var(--G)}
.var-bd{padding:9px 11px}
.var-expl{font-size:.76rem;color:var(--txt);line-height:1.6;margin-bottom:4px;font-family:var(--fB)}
.var-imp{font-family:var(--fB);font-size:.6rem;color:var(--dim)}
.var-imp b{color:var(--O)}
.com{background:#FDFAF4;border-radius:7px;padding:11px;border:1px solid var(--bd);border-left:3px solid var(--A);animation:slideUp .25s ease;box-shadow:var(--sh)}
.com-lbl{font-family:var(--fB);font-size:.58rem;font-weight:700;color:var(--muted);margin-bottom:4px;letter-spacing:.05em}
.com-txt{font-size:.76rem;line-height:1.68;color:var(--dim);font-family:var(--fC);font-style:italic}
.pane.recording{animation:recGlow 2s infinite}

/* ── REPORT ── */
.ov{position:fixed;inset:0;background:rgba(246,241,232,.98);z-index:200;overflow-y:auto;padding:32px 24px;display:flex;justify-content:center}
.rep{max-width:860px;width:100%}
.rep-h{font-family:var(--fH);font-size:2.2rem;letter-spacing:.12em;line-height:1}
.rep-h b{color:var(--Y)}
.rep-sub{font-family:var(--fC);font-size:.82rem;font-style:italic;color:var(--muted);margin-top:5px;margin-bottom:24px}
.rep-sec{margin-bottom:22px}
.rep-st{font-family:var(--fH);font-size:.82rem;letter-spacing:.14em;color:var(--muted);border-bottom:1px solid var(--bd2);padding-bottom:7px;margin-bottom:12px}
.rep-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rep-card{background:#FDFAF4;border:1px solid var(--bd);border-radius:8px;padding:14px;box-shadow:var(--sh)}
.rep-cl{font-family:var(--fB);font-size:.6rem;font-weight:600;color:var(--muted);letter-spacing:.05em;margin-bottom:7px}
.rep-cv{font-family:var(--fH);font-size:1.8rem;line-height:1}
.winner-card{text-align:center;padding:24px;margin-bottom:22px;background:linear-gradient(135deg,rgba(44,74,110,.05),rgba(58,110,82,.04));border:1px solid var(--bd);border-radius:10px;box-shadow:var(--sh2)}
.wc-l{font-family:var(--fC);font-size:.8rem;font-style:italic;color:var(--muted);margin-bottom:7px}
.wc-name{font-family:var(--fH);font-size:2rem;letter-spacing:.1em}
.wc-v{font-family:var(--fB);font-size:.64rem;font-weight:500;color:var(--muted);margin-top:5px}
.wc-r{font-size:.78rem;color:var(--dim);margin-top:8px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.75;font-family:var(--fC);font-style:italic}
.tl-item{display:flex;gap:10px;padding:9px 12px;background:#FDFAF4;border-radius:6px;border-left:3px solid var(--bd);margin-bottom:5px;box-shadow:var(--sh);border:1px solid var(--bd)}
.tl-item.a{border-left-color:var(--A)}.tl-item.b{border-left-color:var(--B)}
.tl-t{font-family:var(--fM);font-size:.56rem;color:var(--muted);flex-shrink:0;width:42px}
.tl-main{font-size:.77rem;line-height:1.58;color:var(--txt);font-family:var(--fB)}
.tl-raw{font-size:.66rem;color:var(--muted);font-family:var(--fC);font-style:italic;margin-top:3px}
.ftag{font-family:var(--fB);font-size:.6rem;font-weight:600;padding:2px 8px;border-radius:3px;display:inline-block;margin:2px}
.ftag-bad{background:rgba(140,58,48,.09);border:1px solid rgba(140,58,48,.22);color:var(--B)}
.ftag-good{background:rgba(58,110,82,.07);border:1px solid rgba(58,110,82,.18);color:var(--G)}

/* ── ELO RESULT ── */
.elo-result{background:rgba(198,161,91,.06);border:1px solid rgba(198,161,91,.28);border-radius:10px;padding:20px;margin-bottom:20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;box-shadow:var(--sh)}
.funnel-msg{background:rgba(44,74,110,.05);border:1px solid rgba(44,74,110,.2);border-radius:8px;padding:14px;margin-top:14px;font-family:var(--fB);font-size:.72rem;color:var(--A);line-height:1.78}

/* ── HOME ── */
.home{flex:1;overflow-y:auto}
.home-hero{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px 30px;text-align:center;position:relative;border-bottom:1px solid var(--bd);overflow:hidden;background:linear-gradient(180deg,var(--s0) 0%,var(--bg) 100%)}
.home-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(198,161,91,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(198,161,91,.06) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(ellipse 90% 100% at 50% 0%,black 40%,transparent 100%);pointer-events:none}
.hero-t{font-family:var(--fH);font-size:3.4rem;letter-spacing:.2em;line-height:.9;color:var(--txt);position:relative;font-weight:700}
.hero-t b{color:var(--Y)}
.hero-sub{font-family:var(--fC);font-size:.95rem;color:var(--dim);font-style:italic;letter-spacing:.04em;margin-top:10px;position:relative}
.hero-desc{font-family:var(--fB);font-size:.86rem;color:var(--muted);max-width:500px;line-height:1.82;margin-top:8px;position:relative}
.hero-btns{display:flex;gap:10px;margin-top:20px;position:relative;flex-wrap:wrap;justify-content:center}
.hero-stats{display:flex;gap:28px;margin-top:20px;position:relative}
.hstat-v{font-family:var(--fH);font-size:1.55rem;letter-spacing:.04em;color:var(--A)}
.hstat-l{font-family:var(--fB);font-size:.6rem;font-weight:500;color:var(--muted);margin-top:2px}
.home-grid{display:grid;grid-template-columns:1fr 300px;flex:1;min-height:0;overflow:hidden}
.home-main{padding:20px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;border-right:1px solid var(--bd)}
.home-side{padding:16px;display:flex;flex-direction:column;gap:14px;overflow-y:auto}

/* ── BOT GRID ── */
.bot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px}
.bot-card{background:#FDFAF4;border:1px solid var(--bd);border-radius:8px;padding:14px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:6px;box-shadow:var(--sh)}
.bot-card:hover{border-color:var(--bd2);transform:translateY(-2px);box-shadow:var(--sh2)}
.bot-card.sel{border-color:var(--A);background:rgba(44,74,110,.05);box-shadow:var(--glA)}
.bot-diff{display:flex;gap:2px;margin-top:2px}
.bd{width:5px;height:5px;border-radius:50%}

/* ── FORMAT PICKER ── */
.fmt-grid{display:flex;gap:6px;flex-wrap:wrap}
.fmt-btn{padding:6px 14px;border-radius:5px;border:1px solid var(--bd);background:transparent;color:var(--dim);font-family:var(--fB);font-size:.68rem;font-weight:500;cursor:pointer;transition:all .18s;text-align:center}
.fmt-btn:hover{border-color:var(--bd2);color:var(--txt);background:rgba(40,28,8,.03)}
.fmt-btn.on{background:var(--A);color:#fff;border-color:var(--A)}

/* ── DAILY ── */
.daily-card{background:linear-gradient(135deg,#FDFAF4,var(--s1));border:1px solid rgba(198,161,91,.28);border-radius:10px;padding:16px;position:relative;overflow:hidden;box-shadow:var(--sh)}
.daily-card::before{content:'';position:absolute;top:-20px;right:-20px;width:80px;height:80px;background:radial-gradient(circle,rgba(198,161,91,.15),transparent 70%)}
.daily-badge{font-family:var(--fB);font-size:.64rem;font-weight:700;letter-spacing:.06em;color:var(--Y);margin-bottom:5px}
.daily-topic{font-family:var(--fH);font-size:.96rem;letter-spacing:.06em;line-height:1.35;margin-bottom:8px}

/* ── MATCHMAKING ── */
.mm-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;position:relative;overflow:hidden}
.mm-screen::before{content:'';position:absolute;width:380px;height:380px;border-radius:50%;border:1px dashed rgba(44,74,110,.15);animation:mmRing 8s linear infinite}
.mm-screen::after{content:'';position:absolute;width:240px;height:240px;border-radius:50%;border:1px dashed rgba(44,74,110,.2);animation:mmRing 5s linear infinite reverse}
.mm-pulse{width:80px;height:80px;border-radius:50%;background:rgba(44,74,110,.06);border:2px solid var(--A);display:flex;align-items:center;justify-content:center;font-size:1.8rem;animation:mmPulse 1.8s infinite;position:relative;z-index:1;box-shadow:var(--glA)}
.mm-opts{display:flex;gap:10px;position:relative;z-index:1;flex-wrap:wrap;justify-content:center}

/* ── LOCK ── */
.lock-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center}
.lock-icon{font-size:2.6rem;opacity:.3}

/* ── MODAL ── */
.modal-bg{position:fixed;inset:0;background:rgba(246,241,232,.88);backdrop-filter:blur(10px);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#FDFAF4;border:1px solid var(--bd2);border-radius:10px;width:100%;max-width:480px;overflow:hidden;animation:slideUp .3s cubic-bezier(.22,1,.36,1);box-shadow:var(--sh3)}
.modal-h{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid var(--bd);background:var(--s1)}
.modal-ht{font-family:var(--fH);font-size:.92rem;letter-spacing:.12em}
.modal-x{background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:1.2rem;padding:4px;transition:color .15s;line-height:1}
.modal-x:hover{color:var(--txt)}
.modal-b{padding:20px;display:flex;flex-direction:column;gap:13px}

/* ── WAITING ── */
.waiting{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.wait-code{font-family:var(--fH);font-size:3.4rem;letter-spacing:.44em;color:var(--A);cursor:pointer;transition:letter-spacing .3s}
.wait-code:hover{letter-spacing:.54em}
.w-slot{display:flex;align-items:center;gap:11px;padding:12px 18px;background:#FDFAF4;border:1px solid var(--bd);border-radius:8px;width:290px;transition:border-color .3s;box-shadow:var(--sh)}
.w-slot.ok{border-color:var(--G)}

/* ── PROFILE ── */
.profile-head{display:flex;align-items:flex-start;gap:20px;margin-bottom:24px}
.profile-name{font-family:var(--fH);font-size:1.6rem;letter-spacing:.08em;line-height:1}
.profile-handle{font-family:var(--fB);font-size:.64rem;font-weight:400;color:var(--muted);margin-top:4px}
.pstat-row{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.pstat{display:flex;flex-direction:column;align-items:center;background:#FDFAF4;border:1px solid var(--bd);border-radius:7px;padding:9px 14px;min-width:66px;box-shadow:var(--sh)}
.pstat-v{font-family:var(--fH);font-size:1.2rem;line-height:1}
.pstat-l{font-family:var(--fB);font-size:.56rem;font-weight:600;color:var(--muted);margin-top:3px}
.hist-item{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#FDFAF4;border-radius:7px;border:1px solid var(--bd);margin-bottom:6px;cursor:pointer;transition:all .18s;box-shadow:var(--sh)}
.hist-item:hover{border-color:var(--A);box-shadow:var(--sh2)}
.hi-res{font-family:var(--fH);font-size:.88rem;width:48px;text-align:center;flex-shrink:0}
.hi-win{color:var(--G)}.hi-loss{color:var(--B)}.hi-draw{color:var(--muted)}

/* ── RANK PAGE ── */
.rank-tabs{display:flex;gap:4px;margin-bottom:16px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:4px}
.rank-tab{flex:1;padding:7px;border-radius:5px;border:none;background:transparent;color:var(--muted);font-family:var(--fB);font-size:.66rem;font-weight:500;cursor:pointer;transition:all .18s;text-align:center}
.rank-tab.on{background:#FDFAF4;color:var(--A);font-weight:700;box-shadow:var(--sh)}

/* ── HALL OF FAME ── */
.hof-card{display:flex;align-items:center;gap:16px;padding:16px 18px;background:#FDFAF4;border-radius:8px;border:1px solid var(--bd);margin-bottom:8px;transition:all .2s;cursor:pointer;box-shadow:var(--sh)}
.hof-card:hover{border-color:var(--A);box-shadow:var(--sh2);transform:translateX(2px)}
.hof-card.gold{border-color:rgba(198,161,91,.4);box-shadow:0 2px 12px rgba(198,161,91,.12)}

/* ── TABLET OVERRIDES (768px – 1023px) ───────────────────────────────────
   Compensate for non-media-queried desktop rules in this same <style> tag
   ─────────────────────────────────────────────────────────────────────── */
@media(min-width:768px) and (max-width:1023px){
  .nav-links{overflow-x:auto!important;scrollbar-width:none!important;-ms-overflow-style:none!important;flex-shrink:1!important}
  .nav-links::-webkit-scrollbar{display:none!important}
  .nl{padding:0 7px!important;font-size:.63rem!important;white-space:nowrap!important}
  .nav-logo{margin-right:10px!important;font-size:.85rem!important}
  .home-grid{grid-template-columns:1fr 240px!important}
  .bot-grid{grid-template-columns:repeat(3,1fr)!important}
}

/* ── MOBILE RESPONSIVE OVERRIDES ─────────────────────────────────────────
   Ces règles sont DANS le tag <style> injecté pour gagner la cascade contre
   les règles non-media-queried ci-dessus (html,body overflow:hidden etc.)
   ─────────────────────────────────────────────────────────────────────── */
@media(max-width:767px){
  html,body{overflow:auto!important;height:auto!important;font-size:15px!important}
  .app{height:auto!important;min-height:100vh!important;overflow:visible!important}
  .page{overflow-y:visible!important;flex:none!important;padding:16px!important}
  /* ── NAV mobile : override display:flex des règles desktop ── */
  .nav{padding:0 16px!important;height:52px!important}
  .nav-links{display:none!important;position:fixed!important;top:52px!important;left:0!important;right:0!important;bottom:0!important;background:rgba(246,241,232,.98)!important;backdrop-filter:blur(24px)!important;flex-direction:column!important;height:calc(100vh - 52px)!important;padding:12px 0 24px!important;z-index:200!important;overflow-y:auto!important;border-top:1px solid var(--bd)!important;align-items:stretch!important;gap:0!important;flex:none!important}
  .nav-links.nav-open{display:flex!important}
  .nl{height:48px!important;padding:0 20px!important;font-size:.82rem!important;border-bottom:none!important;border-left:3px solid transparent!important;justify-content:flex-start!important}
  .nl.on{border-left-color:var(--Y)!important;border-bottom:none!important;background:rgba(198,161,91,.06)!important}
  /* Profile stats wrap */
  .pstat-row{flex-wrap:wrap!important;gap:8px!important}
  .pstat{min-width:58px!important;flex:1!important}
  .home{overflow:visible!important;flex:none!important}
  .home-grid{grid-template-columns:1fr!important;overflow:visible!important;min-height:0!important}
  .home-main{overflow-y:visible!important;border-right:none!important;border-bottom:1px solid var(--bd)!important;min-width:0!important}
  .home-side{display:none!important}
  /* Prevent text truncation everywhere on mobile */
  .profile-name,.wc-name,.hero-t{word-break:break-word!important;overflow-wrap:break-word!important}
  /* Ensure all flex children can shrink */
  .nav-r > *{flex-shrink:0}
  .home-hero{padding:28px 16px 20px!important;text-align:center!important}
  .hero-t{font-size:clamp(1.6rem,8vw,2.4rem)!important}
  .hero-btns{flex-direction:column!important;gap:10px!important;align-items:stretch!important}
  .hero-btns .btn{width:100%!important;justify-content:center!important;min-height:44px!important}
  .hero-stats{flex-direction:row!important;gap:16px!important;justify-content:center!important;flex-wrap:wrap!important}
  .arena{display:flex!important;flex-direction:column!important;gap:0!important;overflow-y:auto!important;flex:1!important}
  .pane{width:100%!important;min-width:0!important;flex:none!important;border-right:none!important;border-bottom:1px solid var(--bd)!important}
  .pane textarea,.pane .fi{font-size:16px!important}
  .pane .btn{min-height:44px!important;padding:10px 16px!important}
  .rep-grid{grid-template-columns:1fr!important}
  .profile-head{flex-direction:column!important;align-items:center!important;text-align:center!important}
  .elo-result{flex-direction:column!important;align-items:center!important}
  .btn{min-height:44px!important}
  .b-sm{min-height:40px!important;padding:8px 14px!important}
  .fi{font-size:16px!important;min-height:44px!important;padding:10px 14px!important}
  .toast{top:auto!important;bottom:20px!important;left:16px!important;right:16px!important;transform:none!important;white-space:normal!important;text-align:center!important;justify-content:center!important}
  .modal-bg{align-items:flex-end!important;padding:0!important}
  .modal{border-radius:12px 12px 0 0!important;max-width:100%!important;width:100%!important}
  .bot-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
  .lb-head{grid-template-columns:36px 1fr 64px 60px!important;font-size:.58rem!important;padding:6px 10px!important}
  .lb-head > *:last-child{display:none}
  .lb-row{grid-template-columns:36px 1fr 64px 60px!important;padding:10px!important}
  .lb-row > *:last-child{display:none}
  .promo-box{padding:28px 20px!important;margin:16px!important}
  .section-title{font-size:.85rem!important}
  /* User banner : stack vertically, stats full width */
  .user-banner{flex-direction:column!important;align-items:flex-start!important}
  .user-banner-stats{width:100%!important;justify-content:space-around!important}
  /* Format picker wrap */
  .fmt-grid{flex-wrap:wrap!important}
  /* Quick train header : stack on small */
  .home-main > div > div:first-child{flex-wrap:wrap!important;gap:8px!important}
}

/* OBS CSS */
`;

const CSS_OBS=`
${GF}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{${['--bg:#050709','--s0:#08090d','--s1:#0d1018','--s2:#131824','--s3:#1c2535','--bd:#1e2a3a','--bd2:#283850','--txt:#ccd6e8','--dim:#556070','--muted:#38485a','--A:#00cfff','--B:#ff2860','--G:#00e887','--Y:#ffc800','--O:#ff7340','--P:#b57bff',"--fH:'Bebas Neue',sans-serif","--fM:'JetBrains Mono',monospace","--fB:'Manrope',sans-serif"].join(';')}}
html,body{background:transparent!important;overflow:hidden;font-family:var(--fB);font-size:14px;color:#fff;-webkit-font-smoothing:antialiased}
*{pointer-events:none!important;user-select:none!important}
.obs{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:16px 20px}
.obs-bar{display:flex;align-items:stretch;filter:drop-shadow(0 4px 20px rgba(0,0,0,.6));animation:sbIn .5s cubic-bezier(.22,1,.36,1)}
@keyframes sbIn{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
.obs-side{display:flex;align-items:center;gap:9px;padding:9px 16px;min-width:200px}
.obs-side-a{background:linear-gradient(135deg,rgba(0,207,255,.22),rgba(0,207,255,.1));border:1px solid rgba(0,207,255,.32);border-right:none;border-radius:8px 0 0 8px;backdrop-filter:blur(16px)}
.obs-side-b{background:linear-gradient(225deg,rgba(255,40,96,.22),rgba(255,40,96,.1));border:1px solid rgba(255,40,96,.32);border-left:none;border-radius:0 8px 8px 0;backdrop-filter:blur(16px)}
.obs-name{font-family:var(--fH);font-size:1rem;letter-spacing:.1em;text-transform:uppercase;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.obs-name-a{color:var(--A);text-shadow:0 0 14px rgba(0,207,255,.5)}
.obs-name-b{color:var(--B);text-shadow:0 0 14px rgba(255,40,96,.5)}
.obs-score{font-family:var(--fH);font-size:1.9rem;transition:all .5s cubic-bezier(.4,0,.2,1)}
.obs-score-a{color:#fff;text-shadow:0 0 16px rgba(0,207,255,.6)}
.obs-score-b{color:#fff;text-shadow:0 0 16px rgba(255,40,96,.6)}
.obs-score.bump{animation:scoreBump .4s ease}
@keyframes scoreBump{0%{transform:scale(1)}40%{transform:scale(1.22)}100%{transform:scale(1)}}
.obs-center{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 12px;background:rgba(8,9,13,.75);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);backdrop-filter:blur(20px);min-width:120px}
.obs-timer{font-family:var(--fH);font-size:1.3rem;letter-spacing:.08em;line-height:1}
.obs-live{display:flex;align-items:center;gap:4px;margin-top:2px}
.obs-ldot{width:5px;height:5px;border-radius:50%;background:var(--B);animation:blink .8s infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.obs-ltxt{font-family:var(--fM);font-size:.5rem;color:var(--B);letter-spacing:.15em;text-transform:uppercase}
.obs-crits{display:flex;gap:5px;margin-top:5px;background:rgba(8,9,13,.6);border-radius:0 0 7px 7px;border:1px solid var(--bd);border-top:none;padding:5px 9px;backdrop-filter:blur(12px)}
.obs-crit{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px}
.obs-cl{font-family:var(--fM);font-size:.47rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
.obs-cbar{width:100%;height:2px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;display:flex}
.obs-ca{height:100%;background:var(--A);transition:width .7s ease}
.obs-cb{height:100%;background:var(--B);margin-left:auto;transition:width .7s ease}
.obs-cvs{display:flex;justify-content:space-between;width:100%}
.obs-cva{font-family:var(--fM);font-size:.47rem;color:var(--A)}
.obs-cvb{font-family:var(--fM);font-size:.47rem;color:var(--B)}
.obs-com{align-self:center;max-width:480px;background:rgba(8,9,13,.75);border:1px solid rgba(255,255,255,.07);border-radius:7px;padding:8px 14px;backdrop-filter:blur(20px);text-align:center;animation:comIn .4s ease}
@keyframes comIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.obs-com-l{font-family:var(--fM);font-size:.48rem;color:var(--muted);letter-spacing:.15em;text-transform:uppercase;margin-bottom:3px}
.obs-com-t{font-size:.77rem;line-height:1.55;color:var(--txt);font-style:italic}
.obs-var{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:50;min-width:300px;background:rgba(8,9,13,.92);border-radius:9px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,200,0,.4),0 0 36px rgba(255,200,0,.18);animation:varIn .35s cubic-bezier(.22,1,.36,1)}
@keyframes varIn{from{opacity:0;transform:translate(-50%,-50%) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.obs-var-exit{animation:varOut .3s ease forwards}
@keyframes varOut{to{opacity:0;transform:translate(-50%,-50%) scale(.9)}}
.obs-var-stripe{height:3px;background:linear-gradient(90deg,var(--Y),var(--O))}
.obs-var-inner{padding:12px 16px}
.obs-var-hd{display:flex;align-items:center;gap:9px;margin-bottom:7px}
.obs-var-badge{font-family:var(--fH);font-size:1rem;padding:3px 10px;background:var(--Y);color:#000;border-radius:3px}
.obs-var-type{font-family:var(--fM);font-size:.66rem;text-transform:uppercase;letter-spacing:.1em}
.obs-var-neg{color:var(--B)}.obs-var-pos{color:var(--G)}
.obs-var-spk{font-family:var(--fM);font-size:.58rem;color:var(--muted);margin-left:auto}
.obs-var-expl{font-size:.77rem;line-height:1.6;color:var(--txt)}
.obs-tx{background:rgba(8,9,13,.7);border:1px solid rgba(255,255,255,.06);border-radius:7px;padding:7px 12px;backdrop-filter:blur(16px);overflow:hidden}
.obs-tx-in{display:flex;gap:9px;align-items:flex-start}
.obs-tx-b{font-family:var(--fH);font-size:.64rem;padding:2px 6px;border-radius:3px;flex-shrink:0;margin-top:1px}
.obs-tx-t{font-size:.72rem;line-height:1.55;color:var(--txt);flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.obs-wm{position:fixed;bottom:12px;right:16px;opacity:.3;font-family:var(--fH);font-size:.7rem;letter-spacing:.1em;color:#fff}
.obs-wm b{color:var(--A)}
.obs-state{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,7,9,.82);backdrop-filter:blur(20px)}
.obs-state-icon{font-size:2.8rem;margin-bottom:12px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.85}}
.obs-state-t{font-family:var(--fH);font-size:2.2rem;letter-spacing:.12em;color:#fff}
.obs-state-t b{color:var(--A)}
.obs-winner{font-family:var(--fH);font-size:1.7rem;letter-spacing:.1em;margin-top:14px;animation:glow 2s infinite}
@keyframes glow{0%,100%{text-shadow:0 0 18px currentColor}50%{text-shadow:0 0 36px currentColor}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
`;

/* ══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   PLAYER PROFILE MODAL
═══════════════════════════════════════════════════════════ */
function PlayerProfileModal({player,isMe,onClose,onChallenge}){
  if(!player)return null;
  const b=getBadge(player.elo||0);
  const nxt=getNextB(player.elo||0);
  const winRate=player.debates?Math.round((player.wins||0)/(player.debates||1)*100):0;
  const modalStyle={position:'fixed',inset:0,background:'rgba(5,7,9,.9)',backdropFilter:'blur(8px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20};
  const boxStyle={background:'var(--s2)',border:'1px solid var(--bd2)',borderRadius:12,width:'100%',maxWidth:520,overflow:'hidden',animation:'slideUp .3s cubic-bezier(.22,1,.36,1)'};
  return(
    <div style={modalStyle} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={boxStyle}>
        {/* HEADER */}
        <div style={{background:'linear-gradient(135deg,var(--Ag),rgba(90,58,110,.05))',padding:'20px 20px 0',borderBottom:'1px solid var(--bd)'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:14,paddingBottom:16}}>
            <div style={{width:60,height:60,borderRadius:'50%',border:`3px solid ${b.color}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',flexShrink:0,background:'var(--s3)'}}>
              {player.avatar?<img src={player.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontFamily:'var(--fH)',color:b.color}}>{(player.name||'?')[0]}</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'1.1rem',letterSpacing:'.08em'}}>{player.name}</div>
                {isMe&&<span style={{fontFamily:'var(--fM)',fontSize:'.55rem',background:'var(--Ag)',color:'var(--A)',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(44,74,110,.22)',fontWeight:700}}>VOUS</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:5,flexWrap:'wrap'}}>
                <span className={`badge-pill ${b.cls}`}>{b.icon} {b.label}</span>
                {player.streak>2&&<span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--O)'}}>🔥 ×{player.streak}</span>}
              </div>
              <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1,height:4,background:'var(--bd2)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${rankPct(player.elo||0)}%`,background:`linear-gradient(90deg,${b.color},${nxt?.color||b.color})`,borderRadius:2}}/>
                </div>
                <div style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)',flexShrink:0}}>{player.elo}{nxt?` / ${nxt.min}`:''}</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:'transparent',border:'none',color:'var(--dim)',cursor:'pointer',fontSize:'1rem',lineHeight:1,padding:4}}>✕</button>
          </div>
          {/* STATS */}
          <div style={{display:'flex',borderTop:'1px solid var(--bd)'}}>
            {[['⚖ ELO',player.elo,'var(--Y)'],['📋 Débats',player.debates||0,''],['✓ Victoires',player.wins||0,'var(--G)'],['% Taux',`${winRate}%`,'var(--A)'],['✦ XP',player.xp||0,'var(--O)']].map(([l,v,c])=>(
              <div key={l} style={{flex:1,textAlign:'center',padding:'9px 4px',borderRight:'1px solid var(--bd)'}}>
                <div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',marginBottom:2}}>{l}</div>
                <div style={{fontFamily:'var(--fH)',fontSize:'.95rem',color:c||'var(--txt)'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* BODY */}
        <div style={{padding:16,display:'flex',flexDirection:'column',gap:12,maxHeight:320,overflowY:'auto'}}>
          {player.eloHistory?.length>1&&(
            <div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6,display:'flex',justifyContent:'space-between'}}>
                <span>Évolution ELO</span>
                <span style={{color:player.eloHistory[player.eloHistory.length-1]>player.eloHistory[0]?'var(--G)':'var(--B)'}}>
                  {player.eloHistory[player.eloHistory.length-1]>player.eloHistory[0]?'↑':'↓'} {Math.abs(player.eloHistory[player.eloHistory.length-1]-player.eloHistory[0])} pts
                </span>
              </div>
              <EloSparkline history={player.eloHistory} color={b.color}/>
            </div>
          )}
          {player.achievements?.length>0&&(
            <div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>🏅 Achievements ({player.achievements.length}/{ACHIEVEMENTS_DEF.length})</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {player.achievements.map(id=>{const a=ACHIEVEMENTS_DEF.find(x=>x.id===id);if(!a)return null;return(<span key={id} style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 8px',background:'rgba(198,161,91,.07)',border:'1px solid rgba(198,161,91,.18)',borderRadius:4,fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--dim)'}}>{a.icon} {a.name}</span>);})}
              </div>
            </div>
          )}
          {player.history?.length>0?(
            <div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Historique récent</div>
              {player.history.slice(0,5).map(d=>(
                <div key={d.id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 10px',background:'var(--s1)',borderRadius:5,border:'1px solid var(--bd)',marginBottom:4}}>
                  <div style={{fontFamily:'var(--fH)',fontSize:'.78rem',width:28,textAlign:'center',color:d.result==='win'?'var(--G)':d.result==='loss'?'var(--B)':'var(--muted)',flexShrink:0}}>{d.result==='win'?'V':d.result==='loss'?'D':'N'}</div>
                  <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:'.74rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.topic}</div><div style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)',marginTop:2}}>vs {d.vs} · {fmtD(d.date)}</div></div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.63rem',flexShrink:0,color:d.eloDelta>=0?'var(--G)':'var(--B)',padding:'1px 5px',borderRadius:3,border:`1px solid ${d.eloDelta>=0?'rgba(58,110,82,.22)':'rgba(140,58,48,.18)'}`,background:d.eloDelta>=0?'rgba(58,110,82,.06)':'rgba(140,58,48,.06)'}}>
                    {d.eloDelta>=0?'+':''}{d.eloDelta}
                  </div>
                </div>
              ))}
            </div>
          ):(
            <div style={{textAlign:'center',padding:16,fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)'}}>Aucun débat enregistré</div>
          )}
        </div>
        {/* FOOTER */}
        <div style={{padding:'10px 16px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end',background:'var(--s1)'}}>
          <button className="btn b-ghost b-sm" onClick={onClose}>Fermer</button>
          {!isMe&&onChallenge&&<button className="btn b-a b-sm" onClick={onChallenge}>⚔️ Défier</button>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACADEMY CREATE/JOIN MODAL
═══════════════════════════════════════════════════════════ */
function AcademyModal({mode,onClose,onDone,academies}){
  const [name,setName]=useState('');
  const [desc,setDesc]=useState('');
  const [type,setType]=useState('academy');
  const [joinId,setJoinId]=useState('');
  const acs=academies||[];
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(5,7,9,.88)',backdropFilter:'blur(8px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--s2)',border:'1px solid var(--bd2)',borderRadius:12,width:'100%',maxWidth:420,overflow:'hidden',animation:'slideUp .3s cubic-bezier(.22,1,.36,1)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid var(--bd)',background:'var(--s1)'}}>
          <div style={{fontFamily:'var(--fH)',fontSize:'.95rem',letterSpacing:'.08em'}}>{mode==='create'?'🏛 Créer une Académie':'📖 Rejoindre une Académie'}</div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'var(--dim)',cursor:'pointer',fontSize:'1rem',lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
          {mode==='create'&&(
            <>
              <div><label style={{fontFamily:'var(--fM)',fontSize:'.57rem',color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:4,display:'block'}}>Nom</label><input className="fi" placeholder="Nom de votre académie…" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></div>
              <div><label style={{fontFamily:'var(--fM)',fontSize:'.57rem',color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:4,display:'block'}}>Description</label><textarea className="fi" placeholder="Mission et valeurs…" value={desc} onChange={e=>setDesc(e.target.value)} style={{minHeight:60,resize:'vertical'}} maxLength={180}/></div>
              <div>
                <label style={{fontFamily:'var(--fM)',fontSize:'.57rem',color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:6,display:'block'}}>Type</label>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {ACADEMY_TYPES.map(t=><button key={t.id} className={`fmt-btn${type===t.id?' on':''}`} onClick={()=>setType(t.id)} style={{flex:'1 1 auto'}}>{t.icon} {t.label}</button>)}
                </div>
              </div>
              <button className="btn b-a" style={{width:'100%',justifyContent:'center'}} disabled={!name.trim()} onClick={()=>onDone({mode:'create',name:name.trim(),desc:desc.trim(),type})}>🏛 Créer l'Académie</button>
            </>
          )}
          {mode==='join'&&(
            <>
              <div style={{fontFamily:'var(--fM)',fontSize:'.62rem',color:'var(--dim)',lineHeight:1.7}}>Rejoignez une académie pour débattre sous sa bannière.</div>
              <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:220,overflowY:'auto'}}>
                {acs.map(ac=>(
                  <div key={ac.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'var(--s1)',border:`1px solid ${joinId===ac.id?'var(--A)':'var(--bd)'}`,borderRadius:6,cursor:'pointer',transition:'all .15s'}} onClick={()=>setJoinId(ac.id)}>
                    <div style={{fontSize:'1.3rem',flexShrink:0}}>{ac.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'var(--fH)',fontSize:'.8rem',letterSpacing:'.06em'}}>{ac.name}</div>
                      <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',marginTop:1}}>{ac.members?.length||0} membres · ELO {ac.avgElo}</div>
                    </div>
                    <div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${joinId===ac.id?'var(--A)':'var(--bd2)'}`,background:joinId===ac.id?'var(--A)':'transparent',transition:'all .15s'}}/>
                  </div>
                ))}
              </div>
              <button className="btn b-g" style={{width:'100%',justifyContent:'center'}} disabled={!joinId} onClick={()=>onDone({mode:'join',id:joinId})}>Rejoindre →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function Toast({msg,type,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t)},[onDone]);
  const c={info:'var(--A)',success:'var(--G)',error:'var(--B)',xp:'var(--Y)',achievement:'var(--P)'};
  return <div className="toast" style={{borderColor:c[type]||'var(--bd2)'}}>{msg}</div>;
}

function AvatarBadge({user,size=32,showBadge=true}){
  const b=getBadge(user?.elo||0);
  return(
    <div className="av-wrap">
      <div className="av" style={{width:size,height:size,borderColor:b.color}}>
        {user?.avatar?<img src={user.avatar} alt=""/>:<span style={{fontSize:size*.35}}>{user?.name?.[0]||'?'}</span>}
      </div>
      {showBadge&&<div className={`av-badge-tag badge-pill ${b.cls}`}>{b.icon}</div>}
    </div>
  );
}

function BadgePill({elo}){
  const b=getBadge(elo||0);
  return <span className={`badge-pill ${b.cls}`}>{b.icon} {b.label}</span>;
}

/* ── ArgScoreDisplay ─────────────────────────────────────────
   Shows per-argument Claude scoring: overall score, 5 criteria,
   analysis, and improvement advice.
   Used inside each argument entry card in the debate arena.
─────────────────────────────────────────────────────────────── */
function ArgScoreDisplay({entry,side}){
  const col=side==='A'?'var(--A)':'var(--B)';
  const hasScore=entry.overall_score!=null;
  const hasAnalysis=entry.analysis&&entry.analysis!=='AI fallback';
  const hasAdvice=entry.improvement_advice&&entry.improvement_advice!=='Support your claims with clearer reasoning.';
  if(!entry.scores&&!hasScore)return null;
  return(
    <div style={{marginTop:6}}>
      {/* Overall score badge */}
      {hasScore&&(
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
          <span style={{fontFamily:'var(--fH)',fontSize:'.92rem',color:col,lineHeight:1,letterSpacing:'.02em'}}>{(+entry.overall_score).toFixed(1)}</span>
          <span style={{fontFamily:'var(--fM)',fontSize:'.48rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em'}}>/ 10</span>
          {entry.confidence!=null&&(
            <span style={{fontFamily:'var(--fM)',fontSize:'.48rem',color:'var(--muted)',marginLeft:3,opacity:.7}}>
              · {Math.round(entry.confidence*100)}% confiance
            </span>
          )}
        </div>
      )}
      {/* 5 criteria chips */}
      {entry.scores&&(
        <div className="escores">
          {CRITERIA.map(c=>(
            <span key={c.key} className="escr">{c.label.slice(0,3)} {entry.scores[c.key]?.toFixed(1)}</span>
          ))}
        </div>
      )}
      {/* AI analysis — 1-2 sentences */}
      {hasAnalysis&&(
        <p style={{fontFamily:'var(--fC)',fontSize:'.72rem',color:'var(--dim)',fontStyle:'italic',
          lineHeight:1.55,margin:'5px 0 0',borderTop:'1px dashed var(--bd)',paddingTop:5}}>
          {entry.analysis}
        </p>
      )}
      {/* Improvement advice */}
      {hasAdvice&&(
        <p style={{fontFamily:'var(--fB)',fontSize:'.6rem',color:'var(--O)',lineHeight:1.5,margin:'3px 0 0',
          display:'flex',alignItems:'flex-start',gap:4}}>
          <span style={{flexShrink:0}}>💡</span>{entry.improvement_advice}
        </p>
      )}
    </div>
  );
}

function RankBar({elo}){
  const cur=getBadge(elo);const nxt=getNextB(elo);const p=rankPct(elo);
  return(
    <div className="rank-bar-wrap">
      <div className="rank-bar-labels">
        <span style={{color:cur.color}}>{cur.label} · {elo}</span>
        {nxt&&<span style={{color:nxt.color}}>{nxt.label} · {nxt.min}</span>}
      </div>
      <div className="rank-bar-track">
        <div className="rank-bar-fill" style={{width:`${p}%`,background:nxt?`linear-gradient(90deg,${cur.color},${nxt.color})`:cur.color}}/>
      </div>
      <div style={{fontFamily:'var(--fM)',fontSize:'.51rem',color:'var(--muted)',marginTop:2}}>{nxt?`${elo} / ${nxt.min} → ${nxt.label}`:'Rang maximum atteint ⭐'}</div>
    </div>
  );
}

function EloSparkline({history,color='#00cfff'}){
  if(!history||history.length<2)return null;
  const w=200,h=46,p=4;
  const mn=Math.min(...history),mx=Math.max(...history),range=mx-mn||1;
  const pts=history.map((v,i)=>`${p+(i/(history.length-1))*(w-p*2)},${p+(1-(v-mn)/range)*(h-p*2)}`).join(' ');
  const last=pts.split(' ').pop().split(',');
  return(
    <svg width={w} height={h} style={{overflow:'visible'}}>
      <defs><linearGradient id="sg"><stop offset="0%" stopColor={color} stopOpacity=".4"/><stop offset="100%" stopColor={color}/></linearGradient></defs>
      <polyline points={pts} fill="none" stroke="url(#sg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}/>
    </svg>
  );
}

function PhaseBar({phase}){
  const idx=DEBATE_PHASES.indexOf(phase);
  return(
    <div className="phase-bar">
      {DEBATE_PHASES.map((p,i)=>(
        <div key={p} style={{display:'flex',alignItems:'center',gap:4}}>
          {i>0&&<div className="phase-sep">›</div>}
          <div className={`phase-step ${i<idx?'phase-done':i===idx?'phase-active':'phase-todo'}`}>
            <div className="phase-dot" style={{background:i<idx?'var(--G)':i===idx?'var(--Y)':'var(--muted)'}}/>
            {p}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromotionOverlay({badge,onClose}){
  return <RankUpAnimation badge={badge} onDone={onClose}/>;
}

/* ══════════════════════════════════════════════════════════════
   OBS OVERLAY
══════════════════════════════════════════════════════════════ */
function OBSOverlay({params}){
  const code=params.get('room')||'';
  const showCom=params.get('commentary')!=='0';
  const showTx=params.get('transcript')!=='0';
  const showVar=params.get('var')!=='0';
  const showCrits=params.get('crits')!=='0';
  const [room,setRoom]=useState(null);
  const [tx,setTx]=useState([]);
  const [scA,setSA]=useState(initS());
  const [scB,setSB]=useState(initS());
  const [vars,setVars]=useState([]);
  const [coms,setComs]=useState([]);
  const [elapsed,setEl]=useState(0);
  const [varPop,setVP]=useState(null);
  const [varExit,setVE]=useState(false);
  const [prevVL,setPVL]=useState(0);
  const [bA,setBA]=useState(false);
  const [bB,setBB]=useState(false);
  const stRef=useRef(null);const tiRef=useRef(null);const vtRef=useRef(null);
  const poll=useCallback(async()=>{
    if(!code)return;
    const rd=await SG(`room:${code}`);
    if(rd){setRoom(rd);if(rd.startedAt&&!stRef.current){stRef.current=rd.startedAt;tiRef.current=setInterval(()=>setEl(Math.floor((Date.now()-stRef.current)/1000)),500)}}
    const shTx=await SG(`tx:${code}`);
    if(shTx){setTx(shTx);let sA2=initS(),sB2=initS();shTx.forEach(e=>{if(e.scores){if(e.side==='A')sA2=applyScore(sA2,e.scores);else sB2=applyScore(sB2,e.scores)}});setSA(p=>{if(Math.abs(gScore(p)-gScore(sA2))>0.05){setBA(true);setTimeout(()=>setBA(false),500)}return sA2});setSB(p=>{if(Math.abs(gScore(p)-gScore(sB2))>0.05){setBB(true);setTimeout(()=>setBB(false),500)}return sB2})}
    const shV=await SG(`var:${code}`);
    if(shV){setVars(shV);if(shV.length>prevVL&&shV.length>0&&showVar){setPVL(shV.length);const lv=shV[shV.length-1];setVE(false);setVP(lv);clearTimeout(vtRef.current);vtRef.current=setTimeout(()=>{setVE(true);setTimeout(()=>setVP(null),350)},4500)}}
    const shC=await SG(`com:${code}`);if(shC)setComs(shC);
  },[code,prevVL,showVar]);
  useEffect(()=>{poll();const iv=setInterval(poll,1600);return()=>{clearInterval(iv);clearInterval(tiRef.current);clearTimeout(vtRef.current)}},[poll]);
  const tA=gScore(scA),tB=gScore(scB),nA=room?.playerA||'A',nB=room?.playerB||'B';
  if(!room||room.status==='waiting')return(<><style>{CSS_OBS}</style><div className="obs-state"><div className="obs-state-icon">⏳</div><div className="obs-state-t">DIALECT<b>IX</b></div></div></>);
  if(room.status==='ended')return(<><style>{CSS_OBS}</style><div className="obs-state"><div className="obs-state-icon">🏆</div><div className="obs-state-t">DÉBAT <b>TERMINÉ</b></div><div className="obs-winner" style={{color:tA>tB?'var(--A)':tA<tB?'var(--B)':'var(--G)'}}>{tA>tB?`🏆 ${nA}`:tA<tB?`🏆 ${nB}`:'═ ÉGALITÉ'}</div></div></>);
  const ltx=tx[tx.length-1];const lc=coms[coms.length-1];
  return(<><style>{CSS_OBS}</style><div className="obs">
    <div style={{display:'flex',flexDirection:'column'}}>
      <div className="obs-bar">
        <div className="obs-side obs-side-a"><div className="obs-name obs-name-a">{nA}</div><div className={`obs-score obs-score-a${bA?' bump':''}`}>{tA.toFixed(1)}</div></div>
        <div className="obs-center"><div className="obs-timer">{fmt(elapsed)}</div><div className="obs-live"><div className="obs-ldot"/><div className="obs-ltxt">Live</div></div></div>
        <div className="obs-side obs-side-b" style={{flexDirection:'row-reverse'}}><div className="obs-name obs-name-b" style={{textAlign:'right'}}>{nB}</div><div className={`obs-score obs-score-b${bB?' bump':''}`}>{tB.toFixed(1)}</div></div>
      </div>
      {showCrits&&<div className="obs-crits">{CRITERIA.map(c=>{const a=scA[c.key]||5,b=scB[c.key]||5,s=a+b||1;return(<div key={c.key} className="obs-crit"><div className="obs-cl">{c.label.slice(0,4)}</div><div className="obs-cbar"><div className="obs-ca" style={{width:`${(a/s)*100}%`}}/><div className="obs-cb" style={{width:`${(b/s)*100}%`}}/></div><div className="obs-cvs"><span className="obs-cva">{a.toFixed(1)}</span><span className="obs-cvb">{b.toFixed(1)}</span></div></div>)})}</div>}
    </div>
    {showCom&&lc&&<div className="obs-com" key={lc.id}><div className="obs-com-l">Arbitre IA</div><div className="obs-com-t">{lc.text}</div></div>}
    {showTx&&ltx&&<div className="obs-tx" key={ltx.id}><div className="obs-tx-in"><div className={`obs-tx-b ${ltx.side==='A'?'eba':'ebb'}`}>{ltx.side==='A'?nA:nB}</div><div className="obs-tx-t">{ltx.formalized||ltx.raw}</div></div></div>}
    {showVar&&varPop&&<div className={`obs-var${varExit?' obs-var-exit':''}`} key={varPop.id}><div className="obs-var-stripe"/><div className="obs-var-inner"><div className="obs-var-hd"><div className="obs-var-badge">VAR #{varPop.num}</div><div className={`obs-var-type ${varPop.negative?'obs-var-neg':'obs-var-pos'}`}>{varPop.type}</div><div className="obs-var-spk">{varPop.speakerName}</div></div><div className="obs-var-expl">{varPop.explanation}</div></div></div>}
    <div className="obs-wm">DIALECT<b>IX</b></div>
  </div></>);
}

/* ══════════════════════════════════════════════════════════════
   DEBATE ARENA
══════════════════════════════════════════════════════════════ */
function DebateArena({config,user,onEnd}){
  const {mode,topic,botConfig,roomCode,nameA,nameB,mySide,format,isSpectator}=config;
  const code=roomCode||'';
  const [tx,setTx]=useState([]);
  const [sA,setSA]=useState(initS());
  const [sB,setSB]=useState(initS());
  const [vars,setVars]=useState([]);
  const [coms,setComs]=useState([]);
  const [elapsed,setEl]=useState(0);
  const [analyzing,setAn]=useState(false);
  const [botThink,setBT]=useState(false);
  const [rtab,setRT]=useState('var');
  const [actSide,setAS]=useState('A');
  const [manA,setManA]=useState('');
  const [manB,setManB]=useState('');
  const [interim,setInt]=useState('');
const [decisiveId,setDecisiveId]=useState(null);
const [defeatedId,setDefeatedId]=useState(null);
  const [prog,setProg]=useState(0);
  const [showOBS,setSO]=useState(false);
  const [toast,setToast]=useState('');
  const [phase,setPhase]=useState(DEBATE_PHASES[0]);
  const [phaseIdx,setPI]=useState(0);
  const txRef=useRef([]);const vrRef=useRef([]);const coRef=useRef([]);
  const tiRef=useRef(null);const bdRef=useRef(null);const phRef=useRef(0);
  const tA=gScore(sA),tB=gScore(sB),sum=tA+tB||1;
const pressureSide=Math.abs(tA-tB)>0.8?(tA<tB?'A':'B'):null;
  const myN=mode==='offline'?(actSide==='A'?nameA:nameB):(mySide==='A'?nameA:nameB);
  const oppS=mySide==='A'?'B':'A';
  const fmtObj=FORMATS.find(f=>f.id===format)||FORMATS[2];
  const timeLimit=fmtObj.min*60;

  useEffect(()=>{
    const t=tiRef.current=setInterval(()=>{
      setEl(e=>{
        const ne=e+1;const pct=ne/timeLimit;
        const pi=pct<0.2?0:pct<0.6?1:pct<0.85?2:3;
        if(pi!==phRef.current){phRef.current=pi;setPI(pi);setPhase(DEBATE_PHASES[pi])}
        return ne;
      });
    },1000);
    return()=>clearInterval(t);
  },[timeLimit]);

  useEffect(()=>{if(bdRef.current)bdRef.current.scrollTop=bdRef.current.scrollHeight},[tx]);

  const handleFinal=useCallback(async t=>{setInt('');if(!t||t.length<3)return;await submitEntry(t,mode==='offline'?actSide:mySide,true)},[mySide,actSide,mode]);
  const handleInterim=useCallback(t=>setInt(t),[]);
  const speech=useSpeech(handleFinal,handleInterim,msg=>setToast(msg));

  const poll=useCallback(async()=>{
    if(!code||mode==='bot'||mode==='offline')return;
    const rd=await SG(`room:${code}`);if(!rd)return;
    const shTx=await SG(`tx:${code}`);
    if(shTx&&shTx.length!==txRef.current.length){setTx(shTx);txRef.current=shTx;let sA2=initS(),sB2=initS();shTx.forEach(e=>{if(e.scores){if(e.side==='A')sA2=applyScore(sA2,e.scores);else sB2=applyScore(sB2,e.scores)}});setSA(sA2);setSB(sB2)}
    const shV=await SG(`var:${code}`);if(shV){setVars(shV);vrRef.current=shV}
    const shC=await SG(`com:${code}`);if(shC){setComs(shC);coRef.current=shC}
    if(rd.status==='ended'){clearInterval(tiRef.current);onEnd(txRef.current,vrRef.current,coRef.current,{scoresA:sA,scoresB:sB,elapsed})}
  },[code,mode,sA,sB,elapsed,onEnd]);

  useEffect(()=>{if(mode==='online'){const iv=setInterval(poll,1400);return()=>clearInterval(iv)}},[mode,poll]);

  const MIN_ARG_LENGTH=80;
  const submitEntry=useCallback(async(raw,side)=>{
    if(!raw.trim()||analyzing||botThink)return;
    const sName=side==='A'?nameA:nameB;
    setAn(true);setProg(10);
    const entry={id:uid(),side,raw,formalized:raw,type:'argument',time:elapsed,scores:null,phase};
    if(mode==='online'){const cur=await SG(`tx:${code}`)||[];const nTx=[...cur,entry];await SS(`tx:${code}`,nTx);setTx(nTx);txRef.current=nTx}
    else{setTx(p=>[...p,entry]);txRef.current=[...txRef.current,entry]}
    setProg(35);
    try{
      const result=await aiAnalyze(raw,side,sName,topic,txRef.current.slice(-5),phase);
      setProg(82);
      if(result){
        const isDecisive=(result.overall_score??0)>=7.5;
        const upd={...entry,formalized:result.formalized||raw,type:result.type||'argument',scores:result.scores,strength:result.strength,
          // Claude structured scoring fields
          overall_score:result.overall_score??null,confidence:result.confidence??null,
          analysis:result.analysis||null,improvement_advice:result.improvement_advice||null,
          strengths:result.strengths||[],weaknesses:result.weaknesses||[],
          decisive:isDecisive};
        if(mode==='online'){const ft=await SG(`tx:${code}`)||[];const mt=ft.map(e=>e.id===entry.id?upd:e);await SS(`tx:${code}`,mt);setTx(mt);txRef.current=mt}
        else{setTx(p=>p.map(e=>e.id===entry.id?upd:e));txRef.current=txRef.current.map(e=>e.id===entry.id?upd:e)}
        if(side==='A')setSA(p=>applyScore(p,result.scores));else setSB(p=>applyScore(p,result.scores));
        // ── Breakthrough detection ──────────────────────────────────────────
        if(isDecisive){
          setDecisiveId(upd.id);
          const oppLast=txRef.current.filter(e=>e.side!==side).slice(-1)[0];
          if(oppLast){setDefeatedId(oppLast.id);setTimeout(()=>setDefeatedId(null),1650);}
          // ── Checkmate detection (Module 3) — score>=9 AND opponent<=5 ──────────
          const oppWeightedScore = side==='A' ? gScore(sB) : gScore(sA);
          if(isCheckmate(upd, oppWeightedScore)){setCheckmateEntry({...upd,winnerName:side==='A'?nameA:nameB});}
        }
        if(result.var_event?.detected){const ve={id:uid(),num:vrRef.current.length+1,side,speakerName:sName,...result.var_event};const nv=[...vrRef.current,ve];if(mode==='online')await SS(`var:${code}`,nv);setVars(nv);vrRef.current=nv;setRT('var')}
        if(result.commentary){const c={id:uid(),text:result.commentary,side};const nc=[...coRef.current,c];if(mode==='online')await SS(`com:${code}`,nc);setComs(nc);coRef.current=nc}
        if(mode==='bot'&&side==='A'&&botConfig){
          setTimeout(async()=>{
            setBT(true);
            await new Promise(r=>setTimeout(r,1100+Math.random()*1400));
            // Build a compatible player object for generateAIArgument
            const botPlayer = {
              id:            botConfig.id || 'bot_arena',
              name:          nameB,
              argumentStyle: BOT_STYLE_MAP[botConfig.style] || 'logical',
              isTest:        true,   // required by generateAIArgument guard
              elo:           botConfig.elo || 1000,
            };
            // Try personality-aware response first, fall back to legacy aiBotRespond
            let ba;
            try {
              const aiText = await generateAIArgument(botPlayer, topic, result.formalized||raw);
              // Detect STYLE_FALLBACKS from arenaUtils.js + legacy aiBotRespond fallback.
              // These are the actual strings generateAIArgument returns when the guard
              // (!player.isTest), no API key, or a fetch failure triggers early return.
              const isFallback = !aiText ||
                aiText === 'Je maintiens ma position.' ||
                aiText.startsWith('Your argument lacks') ||
                aiText.startsWith('This position ignores') ||
                aiText.startsWith('That claim collapses') ||
                aiText.startsWith('The evidence in the relevant') ||
                aiText.startsWith('If that were actually true');
              ba = isFallback
                ? await aiBotRespond(topic, botConfig.style, nameB, txRef.current, result.formalized||raw)
                : aiText;
            } catch {
              ba = await aiBotRespond(topic, botConfig.style, nameB, txRef.current, result.formalized||raw);
            }
            setBT(false);
            await submitEntry(ba,'B');
          }, 350);
        }
      }
    }catch(e){console.error(e)}
    setProg(100);setTimeout(()=>setProg(0),600);setAn(false);
  },[analyzing,botThink,mode,topic,nameA,nameB,code,elapsed,botConfig,phase]);

  const submitManual=useCallback(async side=>{
    const txt=side==='A'?manA:manB;
    if(!txt.trim())return;
    // Validate length here, using the same state variable as the counter.
    // submitEntry must NOT validate length — it is also called by the bot, which
    // runs after manA has already been cleared to ''.
    if(txt.trim().length<MIN_ARG_LENGTH){
      setToast(`Votre argument est trop court. Minimum ${MIN_ARG_LENGTH} caractères.`);
      return;
    }
    if(side==='A')setManA('');else setManB('');
    await submitEntry(txt.trim(),side);
  },[manA,manB,MIN_ARG_LENGTH,submitEntry]);
  const doEnd=async()=>{speech.stop();clearInterval(tiRef.current);if(mode==='online'){const rd=await SG(`room:${code}`);if(rd)await SS(`room:${code}`,{...rd,status:'ended'})}onEnd(txRef.current,vrRef.current,coRef.current,{scoresA:sA,scoresB:sB,elapsed})};

  // ── PANE LOGIC ──────────────────────────────────────────────
  // offline : switcher A/B sur le pane gauche, tout tx affiché gauche, VAR/IA droite
  // bot     : humain (A) gauche, bot (B) droite AVEC ses réponses + VAR/IA dessous
  // online  : mySide gauche, oppSide droite + VAR/IA dessous
  const leftTx  = mode==='offline' ? tx : tx.filter(e=>e.side==='A');
  const rightTx = tx.filter(e=>e.side==='B');
  const showBothPanes = mode==='bot'||mode==='online';

  // Entrée texte : uniquement côté A (humain) pour bot/online
  const activeInputSide = mode==='offline' ? actSide : 'A';

  return(
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      {/* TOP BAR */}
      <div className="ph" style={{height:46,paddingLeft:16,paddingRight:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {analyzing?<div className="chip chip-p"><div className="spin"/>IA…</div>:<div className="chip chip-g" style={{animation:'blink 1.5s infinite'}}>● Live</div>}
          <div style={{fontFamily:'var(--fH)',fontSize:'1.1rem',letterSpacing:'.06em'}}>{fmt(elapsed)}</div>
          <div className="chip chip-a" style={{fontSize:'.56rem'}}>{fmtObj.label} · {fmtObj.min}min</div>
          {code&&<div className="chip">Salon <b style={{color:'var(--A)',letterSpacing:'.15em'}}>{code}</b></div>}
          {mode==='bot'&&<div className="chip chip-p">🤖 vs {nameB}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {mode==='online'&&<button className="btn b-ghost b-sm" onClick={()=>setSO(true)}>🎬 OBS</button>}
          <div className="chip" style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'.55rem'}}>{topic}</div>
          {!isSpectator&&<button className="btn b-b b-sm" onClick={doEnd}>Terminer</button>}
        </div>
      </div>

      {/* PHASE */}
      <PhaseBar phase={phase}/>
      {prog>0&&<div className="prog"><div className="prog-bar" style={{width:`${prog}%`}}/></div>}

      <div className="arena">

        {/* ═══ LEFT PANE — Orateur A (humain) ═══ */}
        <div className={`pane ${speech.active&&!isSpectator&&activeInputSide==='A'?'recording':''} ${pressureSide==='A'?'prs-losing-pane':pressureSide==='B'?'prs-winning-glow':''}`} style={{position:'relative'}}>
          {pressureSide==='A'&&<div className="prs-red-tint" aria-hidden="true"/>}
          <div className="ph">
            <div className="ph-t" style={{color:'var(--A)'}}>
              {nameA}
              <span style={{color:'var(--muted)',fontSize:'.52rem',marginLeft:6,fontFamily:'var(--fM)',textTransform:'uppercase'}}>
                {mode==='bot'?'Vous':mode==='offline'?`Orateur A`:`Orateur ${mySide==='A'?'A':'B'}`}
              </span>
            </div>
            <div className="ph-m">{leftTx.length} arg.</div>
          </div>

          <div className="pb" ref={bdRef}>
            {leftTx.length===0&&<div className="empty"><div className="empty-i">🎙</div><div className="empty-t">Prenez la parole</div></div>}
            {leftTx.map(e=>(
              <ArgumentCard key={e.id} entry={e} side="A" name={nameA}
                defeatedId={defeatedId}
                scoreDisplay={<ArgScoreDisplay entry={e} side="A"/>}/>
            ))}
            {analyzing&&activeInputSide==='A'&&<div className="typing"><div style={{display:'flex',gap:3}}>{[0,1,2].map(i=><div key={i} className="td"/>)}</div><div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--dim)',marginLeft:6}}>Analyse IA…</div></div>}
          </div>

          {/* Zone de saisie — uniquement pour l'orateur A (humain) */}
          {!isSpectator&&(mode==='bot'||mode==='online'||(mode==='offline'&&actSide==='A'))&&(
            <div className="vzone">
              <div className="vrow">
                <button className={`mic ${speech.active?'mic-on':'mic-off'}`} onClick={speech.toggle}>{speech.active?'⏹':'🎙'}</button>
                <div style={{flex:1,minWidth:0}}>
                  {speech.active
                    ?<div style={{fontFamily:'var(--fM)',fontSize:'.65rem',color:'var(--B)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🔴 {interim||'En écoute…'}</div>
                    :<div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)'}}>Cliquez pour parler · {nameA.split(' ')[0]}</div>
                  }
                </div>
              </div>
              <div className="man-row">
                <input
                  className="man-inp"
                  placeholder={`Argument de ${nameA.split(' ')[0]}…`}
                  value={manA}
                  onChange={e=>setManA(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitManual('A')}}}
                  disabled={analyzing||botThink}
                />
                <button className="btn b-a b-sm" onClick={()=>submitManual('A')} disabled={analyzing||botThink||manA.trim().length<MIN_ARG_LENGTH}>↑</button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--fM)',fontSize:'.52rem',marginTop:4}}>
                <span style={{color:'var(--muted)'}}>Entrée pour envoyer</span>
                <span style={{color:manA.trim().length>=MIN_ARG_LENGTH?'var(--G)':'var(--B)',fontWeight:manA.trim().length<MIN_ARG_LENGTH?600:400}}>
                  {manA.trim().length} / {MIN_ARG_LENGTH} caractères minimum
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ CENTER PANE — Scores ═══ */}
        <div className="pane">
          <div className="ph"><div className="ph-t">Scores</div><div className="ph-m">Live</div></div>
          <ScorePanel tA={tA} tB={tB} nameA={nameA} nameB={nameB} sum={sum}/>
          <div className="crits">{CRITERIA.map(c=>{const a=sA[c.key]||5,b=sB[c.key]||5,s=a+b||1;return(<div key={c.key} className="crit"><div className="crit-lbl"><span>{c.label}</span><span className="crit-w">{(c.weight*100).toFixed(0)}%</span></div><div className="crit-row"><div className="cv cv-a">{a.toFixed(1)}</div><div className="cbar"><div className="cba" style={{width:`${(a/s)*100}%`}}/><div className="cbb" style={{width:`${(b/s)*100}%`}}/></div><div className="cv cv-b">{b.toFixed(1)}</div></div></div>)})}</div>
          <div className="ph" style={{borderTop:'1px solid var(--bd)'}}><div className="ph-t">Flux</div><div className="ph-m">{tx.length}</div></div>
          <div className="pb" style={{gap:3}}>
            {tx.length===0&&<div className="empty" style={{minHeight:40}}><div className="empty-i" style={{fontSize:'1rem'}}>◈</div><div className="empty-t">En attente</div></div>}
            {[...tx].reverse().slice(0,8).map(e=>(
              <div key={e.id} className="feed-item">
                <span className={`ebadge eb${e.side.toLowerCase()}`} style={{fontSize:'.54rem',flexShrink:0}}>{e.side==='A'?nameA.split(' ')[0]:nameB.split(' ')[0]}</span>
                <span className="feed-txt">{e.formalized||e.raw}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ RIGHT PANE — Orateur B + VAR/IA ═══ */}
        <div className={`pane ${mode==='offline'&&speech.active&&actSide==='B'?'recording':''} ${pressureSide==='B'?'prs-losing-pane':pressureSide==='A'?'prs-winning-glow':''}`} style={{position:'relative'}}>
          {pressureSide==='B'&&<div className="prs-red-tint" aria-hidden="true"/>}

          {/* Header orateur B — visible dans tous les modes */}
          <div className="ph">
            <div className="ph-t" style={{color:'var(--B)'}}>
              {nameB}
              <span style={{color:'var(--muted)',fontSize:'.52rem',marginLeft:6,fontFamily:'var(--fM)',textTransform:'uppercase'}}>
                {mode==='bot'?'🤖 Bot':mode==='offline'?'Orateur B':'Adversaire'}
              </span>
            </div>
            <div className="ph-m">{rightTx.length} arg.</div>
          </div>

          {/* Arguments orateur B — TOUJOURS visible */}
          <div className="pb" style={{flex:'0 0 auto',maxHeight:showBothPanes?'38%':'100%',overflowY:'auto',borderBottom:showBothPanes?'1px solid var(--bd)':'none'}}>
            {rightTx.length===0&&!botThink&&<div className="empty" style={{minHeight:50}}><div className="empty-i">{mode==='bot'?'🤖':'◎'}</div><div className="empty-t">{mode==='bot'?`${nameB} va répondre…`:'En attente'}</div></div>}
            {rightTx.map(e=>(
              <ArgumentCard key={e.id} entry={e} side="B" name={nameB}
                defeatedId={defeatedId}
                scoreDisplay={<ArgScoreDisplay entry={e} side="B"/>}/>
            ))}
            {botThink&&<div className="typing"><div style={{display:'flex',gap:3}}>{[0,1,2].map(i=><div key={i} className="td"/>)}</div><div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--dim)',marginLeft:6,display:'flex',alignItems:'center',gap:5}}><span>🤖</span>{nameB} réfléchit…</div></div>}
          </div>

          {/* Zone saisie orateur B (offline uniquement) */}
          {!isSpectator&&mode==='offline'&&actSide==='B'&&(
            <div className="vzone">
              <div className="vrow">
                <button className={`mic ${speech.active?'mic-on':'mic-off'}`} onClick={speech.toggle}>{speech.active?'⏹':'🎙'}</button>
                <div style={{flex:1,minWidth:0}}>
                  {speech.active
                    ?<div style={{fontFamily:'var(--fM)',fontSize:'.65rem',color:'var(--B)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🔴 {interim||'En écoute…'}</div>
                    :<div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)'}}>Parler · {nameB.split(' ')[0]}</div>
                  }
                </div>
              </div>
              <div className="man-row">
                <input
                  className="man-inp fi-b"
                  placeholder={`Argument de ${nameB.split(' ')[0]}…`}
                  value={manB}
                  onChange={e=>setManB(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitManual('B')}}}
                  disabled={analyzing}
                />
                <button className="btn b-b b-sm" onClick={()=>submitManual('B')} disabled={analyzing||manB.trim().length<MIN_ARG_LENGTH}>↑</button>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',fontFamily:'var(--fM)',fontSize:'.52rem',marginTop:4}}>
                <span style={{color:manB.trim().length>=MIN_ARG_LENGTH?'var(--G)':'var(--B)',fontWeight:manB.trim().length<MIN_ARG_LENGTH?600:400}}>
                  {manB.trim().length} / {MIN_ARG_LENGTH} caractères minimum
                </span>
              </div>
            </div>
          )}

          {/* Switcher offline (bas du pane droit) */}
          {!isSpectator&&mode==='offline'&&(
            <div className="sw-bar" style={{padding:'6px 12px',borderTop:'1px solid var(--bd)',flexShrink:0}}>
              <button className={`sw-btn sw-a ${actSide==='A'?'sw-on':''}`} onClick={()=>setAS('A')}>🎙 {nameA.split(' ')[0]}</button>
              <span style={{fontFamily:'var(--fH)',fontSize:'.9rem',color:'var(--muted)'}}>⇄</span>
              <button className={`sw-btn sw-b ${actSide==='B'?'sw-on':''}`} onClick={()=>setAS('B')}>🎙 {nameB.split(' ')[0]}</button>
            </div>
          )}

          {/* VAR + Commentaires IA — dans tous les modes */}
          {showBothPanes&&<>
            <div className="tabs" style={{flexShrink:0}}>
              <button className={`tab ${rtab==='var'?'on':''}`} onClick={()=>setRT('var')}>VAR {vars.length>0&&`(${vars.length})`}</button>
              <button className={`tab ${rtab==='com'?'on':''}`} onClick={()=>setRT('com')}>IA {coms.length>0&&`(${coms.length})`}</button>
            </div>
            <div className="pb">
              {rtab==='var'&&<>{vars.length===0&&<div className="empty"><div className="empty-i">◈</div><div className="empty-t">Aucun VAR</div></div>}{vars.map(v=>(<div key={v.id} className="var-box"><div className="var-hd"><div className="var-num">#{v.num}</div><div><div className={`var-type ${v.negative?'var-neg':'var-pos'}`}>{v.type}</div><div style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)'}}>{v.speakerName}</div></div><span className={`ebadge eb${v.side?.toLowerCase()}`} style={{marginLeft:'auto',fontSize:'.58rem'}}>{v.side}</span></div><div className="var-bd"><div className="var-expl">{v.explanation}</div><div className="var-imp">Impact : <b>{v.impact_criterion}</b> {v.impact_delta>0?'+':''}{v.impact_delta?.toFixed(1)}</div></div></div>))}</>}
              {rtab==='com'&&<>{coms.length===0&&<div className="empty"><div className="empty-i">◇</div><div className="empty-t">Commentaires IA</div></div>}{coms.map((c,i)=>(<div key={c.id} className="com"><div className="com-lbl">#{i+1} · {c.side==='A'?nameA.split(' ')[0]:nameB.split(' ')[0]}</div><div className="com-txt">{c.text}</div></div>))}</>}
            </div>
          </>}

          {/* Mode offline : VAR/IA dans tout le pane */}
          {!showBothPanes&&<>
            <div className="tabs" style={{flexShrink:0}}>
              <button className={`tab ${rtab==='var'?'on':''}`} onClick={()=>setRT('var')}>VAR {vars.length>0&&`(${vars.length})`}</button>
              <button className={`tab ${rtab==='com'?'on':''}`} onClick={()=>setRT('com')}>IA {coms.length>0&&`(${coms.length})`}</button>
            </div>
            <div className="pb">
              {rtab==='var'&&<>{vars.length===0&&<div className="empty"><div className="empty-i">◈</div><div className="empty-t">Aucun VAR</div></div>}{vars.map(v=>(<div key={v.id} className="var-box"><div className="var-hd"><div className="var-num">#{v.num}</div><div><div className={`var-type ${v.negative?'var-neg':'var-pos'}`}>{v.type}</div><div style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)'}}>{v.speakerName}</div></div><span className={`ebadge eb${v.side?.toLowerCase()}`} style={{marginLeft:'auto',fontSize:'.58rem'}}>{v.side}</span></div><div className="var-bd"><div className="var-expl">{v.explanation}</div><div className="var-imp">Impact : <b>{v.impact_criterion}</b> {v.impact_delta>0?'+':''}{v.impact_delta?.toFixed(1)}</div></div></div>))}</>}
              {rtab==='com'&&<>{coms.length===0&&<div className="empty"><div className="empty-i">◇</div><div className="empty-t">Commentaires IA</div></div>}{coms.map((c,i)=>(<div key={c.id} className="com"><div className="com-lbl">#{i+1} · {c.side==='A'?nameA.split(' ')[0]:nameB.split(' ')[0]}</div><div className="com-txt">{c.text}</div></div>))}</>}
            </div>
          </>}
        </div>
      </div>

      {/* OBS MODAL */}
      {showOBS&&<div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setSO(false)}}><div className="modal"><div className="modal-h"><div className="modal-ht">🎬 Overlay OBS</div><button className="modal-x" onClick={()=>setSO(false)}>✕</button></div><div className="modal-b"><div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:5,padding:'10px 12px',fontFamily:'var(--fM)',fontSize:'.66rem',color:'var(--A)',wordBreak:'break-all',cursor:'pointer'}} onClick={()=>{const url=`${window.location.href.split('?')[0]}?mode=obs&room=${code}&commentary=1&transcript=1&var=1&crits=1`;navigator.clipboard?.writeText(url);setToast('URL copiée !')}}>Cliquer pour copier l'URL OBS</div><div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)'}}>Activez "Fond transparent" dans OBS · Résolution 1920×1080</div><button className="btn b-ghost b-sm" onClick={()=>setSO(false)}>Fermer</button></div></div></div>}
      {toast&&<Toast msg={toast} type="success" onDone={()=>setToast('')}/>}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   REPORT SCREEN — Academic Debate Analysis Report v2
   Public shareable · SEO-ready · Multi-section
══════════════════════════════════════════════════════════════ */

/* ── Sub-components ──────────────────────────────────────── */
function ScoreEvolutionChart({tx,nA,nB}){
  if(!tx||tx.length<2)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:80,border:'1px dashed var(--bd)',borderRadius:6,color:'var(--muted)',fontFamily:'var(--fM)',fontSize:'.62rem',gap:8}}>
      <span style={{opacity:.5}}>◈</span> Pas assez d'arguments pour afficher l'évolution
    </div>
  );
  const W=560,H=140,PX=32,PY=20;
  const pts=[];let cA=5,cB=5;
  tx.forEach((e,i)=>{
    if(e.strength!=null){
      if(e.side==='A')cA=cA*.65+(e.strength||5)*.35;
      else cB=cB*.65+(e.strength||5)*.35;
    }
    pts.push({i,a:+cA.toFixed(2),b:+cB.toFixed(2)});
  });
  const vals=[...pts.map(p=>p.a),...pts.map(p=>p.b)];
  const minV=Math.max(0,Math.min(...vals)-0.5);
  const maxV=Math.min(10,Math.max(...vals)+0.5);
  const rng=maxV-minV||1;
  const cx=i=>(PX+(i/(pts.length-1||1))*(W-PX*2)).toFixed(1);
  const cy=v=>(H-PY-((v-minV)/rng)*(H-PY*2)).toFixed(1);
  const pA=pts.map((p,i)=>`${i===0?'M':'L'}${cx(i)},${cy(p.a)}`).join(' ');
  const pB=pts.map((p,i)=>`${i===0?'M':'L'}${cx(i)},${cy(p.b)}`).join(' ');
  const fillA=`${pA} L${cx(pts.length-1)},${H-PY} L${cx(0)},${H-PY} Z`;
  const fillB=`${pB} L${cx(pts.length-1)},${H-PY} L${cx(0)},${H-PY} Z`;
  const ticks=[Math.ceil(minV),Math.round((minV+maxV)/2),Math.floor(maxV)];
  return(
    <div style={{position:'relative'}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block',overflow:'visible'}}>
        <defs>
          <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(44,74,110,.18)"/><stop offset="100%" stopColor="rgba(44,74,110,0)"/></linearGradient>
          <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(140,58,48,.15)"/><stop offset="100%" stopColor="rgba(140,58,48,0)"/></linearGradient>
        </defs>
        {/* Grid */}
        {ticks.map(v=>(
          <g key={v}>
            <line x1={PX} y1={cy(v)} x2={W-PX} y2={cy(v)} stroke="var(--bd)" strokeWidth="1" strokeDasharray="3 4"/>
            <text x={PX-5} y={parseFloat(cy(v))+4} textAnchor="end" fill="var(--muted)" fontSize="9" fontFamily="var(--fM)">{v}</text>
          </g>
        ))}
        {/* Argument marker lines */}
        {pts.map((p,i)=>i%2===0&&pts.length>4?(
          <line key={i} x1={cx(i)} y1={PY} x2={cx(i)} y2={H-PY} stroke="var(--bd)" strokeWidth="1" strokeDasharray="2 6" opacity=".5"/>
        ):null)}
        {/* Area fills */}
        <path d={fillA} fill="url(#gradA)"/>
        <path d={fillB} fill="url(#gradB)"/>
        {/* Lines */}
        <path d={pA} fill="none" stroke="var(--A)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={pB} fill="none" stroke="var(--B)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dots on each point */}
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={cx(i)} cy={cy(p.a)} r="2.5" fill="var(--A)" opacity={i===pts.length-1?1:.5}/>
            <circle cx={cx(i)} cy={cy(p.b)} r="2.5" fill="var(--B)" opacity={i===pts.length-1?1:.5}/>
          </g>
        ))}
        {/* End labels */}
        <text x={parseFloat(cx(pts.length-1))+8} y={parseFloat(cy(pts[pts.length-1].a))+4} fill="var(--A)" fontSize="10" fontFamily="var(--fH)" fontWeight="700">{nA.split(' ')[0]} {pts[pts.length-1].a.toFixed(1)}</text>
        <text x={parseFloat(cx(pts.length-1))+8} y={parseFloat(cy(pts[pts.length-1].b))+4} fill="var(--B)" fontSize="10" fontFamily="var(--fH)" fontWeight="700">{nB.split(' ')[0]} {pts[pts.length-1].b.toFixed(1)}</text>
      </svg>
      <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',marginTop:4,padding:'0 '+PX+'px'}}>
        <span>Arg. 1</span>
        {pts.length>4&&<span>Arg. {Math.ceil(pts.length/2)}</span>}
        <span>Arg. {pts.length}</span>
      </div>
    </div>
  );
}

function CritBar({valA,valB,label,weight}){
  const pA=Math.round((valA/10)*100);
  const pB=Math.round((valB/10)*100);
  const aWins=valA>valB,tied=Math.abs(valA-valB)<.2;
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <span style={{fontFamily:'var(--fH)',fontSize:'.72rem',letterSpacing:'.07em',color:'var(--dim)'}}>{label}</span>
          <span style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',background:'var(--s2)',padding:'1px 5px',borderRadius:3}}>{(weight*100).toFixed(0)}%</span>
          {!tied&&<span style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:aWins?'var(--A)':'var(--B)'}}>{aWins?'▲':'▼'}</span>}
        </div>
        <div style={{display:'flex',gap:8,fontFamily:'var(--fH)',fontSize:'.82rem'}}>
          <span style={{color:'var(--A)',minWidth:28,textAlign:'right'}}>{valA.toFixed(1)}</span>
          <span style={{color:'var(--muted)',fontSize:'.6rem',fontFamily:'var(--fC)',fontStyle:'italic'}}>vs</span>
          <span style={{color:'var(--B)',minWidth:28}}>{valB.toFixed(1)}</span>
        </div>
      </div>
      <div style={{display:'flex',gap:4,alignItems:'center'}}>
        <div style={{flex:1,height:5,background:'var(--s2)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pA}%`,background:aWins?'var(--A)':'rgba(44,74,110,.5)',borderRadius:3,transition:'width 1.2s ease'}}/>
        </div>
        <div style={{flex:1,height:5,background:'var(--s2)',borderRadius:3,overflow:'hidden',transform:'scaleX(-1)'}}>
          <div style={{height:'100%',width:`${pB}%`,background:!aWins&&!tied?'var(--B)':'rgba(140,58,48,.5)',borderRadius:3,transition:'width 1.2s ease'}}/>
        </div>
      </div>
    </div>
  );
}

function RSection({title,icon,sub,children,noBorder}){
  return(
    <section style={{marginBottom:36}} aria-label={title}>
      <div style={{display:'flex',alignItems:'flex-end',gap:10,marginBottom:16,paddingBottom:10,borderBottom:noBorder?'none':'1px solid var(--bd)'}}>
        {icon&&<span style={{fontSize:'1.05rem',opacity:.65,flexShrink:0}}>{icon}</span>}
        <div>
          <h2 style={{fontFamily:'var(--fH)',fontSize:'.78rem',letterSpacing:'.2em',color:'var(--muted)',textTransform:'uppercase',margin:0,lineHeight:1}}>{title}</h2>
          {sub&&<p style={{fontFamily:'var(--fC)',fontSize:'.74rem',color:'var(--muted)',fontStyle:'italic',margin:'3px 0 0',lineHeight:1}}>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoPill({label,value}){
  return(
    <div style={{display:'flex',gap:5,alignItems:'center',padding:'5px 13px',background:'#FDFAF4',border:'1px solid var(--bd)',borderRadius:20,boxShadow:'var(--sh)',flexShrink:0}}>
      <span style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em'}}>{label}</span>
      <span style={{fontFamily:'var(--fH)',fontSize:'.72rem',color:'var(--txt)',letterSpacing:'.04em'}}>{value}</span>
    </div>
  );
}

function VarCard({v,idx,nA,nB}){
  const isNeg=v.impact_delta==null||v.impact_delta<=0;
  const col=isNeg?'var(--B)':'var(--G)';
  const bg=isNeg?'rgba(140,58,48,.06)':'rgba(58,110,82,.05)';
  const bdr=isNeg?'rgba(140,58,48,.22)':'rgba(58,110,82,.2)';
  const spkName=v.side==='A'?nA:nB;
  const spkCol=v.side==='A'?'var(--A)':'var(--B)';
  return(
    <div style={{background:'#FDFAF4',border:`1px solid ${bdr}`,borderLeft:`3px solid ${col}`,borderRadius:8,padding:'12px 15px',boxShadow:'var(--sh)',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
        <span style={{fontFamily:'var(--fB)',fontSize:'.6rem',fontWeight:700,padding:'2px 8px',borderRadius:3,background:bg,color:col,border:`1px solid ${bdr}`}}>{isNeg?'⚠ Détection':'✦ Force'} {idx}</span>
        <span style={{fontFamily:'var(--fH)',fontSize:'.7rem',color:spkCol}}>{spkName}</span>
        {v.impact_delta!=null&&<span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:col,marginLeft:'auto',fontWeight:700}}>{v.impact_delta>0?'+':''}{(+v.impact_delta).toFixed(1)}</span>}
      </div>
      <p style={{fontFamily:'var(--fB)',fontSize:'.78rem',color:'var(--txt)',lineHeight:1.62,margin:0}}>{v.explanation||v.reason||'—'}</p>
      {v.impact_criterion&&<div style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)',borderTop:'1px dashed var(--bd)',paddingTop:5,marginTop:2}}>Critère · <b style={{color:'var(--dim)'}}>{v.impact_criterion}</b></div>}
    </div>
  );
}

function SharePanel({debateId,nA,nB,totalA,totalB,topic,winner,onCopy,onToast}){
  const url=`${typeof window!=='undefined'?window.location.origin:''}/debate/${debateId}`;
  const textReport=`📜 Dialectix AI — Rapport de débat\n━━━━━━━━━━━━━━━━━━━━\n📌 ${topic}\n\n⚖ Résultat\n${nA} : ${totalA.toFixed(2)} pts\n${nB} : ${totalB.toFixed(2)} pts\nVainqueur : ${winner||'—'}\n\n🔗 Replay : ${url}`;
  const [copied,setCopied]=useState(false);
  const doCopy=(text,label)=>{
    navigator.clipboard?.writeText(text).then(()=>{
      setCopied(label);
      onToast&&onToast('Copié dans le presse-papiers !');
      setTimeout(()=>setCopied(false),2200);
    }).catch(()=>onToast&&onToast('Copie non disponible'));
  };
  return(
    <div style={{background:'linear-gradient(135deg,rgba(44,74,110,.04),rgba(198,161,91,.03))',border:'1px solid var(--bd)',borderRadius:10,padding:'18px 20px',boxShadow:'var(--sh)'}}>
      {/* URL bar */}
      <div style={{display:'flex',gap:8,alignItems:'center',background:'#FDFAF4',border:'1px solid var(--bd2)',borderRadius:6,padding:'8px 12px',marginBottom:14,boxShadow:'inset 0 1px 3px rgba(40,28,8,.04)'}}>
        <span style={{fontFamily:'var(--fM)',fontSize:'.62rem',color:'var(--muted)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{url}</span>
        <button className="btn b-sm" onClick={()=>doCopy(url,'link')} style={{background:copied==='link'?'var(--G)':'var(--A)',color:'#fff',border:'none',padding:'4px 12px',flexShrink:0,fontSize:'.6rem'}}>
          {copied==='link'?'✓ Copié':'Copier'}
        </button>
      </div>
      {/* Action buttons */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn b-ghost b-sm" onClick={()=>doCopy(textReport,'report')} style={{flex:1,minWidth:140}}>
          <span>📋</span> {copied==='report'?'✓ Copié !':'Copier le rapport'}
        </button>
      </div>
      <p style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',marginTop:10,textAlign:'center',lineHeight:1.6}}>
        ID Débat · <b style={{color:'var(--dim)',letterSpacing:'.06em'}}>{debateId}</b> · Le lien de partage permettra de consulter ce rapport sans compte
      </p>
    </div>
  );
}

/* ── Main ReportScreen ───────────────────────────────────── */
function ReportScreen({tx,vars,sA,sB,nA,nB,topic,elapsed,report,genRep,user,isTraining,botElo,format,onNewDebate,onProfile,onTrain,debateId,showToast,debateConfig}){
  const [activeTab,setActiveTab]=useState('analyse');
  const totalA=gScore(sA),totalB=gScore(sB);
  const isDraw=Math.abs(totalA-totalB)<0.3;
  const isUserWin=!isDraw&&totalA>totalB;

  // ELO computation
  let eloData=null;
  if(user&&!isTraining){
    const oppElo=botElo||1200;
    const ec=calcELO(user.elo,oppElo,totalA,totalB);
    const {newRA,deltaA}=applyELO(user.elo,oppElo,ec.sA,ec.sB,ec.eA,ec.eB,user.debates,20);
    eloData={prev:user.elo,next:newRA,delta:deltaA};
  }

  // Verdict metadata
  const VERDICT_META={
    'Victoire dominante':{col:'var(--G)',bg:'rgba(58,110,82,.08)',bdr:'rgba(58,110,82,.25)',desc:'Supériorité marquée sur tous les critères.'},
    'Victoire nette'    :{col:'var(--A)',bg:'rgba(44,74,110,.08)',bdr:'rgba(44,74,110,.22)',desc:'Avantage clair sur la majorité des critères.'},
    'Victoire serrée'   :{col:'var(--Y)',bg:'rgba(198,161,91,.09)',bdr:'rgba(198,161,91,.3)',desc:'Résultat équilibré, légère supériorité.'},
    'Égalité'           :{col:'var(--muted)',bg:'rgba(90,80,70,.07)',bdr:'rgba(90,80,70,.2)',desc:'Aucun vainqueur — débat parfaitement équilibré.'},
  };
  const vm=VERDICT_META[report?.verdict]||{col:'var(--dim)',bg:'rgba(40,28,8,.04)',bdr:'var(--bd)',desc:''};

  // Top arguments by strength
  const keyArgs=[...tx].filter(e=>e.strength!=null).sort((a,b)=>(b.strength||0)-(a.strength||0)).slice(0,4);
  const mvpArg=keyArgs[0];

  // ── AI winner verdict ──────────────────────────────────────
  // Uses per-argument overall_score averages when available,
  // falls back to gScore (weighted criteria average).
  const scoredA=tx.filter(e=>e.side==='A'&&e.overall_score!=null);
  const scoredB=tx.filter(e=>e.side==='B'&&e.overall_score!=null);
  const avgOverallA=scoredA.length?scoredA.reduce((s,e)=>s+(+e.overall_score),0)/scoredA.length:totalA;
  const avgOverallB=scoredB.length?scoredB.reduce((s,e)=>s+(+e.overall_score),0)/scoredB.length:totalB;
  const aiWinnerSide=avgOverallA>avgOverallB?'A':avgOverallA<avgOverallB?'B':'draw';
  const aiWinnerScores=aiWinnerSide==='A'?sA:sB;
  const bestCrit=CRITERIA.reduce((best,c)=>(aiWinnerScores[c.key]||0)>(aiWinnerScores[best.key]||0)?c:best,CRITERIA[0]);
  const aiVerdictText=aiWinnerSide==='draw'
    ?'Débat parfaitement équilibré — aucun vainqueur.'
    :`${aiWinnerSide==='A'?nA:nB} s'impose par sa ${bestCrit.label.toLowerCase()} (${(aiWinnerScores[bestCrit.key]||5).toFixed(1)}/10).`;

  // VAR split
  const varNeg=vars.filter(v=>v.impact_delta==null||v.impact_delta<=0);
  const varPos=vars.filter(v=>v.impact_delta>0);

  // Date & ID
  const debateDate=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  const dId=debateId||'DBT-'+Math.random().toString(36).slice(2,8).toUpperCase();
  const modeLabel=isTraining?'Entraînement':debateConfig?.mode==='online'?'Classé en ligne':'Classé vs IA';

  // ── Retention insights (ScoreExplanationCard, RankProgressCard, NextObjectivePanel) ──
  const retElo         = eloData?.next ?? user?.elo ?? 1000;
  const retCurBadge    = getBadge(retElo);
  const retNxtBadge    = getNextB(retElo);
  const retPct         = rankPct(retElo);
  const retPointsNeeded= retNxtBadge ? Math.max(0, retNxtBadge.min - retElo) : 0;
  const retWeakCrit    = CRITERIA.reduce((w,c)=>(sA[c.key]??5)<(sA[w.key]??5)?c:w, CRITERIA[0]);

  const TABS=[{id:'analyse',label:'Analyse'},{id:'transcription',label:'Transcription'},{id:'partage',label:'Partager'}];

  // ── Loading ──
  if(genRep||!report){
    return(
      <div className="ov" style={{background:'var(--bg)'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'80vh',gap:22}}>
          <div style={{fontFamily:'var(--fH)',fontSize:'1.5rem',letterSpacing:'.22em',color:'var(--txt)'}}>RAPPORT <span style={{color:'var(--Y)'}}>FINAL</span></div>
          <div style={{width:44,height:44,border:'2px solid var(--bd)',borderTopColor:'var(--A)',borderRadius:'50%',animation:'spin .9s linear infinite'}}/>
          <p style={{fontFamily:'var(--fC)',fontSize:'.95rem',color:'var(--muted)',fontStyle:'italic',maxWidth:340,textAlign:'center',lineHeight:1.7}}>L'arbitre IA analyse votre débat et prépare le rapport académique…</p>
        </div>
      </div>
    );
  }

  return(
    <div className="ov" style={{background:'var(--bg)'}}>
      {/* SEO-ready main wrapper */}
      <article className="rep" style={{maxWidth:920}} role="main" aria-label={`Rapport de débat : ${topic}`}>

        {/* ══ HEADER ══════════════════════════════════════════════ */}
        <header style={{borderBottom:'1px solid var(--bd)',paddingBottom:24,marginBottom:32}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
            <div>
              <p style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)',letterSpacing:'.18em',textTransform:'uppercase',margin:'0 0 8px'}}>Dialectix AI · Rapport d'Arbitrage · {debateDate}</p>
              <h1 style={{fontFamily:'var(--fH)',fontSize:'2rem',letterSpacing:'.14em',color:'var(--txt)',margin:'0 0 6px',lineHeight:1}}>RAPPORT <span style={{color:'var(--Y)'}}>FINAL</span></h1>
              <p style={{fontFamily:'var(--fC)',fontSize:'1.1rem',color:'var(--dim)',fontStyle:'italic',lineHeight:1.55,maxWidth:680,margin:0}}>{topic}</p>
            </div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',textAlign:'right',flexShrink:0}}>
              <div style={{letterSpacing:'.12em'}}>{dId}</div>
              <div style={{marginTop:3,color:'var(--bd3)'}}>Référence officielle</div>
            </div>
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:16}}>
            <InfoPill label="Format" value={format?.toUpperCase()||'STANDARD'}/>
            <InfoPill label="Durée" value={fmt(elapsed)}/>
            <InfoPill label="Arguments" value={`${tx.length}`}/>
            <InfoPill label="Mode" value={modeLabel}/>
            <InfoPill label="Date" value={debateDate}/>
          </div>
        </header>

        {/* ══ VERDICT ══════════════════════════════════════════════ */}
        <RSection title="Verdict Final" icon="⚖️" sub="Décision de l'arbitre IA">
          <div style={{position:'relative',background:'linear-gradient(160deg,rgba(44,74,110,.04),rgba(198,161,91,.04))',border:'1px solid var(--bd)',borderRadius:12,padding:'32px 28px',boxShadow:'var(--sh2)',overflow:'hidden',textAlign:'center',marginBottom:16}}>
            {/* Decorative accent */}
            <div style={{position:'absolute',top:0,left:'15%',right:'15%',height:2,background:`linear-gradient(90deg,transparent,${vm.col},transparent)`}}/>
            <div style={{position:'absolute',bottom:0,left:'40%',right:'40%',height:1,background:`linear-gradient(90deg,transparent,${vm.col}44,transparent)`}}/>

            {/* Winner name */}
            <p style={{fontFamily:'var(--fC)',fontSize:'.82rem',color:'var(--muted)',fontStyle:'italic',margin:'0 0 10px'}}>Vainqueur du débat</p>
            <h2 style={{fontFamily:'var(--fH)',fontSize:isDraw?'2rem':'2.6rem',letterSpacing:'.16em',color:isDraw?'var(--muted)':totalA>totalB?'var(--A)':'var(--B)',margin:'0 0 12px',lineHeight:1}}>
              {isDraw?'MATCH NUL':report.winner?.toUpperCase()}
            </h2>

            {/* Verdict badge */}
            {report.verdict&&(
              <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 18px',background:vm.bg,border:`1px solid ${vm.bdr}`,borderRadius:24,marginBottom:20}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:vm.col}}/>
                <span style={{fontFamily:'var(--fH)',fontSize:'.75rem',letterSpacing:'.12em',color:vm.col}}>{report.verdict}</span>
                <span style={{fontFamily:'var(--fC)',fontSize:'.7rem',color:'var(--muted)',fontStyle:'italic'}}>{vm.desc}</span>
              </div>
            )}

            {/* Score comparison */}
            <div style={{display:'flex',alignItems:'stretch',justifyContent:'center',gap:0,margin:'20px auto',maxWidth:440}}>
              {[[nA,totalA,'var(--A)'],[nB,totalB,'var(--B)']].map(([n,v,c],idx)=>(
                <div key={n} style={{flex:1,textAlign:'center',padding:'16px 20px',background:idx===0?'rgba(44,74,110,.04)':'rgba(140,58,48,.04)',borderRadius:idx===0?'8px 0 0 8px':'0 8px 8px 0',border:`1px solid ${idx===0?'rgba(44,74,110,.18)':'rgba(140,58,48,.16)'}`,borderRight:idx===0?'none':''}}>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:6}}>{n}</div>
                  <div style={{fontFamily:'var(--fH)',fontSize:'3.2rem',color:c,lineHeight:.9,letterSpacing:'.02em'}}>{v.toFixed(1)}</div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',marginTop:6}}>/10 pts</div>
                  {getBadge(idx===0?user?.elo||1000:botElo||1200)&&(
                    <div style={{marginTop:8}}><span className={`badge-pill ${getBadge(idx===0?user?.elo||1000:botElo||1200).cls}`}>{getBadge(idx===0?user?.elo||1000:botElo||1200).icon} {getBadge(idx===0?user?.elo||1000:botElo||1200).label}</span></div>
                  )}
                </div>
              ))}
            </div>

            {/* Gap & Winner reason */}
            {report.margin&&<p style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',marginBottom:12}}>Écart · <b style={{color:'var(--dim)'}}>{report.margin}</b></p>}
            {report.winner_reason&&<p style={{fontFamily:'var(--fC)',fontSize:'.92rem',color:'var(--dim)',lineHeight:1.78,maxWidth:580,margin:'0 auto',fontStyle:'italic'}}>« {report.winner_reason} »</p>}

            {/* AI scoring verdict — based on per-argument overall_score averages */}
            <div style={{marginTop:16,padding:'10px 18px',background:'rgba(44,74,110,.05)',border:'1px solid rgba(44,74,110,.15)',borderRadius:8,display:'inline-flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:'.8rem'}}>🤖</span>
              <span style={{fontFamily:'var(--fB)',fontSize:'.7rem',color:'var(--dim)',fontWeight:500}}>{aiVerdictText}</span>
              {scoredA.length>0&&(
                <span style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',marginLeft:4}}>
                  · {nA} {avgOverallA.toFixed(1)} vs {nB} {avgOverallB.toFixed(1)}
                </span>
              )}
            </div>

            {/* Quality & percentile */}
            <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:16,flexWrap:'wrap'}}>
              {report.quality&&<span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)'}}>Qualité du débat · <b style={{color:'var(--Y)'}}>{report.quality}</b></span>}
              {!user&&report.percentile&&<span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--A)'}}>🎯 Votre niveau dépasse <b>{report.percentile}%</b> des débutants</span>}
            </div>
          </div>

          {/* MVP argument highlight */}
          {report.mvp_argument&&(
            <div style={{background:'rgba(198,161,91,.07)',border:'1px solid rgba(198,161,91,.3)',borderLeft:'4px solid var(--Y)',borderRadius:8,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start',boxShadow:'var(--sh)'}}>
              <span style={{fontSize:'1.1rem',flexShrink:0,marginTop:1}}>🏆</span>
              <div>
                <div style={{fontFamily:'var(--fB)',fontSize:'.62rem',fontWeight:700,color:'var(--Y)',marginBottom:4,letterSpacing:'.06em'}}>ARGUMENT DÉCISIF</div>
                <p style={{fontFamily:'var(--fC)',fontSize:'.88rem',color:'var(--dim)',fontStyle:'italic',lineHeight:1.68,margin:0}}>{report.mvp_argument}</p>
              </div>
            </div>
          )}
        </RSection>

        {/* ══ TABS ══════════════════════════════════════════════ */}
        <div style={{display:'flex',gap:2,background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:9,padding:4,marginBottom:28}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{flex:1,padding:'8px 12px',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'var(--fB)',fontSize:'.7rem',fontWeight:activeTab===t.id?700:500,
                background:activeTab===t.id?'#FDFAF4':'transparent',
                color:activeTab===t.id?'var(--A)':'var(--muted)',
                boxShadow:activeTab===t.id?'var(--sh)':'none',
                transition:'all .18s'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: ANALYSE ════════════════════════════════════════ */}
        {activeTab==='analyse'&&(<>

          {/* §3 — Score breakdown */}
          <RSection title="Analyse par Critère" icon="📊" sub="Comparaison détaillée des scores pondérés">
            <div style={{background:'#FDFAF4',border:'1px solid var(--bd)',borderRadius:10,padding:'20px 22px',boxShadow:'var(--sh)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:18,paddingBottom:14,borderBottom:'1px dashed var(--bd)'}}>
                {[[nA,totalA,'var(--A)'],[nB,totalB,'var(--B)']].map(([n,v,c])=>(
                  <div key={n} style={{textAlign:'center',flex:1}}>
                    <div style={{fontFamily:'var(--fH)',fontSize:'.78rem',letterSpacing:'.1em',color:c,marginBottom:3}}>{n}</div>
                    <div style={{fontFamily:'var(--fH)',fontSize:'2rem',color:c,lineHeight:1}}>{v.toFixed(2)}</div>
                    <div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',marginTop:2}}>score global</div>
                  </div>
                ))}
              </div>
              {CRITERIA.map(c=>(
                <CritBar key={c.key} label={c.label} valA={+(sA[c.key]||5).toFixed?.(1)} valB={+(sB[c.key]||5).toFixed?.(1)} weight={c.weight}/>
              ))}
            </div>
          </RSection>

          {/* §4 — Timeline */}
          {tx.length>=3&&(
            <RSection title="Évolution du Débat" icon="📈" sub={`Progression des scores sur ${tx.length} arguments`}>
              <div style={{background:'#FDFAF4',border:'1px solid var(--bd)',borderRadius:10,padding:'18px 20px',boxShadow:'var(--sh)'}}>
                <div style={{display:'flex',gap:20,marginBottom:14,flexWrap:'wrap'}}>
                  {[[nA,'var(--A)'],[nB,'var(--B)']].map(([n,c])=>(
                    <div key={n} style={{display:'flex',alignItems:'center',gap:7}}>
                      <div style={{width:22,height:2.5,background:c,borderRadius:2}}/>
                      <span style={{fontFamily:'var(--fB)',fontSize:'.65rem',fontWeight:600,color:c}}>{n}</span>
                    </div>
                  ))}
                </div>
                <ScoreEvolutionChart tx={tx} nA={nA} nB={nB}/>
              </div>
            </RSection>
          )}

          {/* §5 — AI Analysis */}
          <RSection title="Analyse de l'Arbitre IA" icon="🧠" sub="Évaluation académique structurée">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {[[nA,'var(--A)',report.strongest_a,report.weakest_a],[nB,'var(--B)',report.strongest_b,report.weakest_b]].map(([n,c,strong,weak])=>(
                <div key={n} style={{background:'#FDFAF4',border:'1px solid var(--bd)',borderLeft:`4px solid ${c}`,borderRadius:9,padding:'16px 18px',boxShadow:'var(--sh)'}}>
                  <div style={{fontFamily:'var(--fH)',fontSize:'.82rem',letterSpacing:'.12em',color:c,marginBottom:14,paddingBottom:8,borderBottom:'1px solid var(--bd)'}}>{n}</div>
                  {strong&&(
                    <div style={{marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,fontFamily:'var(--fB)',fontSize:'.6rem',fontWeight:700,color:'var(--G)',marginBottom:5}}>✦ Force principale</div>
                      <p style={{fontFamily:'var(--fC)',fontSize:'.86rem',color:'var(--dim)',lineHeight:1.72,fontStyle:'italic',margin:0}}>{strong}</p>
                    </div>
                  )}
                  {weak&&(
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:5,fontFamily:'var(--fB)',fontSize:'.6rem',fontWeight:700,color:'var(--muted)',marginBottom:5}}>△ Axe d'amélioration</div>
                      <p style={{fontFamily:'var(--fC)',fontSize:'.86rem',color:'var(--dim)',lineHeight:1.72,fontStyle:'italic',margin:0}}>{weak}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {report.summary&&(
              <div style={{background:'rgba(44,74,110,.04)',border:'1px solid rgba(44,74,110,.15)',borderRadius:9,padding:'16px 20px',boxShadow:'var(--sh)'}}>
                <div style={{fontFamily:'var(--fB)',fontSize:'.62rem',fontWeight:700,color:'var(--A)',marginBottom:8,letterSpacing:'.08em'}}>SYNTHÈSE GÉNÉRALE</div>
                <p style={{fontFamily:'var(--fC)',fontSize:'.92rem',color:'var(--dim)',lineHeight:1.82,fontStyle:'italic',margin:0}}>{report.summary}</p>
              </div>
            )}
          </RSection>

          {/* §6 — VAR */}
          {vars.length>0&&(
            <RSection title="Détections VAR" icon="🚩" sub={`${varNeg.length} détection(s) · ${varPos.length} force(s)`}>
              {varNeg.length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontFamily:'var(--fB)',fontSize:'.62rem',fontWeight:700,color:'var(--B)',marginBottom:8,letterSpacing:'.06em'}}>⚠ Arguments signalés</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8}}>
                    {varNeg.map((v,i)=><VarCard key={i} v={v} idx={i+1} nA={nA} nB={nB}/>)}
                  </div>
                </div>
              )}
              {varPos.length>0&&(
                <div>
                  <div style={{fontFamily:'var(--fB)',fontSize:'.62rem',fontWeight:700,color:'var(--G)',marginBottom:8,letterSpacing:'.06em'}}>✦ Arguments remarquables</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8}}>
                    {varPos.map((v,i)=><VarCard key={i} v={v} idx={i+1} nA={nA} nB={nB}/>)}
                  </div>
                </div>
              )}
              {((report.key_fallacies?.length||0)+(report.key_strengths?.length||0))>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:12}}>
                  {report.key_fallacies?.map((f,i)=><span key={i} className="ftag ftag-bad">⚠ {f}</span>)}
                  {report.key_strengths?.map((s,i)=><span key={i} className="ftag ftag-good">✦ {s}</span>)}
                </div>
              )}
            </RSection>
          )}

          {/* §7 — ELO */}
          {eloData&&(
            <RSection title="Impact ELO" icon="🏅">
              <div style={{background:'#FDFAF4',border:'1px solid rgba(198,161,91,.28)',borderRadius:10,padding:'22px 26px',boxShadow:'var(--sh)',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
                <div style={{textAlign:'center',minWidth:80}}>
                  <p style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em',margin:'0 0 4px'}}>Avant</p>
                  <div style={{fontFamily:'var(--fH)',fontSize:'2.1rem',color:'var(--dim)',lineHeight:1}}>{eloData.prev}</div>
                </div>
                <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:120}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                    <div style={{flex:1,height:2,background:`linear-gradient(90deg,var(--bd2),${eloData.delta>=0?'var(--G)':'var(--B)'})`}}/>
                    <div style={{padding:'6px 18px',background:eloData.delta>=0?'rgba(58,110,82,.1)':'rgba(140,58,48,.08)',border:`1px solid ${eloData.delta>=0?'rgba(58,110,82,.28)':'rgba(140,58,48,.22)'}`,borderRadius:24,flexShrink:0}}>
                      <span style={{fontFamily:'var(--fH)',fontSize:'1.4rem',letterSpacing:'.04em',color:eloData.delta>=0?'var(--G)':'var(--B)'}}>{eloData.delta>=0?'+':''}{eloData.delta}</span>
                    </div>
                    <div style={{flex:1,height:2,background:`linear-gradient(90deg,${eloData.delta>=0?'var(--G)':'var(--B)'},var(--bd2))`}}/>
                  </div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)'}}>{eloData.delta>=0?'Points gagnés':'Points perdus'}</div>
                </div>
                <div style={{textAlign:'center',minWidth:80}}>
                  <p style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em',margin:'0 0 4px'}}>Nouveau</p>
                  <div style={{fontFamily:'var(--fH)',fontSize:'2.1rem',color:'var(--Y)',lineHeight:1}}>{eloData.next}</div>
                </div>
                <div style={{flex:2,minWidth:200}}>
                  <RankBar elo={eloData.next}/>
                </div>
              </div>
            </RSection>
          )}

          {/* §8 — Coaching */}
          <RSection title="Coaching Personnalisé" icon="🎯" sub="Recommandations de l'arbitre IA pour progresser">
            <div style={{background:'linear-gradient(160deg,rgba(44,74,110,.04),rgba(198,161,91,.03))',border:'1px solid var(--bd)',borderRadius:10,padding:'20px 24px',boxShadow:'var(--sh)'}}>
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {[
                  {n:'01',t:'Point fort à consolider',body:report.strongest_a||'Maintenir la cohérence argumentative dans tous les échanges.'},
                  {n:'02',t:'Axe prioritaire d\'amélioration',body:report.weakest_a||'Renforcer le recours aux preuves empiriques et aux sources vérifiables.'},
                  {n:'03',t:'Recommandation tactique',body:report.rec_a||'Structurer chaque argument selon le format : prémisse → développement → conclusion.'},
                ].map(item=>(
                  <div key={item.n} style={{display:'flex',gap:16,alignItems:'flex-start',paddingBottom:item.n!=='03'?16:0,borderBottom:item.n!=='03'?'1px dashed var(--bd)':'none'}}>
                    <div style={{fontFamily:'var(--fH)',fontSize:'1.6rem',color:'var(--bd3)',flexShrink:0,lineHeight:1,marginTop:2,letterSpacing:'.04em'}}>{item.n}</div>
                    <div>
                      <div style={{fontFamily:'var(--fB)',fontSize:'.68rem',fontWeight:700,color:'var(--txt)',marginBottom:4,letterSpacing:'.02em'}}>{item.t}</div>
                      <p style={{fontFamily:'var(--fB)',fontSize:'.8rem',color:'var(--dim)',lineHeight:1.72,margin:0}}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RSection>

          {/* §9 — Key arguments */}
          {keyArgs.length>0&&(
            <RSection title="Arguments Clés" icon="✦" sub={`Les ${keyArgs.length} arguments les plus déterminants du débat`}>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {keyArgs.map((e,i)=>(
                  <div key={e.id} style={{display:'flex',gap:14,padding:'14px 18px',background:'#FDFAF4',border:`1px solid ${i===0?'rgba(198,161,91,.35)':'var(--bd)'}`,borderLeft:`4px solid ${e.side==='A'?'var(--A)':'var(--B)'}`,borderRadius:9,boxShadow:i===0?'var(--sh2)':'var(--sh)',position:'relative',overflow:'hidden',transition:'all .18s'}}>
                    {i===0&&<div style={{position:'absolute',top:0,right:0,background:'rgba(198,161,91,.12)',borderBottom:'1px solid rgba(198,161,91,.25)',borderLeft:'1px solid rgba(198,161,91,.25)',borderBottomLeftRadius:7,padding:'3px 11px',fontFamily:'var(--fH)',fontSize:'.6rem',letterSpacing:'.1em',color:'var(--Y)'}}>DÉCISIF</div>}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,minWidth:50}}>
                      <span className={`ebadge ${e.side==='A'?'eba':'ebb'}`}>{e.side==='A'?nA.split(' ')[0]:nB.split(' ')[0]}</span>
                      {e.strength!=null&&<div style={{fontFamily:'var(--fH)',fontSize:'.88rem',color:'var(--Y)',lineHeight:1}}>{(+e.strength).toFixed(0)}<span style={{fontFamily:'var(--fM)',fontSize:'.48rem',color:'var(--muted)'}}>/10</span></div>}
                      <div style={{fontFamily:'var(--fM)',fontSize:'.5rem',color:'var(--muted)'}}>{fmt(e.time)}</div>
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:'var(--fC)',fontSize:'.9rem',color:'var(--txt)',lineHeight:1.72,fontStyle:'italic',margin:'0 0 6px'}}>{e.formalized||e.raw}</p>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--O)',textTransform:'uppercase',letterSpacing:'.08em'}}>{e.type}</span>
                        <span style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)'}}>{e.phase}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RSection>
          )}

        {/* ── §10 — Insights personnalisés (retention features) ─────────────── */}
        <RSection title="Analyse de votre performance" icon="📊" sub="Décomposition des 5 critères — votre point fort et axe d'amélioration">
          <ScoreExplanationCard sUser={sA} sOpp={sB} isWin={isUserWin} isDraw={isDraw}/>
        </RSection>

        {user&&(
          <RSection title="Progression de rang" icon="🏅" sub="Votre position dans la hiérarchie des débatteurs">
            <RankProgressCard elo={retElo} currentBadge={retCurBadge} nextBadge={retNxtBadge} pct={retPct}/>
          </RSection>
        )}

        {user&&(
          <RSection title="Prochains objectifs" icon="🎯" sub="Ce que vous devez faire maintenant pour progresser">
            <NextObjectivePanel
              user={user} isWin={isUserWin} isDraw={isDraw}
              nextBadge={retNxtBadge} pointsNeeded={retPointsNeeded}
              weakCritLabel={retWeakCrit.label}
              onTrain={onTrain}
              onScrollToReport={() => window.scrollTo({top:0,behavior:'smooth'})}
              report={report}
            />
          </RSection>
        )}

        </>)}

        {/* ══ TAB: TRANSCRIPTION ══════════════════════════════════ */}
        {activeTab==='transcription'&&(
          <RSection title={`Transcription Intégrale`} icon="📜" sub={`${tx.length} arguments · Verbatim et formalisations académiques`}>
            <div style={{background:'#FDFAF4',border:'1px solid var(--bd)',borderRadius:10,overflow:'hidden',boxShadow:'var(--sh)'}}>
              {tx.map((e,i)=>(
                <div key={e.id} style={{display:'flex',gap:13,padding:'12px 16px',borderBottom:i<tx.length-1?'1px solid var(--bd)':'none',borderLeft:`4px solid ${e.side==='A'?'var(--A)':'var(--B)'}`,background:i%2===0?'transparent':'rgba(40,28,8,.012)'}}>
                  <div style={{flexShrink:0,width:70,display:'flex',flexDirection:'column',gap:3}}>
                    <span className={`ebadge ${e.side==='A'?'eba':'ebb'}`} style={{fontSize:'.55rem'}}>{e.side==='A'?nA.split(' ')[0]:nB.split(' ')[0]}</span>
                    <div style={{fontFamily:'var(--fM)',fontSize:'.5rem',color:'var(--muted)'}}>{fmt(e.time)}</div>
                    {e.strength!=null&&<div style={{fontFamily:'var(--fH)',fontSize:'.72rem',color:'var(--Y)'}}>{(+e.strength).toFixed(0)}/10</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:6,marginBottom:5,flexWrap:'wrap'}}>
                      <span style={{fontFamily:'var(--fM)',fontSize:'.5rem',color:'var(--O)',textTransform:'uppercase',letterSpacing:'.08em'}}>{e.type}</span>
                      <span style={{fontFamily:'var(--fM)',fontSize:'.5rem',color:'var(--muted)'}}>{e.phase}</span>
                    </div>
                    <p style={{fontFamily:'var(--fC)',fontSize:'.86rem',color:'var(--txt)',lineHeight:1.72,fontStyle:'italic',margin:0}}>{e.formalized||e.raw}</p>
                    {e.raw&&e.formalized&&e.raw!==e.formalized&&(
                      <p style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',marginTop:5,paddingTop:5,borderTop:'1px dashed var(--bd)',fontStyle:'italic',margin:'5px 0 0'}}>🗣 {e.raw}</p>
                    )}
                    {e.scores&&(
                      <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
                        {CRITERIA.map(c=>e.scores[c.key]!=null&&(
                          <span key={c.key} style={{fontFamily:'var(--fM)',fontSize:'.48rem',padding:'1px 5px',borderRadius:3,background:'var(--s2)',color:'var(--muted)'}}>
                            {c.label} {(+e.scores[c.key]).toFixed(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </RSection>
        )}

        {/* ══ TAB: PARTAGE ════════════════════════════════════════ */}
        {activeTab==='partage'&&(
          <>
            <RSection title="Partager ce Débat" icon="🔗" sub="Rendez ce rapport accessible à tous">
              <SharePanel debateId={dId} nA={nA} nB={nB} totalA={totalA} totalB={totalB} topic={topic} winner={report.winner} onToast={showToast}/>
            </RSection>

            <RSection title="Aperçu Public" icon="👁" sub="Ce que verront les visiteurs sans compte">
              <div style={{background:'var(--s2)',border:'1px dashed var(--bd2)',borderRadius:10,padding:'20px',boxShadow:'inset 0 1px 4px rgba(40,28,8,.05)'}}>
                <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',letterSpacing:'.16em',textTransform:'uppercase',marginBottom:14,textAlign:'center'}}>— Aperçu mode public —</div>
                {/* Minimal public view */}
                <div style={{background:'#FDFAF4',borderRadius:9,border:'1px solid var(--bd)',padding:'16px 20px',boxShadow:'var(--sh)',maxWidth:560,margin:'0 auto'}}>
                  <div style={{fontFamily:'var(--fH)',fontSize:.75+'rem',letterSpacing:'.14em',color:'var(--muted)',marginBottom:6}}>RAPPORT DE DÉBAT PUBLIC</div>
                  <p style={{fontFamily:'var(--fC)',fontSize:'.95rem',color:'var(--txt)',fontStyle:'italic',lineHeight:1.55,margin:'0 0 14px'}}>{topic}</p>
                  <div style={{display:'flex',gap:8,marginBottom:12}}>
                    <InfoPill label="Format" value={format?.toUpperCase()||'STANDARD'}/>
                    <InfoPill label="Arguments" value={`${tx.length}`}/>
                  </div>
                  <div style={{display:'flex',gap:8,marginBottom:10}}>
                    {[[nA,totalA,'var(--A)'],[nB,totalB,'var(--B)']].map(([n,v,c])=>(
                      <div key={n} style={{flex:1,textAlign:'center',padding:'10px',background:`${c}08`,border:`1px solid ${c}30`,borderRadius:7}}>
                        <div style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',marginBottom:4}}>{n}</div>
                        <div style={{fontFamily:'var(--fH)',fontSize:'1.6rem',color:c}}>{v.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                  {report.winner&&<div style={{fontFamily:'var(--fH)',fontSize:'.78rem',letterSpacing:'.1em',color:'var(--G)',textAlign:'center'}}>Vainqueur · {report.winner}</div>}
                  <div style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',textAlign:'center',marginTop:10,paddingTop:10,borderTop:'1px dashed var(--bd)'}}>Données privées masquées · ELO · Profil · Historique</div>
                </div>
              </div>
            </RSection>

            {/* SEO meta preview */}
            <RSection title="Structure SEO" icon="🔎" sub="Métadonnées pour indexation future">
              <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:9,padding:'16px 18px',fontFamily:'var(--fM)',fontSize:'.62rem',color:'var(--muted)',lineHeight:1.8}}>
                {[
                  {k:'title',v:`Débat : ${topic.slice(0,60)}… — Dialectix AI`},
                  {k:'description',v:`${nA} vs ${nB} · ${format?.toUpperCase()} · ${tx.length} arguments · Vainqueur : ${report.winner||'—'}`},
                  {k:'og:url',v:`/debate/${dId}`},
                  {k:'og:type',v:'article'},
                ].map(m=>(
                  <div key={m.k} style={{display:'flex',gap:8,padding:'4px 0',borderBottom:'1px dashed var(--bd)'}}>
                    <span style={{color:'var(--A)',minWidth:120,flexShrink:0}}>{m.k}</span>
                    <span style={{color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.v}</span>
                  </div>
                ))}
              </div>
            </RSection>
          </>
        )}

        {/* ══ ACTION BUTTONS ══════════════════════════════════════ */}
        <div style={{borderTop:'1px solid var(--bd)',paddingTop:24,paddingBottom:60,marginTop:8}}>
          <div style={{display:'flex',justifyContent:'center',gap:10,flexWrap:'wrap'}}>
            <button className="btn b-a b-lg" onClick={onNewDebate}>Nouveau débat</button>
            {user&&<button className="btn b-ghost b-lg" onClick={onProfile}>Mon profil</button>}
            {onTrain&&<button className="btn b-ghost b-lg" onClick={onTrain} style={{color:'var(--O)',borderColor:'rgba(160,90,44,.3)'}}>Entraîner mes faiblesses</button>}
            {onNewDebate&&debateConfig?.botConfig&&<button className="btn b-ghost b-lg" onClick={onNewDebate} style={{color:'var(--A)',borderColor:'rgba(44,74,110,.28)'}}>⚔ Revanche</button>}
          </div>
        </div>

      </article>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   WAITING ROOM
══════════════════════════════════════════════════════════════ */
function WaitingRoom({config,showToast,onDebate,onCancel}){
  const [rd,setRd]=useState(null);
  const code=config?.roomCode||'';
  useEffect(()=>{
    const poll=async()=>{
      const r=await SG(`room:${code}`);if(!r)return;
      setRd(r);
      if(r.playerA&&r.playerB&&r.status!=='ended'){
        const upd={...r,status:'debating',startedAt:Date.now()};
        await SS(`room:${code}`,upd);
        onDebate({...config,nameA:r.playerA,nameB:r.playerB});
      }
    };
    poll();const iv=setInterval(poll,1500);return()=>clearInterval(iv);
  },[code,config,onDebate]);
  return(
    <div className="waiting">
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:'var(--fM)',fontSize:'.62rem',color:'var(--muted)',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:8}}>Code du salon</div>
        <div className="wait-code" onClick={()=>{navigator.clipboard?.writeText(code);showToast('Code copié !')}}>
          {code}
        </div>
        <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',marginTop:4}}>Cliquer pour copier</div>
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:8,padding:'12px 18px',maxWidth:340,textAlign:'center'}}>
        <div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)',marginBottom:4,textTransform:'uppercase'}}>Sujet</div>
        <div style={{fontSize:'.82rem',lineHeight:1.6}}>{config?.topic}</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[['A','#00cfff',rd?.playerA],['B','#ff2860',rd?.playerB]].map(([s,col,n])=>(
          <div key={s} className={`w-slot ${n?'ok':''}`}>
            <div style={{width:8,height:8,borderRadius:'50%',background:n?'var(--G)':'var(--muted)',flexShrink:0}}/>
            <div style={{fontFamily:'var(--fM)',fontSize:'.73rem',flex:1,color:col}}>Orateur {s}</div>
            {n?<div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--G)'}}>✓ {n}</div>:<div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',animation:'blink 1.5s infinite'}}>en attente…</div>}
          </div>
        ))}
      </div>
      <button className="btn b-ghost b-sm" onClick={onCancel}>Annuler</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════ */
export default function DialectixV6(){
  // OBS check
  const urlP=new URLSearchParams(typeof window!=='undefined'?window.location.search:'');
  if(urlP.get('mode')==='obs')return <OBSOverlay params={urlP}/>;

  // ── STATE
  const [page,setPage]=useState('home');
  const [user,setUser]=useState(null);
  const [toast,setToast]=useState(null);
  const [promotion,setPromotion]=useState(null);
  const [viewedPlayer,setViewedPlayer]=useState(null);
  const [academies,setAcademies]=useState(SEED_ACADEMIES);
  const [academyModal,setAcademyModal]=useState(null);

  // ── DEBATE FLOW
  const [phase,setPhase]=useState('idle'); // idle|config|waiting|debate|report
  const [debateMode,setDebateMode]=useState('bot');
  const [debateConfig,setDebateConfig]=useState(null);
  const [reportData,setReportData]=useState(null);
  const [reportResult,setReportResult]=useState(null);
  const [genRep,setGenRep]=useState(false);
  const [selFormat,setSelFormat]=useState('standard');
  const [checkmateEntry,setCheckmateEntry]=useState(null); // Module 3 — Checkmate
  const [showProfileQ,setShowProfileQ]=useState(false);   // Profile questionnaire gate
  const [wisdomQuote,setWisdomQuote]=useState(null);          // Feature 7 — Citation de sagesse
  const [tournamentRulesOpen,setTournamentRulesOpen]=useState(false); // Feature 6 — Règles tournoi
  const [formatModalId,setFormatModalId]=useState(null);      // Feature R3 — Modal règles de format

  // ── MATCHMAKING
  const [mmPhase,setMMPhase]=useState('idle'); // idle|searching|timedout
  const [mmTimer,setMMTimer]=useState(0);
  const mmRef=useRef(null);

  // ── PLATFORM DATA
  const [leaderboard,setLeaderboard]=useState([]);
  const [platformStats,setPlatformStats]=useState({today:0,active:0,total:0});
  const [dailyTopic]=useState(DAILY_TOPICS[new Date().getDay()%DAILY_TOPICS.length]);

  // ── INIT : charge le profil localStorage puis vérifie immédiatement la session Supabase.
  // Si l'email de la session active ne correspond pas à celui du profil stocké,
  // on efface le cache périmé pour forcer onAuthStateChange à reconstruire le bon profil.
  useEffect(()=>{
    initPlatform();
    const saved=typeof localStorage!=='undefined'?localStorage.getItem('dix_user_v6'):null;
    if(saved){
      try{
        const parsed=JSON.parse(saved);
        setUser(parsed); // chargement optimiste — peut être corrigé ci-dessous
        // Vérification asynchrone : est-ce que la session correspond ?
        SB.auth.getSession().then(({data:{session}})=>{
          if(!session){
            // Pas de session Supabase active — on garde l'état mock/guest tel quel
            return;
          }
          const sessionEmail=session.user?.email;
          if(sessionEmail && parsed.email && sessionEmail!==parsed.email){
            // 🔴 MISMATCH : le localStorage appartient à un autre utilisateur
            console.warn('[Auth] localStorage mismatch — purge cache stale',{cached:parsed.email,session:sessionEmail});
            localStorage.removeItem('dix_user_v6');
            localStorage.removeItem('dix_mock_session_v6');
            setUser(null); // effacer l'affichage erroné
            // onAuthStateChange va reconstruire le bon profil automatiquement
          }
        }).catch(()=>{});
      }catch{}
    } else {
      // Pas de cache local — vérifier si une session Supabase active existe déjà
      // (ex: retour d'un redirect OAuth). onAuthStateChange s'en chargera.
    }
  },[]);

  const saveUser=u=>{
    // Auto-attach tier on every save so profile always reflects current ELO.
    // Level is derived from XP: every 100 XP = 1 level (minimum level 1).
    const computedLevel=Math.max(1,Math.floor((u.xp||0)/100)+1);
    const withTier={...u, tier:getTier(u.elo||0).label, mvp_count:u.mvp_count||0, level:computedLevel};
    setUser(withTier);
    if(typeof localStorage!=='undefined')localStorage.setItem('dix_user_v6',JSON.stringify(withTier));
    sbUpsertProfile(withTier); // sync Supabase (fallback : localStorage déjà sauvé)
  };
  const showToast=(msg,type='info')=>setToast({msg,type});

  const initPlatform=async()=>{
    const raw=await SG('platform:lb_v6')||[];
    // Purge any previously seeded fake entries (ids start with 's' followed by a digit).
    // Real user entries always use uid() which produces random alphanumeric strings.
    const lb=raw.filter(p=>!/^s\d+$/.test(p.id));
    if(lb.length!==raw.length)await SS('platform:lb_v6',lb); // persist purge
    setLeaderboard(lb);
    const stats=await SG('platform:stats_v6')||{today:0,active:0,total:0};
    setPlatformStats(stats);
    const savedAc=await SG('platform:academies_v6');
    if(savedAc&&savedAc.length>0)setAcademies(savedAc);
  };

  // ── AUTH — Google OAuth (Supabase) + mock fallback
  const doGoogleLogin=async()=>{
    try{
      const {error}=await SB.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:typeof window!=='undefined'?window.location.origin:undefined}
      });
      if(error)throw error;
      // Auth state change handled by onAuthStateChange listener below
    }catch(e){
      console.warn('[Auth] OAuth failed, falling back to mock:',e.message);
      doLogin(); // graceful fallback
    }
  };

  // Handle Supabase OAuth callback — create profile only if fields are absent
  useEffect(()=>{
    const{data:{subscription}}=SB.auth.onAuthStateChange(async(_evt,session)=>{
      if(!session?.user)return;
      const su=session.user;
      // Check if profile already exists to avoid overwriting existing data
      const{data:existing}=await SB.from('profiles').select('id,elo,wins,losses,draws,mvp_count,tier').eq('id',su.id).single();
      const oauthName=su.user_metadata?.full_name||su.email?.split('@')[0]||'Débatteur';
      const oauthAvatar=su.user_metadata?.avatar_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(oauthName)}&background=EAE3D6&color=2C4A6E&size=80`;
      // Charger le cache localStorage UNIQUEMENT s'il appartient au même utilisateur.
      // 🔴 BUG CORRIGÉ : sans cette vérification, les stats/history/achievements
      //    d'un autre utilisateur (ex: Alexandre Martin) contaminent le nouveau profil.
      let localState={};
      try{
        const s=localStorage.getItem('dix_user_v6');
        if(s){
          const parsed=JSON.parse(s);
          // Correspondance par id Supabase (priorité) ou par email
          const sameUser=(parsed.id&&parsed.id===su.id)||(parsed.email&&parsed.email===su.email);
          if(sameUser){
            localState=parsed;
          } else {
            // Cache d'un autre utilisateur → on purge proprement
            console.warn('[Auth] onAuthStateChange — cache appartient à',parsed.email,'≠',su.email,': purge');
            localStorage.removeItem('dix_user_v6');
            localStorage.removeItem('dix_mock_session_v6');
          }
        }
      }catch(e){}
      // Build merged profile: DB values > localStorage du même user > defaults
      const merged={
        // Spread localState seulement si c'est le même utilisateur (vérifié ci-dessus)
        ...localState,
        // DB fields win over localStorage for core stats (source of vérité)
        elo:          existing?.elo       ?? localState.elo       ?? 1000,
        wins:         existing?.wins      ?? localState.wins      ?? 0,
        losses:       existing?.losses    ?? localState.losses    ?? 0,
        draws:        existing?.draws     ?? localState.draws     ?? 0,
        mvp_count:    existing?.mvp_count ?? localState.mvp_count ?? 0,
        tier:         existing?.tier      ?? localState.tier      ?? 'Beginner',
        // Champs côté client (non stockés en DB)
        debates:      localState.debates  ?? 0,
        streak:       localState.streak   ?? 0,
        xp:           localState.xp       ?? 0,
        level:        localState.level    ?? 1,
        totalArgs:    localState.totalArgs ?? 0,
        bestLogic:    localState.bestLogic ?? 0,
        bestRebuttal: localState.bestRebuttal ?? 0,
        achievements: localState.achievements ?? [],
        history:      localState.history      ?? [],
        eloHistory:   localState.eloHistory   ?? [existing?.elo ?? 1000],
        joinedAt:     localState.joinedAt     ?? Date.now(),
        // L'identité OAuth a toujours la priorité (id, name, email, avatar)
        id:           su.id,
        name:         oauthName,
        email:        su.email || '',
        avatar:       oauthAvatar,
      };
      saveUser(merged);
      showToast(`Bienvenue ${oauthName.split(' ')[0]} ! 🎉`,'success');
      setPage('home');
    });
    return()=>subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const doLogin=async()=>{
    const u=await mockGoogleLogin();
    saveUser(u); // uses saveUser so tier is auto-attached
    showToast(`Bienvenue ${u.name.split(' ')[0]} ! ELO initial : 1000`,'success');
    setPage('home');
  };
  const doLogout=()=>{
    const leavingUserId=user?.id;
    // 1. Clear React state first so no component re-renders with stale user data.
    setUser(null);
    setPage('home');
    setPhase('idle');
    // 2. Remove all localStorage session keys.
    try{
      localStorage.removeItem('dix_user_v6');
      localStorage.removeItem('dix_mock_session_v6');
    }catch{}
    // 3. Remove the leaderboard entry for this user so ghost entries don't linger.
    if(leavingUserId){
      try{
        const raw=localStorage.getItem('platform:lb_v6');
        if(raw){
          const lb=JSON.parse(raw).filter(p=>p.id!==leavingUserId);
          localStorage.setItem('platform:lb_v6',JSON.stringify(lb));
          setLeaderboard(lb);
        }
      }catch{}
    }
    // 4. Sign out of Supabase OAuth session if one exists.
    SB.auth.signOut().catch(()=>{});
    showToast('Déconnecté');
  };

  // ── DAILY DEBATE LIMIT ──────────────────────────────────────────────────────
  // Key: dix_daily_debates_v1  →  { date: "YYYY-MM-DD", count: number }
  // Limit: 10 completed debates per calendar day.
  // Only completed debates (handleEndDebate) count — abandoned debates don't.
  const DAILY_DEBATE_LIMIT=10;
  const getTodayKey=()=>new Date().toISOString().slice(0,10); // "YYYY-MM-DD"
  const getDailyDebateCount=()=>{
    try{
      const raw=localStorage.getItem('dix_daily_debates_v1');
      if(!raw)return 0;
      const stored=JSON.parse(raw);
      return stored.date===getTodayKey()?stored.count:0;
    }catch{return 0;}
  };
  const incrementDailyDebate=()=>{
    try{
      const count=getDailyDebateCount();
      localStorage.setItem('dix_daily_debates_v1',JSON.stringify({date:getTodayKey(),count:count+1}));
    }catch{}
  };
  const canStartDebate=()=>getDailyDebateCount()<DAILY_DEBATE_LIMIT;

  // ── START BOT DEBATE
  const startBotDebate=(bot,topic)=>{
    if(!canStartDebate()){
      showToast(`Limite quotidienne atteinte (${DAILY_DEBATE_LIMIT} débats). Revenez demain.`,'error');
      return;
    }
    // ── Feature 3 : Limite d'entraînement quotidienne pour comptes gratuits ──
    // Les comptes gratuits (non-premium) sont limités à 5 entraînements/jour.
    // Un compte est "premium" si user.isPremium === true.
    if(!user?.isPremium){
      const trainKey='dix_train_daily_v1';
      const todayStr=new Date().toISOString().slice(0,10);
      try{
        const raw=JSON.parse(localStorage.getItem(trainKey)||'{}');
        const count=raw.date===todayStr?raw.count:0;
        if(count>=TRAINING_FREE_DAILY_LIMIT){
          showToast(`Limite d'entraînement atteinte (${TRAINING_FREE_DAILY_LIMIT}/jour). Revenez demain ou débattez en mode Compétitif !`,'error');
          return;
        }
        localStorage.setItem(trainKey,JSON.stringify({date:todayStr,count:count+1}));
      }catch{}
    }
    // ── Beta bot battle limit (max 5 per user) ────────────────────────────
    if(isBetaBotBattle(bot) && hasReachedBotLimit(user?.id)){
      const rem=0;
      showToast(`Limite bêta atteinte : 5 débats contre bots max. Rejoignez la communauté pour plus !`,'error');
      return;
    }
    // ── Profile questionnaire gate (first-time users) ─────────────────────
    if(!hasCompletedProfile()){
      // Queue the debate config and show the questionnaire first
      setDebateConfig({mode:'bot',topic,botConfig:{id:bot.id,style:bot.style,elo:bot.elo},nameA:user?.name?.split(' ')[0]||'Vous',nameB:bot.name,mySide:'A',format:selFormat});
      setDebateMode('bot');
      setShowProfileQ(true);
      return;
    }
    setDebateConfig({mode:'bot',topic,botConfig:{id:bot.id,style:bot.style,elo:bot.elo},nameA:user?.name?.split(' ')[0]||'Vous',nameB:bot.name,mySide:'A',format:selFormat});
    setDebateMode('bot');
    setPhase('debate');
  };

  // ── END DEBATE
  const handleEndDebate=async(tx,vars,coms,{scoresA,scoresB,elapsed})=>{
    setPhase('report');setGenRep(true);
    const debId='DBT-'+Math.random().toString(36).slice(2,8).toUpperCase();
    const rData={tx,vars,coms,scoresA,scoresB,elapsed,debateId:debId};
    setReportData(rData);
    const nA=debateConfig.nameA,nB=debateConfig.nameB;
    let report=await aiReport(tx,nA,nB,scoresA,scoresB,vars,debateConfig.topic,elapsed,debateConfig.format||'standard');
    // If the AI report fails (null / bad JSON), build a minimal local fallback
    // so the report screen always renders and never shows a permanent spinner.
    if(!report){
      const tA=gScore(scoresA),tB=gScore(scoresB);
      const isDraw=Math.abs(tA-tB)<0.3;
      const winner=isDraw?'Égalité':tA>tB?nA:nB;
      const margin=Math.abs(tA-tB);
      const verdict=isDraw?'Égalité':margin>2?'Victoire dominante':margin>1?'Victoire nette':'Victoire serrée';
      report={winner,verdict,margin:margin.toFixed(2),
        winner_reason:'Résultat calculé sur les scores locaux (analyse IA indisponible).',
        summary:`${winner} s'impose avec un score de ${Math.max(tA,tB).toFixed(2)} contre ${Math.min(tA,tB).toFixed(2)}.`,
        strongest_a:'—',strongest_b:'—',weakest_a:'—',weakest_b:'—',
        key_fallacies:[],key_strengths:[],
        rec_a:'Continuez à pratiquer et affinez vos arguments.',
        rec_b:'Continuez à pratiquer et affinez vos arguments.',
        quality:'Moyen',mvp_argument:'—',percentile:50};
    }
    setReportResult(report);setGenRep(false);

    // ── Feature 7 — Citation de sagesse (pop-up après victoire / défaite) ────
    // Affiché 2 secondes après le rapport pour laisser l'utilisateur lire.
    {
      const tA=gScore(scoresA),tB=gScore(scoresB);
      const won=tA>tB+0.3;
      const pool=won?WISDOM_QUOTES.win:WISDOM_QUOTES.loss;
      const q=pool[Math.floor(Math.random()*pool.length)];
      setTimeout(()=>setWisdomQuote({...q,win:won}),2000);
    }

    // ── Save public battle for spectator mode (BattlesPage) ──────────────────
    const tA=gScore(scoresA),tB=gScore(scoresB);
    savePublicBattle({
      id:      debId,
      topic:   debateConfig.topic,
      nameA:   debateConfig.nameA,
      nameB:   debateConfig.nameB,
      scoreA:  tA,
      scoreB:  tB,
      verdict: report?.verdict||null,
      winner:  report?.winner||null,
      argCount:tx.length,
      elapsed,
      transcript: tx.slice(0,30), // cap transcript at 30 entries for storage
      aiReport:   report ? {
        summary:     report.summary,
        strongest_a: report.strongest_a,
        strongest_b: report.strongest_b,
        rec_a:       report.rec_a,
        rec_b:       report.rec_b,
      } : null,
      timestamp: Date.now(),
    });

    // ── Mark topic as debated for this user (prevents re-debate) ─────────────
    if(user?.id && debateConfig.topic){
      markUserDebatedTopic(user.id, debateConfig.topic);
    }

    if(user&&debateMode!=='offline'){
      const totalA=gScore(scoresA),totalB=gScore(scoresB);
      const oppElo=debateConfig.botConfig?.elo||1200;
      const ec=calcELO(user.elo,oppElo,totalA,totalB);
      const {newRA,deltaA}=applyELO(user.elo,oppElo,ec.sA,ec.sB,ec.eA,ec.eB,user.debates,20);
      const won=ec.sA>0.5,draw=ec.sA===0.5;

      const prevBadge=getBadge(user.elo);
      const newBadge=getBadge(newRA);
      const promoted=newBadge.id!==prevBadge.id&&newRA>user.elo;

      const updUser={
        ...user, elo:newRA,
        debates:user.debates+1,
        wins:user.wins+(won?1:0),
        losses:user.losses+(won||draw?0:1),
        draws:user.draws+(draw?1:0),
        streak:won?(user.streak||0)+1:0,
        xp:user.xp+Math.round(25+Math.max(0,deltaA)*0.6),
        totalArgs:(user.totalArgs||0)+tx.filter(e=>e.side==='A').length,
        bestLogic:Math.max(user.bestLogic||0,...tx.filter(e=>e.side==='A'&&e.scores?.logic).map(e=>e.scores.logic)),
        bestRebuttal:Math.max(user.bestRebuttal||0,...tx.filter(e=>e.side==='A'&&e.scores?.rebuttal).map(e=>e.scores.rebuttal)),
        eloHistory:[...user.eloHistory,newRA].slice(-20),
        history:[{id:uid(),date:Date.now(),topic:debateConfig.topic,vs:debateConfig.nameB,result:won?'win':draw?'draw':'loss',eloDelta:deltaA,sA:totalA.toFixed(1),sB:totalB.toFixed(1)},...user.history].slice(0,30),
        // ── Peak ELO tracking (Feature 5) — safe additive field, never decreases ──
        peak_elo:Math.max(user.peak_elo||user.elo||1000, newRA),
      };
      const newAch=checkAchievements(user,updUser);
      if(newAch.length>0){updUser.achievements=[...(user.achievements||[]),...newAch];newAch.forEach((id,i)=>{const a=ACHIEVEMENTS_DEF.find(x=>x.id===id);if(a)setTimeout(()=>showToast(`${a.icon} Achievement débloqué : ${a.name}`,'achievement'),i*1200)})}
      saveUser(updUser); // localStorage + sbUpsertProfile (via saveUser)
      // ── Supabase saves (non-bloquants — fallback local déjà fait) ──
      sbSaveDebate(debId,debateConfig,report,scoresA,scoresB,elapsed,won,draw,deltaA);
      sbSaveMessages(debId,tx);
      sbSaveScores(debId,scoresA,scoresB);
      sbSaveElo(user.id,debId,newRA,deltaA);
      if(newAch.length>0)sbSaveAchievements(user.id,newAch);
      if(promoted)setTimeout(()=>setPromotion(newBadge),500);

      // Update leaderboard
      const lb=await SG('platform:lb_v6')||[];
      const ex=lb.find(p=>p.id===user.id);
      const upd=ex?lb.map(p=>p.id===user.id?{...p,elo:newRA,debates:p.debates+1,wins:p.wins+(won?1:0),trend:deltaA}:[...lb,{id:user.id,name:user.name,elo:newRA,debates:1,wins:won?1:0,avatar:'👤',trend:deltaA}].find(x=>x.id===p.id)||p):[...lb,{id:user.id,name:user.name,elo:newRA,debates:1,wins:won?1:0,avatar:'👤',trend:deltaA}];
      const sorted=upd.sort((a,b)=>b.elo-a.elo);
      await SS('platform:lb_v6',sorted);setLeaderboard(sorted);

      const stats=await SG('platform:stats_v6')||platformStats;
      await SS('platform:stats_v6',{...stats,today:stats.today+1,total:stats.total+1});
    }
    // Count every completed debate toward the daily limit regardless of mode/outcome.
    incrementDailyDebate();
    // ── Track beta bot battles separately (max 5 cap) ─────────────────────
    if(debateConfig?.botConfig && isBetaBotBattle(debateConfig.botConfig)){
      incrementBotBattleCount(user?.id);
      const rem=remainingBotBattles(user?.id);
      if(rem<=2&&rem>0) showToast(`⚠️ Plus que ${rem} débat${rem>1?'s':''} contre bots disponible${rem>1?'s':''}. Profitez-en !`,'info');
    }
  };

  // ── MATCHMAKING
  const handleAcademyAction=async(action)=>{
    if(action.mode==='create'){
      const t=ACADEMY_TYPES.find(x=>x.id===action.type)||ACADEMY_TYPES[0];
      const newAc={id:uid(),name:action.name,type:action.type,icon:t.icon,desc:action.desc,founder:user?.name?.split(' ')[0]||'Anonyme',members:user?[user.id]:[],avgElo:user?.elo||1000,created:Date.now(),wins:0,debates:0};
      const upd=[...academies,newAc];
      setAcademies(upd);
      await SS('platform:academies_v6',upd);
      if(user)saveUser({...user,academyId:newAc.id,academyName:newAc.name});
      showToast('🏛 Académie créée !','success');
    }else if(action.mode==='join'){
      const ac=academies.find(a=>a.id===action.id);
      if(!ac)return;
      const upd=academies.map(a=>a.id===action.id?{...a,members:[...(a.members||[]),user?.id].filter(Boolean)}:a);
      setAcademies(upd);
      await SS('platform:academies_v6',upd);
      if(user)saveUser({...user,academyId:ac.id,academyName:ac.name});
      showToast('📖 Académie rejointe !','success');
    }
    setAcademyModal(null);
  };
  const leaveAcademy=async()=>{
    if(!user?.academyId)return;
    const upd=academies.map(a=>a.id===user.academyId?{...a,members:(a.members||[]).filter(id=>id!==user.id)}:a);
    setAcademies(upd);
    await SS('platform:academies_v6',upd);
    saveUser({...user,academyId:null,academyName:null});
    showToast('Académie quittée','info');
  };

  const startMM=()=>{
    if(!user){showToast('Connexion requise pour le mode compétitif','error');return}
    setMMPhase('searching');setMMTimer(0);
    mmRef.current=setInterval(()=>setMMTimer(t=>{if(t>=20){clearInterval(mmRef.current);setMMPhase('timedout');return 20}return t+1}),1000);
  };
  const cancelMM=()=>{clearInterval(mmRef.current);setMMPhase('idle')};
  const mmPlayBot=()=>{cancelMM();const b=BOTS[1];startBotDebate(b,TOPICS[rnd(0,TOPICS.length-1)])};

  // ── CREATE / JOIN ROOM
  const createRoom=async topic=>{
    if(!user)return;
    const code=rand4();
    const rd={code,topic,playerA:user.name.split(' ')[0],playerB:null,status:'waiting',created:Date.now()};
    await SS(`room:${code}`,rd);await SS(`tx:${code}`,[]);await SS(`var:${code}`,[]);await SS(`com:${code}`,[]);
    const cfg={mode:'online',topic,roomCode:code,nameA:user.name.split(' ')[0],nameB:'Adversaire',mySide:'A',format:selFormat};
    setDebateConfig(cfg);setDebateMode('online');setPhase('waiting');
  };
  const joinRoom=async(code,topic)=>{
    const c=code.toUpperCase();
    const rd=await SG(`room:${c}`);if(!rd){showToast('Salon introuvable','error');return}
    const upd={...rd,playerB:user?.name.split(' ')[0]||'Joueur B'};
    await SS(`room:${c}`,upd);
    const cfg={mode:'online',topic:rd.topic,roomCode:c,nameA:rd.playerA,nameB:user?.name.split(' ')[0]||'Joueur B',mySide:'B',format:selFormat};
    setDebateConfig(cfg);setDebateMode('online');setPhase('debate');
  };

  /* ─── NAV (responsive — burger menu sur mobile) ─── */
  const Nav=()=>{
    const [menuOpen,setMenuOpen]=useState(false);
    const closeMenu=useCallback((cb)=>()=>{setMenuOpen(false);cb&&cb();},[]);
    /* Ferme le menu si on clique dehors */
    useEffect(()=>{
      if(!menuOpen)return;
      const handler=(e)=>{if(!e.target.closest('.nav'))setMenuOpen(false)};
      document.addEventListener('mousedown',handler);
      return()=>document.removeEventListener('mousedown',handler);
    },[menuOpen]);
    return(
    <nav className="nav">
      <div className="nav-logo" onClick={closeMenu(()=>{setPage('home');setPhase('idle')})}>DIALECT<b>IX</b></div>

      {/* ── Desktop nav links ── */}
      <div className={`nav-links${menuOpen?' nav-open':''}`}>
        <button className={`nl ${page==='home'?'on':''}`} onClick={closeMenu(()=>{setPage('home');setPhase('idle')})}>🏠 Accueil</button>
        <button className={`nl ${page==='train'?'on':''}`} onClick={closeMenu(()=>{setPage('train');setPhase('idle')})}>🤖 Entraînement</button>
        <button className={`nl ${page==='compete'?'on':''} hot`} onClick={closeMenu(()=>{setPage('compete');setPhase('idle')})}>⚔️ Compétitif</button>
        <button className={`nl ${page==='arena'?'on':''}`} onClick={closeMenu(()=>setPage('arena'))} style={{color:'var(--P)',fontWeight:page==='arena'?700:400}}>🏟 Arena</button>
        <button className={`nl ${page==='rank'?'on':''}`} onClick={closeMenu(()=>setPage('rank'))}>🏆 Classement</button>
        <button className={`nl ${page==='hall'?'on':''}`} onClick={closeMenu(()=>setPage('hall'))}>⭐ Hall of Fame</button>
        <button className={`nl ${page==='academies'?'on':''}`} onClick={closeMenu(()=>setPage('academies'))}>🏛 Académies</button>
        <button className={`nl ${page==='daily'?'on':''}`} onClick={closeMenu(()=>setPage('daily'))} style={{color:'var(--O)'}}>🔍 Défi</button>
        <button className={`nl ${page==='architect'?'on':''}`} onClick={closeMenu(()=>setPage('architect'))} style={{color:'var(--A)',fontWeight:page==='architect'?700:400}}>🏛 Architecte</button>
        <button className={`nl ${page==='academy-map'?'on':''}`} onClick={closeMenu(()=>setPage('academy-map'))} style={{color:'var(--G)',fontWeight:page==='academy-map'?700:400}}>🏰 Mon Académie</button>
        <button className={`nl ${page==='tournament'?'on':''}`} onClick={closeMenu(()=>setPage('tournament'))} style={{color:'var(--Y)',fontWeight:page==='tournament'?700:400}}>🏆 Tournoi Alpha</button>
        <button className={`nl ${page==='actu'?'on':''}`} onClick={closeMenu(()=>setPage('actu'))} style={{color:'var(--G)',fontWeight:page==='actu'?700:400}}>📰 Actu</button>
        <button className={`nl ${page==='battles'?'on':''}`} onClick={closeMenu(()=>setPage('battles'))} style={{color:'var(--O)',fontWeight:page==='battles'?700:400}}>👁 Battles</button>
        <button className={`nl ${page==='guides'?'on':''}`} onClick={closeMenu(()=>setPage('guides'))} style={{color:'var(--B)',fontWeight:page==='guides'?700:400}}>📘 Guides</button>
        {isAdmin()&&<button className={`nl ${page==='admin-dashboard'?'on':''}`} onClick={closeMenu(()=>setPage('admin-dashboard'))} style={{color:'var(--O)',fontWeight:page==='admin-dashboard'?700:400}}>⚙️ Dashboard</button>}
      </div>

      {/* ── Right section : ELO + badge + avatar / connexion ── */}
      <div className="nav-r">
        {user&&<div style={{fontFamily:'var(--fH)',fontSize:'.95rem',color:'var(--Y)'}}>{user.elo}</div>}
        {user&&<BadgePill elo={user.elo}/>}
        {user&&user.streak>2&&<div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--O)',background:'rgba(160,90,44,.1)',border:'1px solid rgba(160,90,44,.25)',borderRadius:20,padding:'3px 10px'}}>🔥 {user.streak}</div>}
        {user?(
          <div style={{width:30,height:30,borderRadius:'50%',border:`2px solid ${getBadge(user.elo).color}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'.85rem'}} onClick={()=>{setMenuOpen(false);setPage('profile')}}>
            {user.avatar?<img src={user.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span>{user.name[0]}</span>}
          </div>
        ):(
          <button className="btn b-google b-sm" onClick={doGoogleLogin}>
            <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Connexion
          </button>
        )}

        {/* ── Burger button — visible seulement sur mobile (via CSS) ── */}
        <button
          className="nav-burger"
          onClick={()=>setMenuOpen(o=>!o)}
          aria-label={menuOpen?'Fermer le menu':'Ouvrir le menu'}
          aria-expanded={menuOpen}
        >
          {/* 3 lignes → croix selon état */}
          <span className={`burger-line${menuOpen?' open':''}`}/>
          <span className={`burger-line${menuOpen?' open':''}`}/>
          <span className={`burger-line${menuOpen?' open':''}`}/>
        </button>
      </div>
    </nav>
  );
  };

  /* ─── HOME PAGE ─── */
  const HomePage=()=>{
    const [selBot,setSelBot]=useState(BOTS[0]);
    const [customTopic,setCustomTopic]=useState('');
    return(
      <div className="home">
        <div className="home-hero">
          <div className="hero-t">DIALECT<b>IX</b></div>
          <div className="hero-sub">Plateforme IA de Débat Compétitif</div>
          <div className="hero-desc">Entraînez-vous contre des bots IA, affrontez de vrais adversaires, grimpez au classement. Chaque argument est analysé en temps réel.</div>
          <div className="hero-btns">
            <button className="btn b-a b-lg" onClick={()=>setPage('train')}>🤖 Débuter vs Bot</button>
            {user?<button className="btn b-g b-lg" onClick={()=>{startMM();setPage('compete')}}>⚔️ Matchmaking</button>:<button className="btn b-ghost b-lg" onClick={doLogin}>🔓 Connexion compétitive</button>}
          </div>
          <div className="hero-stats">
            {[['Débats aujourd\'hui',platformStats.today,'var(--A)'],['Actifs en ce moment',platformStats.active,'var(--G)'],['Total débats',platformStats.total.toLocaleString(),'var(--Y)']].map(([l,v,c])=>(
              <div key={l} style={{textAlign:'center'}}><div className="hstat-v" style={{color:c}}>{v}</div><div className="hstat-l">{l}</div></div>
            ))}
          </div>
        </div>

        <div className="home-grid">
          <div className="home-main">
            {/* User banner */}
            {user&&<div className="user-banner" style={{background:'linear-gradient(135deg,rgba(44,74,110,.06),rgba(90,58,110,.06))',border:'1px solid var(--bd)',borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <AvatarBadge user={user} size={44}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'1.1rem',letterSpacing:'.06em'}}>{user.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4,flexWrap:'wrap'}}>
                  <BadgePill elo={user.elo}/>
                  <div style={{fontFamily:'var(--fH)',fontSize:'.9rem',color:'var(--Y)'}}>{user.elo} ELO</div>
                  {user.streak>0&&<div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--O)'}}>🔥 {user.streak} série</div>}
                </div>
                <div style={{marginTop:8,maxWidth:280}}><RankBar elo={user.elo}/></div>
              </div>
              <div className="user-banner-stats" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[['Débats',user.debates],['Victoires',user.wins],['XP',user.xp]].map(([l,v])=>(
                  <div key={l} style={{textAlign:'center',background:'var(--s2)',borderRadius:6,padding:'6px 12px'}}><div style={{fontFamily:'var(--fH)',fontSize:'1.1rem'}}>{v}</div><div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',textTransform:'uppercase'}}>{l}</div></div>
                ))}
              </div>
            </div>}

            {/* Quick train */}
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'1rem',letterSpacing:'.1em',textTransform:'uppercase'}}>⚡ Entraînement rapide</div>
                <div style={{display:'flex',gap:4}}>
                  {FORMATS.map(f=><button key={f.id} className={`fmt-btn ${selFormat===f.id?'on':''}`} onClick={()=>setSelFormat(f.id)}>{f.label}</button>)}
                </div>
              </div>
              <div className="bot-grid">
                {BOTS.map(b=>(
                  <div key={b.id} className={`bot-card ${selBot.id===b.id?'sel':''}`} onClick={()=>setSelBot(b)}>
                    <div style={{fontSize:'1.7rem',lineHeight:1}}>{b.emoji}</div>
                    <div style={{fontFamily:'var(--fH)',fontSize:'.88rem',letterSpacing:'.06em'}}>{b.name}</div>
                    <div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--Y)'}}>ELO {b.elo}</div>
                    <div style={{fontFamily:'var(--fM)',fontSize:'.53rem',color:'var(--muted)',lineHeight:1.5}}>{b.desc}</div>
                    <div className="bot-diff">{Array.from({length:4}).map((_,i)=><div key={i} className="bd" style={{background:i<b.diff?b.color:'var(--bd2)'}}/>)}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,display:'flex',gap:10}}>
                <input className="fi" style={{flex:1}} placeholder="Sujet personnalisé (ou laisser vide pour un sujet aléatoire)" value={customTopic} onChange={e=>setCustomTopic(e.target.value)}/>
                <button className="btn b-a" onClick={()=>{setPage('train');startBotDebate(selBot,customTopic||TOPICS[rnd(0,TOPICS.length-1)])}}>▶ vs {selBot.name}</button>
              </div>
            </div>

            {/* Duel Rhétorique Speed Run — aperçu accueil */}
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'1rem',letterSpacing:'.1em',textTransform:'uppercase'}}>⚡ Duel Rhétorique : Speed Run</div>
                <button className="btn b-ghost b-sm" onClick={()=>setPage('daily')}>Jouer →</button>
              </div>
              <div style={{
                background:'linear-gradient(135deg,rgba(140,58,48,.05) 0%,rgba(44,74,110,.05) 100%)',
                border:'1px solid rgba(140,58,48,.2)',borderLeft:'4px solid var(--B)',
                borderRadius:12,padding:'16px 18px 14px',
                boxShadow:'var(--sh)',position:'relative',overflow:'hidden',
              }}>
                <div style={{position:'absolute',top:-10,right:-10,fontSize:'5rem',opacity:.04,pointerEvents:'none',userSelect:'none'}}>⚡</div>
                {/* Records row */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                  {(()=>{
                    let pb=0;try{pb=JSON.parse(localStorage.getItem('dix_speedrun_v1')||'{}').best||0}catch{}
                    return[
                      ['🏅 Record Personnel',pb,'sophismes/60s','var(--A)'],
                      ['🌍 Meilleur mondial','?','chargement…','var(--Y)'],
                    ].map(([label,val,sub,color])=>(
                      <div key={label} style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                        <div style={{fontFamily:'var(--fM)',fontSize:'.48rem',color:'var(--muted)',marginBottom:3}}>{label}</div>
                        <div style={{fontFamily:'var(--fH)',fontSize:'1.3rem',color}}>{val}</div>
                        <div style={{fontFamily:'var(--fM)',fontSize:'.44rem',color:'var(--muted)'}}>{sub}</div>
                      </div>
                    ));
                  })()}
                </div>
                {/* Argument preview */}
                <p style={{fontFamily:'var(--fC)',fontSize:'.88rem',color:'var(--txt)',lineHeight:1.7,fontStyle:'italic',margin:'0 0 12px',borderLeft:'2px solid var(--bd2)',paddingLeft:10}}>
                  « {SEED_DUELS[new Date().getDay()%SEED_DUELS.length]?.argument.slice(0,110)}… »
                </p>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {[['⏱','60s'],['🔥','Combo ×'],['🏆','ELO boost']].map(([i,v])=>(
                    <div key={v} style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:6,padding:'3px 9px',display:'flex',alignItems:'center',gap:4}}>
                      <span style={{fontSize:'.7rem'}}>{i}</span>
                      <span style={{fontFamily:'var(--fH)',fontSize:'.65rem',color:'var(--A)'}}>{v}</span>
                    </div>
                  ))}
                  <div style={{flex:1}}/>
                  <button className="btn b-a b-sm" onClick={()=>setPage('daily')} style={{fontSize:'.62rem'}}>⚡ Speed Run</button>
                </div>
              </div>
            </div>
          </div>

          <div className="home-side">
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'.88rem',letterSpacing:'.1em',textTransform:'uppercase'}}>🏆 Classement</div>
                <button className="btn b-ghost b-sm" onClick={()=>setPage('rank')}>Tout →</button>
              </div>
              {leaderboard.slice(0,8).map((p,i)=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:6,transition:'background .15s',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='var(--s1)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div className={`lb-rank ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''}`} style={{width:28,textAlign:'center'}}>{i+1}</div>
                  <div style={{width:26,height:26,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.75rem',flexShrink:0,border:`1px solid ${getBadge(p.elo).color}`}}>{p.avatar}</div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:'.78rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <BadgePill elo={p.elo}/>
                  </div>
                  <div style={{fontFamily:'var(--fH)',fontSize:'.92rem',color:'var(--Y)',flexShrink:0}}>{p.elo}</div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',flexShrink:0,color:p.trend>0?'var(--G)':p.trend<0?'var(--B)':'var(--muted)'}}>{p.trend>0?'+':''}{p.trend}</div>
                </div>
              ))}
            </div>

            {/* Live debates */}
            <div>
              <div style={{fontFamily:'var(--fH)',fontSize:'.88rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>🔴 En direct</div>
              {[
                {topic:"L'IA et l'emploi",players:"Alice vs Bob",time:"12min"},
                {topic:"Le nucléaire vert",players:"Carlos vs Emma",time:"4min"},
                {topic:"Le télétravail",players:"Lucas vs Sofia",time:"28min"},
              ].map((d,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',background:'var(--s1)',borderRadius:6,border:'1px solid var(--bd)',marginBottom:6,cursor:'pointer'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'var(--B)',animation:'blink .8s infinite',flexShrink:0}}/>
                  <div style={{flex:1,fontSize:'.75rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.topic}</div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',flexShrink:0}}>{d.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── TRAIN PAGE ─── */
  const TrainPage=()=>{
    const [sel,setSel]=useState(null);
    const [topic,setTopic]=useState('');
    // Calcul de la limite quotidienne restante pour les comptes gratuits
    const getRemainingTrains=()=>{
      if(user?.isPremium)return Infinity;
      try{
        const raw=JSON.parse(localStorage.getItem('dix_train_daily_v1')||'{}');
        const todayStr=new Date().toISOString().slice(0,10);
        const used=raw.date===todayStr?raw.count:0;
        return Math.max(0,TRAINING_FREE_DAILY_LIMIT-used);
      }catch{return TRAINING_FREE_DAILY_LIMIT;}
    };
    const remaining=getRemainingTrains();
    const fmt=FORMATS.find(f=>f.id===selFormat)||FORMATS[0];
    return(
      <div className="page">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontFamily:'var(--fH)',fontSize:'1.3rem',letterSpacing:'.1em',textTransform:'uppercase'}}>🤖 Mode Entraînement</div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',marginTop:3}}>Sans login requis · N'affecte pas le classement</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
            {/* Sélecteur de format avec tooltip natif + modal règles au clic */}
            <div style={{display:'flex',gap:4,position:'relative'}}>
              {FORMATS.map(f=>(
                <div key={f.id} style={{position:'relative',display:'inline-block'}} className="fmt-tooltip-wrap">
                  <button className={`fmt-btn ${selFormat===f.id?'on':''}`}
                    title={f.tooltip}
                    onClick={()=>{setSelFormat(f.id);setFormatModalId(f.id);}}>
                    {f.label}
                  </button>
                </div>
              ))}
            </div>
            {/* Timing du format sélectionné */}
            <div style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',textAlign:'right'}}>
              {fmt.readSec}s lecture · {fmt.writeSec}s rédaction
            </div>
          </div>
        </div>
        {/* Limite quotidienne gratuite */}
        {!user?.isPremium&&(
          <div style={{
            background:remaining>0?'rgba(44,74,110,.05)':'rgba(140,58,48,.06)',
            border:`1px solid ${remaining>0?'rgba(44,74,110,.18)':'rgba(140,58,48,.25)'}`,
            borderRadius:8,padding:'8px 14px',marginBottom:16,
            display:'flex',alignItems:'center',gap:10,
          }}>
            <span style={{fontSize:'1rem'}}>{remaining>0?'🎯':'🔒'}</span>
            <div style={{flex:1}}>
              <span style={{fontFamily:'var(--fB)',fontSize:'.7rem',fontWeight:600,color:remaining>0?'var(--A)':'var(--B)'}}>
                {remaining>0?`${remaining} entraînement(s) gratuit(s) aujourd'hui`:'Limite quotidienne atteinte'}
              </span>
              <span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)',marginLeft:8}}>
                {remaining>0?`sur ${TRAINING_FREE_DAILY_LIMIT} max`:'· Revenez demain ou débattez en mode Compétitif'}
              </span>
            </div>
          </div>
        )}
        <div className="bot-grid" style={{marginBottom:20}}>
          {BOTS.map(b=>(
            <div key={b.id} className={`bot-card ${sel?.id===b.id?'sel':''}`} onClick={()=>setSel(b)}>
              <div style={{fontSize:'2rem',lineHeight:1}}>{b.emoji}</div>
              <div style={{fontFamily:'var(--fH)',fontSize:'.95rem',letterSpacing:'.06em'}}>{b.name}</div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--Y)'}}>ELO {b.elo}</div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',lineHeight:1.55}}>{b.desc}</div>
              <div className="bot-diff">{Array.from({length:4}).map((_,i)=><div key={i} className="bd" style={{background:i<b.diff?b.color:'var(--bd2)'}}/>)}</div>
            </div>
          ))}
        </div>
        {sel&&<div className="card card-a">
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <div style={{fontSize:'2.5rem'}}>{sel.emoji}</div>
            <div><div style={{fontFamily:'var(--fH)',fontSize:'1.1rem',letterSpacing:'.08em'}}>{sel.name} · ELO {sel.elo}</div><div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--dim)',marginTop:4}}>{sel.desc}</div></div>
          </div>
          <div style={{marginBottom:10}}>
            <label className="fi-label">Sujet du débat</label>
            <input className="fi" placeholder="Choisissez un sujet ou laissez vide pour un sujet aléatoire…" value={topic} onChange={e=>setTopic(e.target.value)}/>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
            {TOPICS.slice(0,4).map((t,i)=><button key={i} className="btn b-ghost b-sm" style={{fontSize:'.56rem',height:'auto',padding:'5px 10px',whiteSpace:'normal',textAlign:'left',textTransform:'none',letterSpacing:0}} onClick={()=>setTopic(t)}>{t.slice(0,50)}…</button>)}
          </div>
          <button className="btn b-a b-lg" onClick={()=>startBotDebate(sel,topic||TOPICS[rnd(0,TOPICS.length-1)])}>▶ Débuter vs {sel.name}</button>
        </div>}
        {!sel&&<div className="empty" style={{minHeight:120}}><div className="empty-i">🤖</div><div className="empty-t">Sélectionnez un bot pour commencer</div></div>}
      </div>
    );
  };

  /* ─── COMPETE PAGE ─── */
  const CompetePage=()=>{
    const [joinCode,setJoinCode]=useState('');
    const [competeTopic,setCompeteTopic]=useState(TOPICS[0]);
    if(!user)return(
      <div className="lock-screen">
        <div className="lock-icon">🔒</div>
        <div style={{fontFamily:'var(--fH)',fontSize:'1.5rem',letterSpacing:'.1em'}}>Mode Compétitif</div>
        <div style={{fontFamily:'var(--fM)',fontSize:'.66rem',color:'var(--muted)',maxWidth:340,lineHeight:1.85,textAlign:'center'}}>Connectez-vous avec Google pour affronter de vrais adversaires, obtenir un ELO et entrer dans le classement mondial.</div>
        <button className="btn b-google b-lg" onClick={doLogin}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Se connecter avec Google
        </button>
      </div>
    );
    if(mmPhase==='searching'||mmPhase==='timedout')return(
      <div className="mm-screen">
        {mmPhase==='searching'&&<>
          <div className="mm-pulse">⚔️</div>
          <div style={{fontFamily:'var(--fH)',fontSize:'1.6rem',letterSpacing:'.1em',position:'relative',zIndex:1}}>RECHERCHE</div>
          <div style={{fontFamily:'var(--fM)',fontSize:'.65rem',color:'var(--muted)',position:'relative',zIndex:1,animation:'blink 1.5s infinite'}}>ELO cible : {user.elo-150}–{user.elo+150} · {mmTimer}s / 20s</div>
          <div style={{width:220,height:3,background:'var(--bd)',borderRadius:2,overflow:'hidden',position:'relative',zIndex:1}}><div style={{height:'100%',background:'var(--A)',width:`${(mmTimer/20)*100}%`,transition:'width 1s linear'}}/></div>
          <button className="btn b-ghost" style={{position:'relative',zIndex:1}} onClick={cancelMM}>Annuler</button>
        </>}
        {mmPhase==='timedout'&&<>
          <div style={{fontSize:'2rem',position:'relative',zIndex:1}}>⏱</div>
          <div style={{fontFamily:'var(--fH)',fontSize:'1.2rem',letterSpacing:'.1em',position:'relative',zIndex:1}}>Aucun adversaire trouvé</div>
          <div style={{fontFamily:'var(--fM)',fontSize:'.65rem',color:'var(--muted)',position:'relative',zIndex:1}}>Dans la plage ELO ±150 de {user.elo}</div>
          <div className="mm-opts">
            <button className="btn b-ghost" onClick={()=>{cancelMM();startMM()}}>🔄 Relancer</button>
            <button className="btn b-y" onClick={mmPlayBot}>🤖 Jouer vs Bot</button>
          </div>
        </>}
      </div>
    );
    return(
      <div className="page">
        <div style={{display:'flex',alignItems:'center',gap:16,padding:'0 0 16px',flexWrap:'wrap'}}>
          <div className="elo-box"><div className="elo-v">{user.elo}</div><div className="elo-l">ELO</div></div>
          <div><BadgePill elo={user.elo}/><div style={{marginTop:8,maxWidth:220}}><RankBar elo={user.elo}/></div></div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginLeft:'auto'}}>
            {[['Débats',user.debates],['Victoires',user.wins],['Taux',`${pct(user.wins,user.debates)}%`]].map(([l,v])=>(
              <div key={l} style={{textAlign:'center',background:'var(--s1)',borderRadius:6,padding:'8px 14px',border:'1px solid var(--bd)'}}><div style={{fontFamily:'var(--fH)',fontSize:'1.3rem'}}>{v}</div><div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',textTransform:'uppercase',marginTop:2}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
          <div className="card card-a">
            <div style={{fontFamily:'var(--fH)',fontSize:'.95rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--A)',marginBottom:10}}>⚡ Matchmaking</div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.63rem',color:'var(--dim)',lineHeight:1.75,marginBottom:12}}>Trouve un adversaire dans votre fourchette ELO ±150.<br/>Départ automatique dès la connexion.</div>
            <div style={{marginBottom:12}}>
              <label className="fi-label">Sujet</label>
              <select className="fi" value={competeTopic} onChange={e=>setCompeteTopic(e.target.value)}>
                {TOPICS.map((t,i)=><option key={i} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{marginBottom:8,display:'flex',gap:4,flexWrap:'wrap'}}>
              {FORMATS.map(f=><button key={f.id} className={`fmt-btn ${selFormat===f.id?'on':''}`} onClick={()=>setSelFormat(f.id)}>{f.label}</button>)}
            </div>
            <button className="btn b-a" onClick={startMM} style={{width:'100%',justifyContent:'center'}}>⚔️ Lancer le Matchmaking</button>
          </div>
          <div className="card">
            <div style={{fontFamily:'var(--fH)',fontSize:'.95rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>🔗 Salon privé</div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.63rem',color:'var(--dim)',lineHeight:1.75,marginBottom:12}}>Créez un salon et partagez le code à votre adversaire.</div>
            <div style={{marginBottom:10}}>
              <label className="fi-label">Sujet</label>
              <input className="fi" placeholder="Sujet du débat…" value={competeTopic} onChange={e=>setCompeteTopic(e.target.value)}/>
            </div>
            <button className="btn b-g b-sm" style={{width:'100%',justifyContent:'center',marginBottom:10}} onClick={()=>createRoom(competeTopic)}>＋ Créer un salon</button>
            <div style={{display:'flex',gap:6}}>
              <input className="fi" style={{flex:1,fontFamily:'var(--fH)',letterSpacing:'.3em',textTransform:'uppercase',textAlign:'center',fontSize:'1.1rem',color:'var(--A)'}} placeholder="CODE" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={4}/>
              <button className="btn b-ghost b-sm" onClick={()=>joinRoom(joinCode,competeTopic)} disabled={joinCode.length<4}>Rejoindre →</button>
            </div>
          </div>
        </div>
        {user.history.length>0&&<div>
          <div style={{fontFamily:'var(--fH)',fontSize:'.9rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>📋 Historique récent</div>
          {user.history.slice(0,5).map(d=>(
            <div key={d.id} className="hist-item">
              <div className={`hi-res ${d.result==='win'?'hi-win':d.result==='loss'?'hi-loss':'hi-draw'}`}>{d.result==='win'?'✓ V':d.result==='loss'?'✗ D':'~ N'}</div>
              <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:'.78rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.topic}</div><div style={{fontFamily:'var(--fM)',fontSize:'.57rem',color:'var(--muted)',marginTop:2}}>vs {d.vs} · {fmtD(d.date)} · {d.sA}–{d.sB}</div></div>
              <div className={`elo-delta ${d.eloDelta>=0?'d-up':'d-dn'}`}>{d.eloDelta>=0?'+':''}{d.eloDelta}</div>
            </div>
          ))}
        </div>}
      </div>
    );
  };

  /* ─── RANK PAGE ─── */
  const RankPage=()=>{
    const [tab,setTab]=useState('global');
    const sorted={
      global:[...leaderboard].sort((a,b)=>b.elo-a.elo),
      climb:[...leaderboard].sort((a,b)=>b.trend-a.trend),
      winrate:[...leaderboard].sort((a,b)=>(b.wins/(b.debates||1))-(a.wins/(a.debates||1))),
      beginner:[...leaderboard].filter(p=>p.debates<20).sort((a,b)=>b.elo-a.elo),
    };
    return(
      <div className="page">
        <div style={{fontFamily:'var(--fH)',fontSize:'1.4rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:14}}>🏆 Classement mondial</div>
        <div className="rank-tabs">
          {[['global','ELO Global'],['climb','Progression'],['winrate','Taux victoire'],['beginner','Débutants']].map(([k,l])=>(
            <button key={k} className={`rank-tab ${tab===k?'on':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        {leaderboard.length===0&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 20px',gap:16,textAlign:'center'}}>
            <div style={{fontSize:'2.5rem',opacity:.35}}>🏆</div>
            <div style={{fontFamily:'var(--fH)',fontSize:'1rem',letterSpacing:'.08em',color:'var(--dim)'}}>Classement vide</div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.65rem',color:'var(--muted)',maxWidth:280,lineHeight:1.8}}>
              Personne n'est encore classé. Soyez le premier à débattre.
            </div>
            <button className="btn b-a b-sm" onClick={()=>{setPage('train');setPhase('idle')}}>
              Faire un débat
            </button>
          </div>
        )}
        {leaderboard.length>0&&<div className="lb-head"><div>#</div><div>Joueur</div><div style={{textAlign:'center'}}>ELO</div><div style={{textAlign:'center'}}>Débats</div><div style={{textAlign:'center'}}>{tab==='winrate'?'Taux':tab==='climb'?'Gain':tab==='beginner'?'Niveau':'Rang'}</div><div style={{textAlign:'center'}}>Tier</div></div>}
        {leaderboard.length>0&&(sorted[tab]||[]).map((p,i)=>(
          <div key={p.id} className={`lb-row ${user&&p.id===user.id?'me':''}`} onClick={()=>setViewedPlayer(user&&p.id===user.id?{...user,isMe:true}:{...p,isMe:false})} title='Voir le profil'>
            <div className={`lb-rank ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''}`}>{i+1}</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',flexShrink:0}}>{p.avatar}</div>
              <div><div style={{fontWeight:600,fontSize:'.8rem'}}>{p.name}{user&&p.id===user.id&&<span style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--A)',marginLeft:5}}>(vous)</span>}</div><BadgePill elo={p.elo}/></div>
            </div>
            <div style={{fontFamily:'var(--fH)',fontSize:'.92rem',color:'var(--Y)',textAlign:'center'}}>{p.elo}</div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.68rem',color:'var(--muted)',textAlign:'center'}}>{p.debates}</div>
            <div style={{textAlign:'center'}}>
              {tab==='winrate'&&<span style={{fontFamily:'var(--fM)',fontSize:'.7rem',color:'var(--G)'}}>{p.debates?Math.round(p.wins/p.debates*100):0}%</span>}
              {tab==='climb'&&<span style={{fontFamily:'var(--fM)',fontSize:'.65rem',color:p.trend>0?'var(--G)':p.trend<0?'var(--B)':'var(--muted)'}}>{p.trend>0?'+':''}{p.trend}</span>}
              {(tab==='global'||tab==='beginner')&&<BadgePill elo={p.elo}/>}
            </div>
            {/* ── Tier column (Feature 9 extension) ── */}
            <div style={{textAlign:'center'}}>{(()=>{const t=getTier(p.elo||0);return(<span title={t.label} style={{fontFamily:'var(--fM)',fontSize:'.5rem',color:t.color,background:`${t.color}18`,border:`1px solid ${t.color}44`,borderRadius:20,padding:'2px 7px',display:'inline-block'}}>{t.icon} {t.label}</span>)})()}</div>
          </div>
        ))}
      </div>
    );
  };

  /* ─── PROFILE PAGE ─── */
  const ProfilePage=()=>{
    const [editMode,setEditMode]=useState(false);
    const [editName,setEditName]=useState(user?.name||'');
    const [savingProfile,setSavingProfile]=useState(false);

    if(!user)return(<div className="lock-screen"><div className="lock-icon">👤</div><div style={{fontFamily:'var(--fH)',fontSize:'1.5rem',letterSpacing:'.1em'}}>Profil joueur</div><div style={{fontFamily:'var(--fM)',fontSize:'.66rem',color:'var(--muted)',maxWidth:320,lineHeight:1.85,textAlign:'center'}}>Connectez-vous pour voir votre profil ELO, vos achievements et l'historique de vos débats.</div><button className="btn b-google b-lg" onClick={doGoogleLogin}>Se connecter avec Google</button><button className="btn b-ghost b-sm" style={{marginTop:8}} onClick={doLogin}>Connexion demo (sans Google)</button></div>);

    const handleSaveProfile=async()=>{
      if(!editName.trim()){showToast('Le nom ne peut pas être vide.','error');return;}
      setSavingProfile(true);
      const upd={...user,name:editName.trim()};
      saveUser(upd);
      // Sync Supabase profiles table
      try{await SB.from('profiles').update({name:editName.trim()}).eq('id',user.id);}catch{}
      setSavingProfile(false);
      setEditMode(false);
      showToast('✅ Profil mis à jour !','info');
    };

    return(
      <div className="page">
        <div className="profile-head">
          <div style={{width:64,height:64,borderRadius:'50%',border:`3px solid ${getBadge(user.elo).color}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.8rem',flexShrink:0,background:'var(--s2)'}}>
            {user.avatar?<img src={user.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span>{user.name[0]}</span>}
          </div>
          <div style={{flex:1}}>
            {/* Mode édition du nom */}
            {editMode?(
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}>
                <input className="fi" style={{flex:1,maxWidth:280,fontSize:'.9rem',fontFamily:'var(--fH)',letterSpacing:'.04em'}}
                  value={editName} onChange={e=>setEditName(e.target.value)}
                  placeholder="Votre nom d'affichage"
                  autoFocus/>
                <button className="btn b-g b-sm" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile?<><div className="spin"/>…</>:'✓ Sauvegarder'}
                </button>
                <button className="btn b-ghost b-sm" onClick={()=>{setEditMode(false);setEditName(user.name);}}>Annuler</button>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <div className="profile-name">{user.name}</div>
                <button className="btn b-ghost b-sm" onClick={()=>{setEditMode(true);setEditName(user.name);}} style={{fontSize:'.6rem',padding:'3px 8px'}}>✏️ Modifier</button>
              </div>
            )}
            <div className="profile-handle">{user.email}</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,flexWrap:'wrap'}}>
              <BadgePill elo={user.elo}/>
              {/* ── Arena Tier Badge (Feature 2 extension) ── */}
              {(()=>{const t=getTier(user.elo||0);return(<span style={{fontFamily:'var(--fM)',fontSize:'.5rem',letterSpacing:'.1em',textTransform:'uppercase',background:`${t.color}18`,color:t.color,border:`1px solid ${t.color}55`,borderRadius:20,padding:'2px 8px'}}>{t.icon} {t.label}</span>)})()}
              <span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)'}}>Depuis {fmtD(user.joinedAt)}</span>
              {user.streak>0&&<span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--O)'}}>🔥 Série {user.streak}</span>}
            </div>
            <div className="pstat-row">
              {/* Original stats + extended profile stats (Feature 2) */}
              {[['ELO',user.elo,'var(--Y)'],['Débats',user.debates,''],['Victoires',user.wins,'var(--G)'],['Défaites',user.losses||0,'var(--B)'],['Taux',`${pct(user.wins,user.debates)}%`,'var(--A)'],['XP',user.xp,'var(--O)'],['MVP',user.mvp_count||0,'var(--P)']].map(([l,v,c])=>(
                <div key={l} className="pstat"><div className="pstat-v" style={{color:c||'var(--txt)'}}>{v}</div><div className="pstat-l">{l}</div></div>
              ))}
            </div>
          </div>
        </div>

        {/* ── REPUTATION BADGE (Feature 3) — percentile from leaderboard ── */}
        <ReputationBadge userId={user.id} userElo={user.elo} leaderboard={leaderboard}/>

        {/* RANK PROGRESS */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:10}}>Progression de rang</div>
          <RankBar elo={user.elo}/>
          {user.eloHistory.length>1&&<div style={{marginTop:14}}><EloSparkline history={user.eloHistory}/></div>}
          {/* ── Promotion Indicator (Feature 2) — points to next badge ── */}
          {(()=>{const nb=getNextB(user.elo);return nb?(
            <div style={{marginTop:14}}>
              <PromotionIndicator elo={user.elo} nextMin={nb.min} nextLabel={nb.label} nextColor={nb.color} nextIcon={nb.icon}/>
            </div>
          ):null;})()}
          {/* ── Peak Rating Card (Feature 5) — current vs personal best ── */}
          <div style={{marginTop:14}}>
            <PeakRatingCard elo={user.elo} peakElo={user.peak_elo}/>
          </div>
        </div>

        {/* ACHIEVEMENTS */}
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:'var(--fH)',fontSize:'.9rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>🏅 Achievements ({(user.achievements||[]).length}/{ACHIEVEMENTS_DEF.length})</div>
          <div className="ach-grid">
            {ACHIEVEMENTS_DEF.map(a=>{
              const unlocked=(user.achievements||[]).includes(a.id);
              return(<div key={a.id} className={`ach-card ${unlocked?'unlocked':'locked'}`}>
                <div className="ach-icon">{a.icon}</div>
                <div className="ach-name">{a.name}</div>
                <div className="ach-desc">{a.desc}</div>
                {unlocked&&<div style={{fontFamily:'var(--fM)',fontSize:'.5rem',color:'var(--Y)',textTransform:'uppercase',letterSpacing:'.1em'}}>✓ Débloqué</div>}
              </div>);
            })}
          </div>
        </div>

        {/* ── RANK TREND CARD (Feature 1) — ELO delta timeline + W/L/D strip ── */}
        {user.history.length>0&&<RankTrendCard history={user.history}/>}

        {/* HISTORY */}
        {user.history.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontFamily:'var(--fH)',fontSize:'.9rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>📋 Historique</div>
          {user.history.slice(0,10).map(d=>(
            <div key={d.id} className="hist-item">
              <div className={`hi-res ${d.result==='win'?'hi-win':d.result==='loss'?'hi-loss':'hi-draw'}`}>{d.result==='win'?'✓ V':d.result==='loss'?'✗ D':'~ N'}</div>
              <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:'.78rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.topic}</div><div style={{fontFamily:'var(--fM)',fontSize:'.57rem',color:'var(--muted)',marginTop:2}}>vs {d.vs} · {fmtD(d.date)} · {d.sA}–{d.sB}</div></div>
              <div className={`elo-delta ${d.eloDelta>=0?'d-up':'d-dn'}`}>{d.eloDelta>=0?'+':''}{d.eloDelta}</div>
              {/* ── Rematch button (Feature 4) — only on losses, isolated localStorage ── */}
              <RematchButton match={d} onRematch={m=>{const b=BOTS.find(x=>x.name===m.vs);if(b)startBotDebate(b,m.topic);else showToast('🔄 Revanche enregistrée — retrouve cet adversaire en mode Compétitif','info');}}/>
            </div>
          ))}
        </div>}

        {/* ACADÉMIE */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>🏛 Académie</div>
          {user.academyId&&academies.find(a=>a.id===user.academyId)?(
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:'var(--Ag)',borderRadius:7,border:'1px solid rgba(44,74,110,.18)'}}>
              <div style={{fontSize:'1.6rem'}}>{academies.find(a=>a.id===user.academyId).icon}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'.88rem',letterSpacing:'.06em'}}>{academies.find(a=>a.id===user.academyId).name}</div>
                <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',marginTop:2}}>{academies.find(a=>a.id===user.academyId).members?.length||0} membres</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn b-ghost b-sm" onClick={()=>setPage('academies')}>Voir →</button>
                <button className="btn b-ghost b-sm" style={{color:'var(--B)',borderColor:'rgba(140,58,48,.22)'}} onClick={leaveAcademy}>Quitter</button>
              </div>
            </div>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'var(--s2)',borderRadius:7,border:'1px dashed var(--bd)'}}>
              <div style={{fontFamily:'var(--fM)',fontSize:'.62rem',color:'var(--muted)',flex:1}}>Vous n'avez pas rejoint d'académie.</div>
              <button className="btn b-ghost b-sm" onClick={()=>setPage('academies')}>Explorer →</button>
            </div>
          )}
        </div>

        <button className="btn b-ghost" onClick={doLogout}>Se déconnecter</button>
      </div>
    );
  };

  /* ─── HALL OF FAME ─── */
  const HallPage=()=>(
    <div className="page">
      <div style={{fontFamily:'var(--fH)',fontSize:'1.4rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>⭐ Hall of Fame</div>
      <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)',marginBottom:20}}>Les meilleurs débatteurs de tous les temps · Saison 1</div>
      {leaderboard.slice(0,10).map((p,i)=>(
        <div key={p.id} className={`hof-card ${i<3?'gold':''}`} onClick={()=>setViewedPlayer(user&&p.id===user.id?{...user,isMe:true}:{...p,isMe:false})} title='Voir le profil' style={{cursor:'pointer'}}>
          <div style={{fontFamily:'var(--fH)',fontSize:'1.8rem',width:44,textAlign:'center',color:i===0?'var(--Y)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--muted)'}}>{i+1}</div>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0,border:`2px solid ${getBadge(p.elo).color}`}}>{p.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'.88rem'}}>{p.name}</div>
            <div style={{display:'flex',gap:8,marginTop:4,alignItems:'center',flexWrap:'wrap'}}><BadgePill elo={p.elo}/><span style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)'}}>{p.debates} débats</span></div>
          </div>
          <div style={{fontFamily:'var(--fH)',fontSize:'1.8rem',color:'var(--Y)'}}>{p.elo}</div>
        </div>
      ))}
      <div style={{marginTop:24,background:'var(--s1)',border:'1px solid rgba(90,58,110,.2)',borderRadius:10,padding:'14px 18px'}}>
        <div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--P)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:6}}>🗓 Saisons</div>
        <div style={{fontFamily:'var(--fM)',fontSize:'.66rem',color:'var(--muted)',lineHeight:1.75}}>
          Les saisons durent <b style={{color:'var(--txt)'}}>3 mois</b>. À chaque nouvelle saison, l'ELO est partiellement réinitialisé :<br/>
          <span style={{color:'var(--A)'}}>newELO = 0.75 × oldELO + baseline</span><br/>
          Les champions de chaque saison sont immortalisés dans le Hall of Fame.
        </div>
      </div>
    </div>
  );


  /* ─── ACADEMIES PAGE ─── */
  const AcademiesPage=()=>{
    const [selAc,setSelAc]=useState(null);
    const myAc=user?.academyId?academies.find(a=>a.id===user.academyId):null;
    const sorted=[...academies].sort((a,b)=>b.avgElo-a.avgElo);
    return(
      <div className="page">
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontFamily:'var(--fH)',fontSize:'1.4rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>🏛 Académies</div>
            <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--muted)'}}>Communautés intellectuelles compétitives · Débattez sous leur bannière</div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {!myAc&&<button className="btn b-ghost b-sm" onClick={()=>setAcademyModal('join')}>📖 Rejoindre</button>}
            {!myAc&&<button className="btn b-a b-sm" onClick={()=>setAcademyModal('create')}>🏛 Créer</button>}
            {myAc&&<button className="btn b-ghost b-sm" style={{color:'var(--B)',borderColor:'rgba(140,58,48,.25)'}} onClick={leaveAcademy}>Quitter mon académie</button>}
          </div>
        </div>

        {myAc&&(
          <div style={{background:'linear-gradient(135deg,var(--Ag),rgba(90,58,110,.05))',border:'1px solid rgba(44,74,110,.2)',borderRadius:10,padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <div style={{fontSize:'2rem',lineHeight:1}}>{myAc.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'1rem',letterSpacing:'.08em'}}>{myAc.name}</div>
                <span style={{fontFamily:'var(--fM)',fontSize:'.52rem',background:'var(--Ag)',color:'var(--A)',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(44,74,110,.22)',fontWeight:700}}>MON ACADÉMIE</span>
              </div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.6rem',color:'var(--dim)',marginTop:3,lineHeight:1.6}}>{myAc.desc}</div>
              <div style={{display:'flex',gap:14,marginTop:7,flexWrap:'wrap'}}>
                {[['Membres',myAc.members?.length||0],['ELO moy.',myAc.avgElo],['Victoires',myAc.wins]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',gap:5,alignItems:'baseline'}}>
                    <span style={{fontFamily:'var(--fH)',fontSize:'.95rem',color:'var(--Y)'}}>{v}</span>
                    <span style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)'}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{fontFamily:'var(--fM)',fontSize:'.55rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Classement des Académies</div>
        <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'36px 1fr 80px 70px 70px',gap:8,padding:'7px 14px',fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',borderBottom:'1px solid var(--bd)'}}>
            <div>#</div><div>Académie</div><div style={{textAlign:'center'}}>ELO moy.</div><div style={{textAlign:'center'}}>Membres</div><div style={{textAlign:'center'}}>Victoires</div>
          </div>
          {sorted.map((ac,i)=>(
            <div key={ac.id} onClick={()=>setSelAc(selAc?.id===ac.id?null:ac)} style={{display:'grid',gridTemplateColumns:'36px 1fr 80px 70px 70px',gap:8,padding:'11px 14px',cursor:'pointer',borderBottom:'1px solid var(--bd)',background:myAc?.id===ac.id?'var(--Ag)':selAc?.id===ac.id?'rgba(90,58,110,.04)':'transparent',transition:'background .15s'}}>
              <div style={{fontFamily:'var(--fH)',fontSize:'1.2rem',color:i===0?'var(--Y)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--muted)',textAlign:'center'}}>{i+1}</div>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div style={{fontSize:'1.3rem',flexShrink:0}}>{ac.icon}</div>
                <div>
                  <div style={{fontFamily:'var(--fH)',fontSize:'.82rem',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:6}}>
                    {ac.name}
                    {myAc?.id===ac.id&&<span style={{fontFamily:'var(--fM)',fontSize:'.48rem',color:'var(--A)',background:'var(--Ag)',padding:'1px 6px',borderRadius:10}}>vous</span>}
                  </div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',marginTop:1}}>{ACADEMY_TYPES.find(t=>t.id===ac.type)?.label} · {ac.founder}</div>
                </div>
              </div>
              <div style={{fontFamily:'var(--fH)',fontSize:'.88rem',color:'var(--Y)',textAlign:'center'}}>{ac.avgElo}</div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.68rem',color:'var(--muted)',textAlign:'center'}}>{ac.members?.length||0}</div>
              <div style={{fontFamily:'var(--fM)',fontSize:'.68rem',color:'var(--G)',textAlign:'center',fontWeight:700}}>{ac.wins}</div>
            </div>
          ))}
        </div>

        {selAc&&(
          <div style={{background:'var(--s1)',border:'1px solid var(--bd2)',borderRadius:10,padding:16,animation:'slideUp .2s ease'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:12}}>
              <div style={{fontSize:'2.2rem',lineHeight:1}}>{selAc.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--fH)',fontSize:'1rem',letterSpacing:'.08em',marginBottom:4}}>{selAc.name}</div>
                <div style={{fontFamily:'var(--fM)',fontSize:'.62rem',color:'var(--dim)',lineHeight:1.65}}>{selAc.desc}</div>
                <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                  <span className="chip">{ACADEMY_TYPES.find(t=>t.id===selAc.type)?.icon} {ACADEMY_TYPES.find(t=>t.id===selAc.type)?.label}</span>
                  <span className="chip">Fondée par {selAc.founder}</span>
                  <span className="chip">{fmtD(selAc.created)}</span>
                </div>
              </div>
              {user&&!myAc&&<button className="btn b-a b-sm" onClick={()=>handleAcademyAction({mode:'join',id:selAc.id})}>Rejoindre</button>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderTop:'1px solid var(--bd)',paddingTop:10}}>
              {[['ELO moyen',selAc.avgElo,'var(--Y)'],['Membres',selAc.members?.length||0,''],['Victoires',selAc.wins,'var(--G)']].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center',background:'var(--s2)',borderRadius:6,padding:'8px 4px',border:'1px solid var(--bd)'}}>
                  <div style={{fontFamily:'var(--fH)',fontSize:'1.2rem',color:c||'var(--txt)'}}>{v}</div>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.54rem',color:'var(--muted)',marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {academyModal&&<AcademyModal mode={academyModal} onClose={()=>setAcademyModal(null)} onDone={handleAcademyAction} academies={academies}/>}
      </div>
    );
  };

  /* ─── DAILY PAGE ─── */
  const DailyPage=()=>{
    const todayKey=new Date().toDateString(); // e.g. "Fri Mar 13 2026"
    const dailyDoneKey='dix_daily_done_v6';
    // Check if the user already claimed XP today (persists across refreshes).
    const [claimedToday]=useState(()=>{
      try{return localStorage.getItem(dailyDoneKey)===todayKey;}catch{return false;}
    });
    const [arg,setArg]=useState('');
    const [submitted,setSubmitted]=useState(claimedToday);
    const [submitting,setSubmitting]=useState(false);
    const [score,setScore]=useState(null);
    const doSubmit=async()=>{
      if(!arg.trim())return;
      setSubmitting(true);
      const r=await aiAnalyze(arg,'A','Vous',dailyTopic,[],'Arguments');
      setScore(r);setSubmitted(true);setSubmitting(false);
      if(user&&r){
        // Only award XP once per calendar day.
        if(!claimedToday){
          const xpGained=Math.round((r.strength||5)*4+20);
          const upd={...user,xp:user.xp+xpGained,totalArgs:(user.totalArgs||0)+1};
          const newAch=checkAchievements(user,upd);
          if(newAch.length>0)upd.achievements=[...(user.achievements||[]),...newAch];
          saveUser(upd);
          showToast(`+${xpGained} XP gagné !`,'xp');
          try{localStorage.setItem(dailyDoneKey,todayKey);}catch{}
        }else{
          // Still show feedback but no XP
          showToast('Défi déjà soumis aujourd\'hui — pratique libre, pas de XP.','info');
        }
      }
    };
    return(
      <div className="page">
        <div className="daily-card" style={{padding:22,marginBottom:18}}>
          <div className="daily-badge">📅 Défi · {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
          <div className="daily-topic" style={{fontSize:'1.1rem'}}>{dailyTopic}</div>
          <div style={{fontFamily:'var(--fM)',fontSize:'.63rem',color:'var(--dim)',lineHeight:1.7}}>Soumettez votre meilleur argument. L'IA l'analysera et vous attribuera des XP.</div>
        </div>
        {!submitted?(
          <div className="card">
            <label className="fi-label">Votre argument</label>
            <textarea className="fi" style={{minHeight:100,resize:'vertical',lineHeight:1.6}} placeholder="Développez votre position en 2-4 phrases…" value={arg} onChange={e=>setArg(e.target.value)}/>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
              <button className="btn b-y" onClick={doSubmit} disabled={!arg.trim()||submitting}>{submitting?<><div className="spin"/>Analyse…</>:'Soumettre →'}</button>
            </div>
          </div>
        ):(
          <div className="card card-g">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{fontSize:'2rem'}}>✅</div>
              <div><div style={{fontFamily:'var(--fH)',fontSize:'.95rem',letterSpacing:'.08em'}}>Argument analysé !</div><div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--dim)',marginTop:2}}>Force : {score?.strength||0}/10</div></div>
            </div>
            <div style={{background:'var(--s2)',borderRadius:6,padding:12,marginBottom:12,fontSize:'.81rem',lineHeight:1.6,borderLeft:'3px solid var(--G)'}}>{score?.formalized||arg}</div>
            {score?.scores&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {CRITERIA.map(c=>(
                <div key={c.key} style={{flex:1,minWidth:80,background:'var(--s1)',borderRadius:6,padding:'8px 10px',textAlign:'center',border:'1px solid var(--bd)'}}>
                  <div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',textTransform:'uppercase',marginBottom:4}}>{c.label}</div>
                  <div style={{fontFamily:'var(--fH)',fontSize:'1.2rem',color:'var(--A)'}}>{score.scores[c.key].toFixed(1)}</div>
                </div>
              ))}
            </div>}
            {score?.commentary&&<div style={{marginTop:12,fontFamily:'var(--fM)',fontSize:'.68rem',color:'var(--dim)',fontStyle:'italic',lineHeight:1.6}}>{score.commentary}</div>}
            <button className="btn b-ghost b-sm" style={{marginTop:12}} onClick={()=>{setSubmitted(false);setArg('');setScore(null)}}>
              {claimedToday?'Pratiquer encore (sans XP)':'Soumettre un autre argument'}
            </button>
          </div>
        )}
        {user&&<div className="card" style={{marginTop:16}}>
          <div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Vos XP · Niveau {user.level}</div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontFamily:'var(--fH)',fontSize:'1.5rem',color:'var(--Y)'}}>{user.xp} XP</div>
            <div style={{flex:1}}><div className="xp-bar"><div className="xp-fill" style={{width:`${user.xp%100}%`}}/></div><div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'var(--muted)',marginTop:3}}>{user.xp%100}/100 pour niveau {user.level+1}</div></div>
          </div>
        </div>}
      </div>
    );
  };

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  const ONBOARDING_KEY='dix_onboarding_seen_v1';
  const [showOnboarding,setShowOnboarding]=useState(()=>{
    try{return!localStorage.getItem(ONBOARDING_KEY);}catch{return false;}
  });
  const closeOnboarding=()=>{
    try{localStorage.setItem(ONBOARDING_KEY,'1');}catch{}
    setShowOnboarding(false);
  };
  const OnboardingModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#fff',borderRadius:12,padding:'32px 28px',maxWidth:420,width:'100%',boxShadow:'0 24px 60px rgba(0,0,0,.3)',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem',marginBottom:8}}>⚖️</div>
          <h2 style={{margin:0,fontSize:'1.25rem',fontWeight:700,color:'#111'}}>Bienvenue sur Dialectix</h2>
        </div>
        <p style={{margin:0,fontSize:'.88rem',color:'#444',lineHeight:1.7,textAlign:'center'}}>
          Dialectix est une plateforme où vous débattez contre une IA et recevez un score sur vos arguments.
        </p>
        <ol style={{margin:0,paddingLeft:20,display:'flex',flexDirection:'column',gap:10}}>
          {[['Choisissez un bot','🤖'],['Écrivez votre argument','✍️'],['Obtenez votre score et votre ELO','📊']].map(([txt,ico],i)=>(
            <li key={i} style={{fontSize:'.85rem',color:'#222',lineHeight:1.5}}>
              <span style={{marginRight:6}}>{ico}</span>{txt}
            </li>
          ))}
        </ol>
        <button
          onClick={closeOnboarding}
          style={{width:'100%',padding:'12px 0',background:'#1f2937',color:'#fff',border:'none',borderRadius:8,fontSize:'.92rem',fontWeight:600,cursor:'pointer',marginTop:4}}
        >
          Commencer
        </button>
      </div>
    </div>
  );

  /* ═══ RENDER ═══ */
  const showNav=phase==='idle';
  const inDebate=phase==='debate';
  const inReport=phase==='report';
  const inWaiting=phase==='waiting';

  return(
    <>
      <style>{CSS}</style>
      <div className="app">
        {showNav&&<Nav/>}

        {/* DEBATE */}
        {inDebate&&debateConfig&&(
          <DebateArena config={debateConfig} user={user} onEnd={handleEndDebate}/>
        )}

        {/* WAITING ROOM */}
        {inWaiting&&debateConfig&&(
          <WaitingRoom
            config={debateConfig}
            showToast={showToast}
            onDebate={cfg=>{setDebateConfig(cfg);setPhase('debate')}}
            onCancel={()=>{setPhase('idle');setPage('compete')}}
          />
        )}

        {/* REPORT */}
        {inReport&&reportData&&(
          <ReportScreen
            tx={reportData.tx} vars={reportData.vars||[]}
            sA={reportData.scoresA} sB={reportData.scoresB}
            nA={debateConfig.nameA} nB={debateConfig.nameB}
            topic={debateConfig.topic} elapsed={reportData.elapsed}
            report={reportResult} genRep={genRep}
            user={user} isTraining={debateMode==='bot'&&!user}
            botElo={debateConfig.botConfig?.elo}
            format={debateConfig.format||'standard'}
            onNewDebate={()=>{setPhase('idle');setDebateConfig(null);setReportData(null);setReportResult(null)}}
            onProfile={()=>{setPhase('idle');setPage('profile')}}
            onTrain={()=>{setPhase('idle');setDebateConfig(null);setReportData(null);setReportResult(null);setPage('train')}}
            debateId={reportData?.debateId}
            showToast={showToast}
            debateConfig={debateConfig}
          />
        )}

        {/* PAGES */}
        {showNav&&page==='home'&&<HomePage/>}
        {showNav&&page==='train'&&<TrainPage/>}
        {showNav&&page==='compete'&&(
          <CompetitiveLobby
            user={user}
            showToast={showToast}
            onJoinRoom={room=>{
              // Lancer un débat bot simulant la salle (nom de l'adversaire = créateur)
              const b={id:'lobby_opponent',name:room.creator_name,style:'logical',elo:room.creator_elo||1200};
              startBotDebate({...b,id:'analyste'},room.topic);
            }}
            startMM={startMM}
            mmPhase={mmPhase}
            mmTimer={mmTimer}
            cancelMM={cancelMM}
            mmPlayBot={mmPlayBot}
            selFormat={selFormat}
            setSelFormat={setSelFormat}
            FORMATS={FORMATS}
          />
        )}
        {showNav&&page==='rank'&&<RankPage/>}
        {showNav&&page==='profile'&&<ProfilePage/>}
        {showNav&&page==='hall'&&<HallPage/>}
        {showNav&&page==='academies'&&<AcademiesPage/>}
        {showNav&&page==='daily'&&(
          <SophismDuel user={user} saveUser={saveUser} showToast={showToast}/>
        )}
        {showNav&&page==='architect'&&(
          <ArchitectMode user={user} saveUser={saveUser} showToast={showToast}/>
        )}
        {/* ── ARENA — modular, does not affect existing debate logic ── */}
        {showNav&&page==='arena'&&<ArenaPage user={user} saveUser={saveUser} showToast={showToast} setPage={setPage} leaderboard={leaderboard} supabase={SB}/>}

        {/* ── FEATURE 2 — ACADEMY MAP + BOUTIQUE ───────────────────────────── */}
        {showNav&&page==='academy-map'&&(
          <AcademyMap user={user} saveUser={saveUser} showToast={showToast} setPage={setPage}/>
        )}

        {/* ── MODULE 1 — TOURNAMENT ALPHA ───────────────────────────────────── */}
        {showNav&&page==='tournament'&&(
          <>
            <TournamentSystem
              user={user}
              setPage={setPage}
              showToast={showToast}
              onShowRules={()=>setTournamentRulesOpen(true)}
              onChallenge={p=>{
                if(!user){showToast('Connectez-vous pour challenger un joueur.','error');return;}
                const topic=`Débat de tournoi contre ${p.name}`;
                setPage('train');
                setPhase('idle');
              }}
            />
            {/* Feature 6 — Fenêtre Règles du Tournoi (obligatoire avant Prêt) */}
            {tournamentRulesOpen&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
                <div style={{background:'#FDFAF4',borderRadius:14,padding:'32px 28px',maxWidth:500,width:'100%',boxShadow:'0 24px 60px rgba(0,0,0,.25)',display:'flex',flexDirection:'column',gap:18}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'2.2rem',marginBottom:8}}>⚖️</div>
                    <div style={{fontFamily:'var(--fH)',fontSize:'1.25rem',letterSpacing:'.1em',textTransform:'uppercase'}}>Règles du Tournoi</div>
                    <div style={{fontFamily:'var(--fM)',fontSize:'.58rem',color:'var(--muted)',marginTop:4}}>À lire obligatoirement avant de cliquer sur Prêt</div>
                  </div>
                  <div style={{background:'var(--s1)',borderRadius:10,padding:'16px 18px',border:'1px solid var(--bd)',display:'flex',flexDirection:'column',gap:10}}>
                    {[
                      ['🏆','Format','Élimination directe — perdant éliminé, vainqueur avance.'],
                      ['⏱','Temps','Format Standard imposé : 3 min lecture / 5 min rédaction par phase.'],
                      ['🤖','Bots','Les slots restants peuvent être remplis par 1 bot maximum par équipe (si le créateur l\'autorise). Les slots ne sont PAS auto-remplis.'],
                      ['👥','Minimum','Un tournoi ne démarre que si tous les slots humains sont remplis.'],
                      ['⚖️','Fair-play','Tout comportement irrespectueux entraîne une disqualification immédiate.'],
                      ['📊','ELO','L\'ELO est affecté uniquement pour les tournois officiels classés.'],
                    ].map(([ico,titre,texte])=>(
                      <div key={titre} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                        <span style={{fontSize:'.9rem',flexShrink:0,marginTop:1}}>{ico}</span>
                        <div>
                          <span style={{fontFamily:'var(--fB)',fontSize:'.72rem',fontWeight:700,color:'var(--A)'}}>{titre} — </span>
                          <span style={{fontFamily:'var(--fM)',fontSize:'.68rem',color:'var(--dim)'}}>{texte}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn b-a b-lg" style={{flex:1,justifyContent:'center'}}
                      onClick={()=>setTournamentRulesOpen(false)}>
                      ✓ J'ai compris — Prêt !
                    </button>
                    <button className="btn b-ghost" onClick={()=>setTournamentRulesOpen(false)}>
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MODULE 2 — DIALECTIX ACTU ─────────────────────────────────────── */}
        {showNav&&page==='actu'&&(
          <DialectixActu
            user={user}
            setPage={setPage}
            showToast={showToast}
            onEnterArena={(topic,side)=>{
              // Weekly limit check for Actu debates
              if(user?.id && hasReachedWeeklyLimit(user.id)){
                showToast('Limite hebdomadaire atteinte (5 débats Actu max). Revenez la semaine prochaine !','error');
                return;
              }
              if(user?.id) incrementUserWeekDebateCount(user.id);
              // Launch a bot debate using the actu topic
              const bots=window._dialectixBots||[];
              const randomBot=bots[Math.floor(Math.random()*Math.max(1,bots.length))]||{id:'bot_actu',name:'Adversaire IA',style:'logical',elo:1200};
              setDebateConfig({
                topic:  topic.title,
                nameA:  user?.name||'Vous',
                nameB:  randomBot.name||'Adversaire IA',
                format: 'standard',
                mode:   'bot',
                botConfig: {id:randomBot.id,name:randomBot.name,style:randomBot.style||'logical',elo:randomBot.elo||1200},
              });
              setPhase('debate');
              setDebateMode('bot');
            }}
          />
        )}

        {/* ── MODULE 2 — ADMIN WEEKLY DEBATES ──────────────────────────────── */}
        {showNav&&page==='admin-actu'&&(
          <AdminWeeklyDebates user={user} showToast={showToast} setPage={setPage}/>
        )}

        {/* ── BATTLES — spectator mode ─────────────────────────────────────── */}
        {showNav&&page==='battles'&&<BattlesPage user={user} setPage={setPage} showToast={showToast}/>}

        {/* ── GUIDES PAGE ───────────────────────────────────────────────────── */}
        {showNav&&page==='guides'&&<GuidesPage setPage={setPage}/>}

        {/* ── ADMIN DASHBOARD ───────────────────────────────────────────────── */}
        {showNav&&page==='admin-dashboard'&&isAdmin()&&(
          <AdminDashboard onBack={()=>setPage('home')}/>
        )}

        {/* ── BOT BADGE OVERLAY (shown during beta bot debates) ─────────────── */}
        {inDebate&&debateConfig?.botConfig?.isBetaBot&&(
          <div style={{
            position:'fixed',top:58,right:12,zIndex:1100,
            display:'flex',alignItems:'center',gap:6,
            background:'rgba(0,0,0,0.72)',backdropFilter:'blur(6px)',
            border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:20,padding:'5px 12px',
            pointerEvents:'none',
          }}>
            <span style={{
              background:'var(--A)',color:'#fff',
              borderRadius:4,padding:'1px 7px',
              fontSize:10,fontWeight:800,letterSpacing:'0.1em',fontFamily:'var(--fM)',
            }}>BOT</span>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.85)',fontFamily:'var(--fB)',fontWeight:600}}>
              {debateConfig.nameB}
            </span>
          </div>
        )}

        {/* ── MODULE 4 — RANK PROGRESSION (accessible from profile) ────────── */}
        {showNav&&page==='rank-progression'&&user&&(
          <div style={{maxWidth:700,margin:'0 auto',padding:'32px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28}}>
              <button className="btn b-ghost b-sm" onClick={()=>setPage('profile')}>← Profil</button>
              <div style={{fontFamily:'var(--fH)',fontSize:'1rem',letterSpacing:'.12em',color:'var(--txt)'}}>PROGRESSION DE RANG</div>
            </div>
            <RankProgressionSystem elo={user.elo} debates={user.debates||0} wins={user.wins||0} user={user}/>
          </div>
        )}


        {/* PLAYER PROFILE MODAL */}
        {viewedPlayer&&(
          <PlayerProfileModal
            player={viewedPlayer}
            isMe={!!viewedPlayer.isMe}
            onClose={()=>setViewedPlayer(null)}
            onChallenge={!viewedPlayer.isMe?()=>{setViewedPlayer(null);setPage('train')}:null}
          />
        )}

        {/* PROMOTION */}
        {promotion&&<PromotionOverlay badge={promotion} onClose={()=>setPromotion(null)}/>}

        {/* ── PROFILE QUESTIONNAIRE (first battle gate) ────────────────────── */}
        {showProfileQ&&(
          <DialectixProfileQuestionnaire
            onComplete={profile=>{
              savePlayerProfile(profile);
              if(user?.id) storeProfileForMatchmaking(user.id, profile);
              setShowProfileQ(false);
              setPhase('debate'); // proceed to the queued debate
            }}
            onSkip={()=>{
              savePlayerProfile({skippedAll:true,version:1});
              setShowProfileQ(false);
              setPhase('debate');
            }}
          />
        )}

        {/* ── MODULE 3 — CHECKMATE OVERLAY ─────────────────────────────────── */}
        {checkmateEntry&&(
          <CheckmateOverlay
            active={!!checkmateEntry}
            entry={checkmateEntry}
            winnerName={checkmateEntry.winnerName||''}
            onDismiss={()=>setCheckmateEntry(null)}
          />
        )}

        {/* ONBOARDING — shown once per browser, highest z-index after error boundary */}
        {showOnboarding&&<OnboardingModal/>}

        {/* ── FORMAT RULES MODAL ────────────────────────────────────────────── */}
        {formatModalId&&FORMAT_RULES[formatModalId]&&(()=>{
          const fr=FORMAT_RULES[formatModalId];
          return(
            <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px',background:'rgba(10,8,4,.55)',backdropFilter:'blur(6px)'}}
              onClick={()=>setFormatModalId(null)}>
              <div style={{background:'#FDFAF4',borderRadius:16,padding:'28px 26px',maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.25)',border:'1px solid var(--bd)',animation:'slideUp .3s ease'}}
                onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                  <div>
                    <div style={{fontSize:'2rem',marginBottom:4}}>{fr.icon}</div>
                    <div style={{fontFamily:'var(--fH)',fontSize:'1.1rem',letterSpacing:'.08em',color:'var(--txt)',marginBottom:4}}>{fr.title}</div>
                    <div style={{fontFamily:'var(--fC)',fontSize:'.82rem',color:'var(--dim)',fontStyle:'italic',lineHeight:1.5}}>{fr.desc}</div>
                  </div>
                  <button onClick={()=>setFormatModalId(null)}
                    style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:'var(--fM)',fontSize:'.65rem',color:'var(--muted)',flexShrink:0,marginLeft:12}}>
                    ✕ Fermer
                  </button>
                </div>
                {/* Divider */}
                <div style={{height:1,background:'var(--bd)',marginBottom:16}}/>
                {/* Rules list */}
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {fr.rules.map((r,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 14px',background:'var(--s1)',borderRadius:9,border:'1px solid var(--bd)'}}>
                      <span style={{fontSize:'1.1rem',flexShrink:0}}>{r.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:'var(--fM)',fontSize:'.56rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:2}}>{r.label}</div>
                        <div style={{fontFamily:'var(--fB)',fontSize:'.75rem',fontWeight:600,color:'var(--txt)'}}>{r.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* CTA */}
                <button className="btn b-a b-lg" style={{width:'100%',justifyContent:'center',marginTop:18}}
                  onClick={()=>setFormatModalId(null)}>
                  ✓ Compris — Format {FORMATS.find(f=>f.id===formatModalId)?.label} sélectionné
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── FEATURE 7 — CITATION DE SAGESSE ──────────────────────────────── */}
        {wisdomQuote&&(
          <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',zIndex:800,
            maxWidth:420,width:'calc(100% - 32px)',
            background:wisdomQuote.win
              ?'linear-gradient(135deg,rgba(58,110,82,.95),rgba(44,74,110,.95))'
              :'linear-gradient(135deg,rgba(44,74,110,.95),rgba(90,58,110,.95))',
            borderRadius:14,padding:'20px 22px',boxShadow:'0 12px 40px rgba(0,0,0,.3)',
            backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.15)',
            animation:'slideUp .4s cubic-bezier(.34,1.56,.64,1)',
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--fM)',fontSize:'.52rem',color:'rgba(255,255,255,.6)',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:6}}>
                  {wisdomQuote.win?'✦ Citation du vainqueur':'📖 Pensée réflexive'}
                </div>
                <p style={{fontFamily:'var(--fC)',fontSize:'1rem',color:'#fff',lineHeight:1.7,fontStyle:'italic',margin:'0 0 8px'}}>
                  « {wisdomQuote.quote} »
                </p>
                <div style={{fontFamily:'var(--fH)',fontSize:'.64rem',letterSpacing:'.08em',color:'rgba(255,255,255,.7)'}}>
                  — {wisdomQuote.author}
                </div>
              </div>
              <button onClick={()=>setWisdomQuote(null)}
                style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.2)',borderRadius:6,padding:'4px 8px',color:'#fff',cursor:'pointer',fontSize:'.7rem',flexShrink:0}}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      </div>
    </>
  );
}
