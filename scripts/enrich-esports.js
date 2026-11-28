/**
 * 电竞内容补充：把 Apex / Overwatch 的项目、战队合并进 data/esports.json。
 * 只追加不覆盖，按 key/name 去重；可重复运行。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'data', 'esports.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const titles = [
  { key: 'apex', name: 'Apex 英雄', short: 'APEX', color: '#da2929' },
  { key: 'ow', name: '守望先锋 2', short: 'OW2', color: '#f99e1a' },
];

const teams = [
  { name: 'TSM', title: 'apex', region: '北美', short: 'TSM', color: '#e02b2b', desc: '北美老牌俱乐部，Apex 分部长期活跃于 ALGS 顶级赛事。' },
  { name: 'DarkZero', title: 'apex', region: '亚太', short: 'DZ', color: '#7a5cff', desc: '亚太赛区的强势队伍，以稳定的三人协同著称。' },
  { name: 'NRG', title: 'apex', region: '北美', short: 'NRG', color: '#00b36b', desc: '跨项目综合俱乐部，Apex 分部常年出现在世界赛舞台。' },
  { name: 'Alliance', title: 'apex', region: '欧洲', short: 'ALL', color: '#f5c400', desc: '欧洲老牌俱乐部，Apex 与多项目并行运营。' },
  { name: 'Atlanta Reign', title: 'ow', region: '北美', short: 'ATL', color: '#c8102e', desc: 'OWCS 北美赛区代表队伍之一，输出位实力突出。' },
  { name: 'Shanghai Dragons', title: 'ow', region: '中国', short: 'SHD', color: '#d71920', desc: '守望先锋联赛历史上最具辨识度的中国队伍之一。' },
  { name: 'Dallas Fuel', title: 'ow', region: '北美', short: 'DAL', color: '#0a2e5c', desc: 'OWL 创始队伍，2022 赛季总冠军。' },
  { name: 'Hangzhou Spark', title: 'ow', region: '中国', short: 'HZS', color: '#00a3e0', desc: '以粉色视觉与年轻阵容被记住的中国队伍。' },
  { name: 'Sentinels', title: 'valorant', region: '北美', short: 'SEN', color: '#d3222a', desc: 'VALORANT 早期最具影响力的北美俱乐部之一。' },
  { name: 'EDward Gaming', title: 'valorant', region: '中国', short: 'EDG', color: '#0b1e3a', desc: 'CN 赛区代表队伍，2024 年全球冠军赛夺冠。' },
  { name: 'Paper Rex', title: 'valorant', region: '东南亚', short: 'PRX', color: '#f15a29', desc: '以激进打法闻名的东南亚队伍，风格极具观赏性。' },
  { name: 'LOUD', title: 'valorant', region: '巴西', short: 'LOUD', color: '#00a650', desc: '巴西电竞豪门，2022 年 VALORANT 全球冠军。' },
  { name: 'Team Vitality', title: 'cs2', region: '欧洲', short: 'VIT', color: '#ffe500', desc: 'CS2 顶级强队，ZywOo 领衔的法国核心。' },
  { name: 'FaZe Clan', title: 'cs2', region: '国际', short: 'FAZE', color: '#e4002b', desc: '国际纵队代表，Major 冠军与长期争冠者。' },
  { name: 'MOUZ', title: 'cs2', region: '欧洲', short: 'MOUZ', color: '#e30613', desc: '以青训与年轻阵容著称的欧洲俱乐部。' },
  { name: 'Astralis', title: 'cs2', region: '丹麦', short: 'AST', color: '#e4002b', desc: 'CS 历史上最成功的俱乐部之一，四届 Major 冠军。' },
];

for (const t of titles) {
  if (!data.titles.some((x) => x.key === t.key)) data.titles.push(t);
}
for (const t of teams) {
  if (!data.teams.some((x) => x.name === t.name && x.title === t.title)) data.teams.push(t);
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`titles=${data.titles.length} teams=${data.teams.length}`);