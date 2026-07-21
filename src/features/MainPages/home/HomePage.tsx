import { IconArrowRight, IconPhone, IconShieldCheck } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';

import { useLang } from '@/app/providers/useLang';
import heroRoomScene from '@/assets/hero/hero-room-scene-3d.png';
import processVideo from '@/assets/hero/process-mp4.mp4';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import { HomeModelGallery } from '@/features/MainPages/home/HomeModelGallery';
import { SiteFooter } from '@/shared/components';

import './HomePage.css';

const projectImages: string[] = [];

const homeContent = {
  vi: {
    // Hero
    kicker: 'Kiến trúc & Nội thất',
    heroLine1: 'THIẾT KẾ',
    heroLine2: 'KIẾN TRÚC',
    heroSubtitle: 'và Nội thất',
    startBtn: 'Bắt đầu thiết kế',
    contactBtn: 'Liên hệ',
    // Intro
    introEyebrow: 'FurniSpace',
    introTitle: 'Giải pháp thiết kế không gian cho doanh nghiệp',
    introBody:
      'FurniSpace đồng hành cùng cafe, cửa hàng thời trang, văn phòng, showroom và không gian bán lẻ từ ý tưởng, thiết kế 3D, dự toán nội thất đến thi công và bàn giao.',
    exploreBtn: 'Xem giải pháp',
    // Projects
    projectsTitle: 'MẪU THIẾT KẾ NỔI BẬT',
    projectsSubtitle:
      'Các concept được chọn lọc cho không gian kinh doanh cần tính thẩm mỹ, hiệu quả vận hành và khả năng thi công rõ ràng.',
    filters: ['Loại Hình', 'Phong Cách', 'Design Concept'],
    clearFilters: 'Xóa bộ lọc',
    viewAll: 'Xem tất cả',
    projectTitles: [
      'Nội Thất Kim Lim Spirits Office & Lounge 5 Tầng Hiện Đại',
      'Không Gian Showroom Tối Giản Với Vật Liệu Gỗ Ấm',
      'Thiết Kế Cửa Hàng Thời Trang Hiện Đại Và Sang Trọng',
      'Concept Nhà Hàng Với Ánh Sáng Và Chất Liệu Cao Cấp',
      'Góc Tư Vấn Khách Hàng Cho Văn Phòng Kinh Doanh',
      'Phối Cảnh 3D Không Gian Trưng Bày Nội Thất',
    ],
    // Process
    processEyebrow: 'Quy trình',
    processTitle1: 'Từ ý tưởng',
    processTitle2: 'đến bàn giao',
    processIntro:
      'Quy trình triển khai được chia thành từng bước rõ ràng để khách hàng dễ theo dõi thiết kế, ngân sách, tiến độ và chất lượng.',
    learnMore: 'Tìm hiểu thêm',
    steps: [
      ['01', 'Khảo sát & Tư vấn', 'Gặp gỡ khách hàng, khảo sát hiện trạng, xác định nhu cầu vận hành và phong cách phù hợp.'],
      ['02', 'Thiết kế sơ bộ', 'Phác thảo mặt bằng, định hướng vật liệu, ánh sáng và luồng trải nghiệm trong không gian.'],
      ['03', 'Thiết kế 3D', 'Dựng phối cảnh 3D để khách hàng hình dung rõ trước khi chốt phương án thi công.'],
      ['04', 'Báo giá & Thi công', 'Hoàn thiện hồ sơ, dự toán chi phí, sản xuất nội thất và triển khai tại công trình.'],
      ['05', 'Nghiệm thu', 'Kiểm tra chất lượng, hoàn thiện chi tiết và bàn giao không gian theo tiêu chuẩn đã thống nhất.'],
      ['06', 'Bảo trì - Bảo hành', 'Đồng hành sau bàn giao với chính sách bảo hành, bảo trì và hỗ trợ vận hành.'],
    ],
    // Commitments
    commitmentsEyebrow: 'Cam kết',
    commitmentsTitle: 'Đồng hành đáng tin cậy cho không gian kinh doanh',
    commitmentsSubtitle:
      'FurniSpace tập trung vào thiết kế đẹp, rõ công năng, dễ thi công và phù hợp mục tiêu vận hành của từng thương hiệu.',
    commitments: [
      ['Bảo hành 5 năm', 'Cam kết đồng hành dài hạn cho các hạng mục nội thất và thi công chính.'],
      ['Đúng tiến độ', 'Quy trình rõ ràng giúp dự án bám sát thời gian khai trương và vận hành.'],
      ['Chính sách hoàn tiền', 'Minh bạch phạm vi công việc, chi phí và điều kiện nghiệm thu.'],
      ['Tư vấn miễn phí', 'Hỗ trợ định hướng giải pháp phù hợp ngân sách và mục tiêu kinh doanh.'],
    ],
    ctaTitle: 'Sẵn sàng bắt đầu dự án của bạn?',
    ctaBody: 'Trao đổi cùng FurniSpace để biến brief thành thiết kế, dự toán và kế hoạch triển khai rõ ràng.',
    ctaBtn: 'Tư vấn miễn phí',
  },
  en: {
    // Hero
    kicker: 'Architecture & Interior Design',
    heroLine1: 'INTERIOR',
    heroLine2: 'DESIGN',
    heroSubtitle: '& Architecture',
    startBtn: 'Start a project',
    contactBtn: 'Contact us',
    // Intro
    introEyebrow: 'FurniSpace',
    introTitle: 'Spatial design solutions for businesses',
    introBody:
      'FurniSpace partners with cafes, fashion stores, offices, showrooms, and retail spaces from concept to 3D visualization, furniture quotation, construction, and handover.',
    exploreBtn: 'Explore solutions',
    // Projects
    projectsTitle: 'FEATURED DESIGN CONCEPTS',
    projectsSubtitle:
      'Curated concepts for commercial spaces that demand aesthetics, operational efficiency, and buildable clarity.',
    filters: ['Space Type', 'Style', 'Design Concept'],
    clearFilters: 'Clear filters',
    viewAll: 'View all',
    projectTitles: [
      'Kim Lim Spirits 5-Floor Modern Office & Lounge',
      'Minimalist Showroom With Warm Wood Materials',
      'Modern & Luxurious Fashion Store Design',
      'Restaurant Concept With Premium Lighting & Materials',
      'Client Consultation Corner For Business Office',
      '3D Rendering Of Furniture Exhibition Space',
    ],
    // Process
    processEyebrow: 'Process',
    processTitle1: 'From brief',
    processTitle2: 'to handover',
    processIntro:
      'A structured workflow broken into clear steps so clients can track design decisions, budget, timeline, and quality.',
    learnMore: 'Learn more',
    steps: [
      ['01', 'Discovery & Brief', 'Meet clients, assess the site, define operational needs and desired style.'],
      ['02', 'Concept Direction', 'Sketch floor plans, define materials, lighting, and spatial flow direction.'],
      ['03', '3D Visualization', 'Build photorealistic 3D views so stakeholders can approve the space before production.'],
      ['04', 'Quotation & Production', 'Finalize documentation, cost estimates, furniture production, and on-site execution.'],
      ['05', 'Handover', 'Quality inspection, final details, and handover according to agreed standards.'],
      ['06', 'Support & Warranty', 'Post-handover support with warranty, maintenance, and operational guidance.'],
    ],
    // Commitments
    commitmentsEyebrow: 'Commitments',
    commitmentsTitle: 'Reliable delivery for business spaces',
    commitmentsSubtitle:
      "FurniSpace focuses on beautiful design, clear function, buildable execution, and alignment with each brand's operational goals.",
    commitments: [
      ['5-Year Warranty', 'Long-term commitment covering key furniture and construction items.'],
      ['On Schedule', 'Clear workflow keeps projects aligned with opening and operational timelines.'],
      ['Transparent Pricing', 'Scope, cost, and handover conditions are documented before each major milestone.'],
      ['Free Consultation', 'Guidance on solutions tailored to your budget and business goals.'],
    ],
    ctaTitle: 'Ready to shape your next business space?',
    ctaBody: 'Talk to FurniSpace and turn your brief into a clear design, quotation, and delivery plan.',
    ctaBtn: 'Free consultation',
  },
} as const;

