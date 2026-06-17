import terraSalonUrl from '@/assets/project-list/terra-salon.png';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import { SiteFooter } from '@/shared/components';

import './ProjectListReviewPage.css';

const categories = [
  'Khách sạn - Homestay',
  'Nhà hàng - Quán Bar',
  'Phòng khám - nhà thuốc',
  'Quán cafe - trà sữa',
  'Shop - Showroom',
  'Spa - Thẩm mỹ viện',
  'Văn phòng - Công ty',
];

const featuredProjects = Array.from({ length: 6 }, (_, index) => ({
  area: index % 2 === 0 ? '105m2' : '98m2',
  category: 'Nhà hàng - Quán bar',
  imageUrl: terraSalonUrl,
  title: 'TERRA SALON',
  year: '2025',
}));


export function ProjectListReviewPage() {
  return (
    <main className="project-review-page">
      <MainNavbar activePath="/projects" classPrefix="project-review" />

      <section className="project-review-shell">
        <aside className="project-review-filter" aria-label="Bộ lọc dự án">
          <h2>Filter</h2>
          <input type="search" placeholder="Search" aria-label="Search" />

          <h3>By Category</h3>
          <div className="project-review-category-list">
            {categories.map((category) => (
              <label key={category}>
                <input type="checkbox" />
                <span>{category}</span>
              </label>
            ))}
          </div>

          <h3>Sort by</h3>
          <select defaultValue="">
            <option value="">Sort...</option>
            <option value="newest">Mới nhất</option>
            <option value="area">Diện tích</option>
          </select>
        </aside>

        <div className="project-review-content">
          <h1>Chọn Gói Tư Vấn</h1>
          <div className="project-review-grid">
            {featuredProjects.map((project, index) => (
              <ProjectCard key={`${project.title}-${index}`} {...project} />
            ))}
          </div>
        </div>
      </section>


      <SiteFooter />
    </main>
  );
}

type ProjectCardProps = {
  area: string;
  category: string;
  compact?: boolean;
  imageUrl: string;
  title: string;
  year: string;
};

function ProjectCard({ area, category, compact = false, imageUrl, title, year }: ProjectCardProps) {
  return (
    <article className={compact ? 'product-card product-card-compact' : 'product-card'}>
      <div className="product-card-image-wrap">
        <img src={imageUrl} alt={title} />
        <div className="product-card-title-pill">
          <h3>{title}</h3>
        </div>
      </div>
      <dl className="product-card-meta">
        <div>
          <dt>Thể loại</dt>
          <dd>{category}</dd>
        </div>
        <div>
          <dt>Hoàn thành</dt>
          <dd>{year}</dd>
        </div>
        <div>
          <dt>Diện tích</dt>
          <dd>{area}</dd>
        </div>
      </dl>
    </article>
  );
}



