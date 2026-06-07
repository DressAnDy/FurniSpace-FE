import {
  IconBuildingStore,
  IconClockHour4,
  IconLayoutGrid,
  IconPalette,
  IconRulerMeasure,
  IconSparkles,
} from '@tabler/icons-react';

import detailFloorPlanUrl from '@/assets/product-detail/floor-plan.png';
import detailGallery1Url from '@/assets/product-detail/gallery-1.png';
import detailGallery2Url from '@/assets/product-detail/gallery-2.png';
import detailGallery3Url from '@/assets/product-detail/gallery-3.png';
import detailGallery4Url from '@/assets/product-detail/gallery-4.png';
import detailGallery5Url from '@/assets/product-detail/gallery-5.png';
import detailGallery6Url from '@/assets/product-detail/gallery-6.png';
import detailHeroUrl from '@/assets/product-detail/hero.png';
import terraSalonUrl from '@/assets/project-list/terra-salon.png';
import { SiteFooter } from '@/shared/components';

import './ProjectDetailPage.css';

const navigation = ['Trang chủ', 'Về chúng tôi', 'Dự án', 'Dịch vụ'];

const projectFacts = [
  { label: 'Quy mô', value: '1 Trệt' },
  { label: 'Thời gian', value: '20 Days | Design' },
  { label: 'Địa điểm', value: 'Melbourne, Australia' },
  { label: 'Quản lý dự án', value: 'Trang Tran' },
  { label: 'Năm', value: '2025' },
  { label: 'Diện tích', value: '93m2' },
];

const designIdeas = [
  {
    description:
      'Không gian được chia thành 2 khu vực chức năng bao gồm khu vực làm nail và không gian beauty nhưng vẫn kết nối với nhau.',
    icon: <IconLayoutGrid size={18} stroke={1.8} />,
    title: 'Layout',
  },
  {
    description: 'Hiện đại',
    icon: <IconSparkles size={18} stroke={1.8} />,
    title: 'Vibe',
  },
  {
    description: 'Trắng, hồng, be',
    icon: <IconPalette size={18} stroke={1.8} />,
    title: 'Palette',
  },
  {
    description: 'Gỗ, kính',
    icon: <IconBuildingStore size={18} stroke={1.8} />,
    title: 'Materials',
  },
];

const galleryImages = [
  detailGallery1Url,
  detailGallery2Url,
  detailGallery3Url,
  detailGallery4Url,
  detailGallery5Url,
  detailGallery6Url,
];

const latestProjects = Array.from({ length: 3 }, (_, index) => ({
  area: index === 2 ? '90m2' : '105m2',
  category: 'Nhà hàng - Quán bar',
  imageUrl: terraSalonUrl,
  title: 'TERRA SALON',
  year: '2025',
}));

export function ProjectDetailPage() {
  return (
    <main className="project-detail-page">
      <Header />

      <section className="project-detail-hero" aria-label="Terra Beauty Centre">
        <img src={detailHeroUrl} alt="" />
      </section>

      <section className="project-detail-layout">
        <aside className="project-detail-sidebar">
          <p className="project-detail-kicker">Thông tin dự án</p>
          <h1>Terra Beauty Centre</h1>
          <p>
            Dự án Terra Beauty Centre được lấy cảm hứng từ hình ảnh người phụ nữ hiện đại: tinh tế, mạnh mẽ
            nhưng vẫn giữ được sự mềm mại vốn có.
          </p>

          <dl className="project-detail-facts">
            {projectFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <button type="button">Liên hệ</button>
        </aside>

        <div className="project-detail-content">
          <section>
            <h2>Giới thiệu về dự án</h2>
            <p>
              Dự án Terra Beauty Centre được lấy cảm hứng từ hình ảnh người phụ nữ hiện đại: tinh tế, mạnh mẽ
              nhưng vẫn giữ được sự mềm mại vốn có. Không gian được tạo nên với tone màu pastel làm chủ đạo vừa
              thể hiện nét nữ tính, vừa phản ánh tinh thần tự tin, độc lập.
            </p>
          </section>

          <section className="project-detail-idea-section">
            <h2>Ý tưởng thiết kế</h2>
            <div className="project-detail-idea-grid">
              {designIdeas.map((idea) => (
                <article className="project-detail-idea" key={idea.title}>
                  <div>
                    <span>{idea.icon}</span>
                    <h3>{idea.title}</h3>
                  </div>
                  <p>{idea.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="project-detail-plan-section">
            <h2>Mặt bằng 2D</h2>
            <img src={detailFloorPlanUrl} alt="Mặt bằng 2D Terra Beauty Centre" />
          </section>

          <section className="project-detail-gallery-section">
            <h2>Hình thiết kế</h2>
            <div className="project-detail-gallery">
              {galleryImages.map((imageUrl, index) => (
                <figure className="project-detail-gallery-item" key={imageUrl}>
                  <img src={imageUrl} alt={`Thiết kế Terra Beauty Centre ${index + 1}`} />
                  {index === galleryImages.length - 1 ? <figcaption>+13</figcaption> : null}
                </figure>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="project-detail-latest">
        <h2>Cập nhập mới</h2>
        <div className="project-detail-latest-grid">
          {latestProjects.map((project, index) => (
            <ProjectCard key={`${project.title}-${index}`} {...project} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Header() {
  return (
    <header className="project-detail-header">
      <a className="project-detail-brand" href="/">
        <span className="project-detail-brand-mark">F</span>
        <span className="project-detail-brand-divider" />
        <span>FurniSpace</span>
      </a>

      <nav className="project-detail-nav" aria-label="Điều hướng chính">
        {navigation.map((item) => (
          <a key={item} href={`#${item}`}>
            {item}
          </a>
        ))}
        <a className="project-detail-nav-active" href="#thiet-ke-3d">
          Thiết kế 3D
        </a>
      </nav>
    </header>
  );
}

type ProjectCardProps = {
  area: string;
  category: string;
  imageUrl: string;
  title: string;
  year: string;
};

function ProjectCard({ area, category, imageUrl, title, year }: ProjectCardProps) {
  return (
    <article className="project-detail-card">
      <div className="project-detail-card-image">
        <img src={imageUrl} alt={title} />
        <div className="project-detail-card-pill">
          <h3>{title}</h3>
        </div>
      </div>
      <dl>
        <div>
          <dt>Thể loại</dt>
          <dd>{category}</dd>
        </div>
        <div>
          <dt>Hoàn thành</dt>
          <dd>
            <IconClockHour4 size={13} stroke={1.8} />
            {year}
          </dd>
        </div>
        <div>
          <dt>Diện tích</dt>
          <dd>
            <IconRulerMeasure size={13} stroke={1.8} />
            {area}
          </dd>
        </div>
      </dl>
    </article>
  );
}
