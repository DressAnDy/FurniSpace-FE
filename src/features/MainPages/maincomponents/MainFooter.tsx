import { IconClock, IconMail, IconMapPin, IconPhone } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import logoImage from '@/assets/Logo/Logo.png';
import type { Lang } from '@/app/providers/LangContext';

import './MainFooter.css';

type MainFooterProps = {
  lang?: Lang;
};

const footerContent = {
  vi: {
    tagline: 'Giải pháp dành cho không gian của bạn',
    hours: 'Thứ 2 - Thứ 7: 08:00 - 18:00',
    contactTitle: 'Liên hệ',
    servicesTitle: 'Dịch vụ',
    services: ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Quản lý thi công', 'Thiết kế 3D'],
    consultTitle: 'Tư vấn',
    consultText: 'Nhận tư vấn thiết kế miễn phí cho văn phòng, showroom, cửa hàng và không gian kinh doanh.',
    policyTitle: 'Chính sách',
    policies: ['Điều khoản dịch vụ', 'Chính sách hoàn tiền', 'Điều khoản bảo hành', 'Hướng dẫn hợp tác'],
  },
  en: {
    tagline: 'Spatial solutions for your space',
    hours: 'Mon – Sat: 08:00 – 18:00',
    contactTitle: 'Contact',
    servicesTitle: 'Services',
    services: ['Architecture design', 'Interior design', 'Construction management', '3D design'],
    consultTitle: 'Consultation',
    consultText: 'Get a free design consultation for your office, showroom, store, or commercial space.',
    policyTitle: 'Policies',
    policies: ['Terms of service', 'Refund policy', 'Warranty terms', 'Collaboration guide'],
  },
} as const;

export function MainFooter({ lang = 'en' }: MainFooterProps) {
  const t = footerContent[lang];

  return (
    <footer className="main-footer">
      <div className="main-footer-container">
        <div className="main-footer-heading">
          <h2>FurniSpace</h2>
          <p className="main-footer-tagline">{t.tagline}</p>
        </div>

        <div className="main-footer-grid">
          <div className="main-footer-brand-block">
            <img className="main-footer-logo" src={logoImage} alt="FurniSpace" />
          </div>

          <FooterColumn title={t.contactTitle}>
            <FooterLine icon={<IconMapPin size={16} />}>
              123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
            </FooterLine>
            <FooterLine icon={<IconPhone size={16} />}>+84 770 111 101</FooterLine>
            <FooterLine icon={<IconMail size={16} />}>hello@furnispace.vn</FooterLine>
            <FooterLine icon={<IconClock size={16} />}>{t.hours}</FooterLine>
          </FooterColumn>

          <FooterColumn title={t.servicesTitle}>
            {t.services.map((item) => (
              <p key={item} className="main-footer-text">
                {item}
              </p>
            ))}
          </FooterColumn>

          <FooterColumn title={t.consultTitle}>
            <p className="main-footer-text">{t.consultText}</p>
          </FooterColumn>

          <FooterColumn title={t.policyTitle}>
            {t.policies.map((item) => (
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
