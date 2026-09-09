import { IconCheck } from '@tabler/icons-react';

import { useLang } from '@/app/providers/useLang';
import { getJourneySteps, projectStatusStepKeys, journeyStepKeys } from '../utils';
import type { ProjectStatus } from '../types';

import './CustomerWorkspace.css';

export function CustomerTimeline({ status }: { status: ProjectStatus }) {
  const { lang } = useLang();
  const steps = getJourneySteps(lang);
  const currentKey = projectStatusStepKeys[status];
  const currentIndex = journeyStepKeys.indexOf(currentKey);

  return (
    <ol className="customer-workspace-timeline">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : '';

        return (
          <li className={state} key={journeyStepKeys[index]}>
            <span>{state === 'is-complete' ? <IconCheck size={15} stroke={2.4} /> : index + 1}</span>
            <p>{step}</p>
          </li>
        );
      })}
    </ol>
  );
}
