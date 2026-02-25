import { Code, Star, GitFork } from 'lucide-react';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Go: '#00ADD8',
  Java: '#b07219',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Solidity: '#AA6746',
  Shell: '#89e051',
};

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
}

interface GitHubRepoCardProps {
  repo: GitHubRepo;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function GitHubRepoCard({ repo }: GitHubRepoCardProps) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex! flex-col items-start! gap-2 p-4 rounded-lg border border-[hsl(var(--ico-border-color))] bg-[hsl(var(--ico-bg-secondary))]/50 hover:border-[hsl(var(--ico-brand-primary))]/50 hover:bg-[hsl(var(--ico-bg-secondary))] transition-all"
    >
      <div className="flex items-center gap-2">
        <Code className="w-4 h-4 text-[hsl(var(--ico-brand-primary))] shrink-0" />
        <span className="font-medium text-[hsl(var(--ico-text-primary))] group-hover:text-[hsl(var(--ico-brand-primary))] transition-colors truncate">
          {repo.name}
        </span>
      </div>

      {repo.description && (
        <p className="text-sm text-[hsl(var(--ico-text-secondary))] line-clamp-2">
          {repo.description}
        </p>
      )}

      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--ico-brand-primary))]/10 text-[hsl(var(--ico-brand-primary))]"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-auto pt-2 text-xs text-[hsl(var(--ico-text-muted))]">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: LANGUAGE_COLORS[repo.language] ?? '#8b8b8b' }}
            />
            {repo.language}
          </span>
        )}
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {repo.stargazers_count}
          </span>
        )}
        {repo.forks_count > 0 && (
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {repo.forks_count}
          </span>
        )}
        <span className="ml-auto">Updated {formatDate(repo.updated_at)}</span>
      </div>
    </a>
  );
}

export default GitHubRepoCard;
