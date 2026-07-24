import { IconCheck } from '@tabler/icons-react';

type ProjectTimelineProps = {
  currentStep: string;
  steps: string[];
  dates?: Partial<Record<string, string>>;
};

export function ProjectTimeline({ currentStep, steps, dates = {} }: ProjectTimelineProps) {
  const currentIndex = Math.max(0, steps.indexOf(currentStep));

  return (
    <section className="project-timeline-card rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="project-timeline-header mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-950">Project Timeline</h3>
      </div>

      <div className="project-timeline-track">
        {steps.map((step, index) => {
          const isDone = index <= currentIndex;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className={`project-timeline-step${isDone ? ' project-timeline-step-done' : ''}${isCurrent ? ' project-timeline-step-current' : ''}`}>
              {index < steps.length - 1 && <span className={`project-timeline-line${isDone && index < currentIndex ? ' project-timeline-line-done' : ''}`} />}
              <span className="project-timeline-dot">{isDone ? <IconCheck size={18} /> : <span />}</span>
              <div className="project-timeline-copy">
                <p>{step.toUpperCase()}</p>
                {dates[step] && <span>{dates[step]}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
