import { IconCheck } from '@tabler/icons-react';

import { journeySteps, projectStatusStepMap } from '../utils';
import type { ProjectStatus } from '../types';

import './CustomerWorkspace.css';

export function CustomerTimeline({ status }: { status: ProjectStatus }) {
  const currentStep = projectStatusStepMap[status];
  const currentIndex = journeySteps.indexOf(currentStep);

  return (
    <ol className="customer-workspace-timeline">
      {journeySteps.map((step, index) => {
        const state = index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : '';

        return (
          <li className={state} key={step}>
            <span>{state === 'is-complete' ? <IconCheck size={15} stroke={2.4} /> : index + 1}</span>
            <p>{step}</p>
          </li>
        );
      })}
    </ol>
  );
}
