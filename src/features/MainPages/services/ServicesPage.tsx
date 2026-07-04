import {
  IconArrowRight,
  IconBuildingStore,
  IconChecklist,
  IconClipboardText,
  IconColorSwatch,
  IconCube,
  IconDeviceDesktopAnalytics,
  IconHomeSearch,
  IconLayersIntersect,
  IconMessageCircle,
  IconPackage,
  IconRulerMeasure,
  IconSofa,
  IconTool,
  IconTruckDelivery,
  IconUsers,
} from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import galleryOneImage from '@/assets/product-detail/gallery-1.png';
import galleryThreeImage from '@/assets/product-detail/gallery-3.png';
import diningRoomImage from '@/assets/product-detail-shop/dining-room.png';
import roomDetailImage from '@/assets/product-detail-shop/room-detail.png';
import tableRoomImage from '@/assets/product-detail-shop/table-room.png';
import terraSalonImage from '@/assets/project-list/terra-salon.png';
import { useLang } from '@/app/providers/LangContext';
import { MainFooter, MainNavbar } from '@/features/MainPages/maincomponents';

import './ServicesPage.css';

type ServiceIcon = TablerIcon;

const serviceContent = {
  vi: {
    heroEyebrow: 'Dịch vụ FurniSpace',
    heroTitle: 'Dịch Vụ Thiết Kế Nội Thất & Trực Quan 3D',
    heroSubtitle:
      'FurniSpace giúp khách hàng doanh nghiệp lên kế hoạch, hình dung, tùy chỉnh và triển khai không gian nội thất với quy trình rõ ràng từ brief đầu tiên đến bàn giao.',
    startProject: 'Bắt đầu dự án',
    viewProcess: 'Xem quy trình',
    contactUs: 'Liên hệ',
    proposalPreview: 'Xem trước phương án',
    overviewLabel: 'Tổng quan dịch vụ',
    overviewEyebrow: 'Nền tảng trọn gói',
    overviewTitle: 'Dịch vụ nội thất được xây dựng quanh dự án kinh doanh',
    overviewText:
      'Từ tư vấn sales, tiếp nhận thông tin không gian, đề xuất thiết kế, báo giá, sản xuất, lắp đặt đến phản hồi sau bàn giao, FurniSpace giúp các bộ phận cùng theo sát một quy trình dự án.',
    coreEyebrow: 'Dịch vụ chính',
    coreTitle: 'Mọi hạng mục cần thiết trước khi không gian đi vào vận hành',
    coreSubtitle:
      'Các dịch vụ dành cho cafe, văn phòng, showroom, cửa hàng bán lẻ và không gian kinh doanh nhỏ cần thẩm mỹ, ngân sách rõ ràng và phương án có thể thi công.',
    visualTitle: 'Đề xuất 3D trước khi bắt đầu sản xuất',
    visualText:
      'Designer dựng bố cục phòng, sắp xếp nội thất và định hướng hình ảnh để khách hàng xem trước phương án, để lại nhận xét, phê duyệt hoặc yêu cầu chỉnh sửa trước báo giá và sản xuất.',
    darkPanelLabel: 'Cafe / showroom / văn phòng / bán lẻ',
    customTitle: 'Nội thất tùy chỉnh theo nhu cầu từng dự án',
    customText:
      'Sản phẩm có thể có nhiều phiên bản với chất liệu, màu sắc, kích thước, giá và trạng thái hiển thị khác nhau. Các lựa chọn tiêu chuẩn, tùy chỉnh và riêng cho dự án có thể được kiểm tra tính khả thi trước sản xuất.',
    workflowEyebrow: 'Quy trình dự án',
    workflowTitle: 'Lộ trình rõ ràng từ yêu cầu đến bàn giao',
    spacesEyebrow: 'Không gian kinh doanh',
    spacesTitle: 'Thiết kế cho môi trường thương mại',
    chooseEyebrow: 'Vì sao chọn FurniSpace',
    chooseTitle: 'Rõ ràng hơn cho mọi bên tham gia',
    ctaTitle: 'Sẵn sàng thiết kế không gian kinh doanh của bạn?',
    ctaText:
      'Hãy mang đến brief, mặt bằng hoặc mục tiêu kinh doanh. FurniSpace sẽ giúp chuyển hóa thành phương án thiết kế và kế hoạch triển khai rõ ràng.',
    overviewItems: [
      'Tư vấn không gian',
      'Đề xuất thiết kế 2D/3D',
      'Tùy chỉnh nội thất',
      'Báo giá và đặt hàng',
      'Điều phối sản xuất',
      'Lắp đặt và bàn giao',
    ],
    coreServices: [
      { title: 'Tư vấn không gian', text: 'Làm rõ mục tiêu kinh doanh, luồng khách hàng, định hướng phong cách, ngân sách và thời gian khai trương.' },
      { title: 'Khảo sát & tiếp nhận thông tin', text: 'Thu thập kích thước, hiện trạng, hình tham khảo và các ràng buộc trước khi bắt đầu thiết kế.' },
      { title: 'Thiết kế mặt bằng 2D', text: 'Lên khu vực chức năng, lối di chuyển, vị trí nội thất và luồng vận hành bằng mặt bằng thực tế.' },
      { title: 'Đề xuất trực quan 3D', text: 'Xem trước không khí không gian, tỷ lệ, vật liệu, ánh sáng và cách bố trí nội thất.' },
      { title: 'Giải pháp nội thất tùy chỉnh', text: 'Điều chỉnh nội thất theo thương hiệu, kích thước, cường độ sử dụng và ngân sách dự án.' },
      { title: 'Tùy chỉnh vật liệu & màu sắc', text: 'So sánh bề mặt hoàn thiện, texture, bảng màu và phiên bản sản phẩm trước khi xác nhận.' },
      { title: 'Báo giá & kế hoạch dự án', text: 'Chuyển lựa chọn đã duyệt thành phạm vi công việc, chi phí, lịch trình và bước tiếp theo rõ ràng.' },
      { title: 'Theo dõi sản xuất & lắp đặt', text: 'Điều phối sản xuất, giao hàng, các mốc lắp đặt và kiểm tra bàn giao.' },
    ],
    visualizationPoints: [
      'Xem trước phương án thiết kế trước khi triển khai',
      'Đánh giá bố cục phòng và cách sắp xếp nội thất',
      'Bình luận, phê duyệt hoặc yêu cầu chỉnh sửa thiết kế',
      'Hỗ trợ cafe, showroom, văn phòng và cửa hàng bán lẻ',
    ],
    furniturePoints: [
      'Mỗi phiên bản có thể khác chất liệu, màu, kích thước, giá và trạng thái hiển thị',
      'Có phiên bản tiêu chuẩn, tùy chỉnh và riêng cho từng dự án',
      'Kiểm tra tính khả thi trước khi cam kết sản xuất',
      'Tập trung vào quy trình dịch vụ dự án, không phải mua sắm ecommerce đơn thuần',
    ],
    versionCards: [
      { label: 'Tiêu chuẩn', title: 'Gỗ sồi / Vải linen', text: 'Tùy chọn hiển thị trong catalog' },
      { label: 'Tùy chỉnh', title: 'Gỗ walnut / Đồng thau', text: 'Điều chỉnh kích thước' },
      { label: 'Theo dự án', title: 'Bảng màu thương hiệu', text: 'Đã kiểm tra tính khả thi' },
    ],
    workflowSteps: [
      'Gửi yêu cầu dự án',
      'Tư vấn sales',
      'Khảo sát / tiếp nhận mặt bằng',
      'Thiết kế đề xuất 2D/3D',
      'Khách hàng đánh giá & phản hồi',
      'Xác nhận báo giá',
      'Sản xuất & lắp đặt',
      'Bàn giao & nhận phản hồi',
    ],
    spaceTitles: ['Cafe / Nhà hàng', 'Cửa hàng thời trang', 'Văn phòng', 'Showroom', 'Không gian bán lẻ', 'Nội thất doanh nghiệp nhỏ'],
    benefits: [
      { title: 'Xem trước 3D trước khi triển khai', text: 'Các bên liên quan có thể hiểu rõ không gian đề xuất trước khi bắt đầu sản xuất.' },
      { title: 'Quy trình dự án rõ ràng', text: 'Mỗi cột mốc đều có mục đích cụ thể từ yêu cầu ban đầu đến phản hồi cuối.' },
      { title: 'Giao tiếp đội ngũ tốt hơn', text: 'Customer, Sales, Designer và Production cùng theo sát các quyết định đã thống nhất.' },
      { title: 'Nội thất tùy chỉnh theo dự án', text: 'Lựa chọn nội thất có thể điều chỉnh theo hiện trạng và mục tiêu kinh doanh.' },
      { title: 'Minh bạch báo giá', text: 'Các lựa chọn thiết kế đã duyệt được kết nối rõ với phạm vi, ngân sách và đơn hàng.' },
      { title: 'Theo dõi sản xuất và bàn giao', text: 'Giao hàng, lắp đặt, kiểm tra và phản hồi nằm trong cùng một luồng dịch vụ.' },
    ],
  },
  en: {
    heroEyebrow: 'FurniSpace services',
    heroTitle: 'Interior Design & 3D Visualization Services',
    heroSubtitle:
      'FurniSpace helps business customers plan, visualize, customize, and implement interior spaces with a clear path from first brief to handover.',
    startProject: 'Start a Project',
    viewProcess: 'View Process',
    contactUs: 'Contact Us',
    proposalPreview: 'Proposal preview',
    overviewLabel: 'Service overview',
    overviewEyebrow: 'End-to-end platform',
    overviewTitle: 'Interior services built around business projects',
    overviewText:
      'From sales consultation and space input to design proposal, quotation, production, installation, and feedback, FurniSpace keeps every team aligned around one project workflow.',
    coreEyebrow: 'Core services',
    coreTitle: 'Everything your space needs before it opens',
    coreSubtitle:
      'Focused services for cafes, offices, showrooms, retail stores, and small business interiors that need beauty, budget clarity, and buildable design.',
    visualTitle: '3D proposal before production begins',
    visualText:
      'Designers create room layouts, furniture arrangements, and visual directions so customers can preview the proposal, leave comments, approve, or request changes before quotation and production.',
    customTitle: 'Custom furniture for each project need',
    customText:
      'Products can have multiple versions with different material, color, dimensions, price, and visibility. Standard, custom, and project-specific options can be checked for feasibility before production.',
    workflowEyebrow: 'Project workflow',
    workflowTitle: 'A clear path from request to handover',
    spacesEyebrow: 'Business spaces',
    spacesTitle: 'Designed for commercial environments',
    chooseEyebrow: 'Why FurniSpace',
    chooseTitle: 'More clarity for every stakeholder',
    ctaTitle: 'Ready to design your business space?',
    ctaText:
      'Bring your brief, floor plan, or business goal. FurniSpace will help shape it into a design proposal and implementation plan.',
    overviewItems: [
      'Space consultation',
      '2D/3D design proposal',
      'Furniture customization',
      'Quotation and order',
      'Production coordination',
      'Installation and handover',
    ],
    coreServices: [
      { title: 'Space Consultation', text: 'Clarify business goals, customer flow, style direction, budget range, and opening timeline.' },
      { title: 'Site Survey & Space Input', text: 'Collect dimensions, site conditions, references, and constraints before design starts.' },
      { title: '2D Layout Design', text: 'Plan zones, circulation, furniture placement, and operational flow with practical layouts.' },
      { title: '3D Visualization Proposal', text: 'Preview room atmosphere, scale, materials, lighting, and furniture arrangement.' },
      { title: 'Custom Furniture Solution', text: 'Adapt furniture to match brand, dimensions, usage intensity, and project budget.' },
      { title: 'Material & Color Customization', text: 'Compare finishes, textures, palettes, and version options before confirmation.' },
      { title: 'Quotation & Project Planning', text: 'Turn approved choices into clear scope, pricing, schedule, and next actions.' },
      { title: 'Production & Installation Tracking', text: 'Coordinate manufacturing, delivery, installation milestones, and handover checks.' },
    ],
    visualizationPoints: [
      'Preview design proposals before implementation',
      'Review room layout and furniture arrangement',
      'Comment, approve, or request design changes',
      'Support cafe, showroom, office, and retail spaces',
    ],
    darkPanelLabel: 'Cafe / showroom / office / retail',
    furniturePoints: [
      'Different material, color, dimensions, price, and visibility per version',
      'Standard, custom, and project-specific furniture versions',
      'Feasibility review before production commitment',
      'Business-service workflow instead of simple online shopping',
    ],
    versionCards: [
      { label: 'Standard', title: 'Oak / Linen', text: 'Visible catalog option' },
      { label: 'Custom', title: 'Walnut / Brass', text: 'Adjusted dimensions' },
      { label: 'Project', title: 'Brand palette', text: 'Feasibility checked' },
    ],
    workflowSteps: [
      'Submit Project Request',
      'Sales Consultation',
      'Space Survey / Space Input',
      '2D/3D Proposal Design',
      'Customer Review & Feedback',
      'Quotation Confirmation',
      'Production & Installation',
      'Handover & Feedback',
    ],
    spaceTitles: ['Cafe / Restaurant', 'Fashion Store', 'Office', 'Showroom', 'Retail Space', 'Small Business Interior'],
    benefits: [
      { title: '3D preview before implementation', text: 'Stakeholders can understand the proposed space before production begins.' },
      { title: 'Clear project workflow', text: 'Every milestone has a visible purpose from request to final feedback.' },
      { title: 'Better team communication', text: 'Customer, Sales, Designer, and Production stay aligned around shared decisions.' },
      { title: 'Custom furniture by project need', text: 'Furniture choices can be adapted to site requirements and business goals.' },
      { title: 'Quotation transparency', text: 'Approved design choices connect naturally to scope, budget, and ordering.' },
      { title: 'Production and handover tracking', text: 'Delivery, installation, inspection, and feedback remain part of one service flow.' },
    ],
  },
} as const;

