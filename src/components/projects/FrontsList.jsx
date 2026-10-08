import React, { useMemo } from 'react';
import { buildFrontsViewModel } from '@/lib/projects';
import FrontRow from './FrontRow';

export default function FrontsList({
  projects = [],
  guidance = null,
  onOpenProject,
}) {
  const { groups } = useMemo(
    () => buildFrontsViewModel(projects, guidance),
    [projects, guidance]
  );

  if (!groups.length) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4 px-0.5">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">Suas frentes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground/65">
            Toque para ver contexto, avanços e próximo passo.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {groups.map((group) => {
          const totalCount = group.fronts.reduce(
            (acc, root) => acc + 1 + (root.subfronts?.length || 0),
            0
          );

          return (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/75">
                  {group.title}
                </h3>
                <span className="text-[10px] text-muted-foreground/45 tabular-nums">
                  {totalCount} {totalCount === 1 ? 'frente' : 'frentes'}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.fronts.map((root) => (
                  <React.Fragment key={root.id || root.slug}>
                    <FrontRow
                      project={root}
                      onOpen={onOpenProject}
                      isSubfront={false}
                      recommendedRank={root.recommendedRank}
                    />
                    {root.subfronts?.map((sub) => (
                      <FrontRow
                        key={sub.id || sub.slug}
                        project={sub}
                        onOpen={onOpenProject}
                        isSubfront={true}
                        parentName={root.name}
                        recommendedRank={sub.recommendedRank}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
