import { createRoot } from 'react-dom/client';
import MenuSelector from './menu.jsx';
import WorksShowcase from './works.jsx';
import KnowledgeExplorer from './knowledge.jsx';

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
  createRoot(el).render(<Component {...data} />);
}

mount('p3r-menu-root', MenuSelector);
mount('p3r-works-root', WorksShowcase);
mount('kb-root', KnowledgeExplorer);