export function HomePage() {
  return <HomePageContent />;
}

function HomePageContent() {
  const { lang } = useLang();
  const t = homeContent[lang];
  const processVideoReplayTimeoutRef = useRef<number | undefined>(undefined);

  function handleProcessVideoEnded(event: { currentTarget: HTMLVideoElement }) {
    const video = event.currentTarget;

    window.clearTimeout(processVideoReplayTimeoutRef.current);
    processVideoReplayTimeoutRef.current = window.setTimeout(() => {
      video.currentTime = 0;
      void video.play();
    }, 750);
  }

  useEffect(() => {
    const root = document.documentElement;
    const darkSectionSelectors = ['.home-intro', '.home-process', '.site-footer'];
    const desktopQuery = window.matchMedia('(min-width: 901px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sectionScrollDurationMs = 750;
    let isSectionScrolling = false;
    let wheelUnlockTimeout: number | undefined;
    let scrollAnimationFrame: number | undefined;

    function updateHeaderTone() {
      const probeY = 92;
      const isOverDarkSection = darkSectionSelectors.some((selector) => {
        const section = document.querySelector(selector);

        if (!(section instanceof HTMLElement)) {
          return false;
        }

        const rect = section.getBoundingClientRect();

        return rect.top <= probeY && rect.bottom >= probeY;
      });

      root.classList.toggle('home-header-light', isOverDarkSection);
    }

    function getSnapSections() {
      return Array.from(document.querySelectorAll<HTMLElement>('.home-page > section, .home-page > .site-footer'));
    }

    function getActiveSectionIndex(sections: HTMLElement[], direction: number) {
      if (direction < 0) {
        const viewportBottom = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const isNearPageBottom = viewportBottom >= documentHeight - 8;
        const lastVisibleSectionIndex = sections.reduce((visibleIndex, section, index) => {
          const isVisible = section.offsetTop < viewportBottom - 24 && section.offsetTop + section.offsetHeight > window.scrollY + 24;

          return isVisible ? index : visibleIndex;
        }, 0);

        return isNearPageBottom ? sections.length - 1 : lastVisibleSectionIndex;
      }

      const activationOffset = direction > 0 ? Math.min(window.innerHeight * 0.34, 280) : Math.min(window.innerHeight * 0.2, 180);
      const currentPosition = window.scrollY + activationOffset;

      return sections.reduce((activeIndex, section, index) => {
        return section.offsetTop <= currentPosition ? index : activeIndex;
      }, 0);
    }

    function easeInOutSine(progress: number) {
      return -(Math.cos(Math.PI * progress) - 1) / 2;
    }

    function animateScrollTo(targetY: number, duration = sectionScrollDurationMs) {
      const startY = window.scrollY;
      const distance = targetY - startY;
      const startTime = performance.now();

      if (scrollAnimationFrame !== undefined) {
        window.cancelAnimationFrame(scrollAnimationFrame);
      }

      function step(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutSine(progress);

        window.scrollTo(0, startY + distance * easedProgress);
        updateHeaderTone();

        if (progress < 1) {
          scrollAnimationFrame = window.requestAnimationFrame(step);
          return;
        }

        scrollAnimationFrame = undefined;
        window.clearTimeout(wheelUnlockTimeout);
        isSectionScrolling = false;
      }

      scrollAnimationFrame = window.requestAnimationFrame(step);
    }

    function handleSectionWheel(event: WheelEvent) {
      if (!desktopQuery.matches || reducedMotionQuery.matches || Math.abs(event.deltaY) < 6) {
        return;
      }

      const sections = getSnapSections();

      if (sections.length < 2) {
        return;
      }

      if (isSectionScrolling) {
        event.preventDefault();
        return;
      }

      const direction = event.deltaY > 0 ? 1 : -1;
      const currentIndex = getActiveSectionIndex(sections, direction);
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), sections.length - 1);

      if (nextIndex === currentIndex) {
        return;
      }

      event.preventDefault();
      isSectionScrolling = true;
      animateScrollTo(sections[nextIndex].offsetTop);

      window.clearTimeout(wheelUnlockTimeout);
      wheelUnlockTimeout = window.setTimeout(() => {
        isSectionScrolling = false;
      }, sectionScrollDurationMs + 240);
    }

    root.classList.add('home-scroll-snap');
    updateHeaderTone();

    window.addEventListener('scroll', updateHeaderTone, { passive: true });
    window.addEventListener('resize', updateHeaderTone);
    window.addEventListener('wheel', handleSectionWheel, { passive: false });

    return () => {
      window.clearTimeout(processVideoReplayTimeoutRef.current);
      window.clearTimeout(wheelUnlockTimeout);
      if (scrollAnimationFrame !== undefined) {
        window.cancelAnimationFrame(scrollAnimationFrame);
      }
      window.removeEventListener('scroll', updateHeaderTone);
      window.removeEventListener('resize', updateHeaderTone);
      window.removeEventListener('wheel', handleSectionWheel);
      root.classList.remove('home-scroll-snap', 'home-header-light');
    };
  }, []);

  return (
    <main className="home-page">
      <MainNavbar
        activePath="/"
        activeClassName="home-nav-link-active"
        brandLabel="FurniSpace"
        brandMarkLabel="FS"
        brandNameClassName="home-brand-name"
        classPrefix="home"
        linkClassName="home-nav-link"
      />

      {/* Hero */}
      <section
        className="home-hero section-container"
        aria-labelledby="home-hero-title"
      >
        <div className="home-hero-copy">
          <div className="home-kicker">
            <span />
            <p>{t.kicker}</p>
          </div>

          <div>
            <h1 id="home-hero-title">
              {t.heroLine1}
              <br />
              {t.heroLine2}
            </h1>
            <p className="home-hero-subtitle">{t.heroSubtitle}</p>
          </div>

          <hr />

          <div className="home-signature">
            <strong>FurniSpace</strong>
            <span>DESIGN</span>
          </div>

          <div className="home-actions">
            <button
              className="button button-dark home-hero-primary-cta"
              type="button"
            >
              {t.startBtn}
            </button>
            <button
              className="button button-outline"
              type="button"
            >
              {t.contactBtn}
            </button>
          </div>

          <div className="home-phone">
            <IconPhone size={16} />
            <span>+84 770 111 101</span>
          </div>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <img className="home-hero-scene" src={heroRoomScene} alt="" />
        </div>
      </section>

      {/* Intro */}
      <section className="home-intro" aria-labelledby="home-intro-title">
        <div className="section-container home-intro-grid">
          <div className="home-intro-copy">
            <p className="home-eyebrow">{t.introEyebrow}</p>
            <h2 id="home-intro-title">{t.introTitle}</h2>
            <p>{t.introBody}</p>
            <button className="button button-gold" type="button">
              {t.exploreBtn}
            </button>
          </div>

          <HomeModelGallery />
        </div>
      </section>

      {/* Projects */}
      <section className="section-container home-projects" aria-labelledby="home-projects-title">
        <SectionHeading
          id="home-projects-title"
          title={t.projectsTitle}
          subtitle={t.projectsSubtitle}
        />

        <div className="home-filter-row" aria-label={lang === 'vi' ? 'Bộ lọc dự án' : 'Project filters'}>
          {t.filters.map((filter) => (
            <select key={filter} className="home-filter" defaultValue="">
              <option value="">{filter}</option>
            </select>
          ))}
          <button className="button button-filter-clear" type="button">
            {t.clearFilters}
          </button>
        </div>

        <div className="home-project-grid">
          {projectImages.map((image, index) => (
            <article key={t.projectTitles[index]} className="home-project-card">
              <img src={image} alt="" />
              <h3>{t.projectTitles[index]}</h3>
            </article>
          ))}
        </div>

        <div className="home-center">
          <button className="button button-pill" type="button">
            {t.viewAll}
          </button>
        </div>
      </section>

      {/* Process */}
      <section className="home-process" aria-labelledby="home-process-title">
        <div className="section-container home-process-grid">
          <div>
            <p className="home-eyebrow">{t.processEyebrow}</p>
            <h2 id="home-process-title">
              {t.processTitle1}
              <br />
              {t.processTitle2}
            </h2>
            <div className="home-process-video-card" aria-hidden="true">
              <video className="home-process-video" autoPlay muted playsInline preload="metadata" onEnded={handleProcessVideoEnded}>
                <source src={processVideo} type="video/mp4" />
              </video>
            </div>
          </div>

          <div className="home-process-content">
            <p className="home-process-intro">{t.processIntro}</p>

            <div className="home-step-grid">
              {t.steps.map(([number, title, text]) => (
                <article key={number} className="home-step">
                  <p className="home-step-number">{number}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a href="#learn">{t.learnMore}</a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="section-container home-commitments" aria-labelledby="home-commitments-title">
        <SectionHeading
          eyebrow={t.commitmentsEyebrow}
          id="home-commitments-title"
          title={t.commitmentsTitle}
          subtitle={t.commitmentsSubtitle}
        />

        <div className="home-commit-grid">
          {t.commitments.map(([title, text]) => (
            <article key={title} className="home-commit-card">
              <IconShieldCheck size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <div className="home-cta">
          <div>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaBody}</p>
          </div>
          <div className="home-cta-actions">
            <button className="button button-light" type="button">
              {t.ctaBtn}
              <IconArrowRight size={16} />
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
