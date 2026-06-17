import { IconPhone, IconShieldCheck } from '@tabler/icons-react';
import { SiteFooter } from '@/shared/components/SiteFooter';
import { useEffect, useState, type CSSProperties } from 'react';

import warmScandinavianImage from '@/assets/customer-dashboard/warm-scandinavian.png';
import productDetailHeroImage from '@/assets/product-detail/hero.png';
import galleryOneImage from '@/assets/product-detail/gallery-1.png';
import galleryThreeImage from '@/assets/product-detail/gallery-3.png';
import diningRoomImage from '@/assets/product-detail-shop/dining-room.png';
import roomDetailImage from '@/assets/product-detail-shop/room-detail.png';
import tableRoomImage from '@/assets/product-detail-shop/table-room.png';
import terraSalonImage from '@/assets/project-list/terra-salon.png';
import { MainNavbar } from '@/features/MainPages/maincomponents';

import './HomePage.css';

const filters = ['Loai hinh', 'Phong cach', 'Ngan sach', 'Dien tich'];

const featuredProjects = [
  {
    image: terraSalonImage,
    meta: 'Cafe & lounge',
    title: 'Bean & Brew flagship cafe concept',
  },
  {
    image: galleryOneImage,
    meta: 'Fashion retail',
    title: 'Chic Style boutique showroom',
  },
  {
    image: productDetailHeroImage,
    meta: 'Office',
    title: 'Tech studio collaborative workspace',
  },
  {
    image: roomDetailImage,
    meta: 'Showroom',
    title: 'Material gallery and client suite',
  },
  {
    image: diningRoomImage,
    meta: 'Restaurant',
    title: 'Warm dining room visualization',
  },
  {
    image: warmScandinavianImage,
    meta: 'Retail space',
    title: 'Scandinavian retail consultation area',
  },
];

const processSteps = [
  {
    number: '01',
    title: 'Discovery & brief',
    text: 'Clarify business goals, customer flow, site constraints, budget, and operational needs.',
  },
  {
    number: '02',
    title: 'Concept direction',
    text: 'Shape moodboards, layout options, material direction, and a clear commercial design narrative.',
  },
  {
    number: '03',
    title: '3D visualization',
    text: 'Build realistic 3D views so stakeholders can approve the space before production starts.',
  },
  {
    number: '04',
    title: 'Quotation & proposal',
    text: 'Prepare scopes, furniture lists, production options, and transparent pricing for approval.',
  },
  {
    number: '05',
    title: 'Production & install',
    text: 'Coordinate furniture production, site execution, quality control, and installation milestones.',
  },
  {
    number: '06',
    title: 'Handover & support',
    text: 'Complete inspection, handover documents, warranty guidance, and post-launch support.',
  },
];

const commitments = [
  {
    title: 'Business-first design',
    text: 'Every layout supports customer flow, brand experience, team operation, and measurable project goals.',
  },
  {
    title: '3D clarity before build',
    text: 'Realistic previews reduce uncertainty before quotation, production, and installation decisions.',
  },
  {
    title: 'Transparent scope',
    text: 'Design, furniture, material, and execution choices are documented before each major milestone.',
  },
  {
    title: 'End-to-end support',
    text: 'From concept to handover, FurniSpace keeps the project coordinated and accountable.',
  },
];

type RevealStyle = CSSProperties & {
  '--reveal-delay'?: string;
};

