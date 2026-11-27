import { render } from 'preact';
import KnowledgeExplorer from './knowledge.jsx';
import GameLibrary from './games.jsx';
import EsportsBoard from './esports.jsx';

/** 读取同一容器旁的 JSON 数据并挂载一个岛屿；找不到容器就安静退出。 */
function mount(id, Component) {
  const el = document.getElementById(id);
  if (!el) return;
  const dataEl = document.getElementById(`${id}-data`);
  let data = {};
  try {
    data = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  render(<Component {...data} />, el);
}

mount('kb-root', KnowledgeExplorer);
mount('game-root', GameLibrary);
mount('esports-root', EsportsBoard);
