const PRIVATE_IP = /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 构建期脱敏：站点只发布脱敏后的文本，原始笔记保持不动。
 * 规则按顺序执行，因此长词（公司全称）必须排在短词之前。
 */
export function createRedactor(config = {}) {
  const rules = (Array.isArray(config.rules) ? config.rules : [])
    .filter((r) => Array.isArray(r) && r[0])
    .map(([from, to]) => [new RegExp(escapeRegExp(String(from)), 'g'), String(to ?? '')]);

  return function redact(input) {
    if (input == null) return '';
    let out = String(input);
    for (const [re, to] of rules) out = out.replace(re, to);
    return out.replace(PRIVATE_IP, '<内网IP>');
  };
}

export function isPrivateNote(note, config = {}) {
  const folders = config.excludeFolders || [];
  if (!note.folder) return false;
  const top = note.folder.split('/')[0];
  return folders.includes(note.folder) || folders.includes(top);
}
