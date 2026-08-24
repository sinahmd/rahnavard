'use client'

import Link from 'next/link'

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">تنظیمات سایت</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          تنظیمات اصلی سایت شامل اطلاعات تماس، لوگو، متن‌های بخش‌ها و تنظیمات SEO از طریق پنل مدیریت پیشرفته قابل ویرایش است.
        </p>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">تنظیمات عمومی</h3>
            <p className="text-sm text-gray-500 mb-3">نام سایت، لوگو، تلفن، آدرس، شبکه‌های اجتماعی</p>
            <Link
              href="/django-admin/core/sitesettings/"
              className="bg-accent text-dark px-4 py-2 rounded font-bold hover:bg-accent-dark transition-colors inline-block"
            >
              ویرایش تنظیمات
            </Link>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">اسلایدهای هیرو</h3>
            <p className="text-sm text-gray-500 mb-3">مدیریت تصاویر اسلایدر صفحه اصلی</p>
            <Link
              href="/django-admin/core/heroslide/"
              className="bg-accent text-dark px-4 py-2 rounded font-bold hover:bg-accent-dark transition-colors inline-block"
            >
              مدیریت اسلایدها
            </Link>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">ویژگی‌های چرا ما</h3>
            <p className="text-sm text-gray-500 mb-3">مدیریت ویژگی‌های بخش &quot;چرا راهنورد خودرو&quot;</p>
            <Link
              href="/django-admin/core/whyfeature/"
              className="bg-accent text-dark px-4 py-2 rounded font-bold hover:bg-accent-dark transition-colors inline-block"
            >
              مدیریت ویژگی‌ها
            </Link>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">ریدایرکت‌ها</h3>
            <p className="text-sm text-gray-500 mb-3">مدیریت تغییر مسیر URL‌ها</p>
            <Link
              href="/django-admin/core/redirect/"
              className="bg-accent text-dark px-4 py-2 rounded font-bold hover:bg-accent-dark transition-colors inline-block"
            >
              مدیریت ریدایرکت‌ها
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
