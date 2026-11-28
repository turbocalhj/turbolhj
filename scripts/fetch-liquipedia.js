/**
 * 从液体百科（Liquipedia）抓取职业选手基础资料，生成 data/esports-liquipedia.json。
 * - 只读取公开 Infobox 字段：id / name / country / roles / team
 * - 每个请求间隔 1.2s，遵守 Liquipedia API 使用条款
 * - 网络失败时保留人工核对过的兜底值，保证站点仍可构建
 * 运行：node scripts/fetch-liquipedia.js
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UA = 'TURBO-SPARK-PersonalSite/1.0 (https://github.com/turbocalhj; contact: 2383261679@qq.com)';
const API = 'https://liquipedia.net';
const DELAY = 1200;

const GAMES = {
  apex: { wiki: 'apexlegends', name: 'Apex Legends', short: 'APEX', color: '#da2929' },
  ow: { wiki: 'overwatch', name: 'Overwatch 2', short: 'OW2', color: '#f99e1a' },
  valorant: { wiki: 'valorant', name: 'VALORANT', short: 'VAL', color: '#ff4655' },
  cs2: { wiki: 'counterstrike', name: 'Counter-Strike 2', short: 'CS2', color: '#d99b34' },
};

const SEEDS = [
  ['apex', 'ImperialHal', 'Phillip Dosen', '美国', 'TSM', 'IGL'],
  ['apex', 'Reps', 'Jordan Wolfe', '美国', 'TSM', 'Support'],
  ['apex', 'Verhulst', 'Evan Verhulst', '美国', 'TSM', 'Fragger'],
  ['apex', 'Genburten', 'Noyan Ozkose', '澳大利亚', 'DarkZero', 'Fragger'],
  ['apex', 'Zer0', 'Rhys Perry', '澳大利亚', 'DarkZero', 'IGL'],
  ['apex', 'Sharky', 'Cameron Rogers', '澳大利亚', 'DarkZero', 'Support'],
  ['apex', 'Sweetdreams', 'Christopher Sexton', '美国', 'NRG', 'IGL'],
  ['apex', 'Nafen', 'Nathan Nguyen', '美国', 'NRG', 'Fragger'],
  ['ow', 'Proper', 'Kim Dong-hyun', '韩国', 'Atlanta Reign', 'DPS'],
  ['ow', 'Fleta', 'Kim Byung-sun', '韩国', 'Shanghai Dragons', 'DPS'],
  ['ow', 'Lip', 'Lee Jae-won', '韩国', 'Shanghai Dragons', 'DPS'],
  ['ow', 'Leave', 'Huang Xin', '中国', 'Chengdu Hunters', 'DPS'],
  ['ow', 'Guxue', 'Xu Qiuhang', '中国', 'Hangzhou Spark', 'Tank'],
  ['ow', 'Shu', 'Kim Jin-seo', '韩国', 'Atlanta Reign', 'Support'],
  ['ow', 'Chiyo', 'Kim Min-hyung', '韩国', 'Atlanta Reign', 'Support'],
  ['ow', 'Hanbin', 'Choi Han-bin', '韩国', 'Dallas Fuel', 'Tank'],
  ['valorant', 'TenZ', 'Tyson Ngo', '加拿大', 'Sentinels', 'Duelist'],
  ['valorant', 'Boaster', 'Jake Howlett', '英国', 'Fnatic', 'IGL'],
  ['valorant', 'Derke', 'Nikita Sirmitev', '芬兰', 'Fnatic', 'Duelist'],
  ['valorant', 'ZmjjKK', 'Zheng Yongkang', '中国', 'EDward Gaming', 'Duelist'],
  ['valorant', 'CHICHOO', 'Wan Shunzhi', '中国', 'EDward Gaming', 'Sentinel'],
  ['valorant', 'aspas', 'Erick Santos', '巴西', 'LOUD', 'Duelist'],
  ['valorant', 'Less', 'Felipe de Loyola', '巴西', 'LOUD', 'Sentinel'],
  ['valorant', 'f0rsakeN', 'Jason Susanto', '印度尼西亚', 'Paper Rex', 'Flex'],
  ['cs2', 's1mple', 'Oleksandr Kostyliev', '乌克兰', 'Natus Vincere', 'AWPer'],
  ['cs2', 'ZywOo', 'Mathieu Herbaut', '法国', 'Team Vitality', 'AWPer'],
  ['cs2', 'donk', 'Danil Kryshkovets', '俄罗斯', 'Team Spirit', 'Rifler'],
  ['cs2', 'NiKo', 'Nikola Kovac', '波黑', 'G2 Esports', 'Rifler'],
  ['cs2', 'm0NESY', 'Ilya Osipov', '俄罗斯', 'G2 Esports', 'AWPer'],
  ['cs2', 'device', 'Nicolai Reedtz', '丹麦', 'Astralis', 'AWPer'],
  ['cs2', 'ropz', 'Robin Kool', '爱沙尼亚', 'FaZe Clan', 'Rifler'],
  ['cs2', 'Twistzz', 'Russel Van Dulken', '加拿大', 'FaZe Clan', 'Rifler'],
];

const POSTERS = [
  ['apex', 'ALGS 世界锦标赛', 'ALGS Championship', '2025', 'https://liquipedia.net/apexlegends/ALGS_Championship/2025', 'OFFICIAL EVENT', '#da2929'],
  ['apex', 'ALGS 季前赛', 'ALGS Split 2 Playoffs', '2025', 'https://liquipedia.net/apexlegends/ALGS/Split_2/2025', 'PLAYOFFS', '#e85d3d'],
  ['apex', 'ALGS 第四年决赛', 'ALGS Year 4 Championship', '2024', 'https://liquipedia.net/apexlegends/ALGS_Championship/2024', 'GRAND FINAL', '#b51f1f'],
  ['ow', '守望先锋冠军系列赛', 'Overwatch Champions Series', '2025', 'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2025', 'OWCS', '#f99e1a'],
  ['ow', 'OWCS Major', 'OWCS Major', '2025', 'https://liquipedia.net/overwatch/Overwatch_Champions_Series/2025/Major', 'MAJOR', '#ffb84d'],
  ['ow', '守望先锋联赛总决赛', 'Overwatch League Grand Finals', '2023', 'https://liquipedia.net/overwatch/Overwatch_League/2023/Grand_Finals', 'GRAND FINALS', '#d97a00'],
  ['valorant', 'VCT 全球冠军赛', 'VCT Champions', '2025', 'https://liquipedia.net/valorant/VCT/2025/Champions', 'CHAMPIONS', '#ff4655'],
  ['valorant', 'VCT 多伦多大师赛', 'VCT Masters Toronto', '2025', 'https://liquipedia.net/valorant/VCT/2025/Masters/Toronto', 'MASTERS', '#ff6b78'],
  ['valorant', 'VCT 马德里大师赛', 'VCT Masters Madrid', '2024', 'https://liquipedia.net/valorant/VCT/2024/Masters/Madrid', 'MASTERS', '#c4303d'],
  ['valorant', 'VCT 太平洋联赛', 'VCT Pacific', '2025', 'https://liquipedia.net/valorant/VCT/2025/Pacific', 'LEAGUE', '#e03a4a'],
  ['cs2', 'PGL 哥本哈根 Major', 'PGL Major Copenhagen', '2024', 'https://liquipedia.net/counterstrike/PGL/2024/Copenhagen', 'MAJOR', '#d99b34'],
  ['cs2', 'BLAST Premier 世界总决赛', 'BLAST Premier World Final', '2024', 'https://liquipedia.net/counterstrike/BLAST/Premier/2024/World_Final', 'WORLD FINAL', '#f0b429'],
  ['cs2', 'IEM 卡托维兹', 'IEM Katowice', '2025', 'https://liquipedia.net/counterstrike/IEM/Katowice/2025', 'IEM', '#c98b1f'],
  ['cs2', 'ESL Pro League', 'ESL Pro League Season 21', '2025', 'https://liquipedia.net/counterstrike/ESL/Pro_League/Season_21', 'ESL', '#b87a12'],
  ['cs2', 'PGL 布达佩斯 Major', 'PGL Major Budapest', '2025', 'https://liquipedia.net/counterstrike/PGL/2025/Budapest', 'MAJOR', '#e0a83c'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWikitext(wiki, page) {
  const url = `${API}/${wiki}/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip', Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.parse?.wikitext || '';
}

function field(wikitext, name) {
  const m = wikitext.match(new RegExp(`\\|${name}=([^\\n]*)`));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

async function main() {
  const players = [];
  for (let i = 0; i < SEEDS.length; i++) {
    const [game, id, fallbackName, fallbackCountry, fallbackTeam, fallbackRole] = SEEDS[i];
    const meta = GAMES[game];
    let realName = fallbackName;
    let country = fallbackCountry;
    let team = fallbackTeam;
    let role = fallbackRole;
    let source = `${API}/${meta.wiki}/${encodeURIComponent(id)}`;
    try {
      const wt = await fetchWikitext(meta.wiki, id);
      if (wt) {
        realName = field(wt, 'name') || realName;
        country = field(wt, 'country') || country;
        team = field(wt, 'team') || team;
        role = field(wt, 'roles') || role;
        console.log(`[ok] ${game}/${id} -> ${realName} / ${country}`);
      }
    } catch (err) {
      console.warn(`[fallback] ${game}/${id}: ${err.message}`);
    }
    players.push({
      id,
      game,
      name: realName,
      country,
      team,
      role,
      title: game,
      url: source,
    });
    await sleep(DELAY);
  }

  const posters = POSTERS.map(([game, name, en, year, url, tag, color]) => ({ game, title: game, name, en, year, url, tag, color }));
  const titles = Object.entries(GAMES).map(([key, g]) => ({ key, name: g.name, short: g.short, color: g.color }));
  const payload = {
    updated: new Date().toISOString().slice(0, 10),
    source: 'Liquipedia (liquipedia.net) — 公开 Infobox 字段，按 1.2s 间隔抓取',
    titles,
    players,
    posters,
  };
  const out = path.join(ROOT, 'data', 'esports-liquipedia.json');
  fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
  console.log(`wrote ${players.length} players / ${posters.length} posters -> ${out}`);
}

main().catch((err) => { console.error(err); process.exit(1); });