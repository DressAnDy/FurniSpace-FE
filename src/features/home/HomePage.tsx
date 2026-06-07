import {
  IconClock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
} from '@tabler/icons-react';

import './HomePage.css';

const introImage =
  'https://www.figma.com/api/mcp/asset/12205344-8b4b-44ed-ba40-3a6cfea787d5';
const roomImage =
  'https://www.figma.com/api/mcp/asset/75893e0c-95a8-4696-89f9-c2f053ee2334';
const logoImage =
  'https://www.figma.com/api/mcp/asset/8d7a6e89-2635-40f2-b84f-8a4d65c77ec0';

const navigation = ['Trang chủ', 'Về chúng tôi', 'Dự án', 'Dịch vụ'];

const filters = ['Loại Hình', 'Phong Cách', 'Concept Dụng Thần'];

const projects = [
  'Nội Thất Kim Lim Spirits Office & Lounge 5 Tầng Hiện Đại',
  'Căn hộ Aurora Residences Tp Hồ Chí Minh 2PN Japandi',
  'Nội Thất Nhà Phố Đồng Nai 3 Tầng Hiện Đại',
  'Nội Thất Biệt Thự Quận 7 Japandi Mộc Sinh Khí',
  'Nội Thất Nhà Phố Tân Phú Scandinavian Hoả Nhiệt Huyết',
  'Nội Thất Biệt Thự Lavila Tân Cổ Điển Thuỷ An Nhiên',
];

const processSteps = [
  ['01', 'Khảo sát & Tư vấn', 'Gặp gỡ, khảo sát nhu cầu và hiện trạng để định hướng phong cách phù hợp.'],
  ['02', 'Thiết kế sơ bộ', 'Phác thảo mặt bằng, moodboard và giải pháp công năng cho không gian.'],
  ['03', 'Thiết kế 3D', 'Mô phỏng phối cảnh chi tiết để bạn nhìn rõ không gian trước khi thi công.'],
  ['04', 'Thi công', 'Triển khai sản xuất và hoàn thiện đúng bản vẽ, vật liệu, tiến độ đã thống nhất.'],
  ['05', 'Nghiệm thu', 'Kiểm tra chất lượng, bàn giao hồ sơ và hướng dẫn vận hành không gian.'],
  ['06', 'Bảo trì - bảo hành', 'Đồng hành sau bàn giao để không gian luôn vận hành ổn định.'],
];

const commitments = [
  ['Bảo hành 5 năm', 'Cam kết bảo hành toàn bộ công trình trong 5 năm. Sửa chữa miễn phí mọi lỗi kỹ thuật.'],
  ['Đúng tiến độ', 'Hoàn thành đúng thời hạn trong hợp đồng với kế hoạch triển khai minh bạch.'],
  ['Chính sách hoàn tiền', 'Hoàn lại 100% phí thiết kế nếu bạn không hài lòng sau lần trình bày đầu tiên.'],
  ['Tư vấn miễn phí', 'Buổi tư vấn lần đầu hoàn toàn miễn phí tại nhà hoặc văn phòng, không ràng buộc.'],
];

