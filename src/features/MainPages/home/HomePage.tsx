import { IconArrowRight, IconPhone, IconShieldCheck } from '@tabler/icons-react';

import galleryOneImage from '@/assets/product-detail/gallery-1.png';
import galleryThreeImage from '@/assets/product-detail/gallery-3.png';
import diningRoomImage from '@/assets/product-detail-shop/dining-room.png';
import roomDetailImage from '@/assets/product-detail-shop/room-detail.png';
import tableRoomImage from '@/assets/product-detail-shop/table-room.png';
import terraSalonImage from '@/assets/project-list/terra-salon.png';
import { MainFooter, MainNavbar } from '@/features/MainPages/maincomponents';

import './HomePage.css';

const filters = ['Loại Hình', 'Phong Cách', 'Concept Dụng Thần'];

const projects = [
  {
    image: terraSalonImage,
    title: 'Nội Thất Kim Lim Spirits Office & Lounge 5 Tầng Hiện Đại',
  },
  {
    image: galleryOneImage,
    title: 'Không Gian Showroom Tối Giản Với Vật Liệu Gỗ Ấm',
  },
  {
    image: roomDetailImage,
    title: 'Thiết Kế Cửa Hàng Thời Trang Hiện Đại Và Sang Trọng',
  },
  {
    image: diningRoomImage,
    title: 'Concept Nhà Hàng Với Ánh Sáng Và Chất Liệu Cao Cấp',
  },
  {
    image: tableRoomImage,
    title: 'Góc Tư Vấn Khách Hàng Cho Văn Phòng Kinh Doanh',
  },
  {
    image: galleryThreeImage,
    title: 'Phối Cảnh 3D Không Gian Trưng Bày Nội Thất',
  },
];

const processSteps = [
  ['01', 'Khảo sát & Tư vấn', 'Gặp gỡ khách hàng, khảo sát hiện trạng, xác định nhu cầu vận hành và phong cách phù hợp.'],
  ['02', 'Thiết kế sơ bộ', 'Phác thảo mặt bằng, định hướng vật liệu, ánh sáng và luồng trải nghiệm trong không gian.'],
  ['03', 'Thiết kế 3D', 'Dựng phối cảnh 3D để khách hàng hình dung rõ trước khi chốt phương án thi công.'],
  ['04', 'Báo giá & Thi công', 'Hoàn thiện hồ sơ, dự toán chi phí, sản xuất nội thất và triển khai tại công trình.'],
  ['05', 'Nghiệm thu', 'Kiểm tra chất lượng, hoàn thiện chi tiết và bàn giao không gian theo tiêu chuẩn đã thống nhất.'],
  ['06', 'Bảo trì - Bảo hành', 'Đồng hành sau bàn giao với chính sách bảo hành, bảo trì và hỗ trợ vận hành.'],
];

const commitments = [
  ['Bảo hành 5 năm', 'Cam kết đồng hành dài hạn cho các hạng mục nội thất và thi công chính.'],
  ['Đúng tiến độ', 'Quy trình rõ ràng giúp dự án bám sát thời gian khai trương và vận hành.'],
  ['Chính sách hoàn tiền', 'Minh bạch phạm vi công việc, chi phí và điều kiện nghiệm thu.'],
  ['Tư vấn miễn phí', 'Hỗ trợ định hướng giải pháp phù hợp ngân sách và mục tiêu kinh doanh.'],
];

