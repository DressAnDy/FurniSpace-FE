import { type FormEvent, useMemo, useState } from 'react';
import { IconArrowLeft, IconStar, IconStarFilled } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';

import { mockCustomerProjectReviews, mockCustomerTrackingProjects } from '@/features/CustomerPages/mock';
import { CustomerEmptyState, CustomerNavbar, CustomerStatusBadge } from '@/features/CustomerPages/customercomponents';
import { formatCustomerDate, getProjectStatusLabel } from '@/features/CustomerPages/utils';

import './ProjectFeedback.css';

type ReviewForm = {
  comment: string;
  deliveryRating: number;
  designQualityRating: number;
  rating: number;
  serviceQualityRating: number;
};

const initialForm: ReviewForm = {
  comment: '',
  deliveryRating: 0,
  designQualityRating: 0,
  rating: 0,
  serviceQualityRating: 0,
};

export function ProjectFeedback() {
  const { projectId } = useParams();
  const project = useMemo(
    () => mockCustomerTrackingProjects.find((item) => item.projectId === projectId) ?? mockCustomerTrackingProjects.find((item) => item.status === 'COMPLETED'),
    [projectId],
  );
  const existingReview = mockCustomerProjectReviews.find((review) => review.projectId === project?.projectId) ?? null;
  const [form, setForm] = useState<ReviewForm>(initialForm);
  const [submittedReview, setSubmittedReview] = useState(existingReview);
  const isCompleted = project?.status === 'COMPLETED';
  const isValid = form.rating > 0 && form.designQualityRating > 0 && form.serviceQualityRating > 0 && form.deliveryRating > 0 && isCompleted;

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!project || !isValid) return;

    setSubmittedReview({
      reviewId: 'REV-MOCK-NEW',
      projectId: project.projectId,
      orderId: 'ORD-MOCK',
      customerId: 'CUS-MOCK',
      rating: form.rating,
      designQualityRating: form.designQualityRating,
      serviceQualityRating: form.serviceQualityRating,
      deliveryRating: form.deliveryRating,
      comment: form.comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <main className="customer-workspace-page customer-feedback-page">
      <CustomerNavbar activeLabel="Tracking" classPrefix="customer-feedback" />
      <div className="customer-workspace-main">
        <section className="customer-workspace-heading">
          <div>
            <p className="customer-workspace-eyebrow">Customer Workspace</p>
            <h1>Project Feedback</h1>
            <p>Share your experience with the FurniSpace team after project completion.</p>
          </div>
          <Link className="customer-workspace-link customer-workspace-button-secondary" to="/customer/tracking">
            <IconArrowLeft size={16} />
            Back to Tracking
          </Link>
        </section>

        {project ? (
          <section className="customer-workspace-grid">
            <article className="customer-workspace-card">
              <header>
                <div>
                  <h2>Completed Project Summary</h2>
                  <p>Feedback is only available after project and order completion.</p>
                </div>
              </header>
              <div className="customer-workspace-field-grid">
                <Field label="Project name" value={project.projectName} />
                <Field label="Project code" value={project.projectCode} />
                <Field label="Order code" value="ORD-2026-003" />
                <Field label="Business type" value={project.businessType} />
                <Field label="Completed at" value={formatCustomerDate(project.targetCompletionDate)} />
                <div className="customer-workspace-field">
                  <span>Final status</span>
                  <strong><CustomerStatusBadge label={getProjectStatusLabel(project.status)} status={project.status} /></strong>
                </div>
              </div>
            </article>

            <article className="customer-workspace-card">
              {submittedReview ? (
                <ExistingReviewCard review={submittedReview} />
              ) : isCompleted ? (
                <form className="customer-feedback-form" onSubmit={submitReview}>
                  <header>
                    <div>
                      <h2>Rating Form</h2>
                      <p>Overall rating and three sub-ratings are required.</p>
                    </div>
                  </header>
                  <RatingInput label="Overall rating" value={form.rating} onChange={(rating) => setForm((current) => ({ ...current, rating }))} />
                  <RatingInput label="Design quality rating" value={form.designQualityRating} onChange={(designQualityRating) => setForm((current) => ({ ...current, designQualityRating }))} />
                  <RatingInput label="Service quality rating" value={form.serviceQualityRating} onChange={(serviceQualityRating) => setForm((current) => ({ ...current, serviceQualityRating }))} />
                  <RatingInput label="Delivery rating" value={form.deliveryRating} onChange={(deliveryRating) => setForm((current) => ({ ...current, deliveryRating }))} />
                  <label>
                    <span>Comment</span>
                    <textarea rows={5} value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} />
                  </label>
                  <button className="customer-workspace-button" disabled={!isValid} type="submit">Submit Feedback</button>
                </form>
              ) : (
                <CustomerEmptyState message="Feedback form is available after the project status becomes Completed." />
              )}
            </article>
          </section>
        ) : (
          <CustomerEmptyState message="Completed project was not found." />
        )}
      </div>
    </main>
  );
}

function ExistingReviewCard({ review }: { review: NonNullable<typeof mockCustomerProjectReviews[number]> }) {
  return (
    <section className="customer-feedback-existing">
      <header>
        <div>
          <h2>Your review has been submitted.</h2>
          <p>Submitted {formatCustomerDate(review.createdAt)}</p>
        </div>
      </header>
      <div className="customer-workspace-field-grid">
        <Field label="Overall rating" value={`${review.rating} / 5`} />
        <Field label="Design quality" value={`${review.designQualityRating} / 5`} />
        <Field label="Service quality" value={`${review.serviceQualityRating} / 5`} />
        <Field label="Delivery" value={`${review.deliveryRating} / 5`} />
        <Field label="Comment" value={review.comment ?? '-'} />
      </div>
    </section>
  );
}

function RatingInput({ label, onChange, value }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="customer-feedback-rating">
      <span>{label}</span>
      <div>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button aria-label={`${label} ${rating}`} key={rating} type="button" onClick={() => onChange(rating)}>
            {rating <= value ? <IconStarFilled size={23} /> : <IconStar size={23} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