export function HomePage() {
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <span className="home-brand-mark" />
          <span className="home-brand-divider" />
          <span className="home-brand-name">FURNISPACE</span>
        </div>

        <nav className="home-nav">
          {navigation.map((item) => (
            <a key={item} href={`#${item}`} className="home-nav-link">
              {item}
            </a>
          ))}
          <a href="#thiet-ke-3d" className="home-nav-link home-nav-link-active">
            Thiết kế 3D
          </a>
        </nav>
      </header>

      <section className="home-hero section-container">
        <div className="home-hero-copy">
          <div className="home-kicker">
            <span />
            <p>Kiến trúc & Nội thất</p>
          </div>
          <div>
            <h1>
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
          <img className="home-hero-image" src={introImage} alt="" />
          <img className="home-hero-inset" src={roomImage} alt="" />
        </div>
      </section>

      <section className="home-intro">
        <div className="section-container home-intro-grid">
          <div className="home-intro-copy">
            <p className="home-eyebrow">FurniSpace</p>
            <h2>Giải pháp dành cho không gian của bạn</h2>
            <p>
              Ý tưởng của bạn là xuất phát điểm quan trọng để tìm ra giải pháp phù hợp cho không gian mà bạn đang hướng đến.
              Với vai trò một đơn vị thiết kế và thi công tổng thể, FurniSpace luôn sẵn sàng đồng hành và cam kết hiện thực hóa
              không gian mà bạn hằng mong muốn.
            </p>
            <button className="button button-gold" type="button">
              Tìm hiểu ngay
            </button>
          </div>
          <div className="home-gallery" aria-hidden="true">
            <img className="home-gallery-back" src={roomImage} alt="" />
            <img className="home-gallery-front" src={introImage} alt="" />
          </div>
        </div>
      </section>

      <section className="section-container home-projects">
        <SectionHeading
          title="MẪU THIẾT KẾ NỔI BẬT"
          subtitle="Các mẫu nội thất đẹp mắt với đa phong cách hứa hẹn sẽ là nguồn cảm hứng bất tận dành cho bạn"
        />
        <div className="home-filter-row">
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
          {projects.map((project, index) => (
            <article key={project} className="home-project-card">
              <img src={index % 2 === 0 ? introImage : roomImage} alt="" />
              <h3>{project}</h3>
            </article>
          ))}
        </div>
        <div className="home-center">
          <button className="button button-pill" type="button">
            Xem tất cả
          </button>
        </div>
      </section>

      <section className="home-process">
        <div className="section-container home-process-grid">
          <div>
            <p className="home-eyebrow">Quy trình</p>
            <h2>
              Quy Trình
              <br />
              Thực Hiện
            </h2>
          </div>
          <div>
            <p className="home-process-intro">
              Mỗi dự án được triển khai theo một lộ trình rõ ràng, đảm bảo bạn luôn nắm được tiến độ, chi phí và chất lượng
              hoàn thiện.
            </p>
            <div className="home-step-grid">
              {processSteps.map(([number, title, text]) => (
                <article key={number} className="home-step">
                  <p className="home-step-number">{number}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a href="#learn">Tìm hiểu</a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-container home-commitments">
        <SectionHeading
          eyebrow="Cam kết"
          title="Đảm Bảo & Cam Kết"
          subtitle="Chúng tôi xây dựng niềm tin bằng quy trình minh bạch, chất lượng ổn định và những cam kết cụ thể."
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
            <h2>Sẵn sàng bắt đầu dự án?</h2>
            <p>Liên hệ ngay để được tư vấn miễn phí trong hôm nay.</p>
          </div>
          <div className="home-cta-actions">
            <button className="button button-light" type="button">
              Tư vấn miễn phí
            </button>
            <button className="button button-transparent" type="button">
              +84 770 111 101
            </button>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="section-container">
          <div className="home-footer-heading">
            <h2>FurniSpace</h2>
            <p className="home-footer-tagline">Giải pháp dành cho không gian của bạn</p>
          </div>
          <div className="home-footer-grid">
            <div>
              <img className="home-footer-logo" src={logoImage} alt="FurniSpace" />
            </div>
            <FooterColumn title="Contact">
              <FooterLine icon={<IconMapPin size={16} />}>123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</FooterLine>
              <FooterLine icon={<IconPhone size={16} />}>+84 770 111 101</FooterLine>
              <FooterLine icon={<IconMail size={16} />}>hello@conndesign.vn</FooterLine>
              <FooterLine icon={<IconClock size={16} />}>Thứ 2 - Thứ 7: 08:00 - 18:00</FooterLine>
            </FooterColumn>
            <FooterColumn title="Dịch vụ">
              {['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Quản lý thi công', 'Thiết kế 3D'].map((item) => (
                <p key={item} className="home-footer-text">
                  {item}
                </p>
              ))}
            </FooterColumn>
            <FooterColumn title="Tư vấn">
              <p className="home-footer-text">Nhận tư vấn thiết kế miễn phí tại nhà của bạn.</p>
            </FooterColumn>
            <FooterColumn title="Chính sách">
              {['Điều khoản dịch vụ', 'Chính sách hoàn tiền', 'Điều khoản bảo hành', 'Hướng dẫn hợp tác'].map((item) => (
                <p key={item} className="home-footer-text">
                  {item}
                </p>
              ))}
            </FooterColumn>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle: string }) {
  return (
    <div className="section-heading">
      {eyebrow ? <p className="section-heading-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function FooterColumn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="home-footer-column">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function FooterLine({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="home-footer-line">
      <span>{icon}</span>
      <p className="home-footer-text">{children}</p>
    </div>
  );
}
