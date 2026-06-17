import { IconClock, IconMail, IconMapPin, IconPhone } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import logoImage from '@/assets/Logo/Logo.png';

import './MainFooter.css';

const services = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Quản lý thi công', 'Thiết kế 3D'];
const policies = ['Điều khoản dịch vụ', 'Chính sách hoàn tiền', 'Điều khoản bảo hành', 'Hướng dẫn hợp tác'];

export function MainFooter() {
  return (
    <footer className="main-footer">
      <div className="main-footer-container">
        <div className="main-footer-heading">
          <h2>FurniSpace</h2>
          <p className="main-footer-tagline">Giải pháp dành cho không gian của bạn</p>
        </div>

        <div className="main-footer-grid">
          <div className="main-footer-brand-block">
            <img className="main-footer-logo" src={logoImage} alt="FurniSpace" />
          </div>

          <FooterColumn title="Contact">
            <FooterLine icon={<IconMapPin size={16} />}>123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</FooterLine>
            <FooterLine icon={<IconPhone size={16} />}>+84 770 111 101</FooterLine>
            <FooterLine icon={<IconMail size={16} />}>hello@furnispace.vn</FooterLine>
            <FooterLine icon={<IconClock size={16} />}>Thứ 2 - Thứ 7: 08:00 - 18:00</FooterLine>
          </FooterColumn>

          <FooterColumn title="Dịch vụ">
            {services.map((item) => (
              <p key={item} className="main-footer-text">
                {item}
              </p>
            ))}
          </FooterColumn>

          <FooterColumn title="Tư vấn">
            <p className="main-footer-text">Nhận tư vấn thiết kế miễn phí cho văn phòng, showroom, cửa hàng và không gian kinh doanh.</p>
          </FooterColumn>

          <FooterColumn title="Chính sách">
            {policies.map((item) => (
              <p key={item} className="main-footer-text">
                {item}
              </p>
            ))}
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="main-footer-column">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function FooterLine({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="main-footer-line">
      <span>{icon}</span>
      <p className="main-footer-text">{children}</p>
    </div>
  );
}
