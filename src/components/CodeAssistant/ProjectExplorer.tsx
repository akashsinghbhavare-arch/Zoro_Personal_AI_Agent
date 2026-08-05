import { useState, useEffect } from 'react';
import { FolderOpen, FileText, ChevronRight, ChevronDown, RefreshCw, Search } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface ProjectExplorerProps {
  onFileSelect?: (path: string, content: string) => void;
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'release', '.vite', 'coverage']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md', '.py', '.sql', '.sh', '.env.example', '.yaml', '.yml']);

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx) : '';
}

function isCodeFile(name: string): boolean {
  // Never show .env for security
  if (name === '.env') return false;
  return CODE_EXTENSIONS.has(getExtension(name)) || getExtension(name) === '';
}

function FileNodeItem({ node, depth, onFileSelect }: { node: FileNode; depth: number; onFileSelect?: (p: string, c: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 1);

  const handleClick = async () => {
    if (node.type === 'directory') {
      setExpanded(e => !e);
    } else if (onFileSelect && (window as any).electronAPI?.readFileContent) {
      try {
        const content = await (window as any).electronAPI.readFileContent(node.path);
        onFileSelect(node.path, content || '');
      } catch {
        onFileSelect(node.path, '');
      }
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/50 text-left transition-colors group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === 'directory' ? (
          <>
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 shrink-0 transition-colors" />
          </>
        )}
        <span className={`text-xs truncate ${node.type === 'directory' ? 'text-slate-300 font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>
          {node.name}
        </span>
      </button>
      {node.type === 'directory' && expanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileNodeItem key={child.path} node={child} depth={depth + 1} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// Build file tree from flat list
function buildTree(paths: string[], basePath: string): FileNode[] {
  const root: FileNode[] = [];
  const map = new Map<string, FileNode>();

  paths.sort().forEach(fullPath => {
    const relative = fullPath.replace(basePath, '').replace(/^[/\\]/, '');
    const parts = relative.split(/[/\\]/);

    // Skip ignored dirs and hidden files
    if (parts.some(p => IGNORED_DIRS.has(p) || (p.startsWith('.') && p !== '.env.example'))) return;

    const name = parts[parts.length - 1];

    // Only show code files at the leaf level
    if (parts.length === 1 && !isCodeFile(name) && getExtension(name)) return;

    let current = root;
    let currentPath = basePath;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = `${currentPath}/${part}`;
      const existing = map.get(currentPath);

      if (existing) {
        current = existing.children || [];
      } else {
        const isLast = i === parts.length - 1;
        const node: FileNode = {
          name: part,
          path: fullPath.replace(/[/\\][^/\\]+$/, '').split(/[/\\]/).slice(0, i + 1).join('/') + (isLast ? '' : ''),
          type: isLast ? 'file' : 'directory',
          children: isLast ? undefined : [],
        };
        // Fix path for files
        if (isLast) node.path = fullPath;
        else node.path = currentPath;

        map.set(currentPath, node);
        current.push(node);
        current = node.children || [];
      }
    }
  });

  return root;
}

export const ProjectExplorer = ({ onFileSelect }: ProjectExplorerProps) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTree = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.listProjectFiles) {
        const files: string[] = await (window as any).electronAPI.listProjectFiles();
        const basePath = files[0]?.split(/[/\\]/).slice(0, -1).join('/') || '';
        setTree(buildTree(files, basePath));
      } else {
        // Fallback: static demo tree
        setTree([
          { name: 'src', path: 'src', type: 'directory', children: [
            { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
            { name: 'components', path: 'src/components', type: 'directory', children: [] },
            { name: 'utils', path: 'src/utils', type: 'directory', children: [] },
          ]},
          { name: 'server', path: 'server', type: 'directory', children: [
            { name: 'index.js', path: 'server/index.js', type: 'file' },
            { name: 'routes', path: 'server/routes', type: 'directory', children: [] },
          ]},
          { name: 'package.json', path: 'package.json', type: 'file' },
        ]);
      }
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTree(); }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900/60">
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Explorer</span>
        <button onClick={loadTree} className="text-slate-500 hover:text-slate-200 p-1 rounded transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="px-2 pt-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-2.5 py-1.5">
          <Search className="w-3 h-3 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-full"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1 px-1 mt-1">
        {tree.length === 0 && !loading && (
          <p className="text-xs text-slate-600 text-center pt-4">No project files found.</p>
        )}
        {tree.map(node => (
          <FileNodeItem key={node.path} node={node} depth={0} onFileSelect={onFileSelect} />
        ))}
      </div>
    </div>
  );
};
