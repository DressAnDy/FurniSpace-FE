import { IconClock, IconMail, IconMapPin, IconPhone } from '@tabler/icons-react';

import './SiteFooter.css';

const logoImage =
  'https://www.figma.com/api/mcp/asset/8d7a6e89-2635-40f2-b84f-8a4d65c77ec0';

const services = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Quản lý thi công', 'Thiết kế 3D'];
const policies = ['Điều khoản dịch vụ', 'Chính sách hoàn tiền', 'Điều khoản bảo hành', 'Hướng dẫn hợp tác'];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        <div className="site-footer-heading">
          <h2>FurniSpace</h2>
          <p className="site-footer-tagline">Giải pháp dành cho không gian của bạn</p>
        </div>
        <div className="site-footer-grid">
          <div>
            <img className="site-footer-logo" src={logoImage} alt="FurniSpace" />
          </div>
          <FooterColumn title="Contact">
            <FooterLine icon={<IconMapPin size={16} />}>
              123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
            </FooterLine>
            <FooterLine icon={<IconPhone size={16} />}>+84 770 111 101</FooterLine>
            <FooterLine icon={<IconMail size={16} />}>hello@conndesign.vn</FooterLine>
            <FooterLine icon={<IconClock size={16} />}>Thứ 2 - Thứ 7: 08:00 - 18:00</FooterLine>
          </FooterColumn>
          <FooterColumn title="Dịch vụ">
            {services.map((item) => (
              <p key={item} className="site-footer-text">
                {item}
              </p>
            ))}
          </FooterColumn>
          <FooterColumn title="Tư vấn">
            <p className="site-footer-text">Nhận tư vấn thiết kế miễn phí tại nhà của bạn.</p>
          </FooterColumn>
          <FooterColumn title="Chính sách">
            {policies.map((item) => (
              <p key={item} className="site-footer-text">
                {item}
              </p>
            ))}
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="site-footer-column">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function FooterLine({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="site-footer-line">
      <span>{icon}</span>
      <p className="site-footer-text">{children}</p>
    </div>
  );
}
