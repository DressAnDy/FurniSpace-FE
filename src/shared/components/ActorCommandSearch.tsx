import { type FormEvent, useMemo, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

type Actor = 'admin' | 'designer' | 'sale';

type CommandItem = {
  label: string;
  path: string;
  keywords: string;
  group: string;
};

const commandsByActor: Record<Actor, CommandItem[]> = {
  admin: [
    { label: 'Admin Dashboard', path: '/admin/dashbroad', group: 'Overview', keywords: 'dashboard overview admin home' },
    { label: 'User & Role Management', path: '/admin/users', group: 'Users', keywords: 'users roles accounts staff manage user role' },
    { label: 'Product Categories', path: '/admin/categories', group: 'Catalog', keywords: 'category categories product groups add category create category new category' },
    { label: 'Products', path: '/admin/products', group: 'Catalog', keywords: 'products catalog inventory manage product' },
    { label: 'Create Product', path: '/admin/products/create', group: 'Catalog', keywords: 'create product add product new product' },
    { label: '3D Model & File Library', path: '/admin/catalog/models', group: '3D', keywords: '3d model file library assets workspace catalog model workspace open workspace' },
    { label: '3D Lab', path: '/admin/3d-lab', group: '3D', keywords: '3d lab room planner editor test' },
  ],
  designer: [
    { label: 'Designer Dashboard', path: '/designer/dashbroad', group: 'Overview', keywords: 'dashboard designer home overview' },
    { label: 'Assigned Projects', path: '/designer/assigned-projects', group: 'Projects', keywords: 'assigned projects project list customer' },
    { label: 'Product Library', path: '/designer/product-library', group: 'Catalog', keywords: 'product library furniture catalog models' },
    { label: 'My Schedule', path: '/designer/schedules', group: 'Schedule', keywords: 'schedule calendar appointments my schedule' },
  ],
  sale: [
    { label: 'Sales Dashboard', path: '/sales/dashbroad', group: 'Overview', keywords: 'dashboard sales sale home overview' },
    { label: 'Project Request Queue', path: '/sales/project-requests', group: 'Projects', keywords: 'project request queue requests new leads' },
    { label: 'Assigned Projects', path: '/sales/assigned-projects', group: 'Projects', keywords: 'assigned projects project customers' },
    { label: 'Schedules', path: '/sales/schedules', group: 'Schedule', keywords: 'schedule calendar appointment schedules' },
    { label: 'Quotations', path: '/sales/quotations', group: 'Sales', keywords: 'quotations quotes quotation pricing proposal' },
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

  const matchingCommand = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    return commandsByActor[actor].find((command) =>
      `${command.label} ${command.group} ${command.keywords}`.toLowerCase().includes(normalizedQuery),
    ) ?? null;
  }, [actor, query]);

  function goToCommand(command: CommandItem) {
    setQuery('');
    navigate(command.path);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (matchingCommand) goToCommand(matchingCommand);
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
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
