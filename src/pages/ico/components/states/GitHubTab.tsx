import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Code, ExternalLink, Loader2 } from 'lucide-react';
import { GitHubRepoCard, type GitHubRepo } from '../shared/GitHubRepoCard';

const GITHUB_USERNAME = 'casper-ecosystem';
const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`;
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=30`;

interface GitHubTabProps {
  className?: string;
}

export function GitHubTab({ className }: GitHubTabProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(GITHUB_API_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        return res.json();
      })
      .then((data: GitHubRepo[]) => {
        setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-t-md bg-[hsl(var(--ico-bg-card))] border border-b-0 border-[hsl(var(--ico-border-color))]">
        <div className="flex items-center gap-2 text-[hsl(var(--ico-text-primary))]">
          <Code className="w-5 h-5" />
          <span className="font-semibold">GitHub Repositories</span>
          {!loading && !error && (
            <span className="text-xs text-[hsl(var(--ico-text-muted))]">({repos.length})</span>
          )}
        </div>
        <a
          href={GITHUB_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-[hsl(var(--ico-form-button))] hover:bg-[hsl(var(--ico-form-button-hover))] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className='hidden md:block'>Open in GitHub</span>
        </a>
      </div>

      {/* Content */}
      <div className="rounded-b-md bg-[hsl(var(--ico-bg-card))] border border-[hsl(var(--ico-border-color))]">
        {loading && (
          <div className="flex items-center justify-center py-20 text-[hsl(var(--ico-text-secondary))]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading repositories...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--ico-text-secondary))]">
            <p className="mb-2">Failed to load repositories</p>
            <p className="text-sm text-[hsl(var(--ico-text-muted))]">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 ">
            {repos.map((repo) => (
              <GitHubRepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GitHubTab;