const coreServiceIcons: ServiceIcon[] = [IconUsers, IconHomeSearch, IconRulerMeasure, IconCube, IconSofa, IconColorSwatch, IconClipboardText, IconTruckDelivery];

const spaceImages = [terraSalonImage, galleryOneImage, roomDetailImage, diningRoomImage, tableRoomImage, galleryThreeImage];

const benefitIcons: ServiceIcon[] = [IconDeviceDesktopAnalytics, IconChecklist, IconMessageCircle, IconTool, IconLayersIntersect, IconPackage];

export function ServicesPage() {
  const { lang } = useLang();
  const t = serviceContent[lang];

  return (
    <main className="services-page">
      <MainNavbar activePath="/services" classPrefix="services" />

      <section className="services-hero services-container" aria-labelledby="services-hero-title">
        <div className="services-hero-copy services-reveal">
          <p className="services-eyebrow">{t.heroEyebrow}</p>
          <h1 id="services-hero-title">{t.heroTitle}</h1>
          <p>{t.heroSubtitle}</p>
          <div className="services-hero-actions">
            <Link className="services-button services-button-dark" to="/customer/project-request">
              {t.startProject}
              <IconArrowRight size={16} stroke={1.8} />
            </Link>
            <a className="services-button services-button-outline" href="#services-workflow">
              {t.viewProcess}
            </a>
          </div>
        </div>

        <div className="services-hero-visual services-hero-reveal" aria-hidden="true">
          <img className="services-hero-main-image" src={roomDetailImage} alt="" />
          <img className="services-hero-side-image" src={tableRoomImage} alt="" />
          <div className="services-hero-note">
            <span>2D</span>
            <span>3D</span>
            <strong>{t.proposalPreview}</strong>
          </div>
        </div>
      </section>

      <section className="services-overview" aria-labelledby="services-overview-title">
        <div className="services-container services-overview-grid">
          <div className="services-section-copy services-reveal">
            <p className="services-eyebrow">{t.overviewEyebrow}</p>
            <h2 id="services-overview-title">{t.overviewTitle}</h2>
            <p>{t.overviewText}</p>
          </div>

          <div className="services-overview-list services-stagger" aria-label={t.overviewLabel}>
            {t.overviewItems.map((item, index) => (
              <article key={item} style={{ '--services-delay': `${index * 70}ms` } as CSSProperties}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="services-core services-container" aria-labelledby="services-core-title">
        <SectionIntro eyebrow={t.coreEyebrow} title={t.coreTitle} subtitle={t.coreSubtitle} id="services-core-title" />
        <div className="services-card-grid services-stagger">
          {t.coreServices.map((service, index) => {
            const Icon = coreServiceIcons[index];

            return (
              <article className="services-card" key={service.title} style={{ '--services-delay': `${index * 55}ms` } as CSSProperties}>
                <span className="services-card-icon">
                  <Icon size={24} stroke={1.7} />
                </span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="services-dark-feature" aria-labelledby="services-visualization-title">
        <div className="services-container services-dark-grid">
          <div className="services-dark-media services-reveal" aria-hidden="true">
            <img src={diningRoomImage} alt="" />
            <div className="services-dark-panel">
              <IconBuildingStore size={22} stroke={1.8} />
              <span>{t.darkPanelLabel}</span>
            </div>
          </div>
          <FeatureCopy id="services-visualization-title" title={t.visualTitle} text={t.visualText} points={t.visualizationPoints} />
        </div>
      </section>

      <section className="services-custom services-container" aria-labelledby="services-custom-title">
        <FeatureCopy id="services-custom-title" title={t.customTitle} text={t.customText} points={t.furniturePoints} />
        <div className="services-version-board services-reveal" aria-hidden="true">
          {t.versionCards.map((version) => (
            <article key={version.label}>
              <span>{version.label}</span>
              <strong>{version.title}</strong>
              <p>{version.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="services-workflow" id="services-workflow" aria-labelledby="services-workflow-title">
        <div className="services-container">
          <div className="services-section-copy services-reveal">
            <p className="services-eyebrow">{t.workflowEyebrow}</p>
            <h2 id="services-workflow-title">{t.workflowTitle}</h2>
          </div>
          <ol className="services-timeline services-stagger">
            {t.workflowSteps.map((step, index) => (
              <li key={step} style={{ '--services-delay': `${index * 70}ms` } as CSSProperties}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="services-spaces services-container" aria-labelledby="services-spaces-title">
        <SectionIntro eyebrow={t.spacesEyebrow} title={t.spacesTitle} id="services-spaces-title" />
        <div className="services-space-grid services-stagger">
          {t.spaceTitles.map((spaceTitle, index) => (
            <article className="services-space-card" key={spaceTitle} style={{ '--services-delay': `${index * 60}ms` } as CSSProperties}>
              <img src={spaceImages[index]} alt="" />
              <h3>{spaceTitle}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="services-why services-container" aria-labelledby="services-why-title">
        <SectionIntro eyebrow={t.chooseEyebrow} title={t.chooseTitle} id="services-why-title" />
        <div className="services-benefit-grid services-stagger">
          {t.benefits.map((benefit, index) => {
            const Icon = benefitIcons[index];

            return (
              <article className="services-benefit-card" key={benefit.title} style={{ '--services-delay': `${index * 60}ms` } as CSSProperties}>
                <Icon size={23} stroke={1.8} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>

        <div className="services-cta services-reveal">
          <div>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaText}</p>
          </div>
          <div className="services-cta-actions">
            <Link className="services-button services-button-light" to="/customer/project-request">
              {t.startProject}
              <IconArrowRight size={16} stroke={1.8} />
            </Link>
            <Link className="services-button services-button-transparent" to="/register">
              {t.contactUs}
            </Link>
          </div>
        </div>
      </section>

      <MainFooter />
    </main>
  );
}

function SectionIntro({ eyebrow, id, subtitle, title }: { eyebrow: string; id: string; subtitle?: string; title: string }) {
  return (
    <div className="services-section-intro services-reveal">
      <p className="services-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function FeatureCopy({ id, points, text, title }: { id: string; points: readonly string[]; text: string; title: string }) {
  return (
    <div className="services-feature-copy services-reveal">
      <h2 id={id}>{title}</h2>
      <p>{text}</p>
      <ul>
        {points.map((point) => (
          <li key={point}>
            <IconChecklist size={18} stroke={1.8} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
