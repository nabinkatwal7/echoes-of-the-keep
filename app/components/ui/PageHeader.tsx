import { Ornament } from "./Ornament";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/60 bg-black/30 text-3xl text-gold shadow-[0_0_20px_rgba(201,162,75,0.2)]">
              {icon}
            </div>
          )}
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h1 className="gilded text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <Ornament />
    </header>
  );
}
