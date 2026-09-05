'use client'

import Link from 'next/link'
import AdminListPage from '@/components/admin/list/AdminListPage'
import type { BranchAdmin } from '@/types/branch'
import { deleteBranch, listBranches, setBranchActive } from '@/lib/api/branches'

export default function AdminBranchesPage() {
  return (
    <AdminListPage<BranchAdmin>
      title="مدیریت شعب"
      createHref="/admin/branches/new"
      createLabel="+ شعبه جدید"
      emptyMessage="شعبه‌ای وجود ندارد"
      errorMessage="خطا در بارگذاری شعب"
      fetchPage={listBranches}
      rowKey={(branch) => branch.id}
      columns={[
        {
          header: 'نام',
          cell: (branch) => <span className="font-bold">{branch.name}</span>,
        },
        { header: 'آدرس', cell: (branch) => branch.address },
        { header: 'تلفن', cell: (branch) => <span className="font-mono">{branch.phone}</span> },
        {
          header: 'وضعیت',
          cell: (branch, helpers) => (
            <button
              onClick={async () => {
                try {
                  await setBranchActive(branch.id, !branch.is_active)
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              aria-pressed={branch.is_active}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                branch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {branch.is_active ? 'فعال' : 'غیرفعال'}
            </button>
          ),
        },
        {
          header: 'عملیات',
          cell: (branch, helpers) => (
            <div className="flex gap-2">
              <Link
                href={`/admin/branches/${branch.id}/edit`}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                ویرایش
              </Link>
              <button
                onClick={async () => {
                  const ok = await helpers.confirm('آیا از حذف این شعبه اطمینان دارید؟')
                  if (!ok) return
                  try {
                    await deleteBranch(branch.id)
                    helpers.refresh()
                  } catch {
                    helpers.error('خطا در حذف شعبه')
                  }
                }}
                className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
              >
                حذف
              </button>
            </div>
          ),
        },
      ]}
    />
  )
}
