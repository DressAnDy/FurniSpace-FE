import { IconCheck, IconCurrencyDollar, IconFileText, IconPlus } from '@tabler/icons-react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import './SaleQuotations.css';

type Quotation = {
  code: string;
  projectCode: string;
  projectName: string;
  customer: string;
  version: string;
  totalAmount: string;
  status: string;
  validUntil: string;
};

type QuotationItem = {
  product: string;
  quantity: number;
  unitPrice: string;
  customization: string;
  subtotal: string;
};

const quotations: Quotation[] = [
  {
    code: 'QUO-2024-089',
    projectCode: 'PRJ-2024-156',
    projectName: 'Luxury Cafe Interior',
    customer: 'Bean & Brew Co.',
    version: 'v1',
    totalAmount: '$74,740',
    status: 'SENT',
    validUntil: '2024-06-20',
  },
  {
    code: 'QUO-2024-088',
    projectCode: 'PRJ-2024-155',
    projectName: 'Fashion Boutique Renovation',
    customer: 'Chic Style Ltd.',
    version: 'v2',
    totalAmount: '$49,440',
    status: 'ACCEPTED',
    validUntil: '2024-06-18',
  },
  {
    code: 'QUO-2024-087',
    projectCode: 'PRJ-2024-154',
    projectName: 'Corporate Office Space',
    customer: 'Tech Innovations Inc.',
    version: 'v1',
    totalAmount: '$102,700',
    status: 'REVISION REQUESTED',
    validUntil: '2024-06-22',
  },
];

const quotationItems: QuotationItem[] = [
  { product: 'Custom Dining Tables - Oak Finish', quantity: 8, unitPrice: '$1,200', customization: '$400', subtotal: '$12,800' },
  { product: 'Bar Stools - Leather Upholstery', quantity: 15, unitPrice: '$350', customization: '$100', subtotal: '$6,750' },
  { product: 'Display Shelving Unit - Walnut', quantity: 6, unitPrice: '$2,800', customization: '$600', subtotal: '$20,400' },
  { product: 'Custom Counter - Marble Top', quantity: 1, unitPrice: '$15,000', customization: '$2,500', subtotal: '$17,500' },
];

export function SaleQuotations() {
  return (
    <div className="sale-quotations-shell">
      <SaleSidebar activeLabel="Quotations" />
      <div className="sale-quotations-content">
        <SaleNavbar />
        <main className="sale-quotations-main">
          <section className="sale-quotations-heading">
            <div>
              <h2>Quotations</h2>
              <p>Manage project quotations and pricing</p>
            </div>
            <button type="button">
              <IconPlus size={16} />
              Create Quotation
            </button>
          </section>

          <section className="sale-quotations-metrics">
            <article>
              <div>
                <span>Total Quotations</span>
                <strong>24</strong>
              </div>
              <IconFileText size={26} />
            </article>
            <article>
              <div>
                <span>Sent</span>
                <strong>12</strong>
              </div>
              <IconFileText size={26} />
            </article>
            <article>
              <div>
                <span>Accepted</span>
                <strong>8</strong>
              </div>
              <IconCheck size={26} />
            </article>
            <article>
              <div>
                <span>Total Value</span>
                <strong>$1.2M</strong>
              </div>
              <IconCurrencyDollar size={30} />
            </article>
          </section>

          <section className="sale-quotations-card">
            <header>
              <h3>All Quotations</h3>
              <p>View and manage project quotations</p>
            </header>
            <div className="sale-quotations-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Quotation Code</th>
                    <th>Project</th>
                    <th>Customer</th>
                    <th>Version</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Valid Until</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.code}>
                      <td className="sale-quotations-code">{quotation.code}</td>
                      <td>
                        <strong>{quotation.projectCode}</strong>
                        <span>{quotation.projectName}</span>
                      </td>
                      <td>{quotation.customer}</td>
                      <td>
                        <span className="sale-quotations-version">{quotation.version}</span>
                      </td>
                      <td>{quotation.totalAmount}</td>
                      <td>
                        <span className={`sale-quotations-status sale-quotations-status-${quotation.status.toLowerCase().replace(/ /g, '-')}`}>{quotation.status}</span>
                      </td>
                      <td>{quotation.validUntil}</td>
                      <td>
                        <button className="sale-quotations-link-button" type="button">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sale-quotations-card sale-quotations-detail">
            <header className="sale-quotations-detail-header">
              <div>
                <h3>Quotation Detail - QUO-2024-089</h3>
                <p>PRJ-2024-156 - Luxury Cafe Interior</p>
              </div>
              <span className="sale-quotations-status sale-quotations-status-sent">SENT</span>
            </header>

            <div className="sale-quotations-detail-grid">
              <div>
                <span>Customer</span>
                <strong>Bean & Brew Co.</strong>
              </div>
              <div>
                <span>Valid Until</span>
                <strong>2024-06-20</strong>
              </div>
              <div>
                <span>Sent Date</span>
                <strong>2024-06-05</strong>
              </div>
              <div>
                <span>Version</span>
                <strong>Version 1</strong>
              </div>
            </div>

            <div className="sale-quotations-divider" />

            <h4>Quotation Items</h4>
            <div className="sale-quotations-table-scroll">
              <table className="sale-quotations-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Customization</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationItems.map((item) => (
                    <tr key={item.product}>
                      <td>{item.product}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitPrice}</td>
                      <td>{item.customization}</td>
                      <td>{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sale-quotations-total-list">
              <div>
                <span>Subtotal</span>
                <strong>$68,500</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong className="sale-quotations-discount">-$3,000</strong>
              </div>
              <div>
                <span>Tax (8%)</span>
                <strong>$5,240</strong>
              </div>
              <div>
                <span>Service Fee</span>
                <strong>$2,500</strong>
              </div>
              <div>
                <span>Delivery Fee</span>
                <strong>$1,500</strong>
              </div>
              <div className="sale-quotations-total">
                <span>Total Amount</span>
                <strong>$74,740</strong>
              </div>
            </div>

            <div className="sale-quotations-actions">
              <button type="button">Send to Customer</button>
              <button type="button">Edit Quotation</button>
              <button type="button">Download PDF</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