export function HomePage() {
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

      <section className="home-hero section-container" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <div className="home-kicker">
            <span />
            <p>Kiến trúc & Nội thất</p>
          </div>

          <div>
            <h1 id="home-hero-title">
              THIẾT KẾ
              <br />
              KIẾN TRÚC
            </h1>
            <p className="home-hero-subtitle">và Nội thất</p>
          </div>

          <hr />

          <div className="home-signature">
            <strong>FurniSpace</strong>
            <span>DESIGN</span>
          </div>

          <div className="home-actions">
            <button className="button button-dark" type="button">
              Bắt đầu thiết kế
            </button>
            <button className="button button-outline" type="button">
              Liên hệ
            </button>
          </div>

          <div className="home-phone">
            <IconPhone size={16} />
            <span>+84 770 111 101</span>
          </div>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <img className="home-hero-image" src={roomDetailImage} alt="" />
          <img className="home-hero-inset" src={tableRoomImage} alt="" />
        </div>
      </section>

      <section className="home-intro" aria-labelledby="home-intro-title">
        <div className="section-container home-intro-grid">
          <div className="home-intro-copy">
            <p className="home-eyebrow">FurniSpace</p>
            <h2 id="home-intro-title">Giải pháp thiết kế không gian cho doanh nghiệp</h2>
            <p>
              FurniSpace đồng hành cùng cafe, cửa hàng thời trang, văn phòng, showroom và không gian bán lẻ từ ý tưởng, thiết kế 3D, dự toán nội thất
              đến thi công và bàn giao.
            </p>
            <button className="button button-gold" type="button">
              Xem giải pháp
            </button>
          </div>

          <div className="home-gallery" aria-hidden="true">
            <img className="home-gallery-back" src={diningRoomImage} alt="" />
            <img className="home-gallery-front" src={galleryThreeImage} alt="" />
          </div>
        </div>
      </section>

      <section className="section-container home-projects" aria-labelledby="home-projects-title">
        <SectionHeading
          id="home-projects-title"
          title="MẪU THIẾT KẾ NỔI BẬT"
          subtitle="Các concept được chọn lọc cho không gian kinh doanh cần tính thẩm mỹ, hiệu quả vận hành và khả năng thi công rõ ràng."
        />

        <div className="home-filter-row" aria-label="Bộ lọc dự án">
          {filters.map((filter) => (
            <select key={filter} className="home-filter" defaultValue="">
              <option value="">{filter}</option>
            </select>
          ))}
          <button className="button button-filter-clear" type="button">
            Xóa bộ lọc
          </button>
        </div>

        <div className="home-project-grid">
          {projects.map((project) => (
            <article key={project.title} className="home-project-card">
              <img src={project.image} alt="" />
              <h3>{project.title}</h3>
            </article>
          ))}
        </div>

        <div className="home-center">
          <button className="button button-pill" type="button">
            Xem tất cả
          </button>
        </div>
      </section>

      <section className="home-process" aria-labelledby="home-process-title">
        <div className="section-container home-process-grid">
          <div>
            <p className="home-eyebrow">Quy trình</p>
            <h2 id="home-process-title">
              Từ ý tưởng
              <br />
              đến bàn giao
            </h2>
          </div>

          <div className="home-process-content">
            <p className="home-process-intro">
              Quy trình triển khai được chia thành từng bước rõ ràng để khách hàng dễ theo dõi thiết kế, ngân sách, tiến độ và chất lượng.
            </p>

            <div className="home-step-grid">
              {processSteps.map(([number, title, text]) => (
                <article key={number} className="home-step">
                  <p className="home-step-number">{number}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a href="#learn">Tìm hiểu thêm</a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-container home-commitments" aria-labelledby="home-commitments-title">
        <SectionHeading
          eyebrow="Cam kết"
          id="home-commitments-title"
          title="Đồng hành đáng tin cậy cho không gian kinh doanh"
          subtitle="FurniSpace tập trung vào thiết kế đẹp, rõ công năng, dễ thi công và phù hợp mục tiêu vận hành của từng thương hiệu."
        />

        <div className="home-commit-grid">
          {commitments.map(([title, text]) => (
            <article key={title} className="home-commit-card">
              <IconShieldCheck size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <div className="home-cta">
          <div>
            <h2>Sẵn sàng bắt đầu dự án của bạn?</h2>
            <p>Trao đổi cùng FurniSpace để biến brief thành thiết kế, dự toán và kế hoạch triển khai rõ ràng.</p>
          </div>
          <div className="home-cta-actions">
            <button className="button button-light" type="button">
              Tư vấn miễn phí
              <IconArrowRight size={16} />
            </button>
            <button className="button button-transparent" type="button">
              +84 770 111 101
            </button>
          </div>
        </div>
      </section>

      <MainFooter />
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
