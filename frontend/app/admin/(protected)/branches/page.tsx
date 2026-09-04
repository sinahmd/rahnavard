'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { BranchAdmin } from '@/types/branch'
import {
  deleteBranch,
  listBranches,
  setBranchActive,
} from '@/lib/api/branches'

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<BranchAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      setError(null)
      const data = await listBranches()
      setBranches(data.results || [])
    } catch {
      setError('خطا در بارگذاری شعب')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      setError(null)
      await setBranchActive(id, !currentStatus)
      await fetchBranches()
    } catch {
      setError('خطا در ذخیره تغییرات')
    }
  }

  const deleteBranchRow = async (id: number) => {
    if (!confirm('آیا از حذف این شعبه اطمینان دارید؟')) return
    try {
      setError(null)
      await deleteBranch(id)
      await fetchBranches()
    } catch {
      setError('خطا در حذف شعبه')
    }
  }

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت شعب</h1>
        <Link href="/admin/branches/new" className="bg-accent text-dark px-4 py-2 rounded-lg font-bold hover:bg-accent-dark transition-colors">
          + شعبه جدید
        </Link>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="p-4 font-bold">نام</th>
              <th className="p-4 font-bold">آدرس</th>
              <th className="p-4 font-bold">تلفن</th>
              <th className="p-4 font-bold">وضعیت</th>
              <th className="p-4 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">شعبه‌ای وجود ندارد</td></tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-bold">{branch.name}</td>
                  <td className="p-4">{branch.address}</td>
                  <td className="p-4 font-mono">{branch.phone}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(branch.id, branch.is_active)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {branch.is_active ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/branches/${branch.id}/edit`} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors">
                        ویرایش
                      </Link>
                      <button onClick={() => deleteBranchRow(branch.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors">
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
