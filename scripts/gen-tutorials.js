/**
 * 生成学习教程占位数据：20 个技术方向 × 6 个阶段 = 120 条，按 12 条/页分为 10 页。
 * 运行：node scripts/gen-tutorials.js
 * 内容用于首页与 /tutorials/ 分页的布局演示，后续可替换为真实教程。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const CATEGORIES = [
  { key: 'html', name: 'HTML', color: '#e8792f', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTML' },
  { key: 'css', name: 'CSS', color: '#2f6fe8', url: 'https://developer.mozilla.org/zh-CN/docs/Web/CSS' },
  { key: 'js', name: 'JavaScript', color: '#e8c22f', url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript' },
  { key: 'ts', name: 'TypeScript', color: '#3178c6', url: 'https://www.typescriptlang.org/zh/docs/' },
  { key: 'react', name: 'React', color: '#61dafb', url: 'https://zh-hans.react.dev/learn' },
  { key: 'vue', name: 'Vue', color: '#42b883', url: 'https://cn.vuejs.org/guide/' },
  { key: 'node', name: 'Node.js', color: '#539e43', url: 'https://nodejs.org/zh-cn/learn' },
  { key: 'git', name: 'Git', color: '#f05033', url: 'https://git-scm.com/book/zh/v2' },
  { key: 'docker', name: 'Docker', color: '#2496ed', url: 'https://docs.docker.com/get-started/' },
  { key: 'linux', name: 'Linux', color: '#f0b429', url: 'https://linuxcommand.org/' },
  { key: 'mysql', name: 'MySQL', color: '#00758f', url: 'https://dev.mysql.com/doc/' },
  { key: 'redis', name: 'Redis', color: '#d82c20', url: 'https://redis.io/docs/latest/' },
  { key: 'http', name: 'HTTP', color: '#7fd4ff', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP' },
  { key: 'algo', name: '算法', color: '#8e6cf0', url: 'https://oi-wiki.org/' },
  { key: 'perf', name: '性能优化', color: '#f25c8a', url: 'https://web.dev/learn/performance' },
  { key: 'security', name: 'Web 安全', color: '#e05252', url: 'https://developer.mozilla.org/zh-CN/docs/Web/Security' },
  { key: 'test', name: '测试', color: '#4caf50', url: 'https://vitest.dev/guide/' },
  { key: 'build', name: '工程化', color: '#c8a45c', url: 'https://esbuild.github.io/' },
  { key: 'deploy', name: '部署', color: '#00a8a8', url: 'https://docs.github.com/zh/actions' },
  { key: 'arch', name: '架构', color: '#a86ee0', url: 'https://martinfowler.com/architecture/' },
];

const STAGES = [
  { level: '入门', minutes: 25, tail: '核心概念与最小可运行示例' },
  { level: '入门', minutes: 35, tail: '常用语法速查与练习路径' },
  { level: '进阶', minutes: 45, tail: '关键机制与常见坑位拆解' },
  { level: '进阶', minutes: 55, tail: '真实项目中的组合用法' },
  { level: '实战', minutes: 70, tail: '从需求到落地的完整案例' },
  { level: '排错', minutes: 40, tail: '调试思路、性能与排查清单' },
];

const items = [];
for (const cat of CATEGORIES) {
  STAGES.forEach((stage, i) => {
    items.push({
      id: `${cat.key}-${String(i + 1).padStart(2, '0')}`,
      category: cat.name,
      color: cat.color,
      title: `${cat.name} · ${stage.tail}`,
      summary: `围绕 ${cat.name} 的${stage.tail}，用一页篇幅整理概念、示例与自测问题，适合按顺序过一遍。`,
      level: stage.level,
      minutes: stage.minutes,
      url: cat.url,
    });
  });
}

const data = {
  updated: '2026-11-28',
  note: '学习教程占位内容：20 个方向 × 6 个阶段，共 120 条，按每页 12 条分为 10 页。',
  pageSize: 12,
  items,
};

const out = path.join(ROOT, 'data', 'tutorials.json');
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`generated ${items.length} tutorials -> ${out}`);