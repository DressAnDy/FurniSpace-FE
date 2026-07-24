import { type FormEvent, useMemo, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

type Actor = 'admin' | 'designer' | 'production' | 'sale';

type CommandItem = {
  label: string;
  path: string;
  keywords: string;
  group: string;
  description: string;
};

const commandsByActor: Record<Actor, CommandItem[]> = {
  admin: [
    { label: 'Admin Dashboard', path: '/admin/dashbroad', group: 'Overview', keywords: 'dashboard overview admin home', description: 'View admin metrics, summaries, and recent operation status.' },
    { label: 'User & Role Management', path: '/admin/users', group: 'Users', keywords: 'users roles accounts staff manage user role', description: 'Manage accounts, roles, account details, and user status.' },
    { label: 'Product Categories', path: '/admin/categories', group: 'Catalog', keywords: 'category categories product groups add category create category new category', description: 'Create, edit, and organize product categories.' },
    { label: 'Products', path: '/admin/products', group: 'Catalog', keywords: 'products catalog inventory manage product', description: 'Search, edit, archive, and manage product catalog items.' },
    { label: 'Create Product', path: '/admin/products/create', group: 'Catalog', keywords: 'create product add product new product', description: 'Open the form to add a new catalog product.' },
    { label: '3D Model & File Library', path: '/admin/catalog/models', group: '3D', keywords: '3d model file library assets workspace catalog model workspace open workspace', description: 'Review product version assets and open 3D model workspaces.' },
    { label: '3D Lab', path: '/admin/3d-lab', group: '3D', keywords: '3d lab room planner editor test', description: 'Open the 3D room planner lab and model testing workspace.' },
  ],
  designer: [
    { label: 'Designer Dashboard', path: '/designer/dashbroad', group: 'Overview', keywords: 'dashboard designer home overview', description: 'View designer work summary and active project overview.' },
    { label: 'Assigned Projects', path: '/designer/assigned-projects', group: 'Projects', keywords: 'assigned projects project list customer', description: 'Open the list of projects assigned to the designer.' },
    { label: 'Product Library', path: '/designer/product-library', group: 'Catalog', keywords: 'product library furniture catalog models', description: 'Browse products, materials, and furniture library items.' },
    { label: 'My Schedule', path: '/designer/schedules', group: 'Schedule', keywords: 'schedule calendar appointments my schedule', description: 'Review appointments and design schedule.' },
  ],
  production: [
    { label: 'Production Dashboard', path: '/production/dashbroad', group: 'Overview', keywords: 'dashboard production home overview feasibility', description: 'View production feasibility workload and review summary.' },
    { label: 'Customization Requests', path: '/production/customization-requests', group: 'Review', keywords: 'customization requests production review feasible material cost days', description: 'Review customer customization requests for feasibility, material, cost, and production days.' },
  ],
  sale: [
    { label: 'Sales Dashboard', path: '/sales/dashbroad', group: 'Overview', keywords: 'dashboard sales sale home overview', description: 'View sale metrics, activity, and project summary.' },
    { label: 'Project Request Queue', path: '/sales/project-requests', group: 'Projects', keywords: 'project request queue requests new leads', description: 'Review incoming project requests and customer leads.' },
    { label: 'Assigned Projects', path: '/sales/assigned-projects', group: 'Projects', keywords: 'assigned projects project customers', description: 'Open projects assigned to the sales consultant.' },
    { label: 'Schedules', path: '/sales/schedules', group: 'Schedule', keywords: 'schedule calendar appointment schedules', description: 'Manage consultations, meetings, and sale schedules.' },
    { label: 'Quotations', path: '/sales/quotations', group: 'Sales', keywords: 'quotations quotes quotation pricing proposal', description: 'Open quotation and pricing workflows.' },
  ],
};

type ActorCommandSearchProps = {
  actor: Actor;
  className: string;
  placeholder: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function ActorCommandSearch({ actor, className, placeholder }: ActorCommandSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];

    return commandsByActor[actor]
      .filter((command) =>
        `${command.label} ${command.group} ${command.keywords} ${command.description}`.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 5);
  }, [actor, query]);

  function goToCommand(command: CommandItem) {
    setQuery('');
    setIsFocused(false);
    navigate(command.path);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (results[0]) goToCommand(results[0]);
  }

  return (
    <form className={`${className} actor-command-search`} onSubmit={handleSubmit}>
      <IconSearch size={18} />
      <input
        aria-label={`${actor} command search`}
        autoComplete="off"
        placeholder={placeholder}
        type="search"
        value={query}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsFocused(true)}
      />
      {isFocused && query.trim() && (
        <div className="actor-command-results" role="listbox">
          {results.length ? (
            results.map((command) => (
              <button key={command.path} type="button" onMouseDown={() => goToCommand(command)}>
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.group}</small>
                </span>
                <p>{command.description}</p>
              </button>
            ))
          ) : (
            <p className="actor-command-empty">No matching feature</p>
          )}
        </div>
      )}
    </form>
  );
}