export function HomePage() {
  const [animationsReady, setAnimationsReady] = useState(false);

  useEffect(() => {
    setAnimationsReady(true);

    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.home-reveal, .home-signature-motion'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.16 },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className={['home-page', animationsReady ? 'home-animations-ready' : null].filter(Boolean).join(' ')}>
      <MainNavbar
        activePath="/"
        activeClassName="home-nav-link-active"
        brandLabel="FURNISPACE"
        brandMarkLabel="FS"
        brandNameClassName="home-brand-name"
        classPrefix="home"
        linkClassName="home-nav-link"
      />

      <section className="home-hero section-container home-signature-motion is-visible" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <div className="home-kicker hero-kicker home-hero-reveal home-hero-reveal-1">
            <span />
            <p>Interior design & 3D visualization</p>
          </div>

          <div className="home-hero-title-wrap">
            <h1 id="home-hero-title">
              <span className="home-title-line hero-title-line home-hero-reveal home-hero-reveal-2">Business</span>
              <span className="home-title-line hero-title-line home-hero-reveal home-hero-reveal-3">Interior Systems</span>
            </h1>
            <p className="home-hero-subtitle home-hero-reveal home-hero-reveal-1">from concept to handover</p>
          </div>

          <hr className="home-hero-rule hero-divider-line" />

          <div className="home-signature home-hero-reveal home-hero-reveal-4">
            <strong>FurniSpace</strong>
            <span>DESIGN</span>
          </div>

          <div className="home-actions home-hero-reveal home-hero-reveal-5">
            <button className="button button-dark" type="button">
              Start a project
            </button>
            <button className="button button-outline" type="button">
              Book consult
            </button>
          </div>

          <div className="home-phone home-hero-reveal home-hero-reveal-6">
            <IconPhone size={16} />
            <span>+84 770 111 101</span>
          </div>
        </div>

        <div className="home-hero-visual home-hero-visual-motion hero-visual-depth" aria-hidden="true">
          <img className="home-hero-image hero-visual-panel hero-visual-panel-main" src={roomDetailImage} alt="" />
          <img className="home-hero-inset hero-visual-panel hero-visual-panel-inset" src={tableRoomImage} alt="" />
          <div className="home-hero-preview-card hero-preview-card">
            <span>3D Proposal</span>
            <strong>Retail Concept 92%</strong>
          </div>
        </div>
      </section>

      <section className="home-intro home-signature-motion solution-section" aria-labelledby="home-intro-title">
        <div className="section-container home-intro-grid">
          <div className="home-intro-copy solution-copy">
            <p className="home-eyebrow">FurniSpace</p>
            <h2 id="home-intro-title">Spatial solutions for cafes, offices, showrooms, and retail brands</h2>
            <p>
              FurniSpace turns business requirements into spatial strategy, 3D visual direction, quotation-ready proposals, furniture planning,
              production coordination, installation, and handover support.
            </p>
            <button className="button button-gold" type="button">
              Explore solution
            </button>
          </div>

          <div className="home-gallery solution-visual" aria-hidden="true">
            <img className="home-gallery-back solution-visual-layer solution-visual-layer-back" src={diningRoomImage} alt="" />
            <img className="home-gallery-front solution-visual-layer solution-visual-layer-front" src={galleryThreeImage} alt="" />
            <div className="home-gallery-note solution-floating-card">
              <span>Material board</span>
              <strong>Warm wood / stone / linen</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section-container home-projects portfolio-section home-signature-motion" aria-labelledby="home-projects-title">
        <SectionHeading
          className="portfolio-heading"
          id="home-projects-title"
          title="Featured commercial design concepts"
          subtitle="Selected interior directions for cafes, fashion stores, offices, showrooms, and customer-facing spaces."
        />

        <div className="home-filter-row portfolio-filter-row" aria-label="Project filters">
          {filters.map((filter) => (
            <select key={filter} className="home-filter portfolio-filter" defaultValue="">
              <option value="">{filter}</option>
            </select>
          ))}
          <button className="button button-filter-clear" type="button">
            Clear filters
          </button>
        </div>

        <div className="home-project-grid">
          {featuredProjects.map((project, index) => (
            <article key={project.title} className="home-project-card portfolio-card" style={{ '--reveal-delay': `${index * 90}ms` } as RevealStyle}>
              <div className="portfolio-card-image">
                <img src={project.image} alt="" />
              </div>
              <p>{project.meta}</p>
              <h3>{project.title}</h3>
            </article>
          ))}
        </div>

        <div className="home-center">
          <button className="button button-pill" type="button">
            View all concepts
          </button>
        </div>
      </section>

      <section className="home-process process-section home-signature-motion" aria-labelledby="home-process-title">
        <div className="section-container home-process-grid">
          <div className="process-heading">
            <p className="home-eyebrow">Process</p>
            <h2 id="home-process-title">
              From brief
              <br />
              to handover
            </h2>
          </div>

          <div className="home-process-content">
            <p className="home-process-intro">
              A structured workflow keeps design intent, quotation decisions, production scope, and installation quality aligned.
            </p>

            <div className="home-step-grid">
              {processSteps.map((step, index) => (
                <article key={step.number} className="home-step process-step" style={{ '--reveal-delay': `${index * 110}ms` } as RevealStyle}>
                  <p className="home-step-number">{step.number}</p>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <a href="#learn">Learn more</a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-container home-commitments trust-section home-signature-motion" aria-labelledby="home-commitments-title">
        <SectionHeading
          className="trust-heading"
          eyebrow="Commitments"
          id="home-commitments-title"
          title="Reliable delivery for business spaces"
          subtitle="Designed for teams that need beautiful, functional, quote-ready, and buildable interior solutions."
        />

        <div className="home-commit-grid">
          {commitments.map((commitment, index) => (
            <article key={commitment.title} className="home-commit-card trust-card" style={{ '--reveal-delay': `${index * 100}ms` } as RevealStyle}>
              <IconShieldCheck size={24} />
              <h3>{commitment.title}</h3>
              <p>{commitment.text}</p>
            </article>
          ))}
        </div>

        <div className="home-cta cta-glow-panel">
          <div>
            <h2>Ready to shape your next business space?</h2>
            <p>Book a consultation and turn your brief into a clear design, proposal, and delivery plan.</p>
          </div>
          <div className="home-cta-actions">
            <button className="button button-light" type="button">
              Free consultation
            </button>
            <button className="button button-transparent" type="button">
              +84 770 111 101
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SectionHeading({
  className,
  eyebrow,
  id,
  title,
  subtitle,
}: {
  className?: string;
  eyebrow?: string;
  id?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className={['section-heading', className].filter(Boolean).join(' ')}>
      {eyebrow ? <p className="section-heading-eyebrow">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
