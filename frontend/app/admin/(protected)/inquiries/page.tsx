'use client'

import AdminListPage from '@/components/admin/list/AdminListPage'
import type { Inquiry } from '@/types/inquiry'
import { listInquiries, patchInquiryStatus } from '@/lib/api/inquiries'

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('fa-IR')
  } catch {
    return dateString
  }
}

const statusButton = (active: boolean) =>
  `px-3 py-1 rounded-full text-sm font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`

export default function AdminInquiriesPage() {
  return (
    <AdminListPage<Inquiry>
      title="مدیریت استعلامات"
      emptyMessage="استعلامی وجود ندارد"
      errorMessage="خطا در بارگذاری استعلامات"
      fetchPage={listInquiries}
      rowKey={(inquiry) => inquiry.id}
      columns={[
        { header: 'نام', cell: (inquiry) => <span className="font-bold">{inquiry.name}</span> },
        { header: 'تلفن', cell: (inquiry) => <span className="font-mono">{inquiry.phone}</span> },
        { header: 'موضوع', cell: (inquiry) => inquiry.subject || '-' },
        {
          header: 'پیام',
          cell: (inquiry) => (
            <span className="max-w-xs truncate block text-sm">{inquiry.message || '-'}</span>
          ),
        },
        {
          header: 'خوانده شده',
          cell: (inquiry, helpers) => (
            <button
              onClick={async () => {
                try {
                  await patchInquiryStatus(inquiry.id, { is_read: !inquiry.is_read })
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              aria-pressed={inquiry.is_read}
              className={statusButton(inquiry.is_read)}
            >
              {inquiry.is_read ? 'خوانده شده' : 'جدید'}
            </button>
          ),
        },
        {
          header: 'تماس گرفته شده',
          cell: (inquiry, helpers) => (
            <button
              onClick={async () => {
                try {
                  await patchInquiryStatus(inquiry.id, { is_contacted: !inquiry.is_contacted })
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              aria-pressed={inquiry.is_contacted}
              className={statusButton(inquiry.is_contacted)}
            >
              {inquiry.is_contacted ? 'تماس گرفته شده' : 'در انتظار'}
            </button>
          ),
        },
        { header: 'تاریخ', cell: (inquiry) => <span className="text-gray-500">{formatDate(inquiry.created_at)}</span> },
      ]}
    />
  )
}
