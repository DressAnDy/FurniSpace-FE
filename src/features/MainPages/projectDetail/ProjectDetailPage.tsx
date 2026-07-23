import {
  IconBuildingStore,
  IconClockHour4,
  IconLayoutGrid,
  IconPalette,
  IconRulerMeasure,
  IconSparkles,
} from '@tabler/icons-react';

import { MainNavbar } from '@/features/MainPages/maincomponents';
import { SiteFooter } from '@/shared/components';

import './ProjectDetailPage.css';

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

const detailFloorPlanUrl: string | null = null;
const detailHeroUrl: string | null = null;
const galleryImages: string[] = [];

const latestProjects: ProjectCardProps[] = [];

export function ProjectDetailPage() {
  return (
    <main className="project-detail-page">
      <MainNavbar activePath="/projects" classPrefix="project-detail" />

      <section className="project-detail-hero" aria-label="Terra Beauty Centre">
        {detailHeroUrl ? <img src={detailHeroUrl} alt="" /> : null}
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
            {detailFloorPlanUrl ? <img src={detailFloorPlanUrl} alt="Mặt bằng 2D Terra Beauty Centre" /> : null}
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

type ProjectCardProps = {
  area: string;
  category: string;
  imageUrl: string | null;
  title: string;
  year: string;
};

function ProjectCard({ area, category, imageUrl, title, year }: ProjectCardProps) {
  return (
    <article className="project-detail-card">
      <div className="project-detail-card-image">
        {imageUrl ? <img src={imageUrl} alt={title} /> : null}
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
